#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
connpass グループの Atom フィード（または API v2）から ICS を生成する。

目的:
    feeds.yml に列挙した connpass グループのイベント情報を取得し、
    docs/{key}.ics として出力する。GitHub Pages で配信することで
    カレンダーアプリから購読可能にする。
    あわせて docs/feeds.json（フィード一覧のマニフェスト）も出力する。

    デフォルトは API キー不要の Atom 方式（{subdomain}.connpass.com/ja.atom）。
    環境変数 CONNPASS_API_KEY が設定されている場合のみ、より多件数を
    取得できる connpass API v2 を試み、失敗時は自動的に Atom 方式へ
    フォールバックする（Atom 方式が唯一の安定動作パスであるため）。

使い方:
    python scripts/generate_all_ics.py

環境変数:
    FEEDS_YML          feeds.yml のパス（デフォルト: feeds.yml）
    OUT_DIR            出力先ディレクトリ（デフォルト: docs）
    CONNPASS_API_KEY   connpass API v2 のAPIキー（任意。未設定なら Atom 方式のみ）
"""

from __future__ import annotations

import json
import os
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from dataclasses import dataclass
from datetime import datetime, timezone
from zoneinfo import ZoneInfo
from typing import Any, Dict, List, Optional

JST = ZoneInfo("Asia/Tokyo")
ATOM_NS = "http://www.w3.org/2005/Atom"


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
    req.add_header("User-Agent", "connpass-ics-generator/2.0")

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
# connpass API v2 取得（CONNPASS_API_KEY 設定時のみ試行）
# ---------------------------------------------------------------------------

def _connpass_ym_range(months_ahead: int = 6) -> List[str]:
    """今月から months_ahead ヶ月先までの YYYYMM リストを返す。"""
    now = datetime.now(JST)
    y, m = now.year, now.month
    out: List[str] = []
    for _ in range(months_ahead + 1):
        out.append(f"{y:04d}{m:02d}")
        m += 1
        if m > 12:
            m = 1
            y += 1
    return out


def fetch_api_v2(subdomain: str, api_key: str) -> List[CalEvent]:
    """
    connpass API v2 (https://connpass.com/api/v2/events/) からイベント一覧を取得する。

    認証は X-API-Key ヘッダー。取得期間は今月から6ヶ月先まで（ym パラメータを
    複数指定して絞り込む）。

    注意: connpass API v2 のグループ検索パラメータの正確な仕様は非公開のため、
    グループの subdomain を "series_nickname" として渡すベストエフォート実装。
    HTTPエラーや JSON パースエラーなど、何が起きてもここでは握りつぶさず
    例外を送出する。呼び出し元（fetch_events）が Atom 方式へフォールバックする。
    """
    base_url = "https://connpass.com/api/v2/events/"
    ym_values = _connpass_ym_range(months_ahead=6)

    events: List[CalEvent] = []
    start = 1
    count = 100
    max_pages = 10  # 無限ループ防止の安全上限

    for _ in range(max_pages):
        query: List[tuple[str, str]] = [
            ("series_nickname", subdomain),
            ("count", str(count)),
            ("start", str(start)),
        ]
        query += [("ym", ym) for ym in ym_values]
        url = f"{base_url}?{urllib.parse.urlencode(query)}"

        req = urllib.request.Request(url, method="GET")
        req.add_header("X-API-Key", api_key)
        req.add_header("User-Agent", "connpass-ics-generator/2.0")

        with urllib.request.urlopen(req, timeout=30) as resp:
            body = resp.read()

        data = json.loads(body)
        results = data.get("events") or []

        for item in results:
            uid = str(item.get("id") or item.get("url") or "").strip()
            title = str(item.get("title") or "").strip()
            url_href = str(item.get("url") or "").strip()
            started_raw = item.get("started_at")
            if not uid or not title or not url_href or not started_raw:
                continue

            started_at = parse_iso_datetime(str(started_raw))
            ended_raw = item.get("ended_at")
            if ended_raw:
                ended_at = parse_iso_datetime(str(ended_raw))
            else:
                ended_at = started_at.replace(hour=min(started_at.hour + 1, 23))

            updated_raw = item.get("updated_at") or started_raw
            published = parse_iso_datetime(str(updated_raw))
            summary = str(item.get("description") or item.get("catch") or "")

            events.append(CalEvent(
                uid=uid,
                title=title,
                url=url_href,
                published=published,
                started_at=started_at,
                ended_at=ended_at,
                summary=summary,
            ))

        results_available = int(data.get("results_available") or 0)
        results_returned = int(data.get("results_returned") or len(results))
        results_start = int(data.get("results_start") or start)

        if results_returned <= 0:
            break
        if results_start + results_returned - 1 >= results_available:
            break
        start += results_returned

    return events


def fetch_events(subdomain: str, api_key: str) -> tuple[List[CalEvent], str]:
    """
    フィード1件分のイベント一覧を取得する。

    CONNPASS_API_KEY が設定されていれば API v2 (fetch_api_v2) を試み、
    何らかの理由で失敗した場合は必ず既存の Atom 方式 (fetch_atom) に
    フォールバックする。戻り値は (events, source)。source は "api" または "atom"。
    """
    if api_key:
        try:
            events = fetch_api_v2(subdomain, api_key)
            return events, "api"
        except Exception as e:  # noqa: BLE001 - 何が起きても Atom にフォールバックする
            print(
                f"WARN {subdomain}: connpass API v2 の取得に失敗したため Atom 方式にフォールバックします ({e})",
                file=sys.stderr,
            )

    return fetch_atom(subdomain), "atom"


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
    api_key = os.getenv("CONNPASS_API_KEY", "").strip()
    os.makedirs(out_dir, exist_ok=True)

    feeds = load_feeds_yml(feeds_path)
    if not feeds:
        die("feeds.yml に feeds がありません。")

    total = 0
    manifest_feeds: List[Dict[str, Any]] = []
    for feed in feeds:
        key = safe_slug(str(feed.get("key") or ""))
        name = str(feed.get("name") or key)
        subdomain = str(feed.get("subdomain") or "").strip()

        if not subdomain:
            print(f"SKIP {key}: subdomain 未指定", file=sys.stderr)
            continue

        events, source = fetch_events(subdomain, api_key)

        ics = build_ics(events, cal_name=name)
        out_path = os.path.join(out_dir, f"{key}.ics")
        with open(out_path, "w", encoding="utf-8", newline="") as f:
            f.write(ics)

        print(f"OK  {key}: {len(events)} events -> {out_path} (source={source})")
        total += len(events)

        manifest_feeds.append({
            "key": key,
            "name": name,
            "events": len(events),
            "source": source,
        })

    feeds_json_path = os.path.join(out_dir, "feeds.json")
    manifest = {
        "generated_at": datetime.now(timezone.utc).replace(microsecond=0).isoformat(),
        "feeds": manifest_feeds,
    }
    with open(feeds_json_path, "w", encoding="utf-8", newline="") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)
        f.write("\n")

    print(f"OK  feeds.json -> {feeds_json_path}")
    print(f"---\ntotal: {total} events")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
