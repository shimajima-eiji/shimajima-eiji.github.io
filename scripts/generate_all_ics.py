#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
connpass API v2 から複数団体分の ICS を生成する。

目的:
    feeds.yml に列挙した団体のイベントを connpass API から取得し、
    docs/{key}.ics として出力する。GitHub Pages で配信することで
    カレンダーアプリから購読可能にする。

使い方:
    CONNPASS_API_KEY=xxx python scripts/generate_all_ics.py

環境変数:
    CONNPASS_API_KEY          (必須) connpass API v2 キー
    FEEDS_YML                 feeds.yml のパス（デフォルト: feeds.yml）
    OUT_DIR                   出力先ディレクトリ（デフォルト: docs）
    CONNPASS_COUNT            1リクエストの最大取得件数 (1-100, デフォルト: 100)
    CONNPASS_RANGE_DAYS_AHEAD 何日先まで取得するか（デフォルト: 365）
    CONNPASS_RANGE_DAYS_BACK  何日前まで取得するか（デフォルト: 0）
"""

from __future__ import annotations

import json
import os
import re
import sys
import urllib.parse
import urllib.request
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo
from typing import Any, Dict, List, Optional

API_ENDPOINT = "https://connpass.com/api/v2/events/"
JST = ZoneInfo("Asia/Tokyo")


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

    def parse_list_value(v: str) -> List[Any]:
        v = v.strip()
        if not (v.startswith("[") and v.endswith("]")):
            return []
        inner = v[1:-1].strip()
        if not inner:
            return []
        parts = [p.strip() for p in inner.split(",")]
        out: List[Any] = []
        for p in parts:
            p = p.strip().strip("'").strip('"')
            if re.fullmatch(r"-?\d+", p):
                out.append(int(p))
            else:
                out.append(p)
        return out

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
            k = k.strip()
            v = v.strip()
            if v.startswith("[") and v.endswith("]"):
                cur[k] = parse_list_value(v)
            else:
                vv = v.strip().strip("'").strip('"')
                if re.fullmatch(r"-?\d+", vv):
                    cur[k] = int(vv)
                else:
                    cur[k] = vv

    if cur:
        feeds.append(cur)
    return feeds


# ---------------------------------------------------------------------------
# データクラス
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class ConnpassEvent:
    event_id: int
    title: str
    event_url: str
    started_at: datetime   # tz-aware JST
    ended_at: datetime     # tz-aware JST
    place: str
    address: str
    catch: str
    description: str

    @property
    def location(self) -> str:
        p = (self.place or "").strip()
        a = (self.address or "").strip()
        if p and a and a not in p:
            return f"{p} {a}"
        return p or a


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


# ---------------------------------------------------------------------------
# connpass API
# ---------------------------------------------------------------------------

def http_get_json(url: str, api_key: str) -> Dict[str, Any]:
    req = urllib.request.Request(url, method="GET")
    req.add_header("X-API-Key", api_key)
    req.add_header("User-Agent", "multi-ics-generator/1.0")
    req.add_header("Accept", "application/json")

    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        try:
            detail = e.read().decode("utf-8", errors="replace")
        except Exception:
            detail = ""
        if e.code in (401, 403):
            die(f"API 認証に失敗 (HTTP {e.code}). CONNPASS_API_KEY を確認。詳細: {detail[:400]}")
        die(f"HTTPError (HTTP {e.code}): {detail[:400]}")
    except urllib.error.URLError as e:
        die(f"URL error: {e}")
    except json.JSONDecodeError as e:
        die(f"JSON decode error: {e}")


def to_int_list(x: Any) -> List[int]:
    if x is None:
        return []
    if isinstance(x, int):
        return [x]
    if isinstance(x, list):
        out = []
        for v in x:
            if isinstance(v, int):
                out.append(v)
            elif isinstance(v, str) and re.fullmatch(r"\d+", v.strip()):
                out.append(int(v.strip()))
            else:
                die(f"ID 配列に数値以外が混入: {v!r}")
        return out
    if isinstance(x, str):
        x = x.strip()
        return [int(x)] if x else []
    die(f"ID 指定の型が不正: {type(x)}")


def build_query_params(feed: Dict[str, Any], count: int, order: int) -> Dict[str, str]:
    params: Dict[str, str] = {
        "count": str(max(1, min(count, 100))),
        "order": str(order),
    }

    subdomain = str(feed.get("subdomain") or "").strip()
    keyword = str(feed.get("keyword") or "").strip()
    group_ids = to_int_list(feed.get("group_id"))
    event_ids = to_int_list(feed.get("event_id"))

    if subdomain:
        params["subdomain"] = subdomain
    if group_ids:
        params["group_id"] = ",".join(str(x) for x in group_ids)
    if event_ids:
        params["event_id"] = ",".join(str(x) for x in event_ids)
    if keyword:
        params["keyword"] = keyword

    if not (subdomain or group_ids or event_ids or keyword):
        die(
            f"フィルタ未指定: key={feed.get('key')!r}"
            "（subdomain / group_id / event_id / keyword のどれか必須）"
        )
    return params


def fetch_events(
    api_key: str,
    feed: Dict[str, Any],
    count: int = 100,
    days_back: int = 0,
    days_ahead: int = 365,
    order: int = 2,
) -> List[ConnpassEvent]:
    params = build_query_params(feed, count=count, order=order)
    url = f"{API_ENDPOINT}?{urllib.parse.urlencode(params)}"
    data = http_get_json(url, api_key=api_key)

    raw_events = data.get("events")
    if not isinstance(raw_events, list):
        die(f"API レスポンス形式が想定外。keys={list(data.keys())}")

    now_jst = datetime.now(JST)
    window_start = now_jst - timedelta(days=days_back)
    window_end = now_jst + timedelta(days=days_ahead)

    out: List[ConnpassEvent] = []
    for ev in raw_events:
        if not isinstance(ev, dict):
            continue
        try:
            started = parse_iso_datetime(str(ev.get("started_at", ""))).astimezone(JST)
            ended = parse_iso_datetime(str(ev.get("ended_at", ""))).astimezone(JST)
        except Exception:
            continue

        if not (window_start <= started <= window_end):
            continue

        eid = ev.get("event_id")
        if eid is None:
            continue
        try:
            event_id_int = int(eid)
        except Exception:
            continue

        title = str(ev.get("title") or "").strip() or f"connpass event {event_id_int}"
        event_url = str(
            ev.get("event_url") or ev.get("public_url") or ev.get("url") or ""
        ).strip() or f"https://connpass.com/event/{event_id_int}/"

        out.append(
            ConnpassEvent(
                event_id=event_id_int,
                title=title,
                event_url=event_url,
                started_at=started,
                ended_at=ended,
                place=str(ev.get("place") or "").strip(),
                address=str(ev.get("address") or "").strip(),
                catch=str(ev.get("catch") or "").strip(),
                description=str(ev.get("description") or "").strip(),
            )
        )

    out.sort(key=lambda x: x.started_at)
    return out


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


def fmt_dt_jst(dt: datetime) -> str:
    return dt.astimezone(JST).strftime("%Y%m%dT%H%M%S")


def fmt_dtstamp_utc() -> str:
    return datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")


def html_to_text(s: str) -> str:
    if not s:
        return ""
    s = s.replace("<br>", "\n").replace("<br/>", "\n").replace("<br />", "\n")
    s = re.sub(r"<[^>]+>", " ", s)
    s = re.sub(r"[ \t]+\n", "\n", s)
    s = re.sub(r"\n{3,}", "\n\n", s)
    return s.strip()


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


def build_ics(events: List[ConnpassEvent], cal_name: str) -> str:
    lines: List[str] = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//shimajima-eiji//multi-connpass-ics//JA",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        f"X-WR-CALNAME:{ics_escape(cal_name)}",
    ]
    lines += VTIMEZONE_ASIA_TOKYO

    dtstamp = fmt_dtstamp_utc()

    for ev in events:
        host = urllib.parse.urlparse(ev.event_url).hostname or "connpass.com"
        uid = f"connpass-{ev.event_id}@{host}"

        desc_parts = [p for p in [ev.catch, html_to_text(ev.description), ev.event_url] if p]
        description = "\n\n".join(desc_parts)

        vevent_lines: List[str] = [
            "BEGIN:VEVENT",
            f"UID:{ics_escape(uid)}",
            f"DTSTAMP:{dtstamp}",
            f"DTSTART;TZID=Asia/Tokyo:{fmt_dt_jst(ev.started_at)}",
            f"DTEND;TZID=Asia/Tokyo:{fmt_dt_jst(ev.ended_at)}",
            f"SUMMARY:{ics_escape(ev.title)}",
        ]
        if ev.location:
            vevent_lines.append(f"LOCATION:{ics_escape(ev.location)}")
        vevent_lines.append(f"DESCRIPTION:{ics_escape(description)}")
        vevent_lines.append(f"URL:{ics_escape(ev.event_url)}")
        vevent_lines.append("END:VEVENT")

        for ln in vevent_lines:
            lines.extend(ics_fold_line(ln))

    lines.append("END:VCALENDAR")
    return "\r\n".join(lines) + "\r\n"


# ---------------------------------------------------------------------------
# エントリポイント
# ---------------------------------------------------------------------------

def main() -> int:
    api_key = os.getenv("CONNPASS_API_KEY", "").strip()
    if not api_key:
        die("CONNPASS_API_KEY が未設定です。")

    feeds_path = os.getenv("FEEDS_YML", "feeds.yml")
    out_dir = os.getenv("OUT_DIR", "docs")
    count = int(os.getenv("CONNPASS_COUNT", "100"))
    days_ahead = int(os.getenv("CONNPASS_RANGE_DAYS_AHEAD", "365"))
    days_back = int(os.getenv("CONNPASS_RANGE_DAYS_BACK", "0"))

    os.makedirs(out_dir, exist_ok=True)

    feeds = load_feeds_yml(feeds_path)
    if not feeds:
        die("feeds.yml に feeds がありません。")

    total = 0
    for feed in feeds:
        key = safe_slug(str(feed.get("key") or ""))
        name = str(feed.get("name") or key)

        events = fetch_events(
            api_key=api_key,
            feed=feed,
            count=count,
            days_back=days_back,
            days_ahead=days_ahead,
        )

        ics = build_ics(events, cal_name=name)
        out_path = os.path.join(out_dir, f"{key}.ics")
        with open(out_path, "w", encoding="utf-8", newline="") as f:
            f.write(ics)

        print(f"OK  {key}: {len(events)} events -> {out_path}")
        total += len(events)

    print(f"---\ntotal: {total} events")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
