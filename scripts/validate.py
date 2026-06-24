#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
docs/ と scripts/ の最小バリデーション（ネットワーク不要・CI 用）。

目的:
    壊れた HTML / ICS / JSON が GitHub Pages に公開されるのを防ぐ。
    外部 API を叩かず、生成ロジックの自己テストと静的ファイル検査だけを行う。

使い方:
    python scripts/validate.py
"""

from __future__ import annotations

import glob
import importlib.util
import json
import os
import sys
from datetime import datetime
from html.parser import HTMLParser
from zoneinfo import ZoneInfo

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DOCS = os.path.join(ROOT, "docs")
JST = ZoneInfo("Asia/Tokyo")

errors: list[str] = []


def err(msg: str) -> None:
    errors.append(msg)
    print(f"  NG  {msg}")


def ok(msg: str) -> None:
    print(f"  OK  {msg}")


# ---------------------------------------------------------------------------
# HTML 検査
# ---------------------------------------------------------------------------

# 明示的に開閉するコンテナ系タグだけ釣り合いを検査する（p/li 等の省略可能タグは対象外）。
_TRACKED = {"html", "head", "body", "div", "nav", "header", "footer", "ul", "script", "style"}


class _Counter(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.starts: dict[str, int] = {}
        self.ends: dict[str, int] = {}

    def handle_starttag(self, tag, attrs):
        if tag in _TRACKED:
            self.starts[tag] = self.starts.get(tag, 0) + 1

    def handle_endtag(self, tag):
        if tag in _TRACKED:
            self.ends[tag] = self.ends.get(tag, 0) + 1


def check_html(path: str) -> None:
    name = os.path.relpath(path, ROOT)
    with open(path, encoding="utf-8") as f:
        html = f.read()

    c = _Counter()
    c.feed(html)
    c.close()

    # このファイルのエラーだけをローカルに集める。global errors への部分文字列マッチに
    # 頼ると 'docs/index.html.bak' のような別ファイル名と誤一致して OK 判定を取り違える。
    local: list[str] = []
    for tag in _TRACKED:
        s, e = c.starts.get(tag, 0), c.ends.get(tag, 0)
        if s != e:
            local.append(f"{name}: <{tag}> の開閉数が不一致 (open={s}, close={e})")

    low = html.lower()
    for must in ("<!doctype html", "<title>", "</html>", "</body>"):
        if must not in low:
            local.append(f"{name}: 必須要素が見つからない: {must}")

    for m in local:
        err(m)
    if not local:
        ok(f"HTML {name}")


# ---------------------------------------------------------------------------
# ICS / JSON 検査
# ---------------------------------------------------------------------------

def check_ics(path: str) -> None:
    name = os.path.relpath(path, ROOT)
    # newline="" で改行変換を抑止し、実際の CRLF を検査できるようにする。
    with open(path, encoding="utf-8", newline="") as f:
        body = f.read()
    problems = []
    if not body.startswith("BEGIN:VCALENDAR"):
        problems.append("BEGIN:VCALENDAR で始まっていない")
    if not body.rstrip("\r\n").endswith("END:VCALENDAR"):
        problems.append("END:VCALENDAR で終わっていない")
    if "\r\n" not in body:
        problems.append("CRLF 改行になっていない")
    if body.count("BEGIN:VEVENT") != body.count("END:VEVENT"):
        problems.append("VEVENT の開閉数が不一致")
    for p in problems:
        err(f"{name}: {p}")
    if not problems:
        ok(f"ICS  {name}")


def check_json(path: str) -> None:
    name = os.path.relpath(path, ROOT)
    try:
        with open(path, encoding="utf-8") as f:
            data = json.load(f)
    except Exception as e:  # noqa: BLE001
        err(f"{name}: JSON として不正: {e}")
        return
    if "feeds" not in data or not isinstance(data["feeds"], list):
        err(f"{name}: 'feeds' 配列がない")
    else:
        ok(f"JSON {name} ({len(data['feeds'])} feeds)")


# ---------------------------------------------------------------------------
# 生成ロジックの自己テスト（ネットワーク不要）
# ---------------------------------------------------------------------------

def _load(module_name: str, filename: str):
    spec = importlib.util.spec_from_file_location(
        module_name, os.path.join(ROOT, "scripts", filename)
    )
    mod = importlib.util.module_from_spec(spec)
    # dataclass などが __module__ を解決できるよう先に登録する。
    sys.modules[module_name] = mod
    spec.loader.exec_module(mod)
    return mod


def selftest_connpass() -> None:
    gen = _load("gen_all_ics", "generate_all_ics.py")

    # ICS エスケープ
    assert gen.ics_escape("a,b;c\\d\ne") == "a\\,b\\;c\\\\d\\ne"

    # 行折り返しは UTF-8 75 バイト以内（ASCII）
    long_line = "X" * 200
    for piece in gen.ics_fold_line(long_line):
        assert len(piece.encode("utf-8")) <= 75

    # マルチバイト（日本語 3 バイト文字）でも各 piece が 75 バイト以内で、
    # 文字の途中で割れない（継続行先頭スペースを除いて連結すると原文に戻る）。
    jp_line = "今日も一日がんばりましょう" * 10  # 130 文字 / 約 390 バイト
    pieces = gen.ics_fold_line(jp_line)
    assert len(pieces) > 1, "折り返しが起きていない"
    for piece in pieces:
        assert len(piece.encode("utf-8")) <= 75, f"75 バイト超: {piece!r}"
    # 1 行目はそのまま、2 行目以降は先頭スペースを剥がして連結 → 原文一致
    rejoined = pieces[0] + "".join(p[1:] for p in pieces[1:])
    assert rejoined == jp_line, "折り返し再結合で原文に戻らない（文字が割れている）"

    # 開催日時パース
    summary = "開催日時: 2026/04/18 10:00 ～ 18:00 / 場所: ..."
    fallback = datetime(2026, 1, 1, tzinfo=JST)
    started, ended = gen.parse_event_datetime(summary, fallback)
    assert (started.hour, ended.hour) == (10, 18), (started, ended)

    # build_ics の構造
    ev = gen.CalEvent(
        uid="uid-1",
        title="テスト, イベント",
        url="https://ospn.connpass.com/event/1/",
        published=fallback,
        started_at=started,
        ended_at=ended,
        summary=summary,
    )
    ics = gen.build_ics([ev], "テストカレンダー")
    assert ics.startswith("BEGIN:VCALENDAR\r\n")
    assert ics.rstrip("\r\n").endswith("END:VCALENDAR")
    assert ics.count("BEGIN:VEVENT") == 1

    # API v2 レスポンス1件 → CalEvent 変換（ネットワーク不要）
    api_ev = gen.event_from_api({
        "title": "もくもく会",
        "event_id": 365530,
        "event_url": "https://ospn.connpass.com/event/365530/",
        "started_at": "2025-08-16T07:00:00+09:00",
        "ended_at": "2025-08-16T08:00:00+09:00",
        "place": "Discord",
        "catch": "ゆるい会",
    })
    assert api_ev.uid == "connpass-event-365530@connpass.com"
    assert api_ev.started_at.hour == 7 and api_ev.ended_at.hour == 8
    assert "会場: Discord" in api_ev.summary
    # ym ウィンドウは今月を含み months_ahead+1 件
    win = gen._ym_window(6)
    assert len(win) == 7 and len(win[0]) == 6
    ok("selftest generate_all_ics")


def selftest_issues() -> None:
    iss = _load("gen_issues_ics", "generate_issues_ics.py")
    import datetime as _dt

    assert iss.extract_due("foo\ndue: 2026-03-15\nbar") == _dt.date(2026, 3, 15)
    assert iss.extract_due("due なし") is None
    assert iss.extract_due("DUE : 2026-12-31") == _dt.date(2026, 12, 31)
    ok("selftest generate_issues_ics")


# ---------------------------------------------------------------------------
# エントリポイント
# ---------------------------------------------------------------------------

def main() -> int:
    # 各種別で「期待ファイルが 0 件」なら無音 PASS させず FAIL にする。
    # docs/ を丸ごと削除する事故コミットや、生成ジョブが何も出力しなかったケースを
    # CI で検出するため（ループ本体が走らないと errors が空のまま PASSED になる穴を塞ぐ）。
    print("== HTML ==")
    html_paths = sorted(glob.glob(os.path.join(DOCS, "*.html")))
    if not html_paths:
        err("docs/*.html が 1 件もない（サイト本体が消えている可能性）")
    for path in html_paths:
        check_html(path)

    print("== ICS ==")
    ics_paths = sorted(glob.glob(os.path.join(DOCS, "*.ics")))
    if not ics_paths:
        err("docs/*.ics が 1 件もない（カレンダー生成が失敗した可能性）")
    for path in ics_paths:
        check_ics(path)

    print("== JSON ==")
    json_paths = sorted(glob.glob(os.path.join(DOCS, "*.json")))
    if not json_paths:
        err("docs/*.json が 1 件もない（feeds.json が消えている可能性）")
    for path in json_paths:
        check_json(path)

    print("== 自己テスト ==")
    selftest_connpass()
    selftest_issues()

    print("---")
    if errors:
        print(f"FAILED: {len(errors)} 件のエラー", file=sys.stderr)
        return 1
    print("PASSED")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
