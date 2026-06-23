#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
connpass グループの Atom フィードから ICS を生成する。

目的:
    feeds.yml に列挙した connpass グループの Atom フィードを取得し、
    docs/{key}.ics として出力する。GitHub Pages で配信することで
    カレンダーアプリから購読可能にする。

    API キー不要。{subdomain}.connpass.com/ja.atom を使う。

使い方:
    python scripts/generate_all_ics.py

環境変数:
    FEEDS_YML   feeds.yml のパス（デフォルト: feeds.yml）
    OUT_DIR     出力先ディレクトリ（デフォルト: docs）
"""

from __future__ import annotations

import json
import os
import re
import sys
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from dataclasses import dataclass
from datetime import date, datetime, timezone
from zoneinfo import ZoneInfo
from typing import Any, Dict, List, Optional

JST = ZoneInfo("Asia/Tokyo")
ATOM_NS = "http://www.w3.org/2005/Atom"
USER_AGENT = "connpass-ics-generator/2.0 (+https://github.com/shimajima-eiji/shimajima-eiji.github.io)"
CONNPASS_API_URL = "https://connpass.com/api/v2/events/"


# ---------------------------------------------------------------------------
# feeds.yml 最小パーサ（PyYAML 不要）
# ---------------------------------------------------------------------------

def load_feeds_yml(path: str) -> List[Dict[str, Any]]:
    """feeds.yml を読み込む。PyYAML なしで動く最小実装。"""
    if not os.path.exists(path):
        raise FileNotFoundError(path)

    lines = [ln.rstrip("\n") for ln in open(path, "r", encoding="utf-8")]
    feeds: List[Dict[str, Any]] = []
    cur: Optional[Dict[str, Any]] = None

    for ln in lines:
        if not ln.strip() or ln.strip().startswith("#"):
            continue
        if ln.strip() == "feeds:":
            continue
        if ln.lstrip().startswith("- "):
            if cur:
                feeds.append(cur)
            cur = {}
            rest = ln.lstrip()[2:].strip()
            if rest and ":" in rest:
                k, v = rest.split(":", 1)
                cur[k.strip()] = v.strip().strip("'").strip('"')
            continue
        if cur is None:
            continue
        if ":" in ln:
            k, v = ln.strip().split(":", 1)
            cur[k.strip()] = v.strip().strip("'").strip('"')

    if cur:
        feeds.append(cur)
    return feeds


# ---------------------------------------------------------------------------
# データクラス
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class CalEvent:
    uid: str
    title: str
    url: str
    published: datetime    # tz-aware（投稿日時）
    started_at: datetime   # tz-aware（イベント開始日時）
    ended_at: datetime     # tz-aware（イベント終了日時）
    summary: str


# ---------------------------------------------------------------------------
# ユーティリティ
# ---------------------------------------------------------------------------

def die(msg: str, code: int = 2) -> None:
    print(f"ERROR: {msg}", file=sys.stderr)
    raise SystemExit(code)


def safe_slug(s: str) -> str:
    s = (s or "").strip().lower()
    if not s:
        die("feed.key が空です（ファイル名になるので必須）")
    if not re.fullmatch(r"[a-z0-9][a-z0-9\-_.]{0,80}", s):
        die(f"feed.key が不正です: {s!r}（a-z0-9 と - _ . のみ、先頭は英数字）")
    return s


def parse_iso_datetime(s: str) -> datetime:
    if not s:
        raise ValueError("empty datetime string")
    if s.endswith("Z"):
        s = s[:-1] + "+00:00"
    dt = datetime.fromisoformat(s)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt


# 「開催日時: 2026/04/18 10:00 ～ 18:00」形式から開始・終了を抽出する
_DATETIME_PATTERN = re.compile(
    r"開催日時[:：]\s*(\d{4}/\d{2}/\d{2})\s+(\d{2}:\d{2})\s*[～〜~]\s*(\d{2}:\d{2})"
)

def parse_event_datetime(summary: str, fallback: datetime) -> tuple[datetime, datetime]:
    """
    connpass Atom の summary 先頭にある開催日時テキストから
    (started_at, ended_at) を JST で返す。
    パースできなければ fallback（投稿日時）を started_at、+1h を ended_at にする。
    """
    m = _DATETIME_PATTERN.search(summary)
    if not m:
        ended = fallback.replace(hour=min(fallback.hour + 1, 23))
        return fallback, ended

    date_str, start_str, end_str = m.group(1), m.group(2), m.group(3)
    date_part = date_str.replace("/", "-")
    try:
        started = datetime.fromisoformat(f"{date_part}T{start_str}:00").replace(tzinfo=JST)
        ended = datetime.fromisoformat(f"{date_part}T{end_str}:00").replace(tzinfo=JST)
        if ended <= started:
            ended = started.replace(hour=min(started.hour + 1, 23))
        return started, ended
    except ValueError:
        ended = fallback.replace(hour=min(fallback.hour + 1, 23))
        return fallback, ended


def ns(tag: str) -> str:
    return f"{{{ATOM_NS}}}{tag}"


# ---------------------------------------------------------------------------
# Atom フィード取得・パース
# ---------------------------------------------------------------------------

def fetch_atom(subdomain: str) -> List[CalEvent]:
    """
    {subdomain}.connpass.com/ja.atom を取得してイベント一覧を返す。
    認証不要。取得件数は connpass 側の固定値（通常 10件）。
    """
    url = f"https://{subdomain}.connpass.com/ja.atom"
    req = urllib.request.Request(url, method="GET")
    req.add_header("User-Agent", USER_AGENT)

    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            body = resp.read()
    except urllib.error.HTTPError as e:
        die(f"HTTP {e.code}: {url}")
    except urllib.error.URLError as e:
        die(f"URL error ({url}): {e}")

    try:
        root = ET.fromstring(body)
    except ET.ParseError as e:
        die(f"Atom parse error ({url}): {e}")

    events: List[CalEvent] = []
    for entry in root.findall(ns("entry")):
        title_el = entry.find(ns("title"))
        link_el = entry.find(ns("link"))
        pub_el = entry.find(ns("published"))
        if pub_el is None:
            pub_el = entry.find(ns("updated"))
        summary_el = entry.find(ns("summary"))
        id_el = entry.find(ns("id"))

        if title_el is None or link_el is None or pub_el is None:
            continue

        title = (title_el.text or "").strip()
        url_href = link_el.get("href", "").strip()
        summary = (summary_el.text or "") if summary_el is not None else ""
        uid = (id_el.text if id_el is not None else url_href) or url_href

        try:
            published = parse_iso_datetime(pub_el.text or "")
        except Exception:
            continue

        started_at, ended_at = parse_event_datetime(summary, published)

        events.append(CalEvent(
            uid=uid,
            title=title,
            url=url_href,
            published=published,
            started_at=started_at,
            ended_at=ended_at,
            summary=summary,
        ))

    return events


# ---------------------------------------------------------------------------
# connpass API v2 取得（CONNPASS_API_KEY がある場合のみ使用）
#   - 認証: X-API-Key ヘッダ。User-Agent 必須。
#   - ym(年月) で「今月〜数ヶ月先」に絞り、過去イベントで埋まるのを防ぐ。
#   - キーが無い／失敗した場合は呼び出し側で Atom にフォールバックする。
# ---------------------------------------------------------------------------

def _ym_window(months_ahead: int = 6) -> List[str]:
    """今月から months_ahead ヶ月先までの YYYYMM 文字列リストを返す。"""
    today = date.today()
    out: List[str] = []
    y, m = today.year, today.month
    for _ in range(months_ahead + 1):
        out.append(f"{y}{m:02d}")
        m += 1
        if m > 12:
            m = 1
            y += 1
    return out


def event_from_api(e: Dict[str, Any]) -> CalEvent:
    """connpass API v2 のイベント1件を CalEvent に変換する（純粋関数）。"""
    title = (e.get("title") or "").strip()
    url_href = (e.get("event_url") or "").strip()
    event_id = e.get("event_id")
    uid = f"connpass-event-{event_id}@connpass.com" if event_id else url_href

    started_at = parse_iso_datetime(e.get("started_at") or "")
    ended_raw = e.get("ended_at")
    if ended_raw:
        ended_at = parse_iso_datetime(ended_raw)
    else:
        ended_at = started_at.replace(hour=min(started_at.hour + 1, 23))
    if ended_at <= started_at:
        ended_at = started_at.replace(hour=min(started_at.hour + 1, 23))

    catch = (e.get("catch") or "").strip()
    place = (e.get("place") or "").strip()
    summary = "\n".join(p for p in [catch, (f"会場: {place}" if place else "")] if p)

    return CalEvent(
        uid=uid,
        title=title,
        url=url_href,
        published=started_at,
        started_at=started_at,
        ended_at=ended_at,
        summary=summary,
    )


def fetch_api(subdomain: str, api_key: str, months_ahead: int = 6, count: int = 100) -> List[CalEvent]:
    """connpass API v2 から今後のイベントを取得する。失敗時は例外を送出する。"""
    params: List[tuple[str, str]] = [
        ("subdomain", subdomain),
        ("count", str(count)),
        ("order", "2"),  # 開催日時順
    ]
    params += [("ym", ym) for ym in _ym_window(months_ahead)]
    url = f"{CONNPASS_API_URL}?{urllib.parse.urlencode(params)}"

    req = urllib.request.Request(url, method="GET")
    req.add_header("X-API-Key", api_key)
    req.add_header("User-Agent", USER_AGENT)
    req.add_header("Accept", "application/json")

    with urllib.request.urlopen(req, timeout=30) as resp:
        data = json.loads(resp.read().decode("utf-8"))

    events: List[CalEvent] = []
    for e in data.get("events", []) or []:
        try:
            events.append(event_from_api(e))
        except Exception:  # noqa: BLE001 — 不正な1件はスキップ
            continue
    return events


# ---------------------------------------------------------------------------
# ICS 生成
# ---------------------------------------------------------------------------

def ics_escape(text: str) -> str:
    t = text or ""
    t = t.replace("\\", "\\\\")
    t = t.replace("\r\n", "\n").replace("\r", "\n")
    t = t.replace("\n", "\\n")
    t = t.replace(",", "\\,")
    t = t.replace(";", "\\;")
    return t


def ics_fold_line(line: str, limit: int = 75) -> List[str]:
    if len(line.encode("utf-8")) <= limit:
        return [line]
    parts: List[str] = []
    cur = ""
    cur_bytes = 0
    for ch in line:
        chb = ch.encode("utf-8")
        if cur_bytes + len(chb) > limit and cur:
            parts.append(cur)
            cur = " " + ch
            cur_bytes = len(cur.encode("utf-8"))
        else:
            cur += ch
            cur_bytes += len(chb)
    if cur:
        parts.append(cur)
    return parts


def fmt_dtstamp_utc() -> str:
    return datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")


def fmt_dt_jst(dt: datetime) -> str:
    return dt.astimezone(JST).strftime("%Y%m%dT%H%M%S")


VTIMEZONE_ASIA_TOKYO = [
    "BEGIN:VTIMEZONE",
    "TZID:Asia/Tokyo",
    "X-LIC-LOCATION:Asia/Tokyo",
    "BEGIN:STANDARD",
    "TZOFFSETFROM:+0900",
    "TZOFFSETTO:+0900",
    "TZNAME:JST",
    "DTSTART:19700101T000000",
    "END:STANDARD",
    "END:VTIMEZONE",
]


def build_ics(events: List[CalEvent], cal_name: str) -> str:
    lines: List[str] = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//shimajima-eiji//connpass-atom-ics//JA",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        f"X-WR-CALNAME:{ics_escape(cal_name)}",
    ]
    lines += VTIMEZONE_ASIA_TOKYO

    dtstamp = fmt_dtstamp_utc()

    for ev in events:
        desc_parts = [p for p in [ev.summary.strip(), ev.url] if p]
        description = "\n\n".join(desc_parts)

        vevent_lines: List[str] = [
            "BEGIN:VEVENT",
            f"UID:{ics_escape(ev.uid)}",
            f"DTSTAMP:{dtstamp}",
            f"DTSTART;TZID=Asia/Tokyo:{fmt_dt_jst(ev.started_at)}",
            f"DTEND;TZID=Asia/Tokyo:{fmt_dt_jst(ev.ended_at)}",
            f"SUMMARY:{ics_escape(ev.title)}",
            f"DESCRIPTION:{ics_escape(description)}",
            f"URL:{ics_escape(ev.url)}",
            "END:VEVENT",
        ]

        for ln in vevent_lines:
            lines.extend(ics_fold_line(ln))

    lines.append("END:VCALENDAR")
    return "\r\n".join(lines) + "\r\n"


# ---------------------------------------------------------------------------
# エントリポイント
# ---------------------------------------------------------------------------

def main() -> int:
    feeds_path = os.getenv("FEEDS_YML", "feeds.yml")
    out_dir = os.getenv("OUT_DIR", "docs")
    os.makedirs(out_dir, exist_ok=True)

    feeds = load_feeds_yml(feeds_path)
    if not feeds:
        die("feeds.yml に feeds がありません。")

    api_key = os.getenv("CONNPASS_API_KEY", "").strip()
    print(f"connpass source: {'API v2 (key あり)' if api_key else 'Atom (key なし)'}")

    total = 0
    generated: List[Dict[str, Any]] = []
    for feed in feeds:
        key = safe_slug(str(feed.get("key") or ""))
        name = str(feed.get("name") or key)
        subdomain = str(feed.get("subdomain") or "").strip()

        if not subdomain:
            print(f"SKIP {key}: subdomain 未指定", file=sys.stderr)
            continue

        # API キーがあれば API v2、無ければ／失敗時は Atom を使う。
        source = "atom"
        if api_key:
            try:
                events = fetch_api(subdomain, api_key)
                source = "api"
            except Exception as ex:  # noqa: BLE001
                print(f"WARN {key}: API 取得失敗のため Atom にフォールバック: {ex}", file=sys.stderr)
                events = fetch_atom(subdomain)
        else:
            events = fetch_atom(subdomain)

        ics = build_ics(events, cal_name=name)
        out_path = os.path.join(out_dir, f"{key}.ics")
        with open(out_path, "w", encoding="utf-8", newline="") as f:
            f.write(ics)

        print(f"OK  {key}: {len(events)} events [{source}] -> {out_path}")
        total += len(events)
        generated.append({"key": key, "name": name, "events": len(events), "source": source})

    # トップページ（index.html）が動的に読み込む一覧。
    # feeds.yml を更新すれば自動で追従し、HTML を手で直す必要がない。
    feeds_json_path = os.path.join(out_dir, "feeds.json")
    with open(feeds_json_path, "w", encoding="utf-8") as f:
        json.dump(
            {
                "generated_at": datetime.now(timezone.utc).isoformat(),
                "feeds": generated,
            },
            f,
            ensure_ascii=False,
            indent=2,
        )
        f.write("\n")
    print(f"OK  feeds.json -> {feeds_json_path}")

    print(f"---\ntotal: {total} events")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
