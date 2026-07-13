#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
docs/ 配下の生成物と scripts/ の生成ロジックを検証する。

目的:
    CI（pull_request / main 以外への push）で以下を確認し、壊れた
    HTML/ICS が誤って main にマージされる前に検出する。

    1. docs/*.html: 主要タグの開閉数の対応、必須メタ情報の有無
    2. docs/*.ics : VCALENDAR/VEVENT の構造、CRLF 改行
    3. docs/feeds.json（存在する場合のみ）: JSON としての妥当性、
       トップレベルに feeds リストがあること
       （feeds.json は別タスクで追加予定のファイルなので、
        存在しない場合はチェック自体をスキップする）
    4. scripts/generate_all_ics.py / scripts/generate_issues_ics.py の
       ユーティリティ関数（ics_escape / ics_fold_line /
       parse_event_datetime / extract_due）の自己テスト

    ネットワークアクセスは一切行わない。単体で実行可能。

使い方:
    python scripts/validate.py

終了コード:
    0   すべての検証項目が PASSED
    1   いずれかの検証項目が FAILED
"""

from __future__ import annotations

import glob
import importlib.util
import json
import os
import re
import sys
from datetime import date, datetime, timezone
from types import ModuleType
from typing import List, Tuple

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DOCS_DIR = os.path.join(REPO_ROOT, "docs")
SCRIPTS_DIR = os.path.join(REPO_ROOT, "scripts")

# 開閉対応をチェックする主要タグ（自己終了しない前提のタグのみを対象にする）
HTML_TAGS: Tuple[str, ...] = (
    "div", "section", "ul", "li", "a", "p",
    "header", "footer", "main", "style", "script",
)


# ---------------------------------------------------------------------------
# 結果集計
# ---------------------------------------------------------------------------

class Result:
    """検証結果（項目名, 成否, 詳細）を蓄積するだけの単純な集計器。"""

    def __init__(self) -> None:
        self.checks: List[Tuple[str, bool, str]] = []

    def check(self, name: str, ok: bool, detail: str = "") -> None:
        self.checks.append((name, ok, detail))

    @property
    def all_passed(self) -> bool:
        return all(ok for _, ok, _ in self.checks)

    def report(self) -> None:
        for name, ok, detail in self.checks:
            status = "PASSED" if ok else "FAILED"
            suffix = f": {detail}" if detail else ""
            print(f"[{status}] {name}{suffix}")


RESULT = Result()


# ---------------------------------------------------------------------------
# HTML 検証
# ---------------------------------------------------------------------------

def count_tag(html: str, tag: str) -> Tuple[int, int]:
    """
    指定タグの開始・終了タグ数を数える。

    フル HTML パーサではなく、字句レベルの単純な検査であることに注意。
    「<tag」の直後が空白または「>」であれば開始タグ、「</tag>」であれば
    終了タグとみなす（属性の有無・改行は許容する）。
    """
    open_re = re.compile(rf"<{tag}(?=[\s>])", re.IGNORECASE)
    close_re = re.compile(rf"</{tag}\s*>", re.IGNORECASE)
    return len(open_re.findall(html)), len(close_re.findall(html))


def validate_html_file(path: str) -> List[str]:
    """1つの HTML ファイルを検証し、エラーメッセージのリストを返す（空なら OK）。"""
    errors: List[str] = []
    with open(path, "r", encoding="utf-8") as f:
        html = f.read()

    for tag in HTML_TAGS:
        opens, closes = count_tag(html, tag)
        if opens != closes:
            errors.append(f"<{tag}> の開閉数が不一致（open={opens}, close={closes}）")

    if not re.search(r"<title>.*?</title>", html, re.IGNORECASE | re.DOTALL):
        errors.append("<title> がありません")

    if not re.search(r"<meta\s+charset=", html, re.IGNORECASE):
        errors.append("<meta charset=...> がありません")

    if not re.search(r"<html\s+[^>]*lang=", html, re.IGNORECASE):
        errors.append("<html lang=...> がありません")

    return errors


def validate_all_html() -> None:
    """docs/*.html（トップレベルのみ、サブディレクトリは対象外）を検証する。"""
    paths = sorted(glob.glob(os.path.join(DOCS_DIR, "*.html")))
    if not paths:
        RESULT.check("HTML: docs/*.html が見つかりません", False, DOCS_DIR)
        return
    for path in paths:
        rel = os.path.relpath(path, REPO_ROOT)
        errors = validate_html_file(path)
        RESULT.check(f"HTML構文チェック: {rel}", not errors, "; ".join(errors))


# ---------------------------------------------------------------------------
# ICS 検証
# ---------------------------------------------------------------------------

def validate_ics_file(path: str) -> List[str]:
    """1つの ICS ファイルを検証し、エラーメッセージのリストを返す（空なら OK）。"""
    errors: List[str] = []
    with open(path, "rb") as f:
        raw = f.read()

    try:
        text = raw.decode("utf-8")
    except UnicodeDecodeError as e:
        return [f"UTF-8 デコードに失敗しました: {e}"]

    if "BEGIN:VCALENDAR" not in text:
        errors.append("BEGIN:VCALENDAR がありません")
    if "END:VCALENDAR" not in text:
        errors.append("END:VCALENDAR がありません")

    # CRLF (\r\n) 改行のみで構成されていることを確認する
    stripped = text.replace("\r\n", "")
    if "\n" in stripped or "\r" in stripped:
        errors.append("CRLF (\\r\\n) 以外の改行が含まれています")

    begin_events = text.count("BEGIN:VEVENT")
    end_events = text.count("END:VEVENT")
    if begin_events != end_events:
        errors.append(f"VEVENT の開閉数が不一致（BEGIN={begin_events}, END={end_events}）")

    return errors


def validate_all_ics() -> None:
    """docs/*.ics（トップレベルのみ）を検証する。"""
    paths = sorted(glob.glob(os.path.join(DOCS_DIR, "*.ics")))
    if not paths:
        RESULT.check("ICS: docs/*.ics が見つかりません", False, DOCS_DIR)
        return
    for path in paths:
        rel = os.path.relpath(path, REPO_ROOT)
        errors = validate_ics_file(path)
        RESULT.check(f"ICS構文チェック: {rel}", not errors, "; ".join(errors))


# ---------------------------------------------------------------------------
# feeds.json 検証（存在する場合のみ。別タスクで追加予定のため必須ではない）
# ---------------------------------------------------------------------------

def validate_feeds_json() -> None:
    path = os.path.join(DOCS_DIR, "feeds.json")
    if not os.path.exists(path):
        # feeds.json は別タスクで追加される予定のファイル。無ければスキップする。
        return

    with open(path, "r", encoding="utf-8") as f:
        raw = f.read()

    try:
        data = json.loads(raw)
    except json.JSONDecodeError as e:
        RESULT.check("feeds.json: JSON妥当性", False, str(e))
        return

    RESULT.check("feeds.json: JSON妥当性", True)

    ok = isinstance(data, dict) and isinstance(data.get("feeds"), list)
    RESULT.check(
        "feeds.json: トップレベルに feeds リストが存在する",
        ok,
        "" if ok else "'feeds' キーがリストとして存在しません",
    )


# ---------------------------------------------------------------------------
# 生成ロジックの自己テスト
# ---------------------------------------------------------------------------

def load_module(name: str, filename: str) -> ModuleType:
    """scripts/ 配下のスクリプトをパッケージ化せずファイルパスから直接 import する。"""
    path = os.path.join(SCRIPTS_DIR, filename)
    spec = importlib.util.spec_from_file_location(name, path)
    if spec is None or spec.loader is None:
        raise ImportError(f"{filename} を読み込めません: {path}")
    module = importlib.util.module_from_spec(spec)
    # dataclasses 等が sys.modules[cls.__module__] を参照するため、
    # exec_module 前に登録しておく必要がある。
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


def selftest_generate_all_ics() -> None:
    """scripts/generate_all_ics.py のユーティリティ関数を自己テストする。"""
    try:
        mod = load_module("generate_all_ics", "generate_all_ics.py")
    except Exception as e:
        RESULT.check("selftest: generate_all_ics.py の import", False, str(e))
        return
    RESULT.check("selftest: generate_all_ics.py の import", True)

    # ics_escape: バックスラッシュ・改行・カンマ・セミコロンのエスケープ
    try:
        assert mod.ics_escape("a,b;c") == "a\\,b\\;c"
        assert mod.ics_escape("line1\nline2") == "line1\\nline2"
        assert mod.ics_escape("back\\slash") == "back\\\\slash"
        RESULT.check("selftest: ics_escape", True)
    except AssertionError:
        RESULT.check("selftest: ics_escape", False, "エスケープ結果が期待値と一致しません")

    # ics_fold_line: 75 バイトで折り返し、継続行の先頭スペースを除けば復元できること
    try:
        long_line = "SUMMARY:" + ("あ" * 40)
        folded = mod.ics_fold_line(long_line)
        assert len(folded) > 1
        assert all(len(part.encode("utf-8")) <= 75 for part in folded)
        unfolded = folded[0] + "".join(p[1:] for p in folded[1:])
        assert unfolded == long_line
        assert mod.ics_fold_line("SHORT") == ["SHORT"]
        RESULT.check("selftest: ics_fold_line", True)
    except AssertionError:
        RESULT.check("selftest: ics_fold_line", False, "折り返し結果が期待値と一致しません")

    # parse_event_datetime: 「開催日時: ...」形式のパースとフォールバック
    try:
        fallback = datetime(2026, 1, 1, 0, 0, tzinfo=timezone.utc)
        summary = "開催日時: 2026/04/18 10:00 ～ 18:00\n本文..."
        started, ended = mod.parse_event_datetime(summary, fallback)
        assert (started.year, started.month, started.day, started.hour, started.minute) == (
            2026, 4, 18, 10, 0,
        )
        assert (ended.year, ended.month, ended.day, ended.hour, ended.minute) == (
            2026, 4, 18, 18, 0,
        )

        started2, ended2 = mod.parse_event_datetime("開催日時の記載なし", fallback)
        assert started2 == fallback
        assert ended2 > started2
        RESULT.check("selftest: parse_event_datetime", True)
    except AssertionError:
        RESULT.check("selftest: parse_event_datetime", False, "日時パース結果が期待値と一致しません")


def selftest_generate_issues_ics() -> None:
    """scripts/generate_issues_ics.py のユーティリティ関数を自己テストする。"""
    try:
        mod = load_module("generate_issues_ics", "generate_issues_ics.py")
    except Exception as e:
        RESULT.check("selftest: generate_issues_ics.py の import", False, str(e))
        return
    RESULT.check("selftest: generate_issues_ics.py の import", True)

    # extract_due: 本文中の due: YYYY-MM-DD を抽出できること
    try:
        assert mod.extract_due("説明文\ndue: 2026-03-15\n続き") == date(2026, 3, 15)
        assert mod.extract_due("due: なし") is None
        assert mod.extract_due("") is None
        RESULT.check("selftest: extract_due", True)
    except AssertionError:
        RESULT.check("selftest: extract_due", False, "due: 抽出結果が期待値と一致しません")


# ---------------------------------------------------------------------------
# エントリポイント
# ---------------------------------------------------------------------------

def main() -> int:
    validate_all_html()
    validate_all_ics()
    validate_feeds_json()
    selftest_generate_all_ics()
    selftest_generate_issues_ics()

    print("=" * 60)
    RESULT.report()
    print("=" * 60)

    if RESULT.all_passed:
        print(f"PASSED: {len(RESULT.checks)} checks")
        return 0

    failed = [name for name, ok, _ in RESULT.checks if not ok]
    print(f"FAILED: {len(failed)}/{len(RESULT.checks)} checks failed", file=sys.stderr)
    for name in failed:
        print(f"  - {name}", file=sys.stderr)
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
