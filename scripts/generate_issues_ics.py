#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
GitHub Issues の本文に書かれた due: YYYY-MM-DD を読み取り ICS を生成する。

目的:
    Issue 本文に「due: 2026-03-15」と書くだけで Google カレンダーに
    締切として表示されるようにする。GitHub Pages 経由で購読可能にする。

使い方:
    GH_TOKEN=xxx GITHUB_REPOSITORY=owner/repo python scripts/generate_issues_ics.py

環境変数:
    GH_TOKEN            (必須) GitHub Personal Access Token または GITHUB_TOKEN
    GITHUB_REPOSITORY   (必須) owner/repo 形式
    OUT_DIR             出力先ディレクトリ（デフォルト: docs）
    OUT_FILE            出力ファイル名（デフォルト: github-issues.ics）

Issue 本文のフォーマット:
    本文のどこかに以下を記載する。
        due: 2026-03-15
    時刻なし = 終日イベントとして扱う。
    due: がない Issue は ICS に含めない。
"""

from __future__ import annotations

import json
import os
import re
import sys
import urllib.request
from datetime import date, datetime, timezone
from typing import Any, Dict, List, Optional

GH_API = "https://api.github.com"

_DUE_PATTERN = re.compile(r"^\s*due\s*:\s*(\d{4}-\d{2}-\d{2})\s*$", re.MULTILINE | re.IGNORECASE)


# ---------------------------------------------------------------------------
# ユーティリティ
# ---------------------------------------------------------------------------

def die(msg: str, code: int = 2) -> None:
    print(f"ERROR: {msg}", file=sys.stderr)
    raise SystemExit(code)


def fmt_dtstamp_utc() -> str:
    return datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")


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


# ---------------------------------------------------------------------------
# GitHub API
# ---------------------------------------------------------------------------

def gh_get(path: str, token: str) -> Any:
    url = f"{GH_API}{path}"
    req = urllib.request.Request(url, method="GET")
    req.add_header("Authorization", f"Bearer {token}")
    req.add_header("Accept", "application/vnd.github+json")
    req.add_header("X-GitHub-Api-Version", "2022-11-28")
    req.add_header("User-Agent", "github-issues-ics/1.0")

    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        try:
            detail = e.read().decode("utf-8", errors="replace")
        except Exception:
            detail = ""
        die(f"GitHub API HTTP {e.code}: {path}\n{detail[:400]}")
    except urllib.error.URLError as e:
        die(f"GitHub API URL error: {e}")


def fetch_open_issues(repo: str, token: str) -> List[Dict[str, Any]]:
    """open な Issues を全件取得（PR は除外）。"""
    issues: List[Dict[str, Any]] = []
    page = 1
    while True:
        path = f"/repos/{repo}/issues?state=open&per_page=100&page={page}"
        data = gh_get(path, token)
        if not isinstance(data, list) or not data:
            break
        for item in data:
            # PR は pull_request キーを持つ
            if "pull_request" not in item:
                issues.append(item)
        if len(data) < 100:
            break
        page += 1
    return issues


# ---------------------------------------------------------------------------
# due: パース
# ---------------------------------------------------------------------------

def extract_due(body: str) -> Optional[date]:
    """Issue 本文から due: YYYY-MM-DD を抽出する。"""
    if not body:
        return None
    m = _DUE_PATTERN.search(body)
    if not m:
        return None
    try:
        return date.fromisoformat(m.group(1))
    except ValueError:
        return None


# ---------------------------------------------------------------------------
# ICS 生成
# ---------------------------------------------------------------------------

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


def build_ics(issues: List[Dict[str, Any]], cal_name: str, repo: str) -> str:
    lines: List[str] = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        f"PRODID:-//shimajima-eiji//github-issues-ics//JA",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        f"X-WR-CALNAME:{ics_escape(cal_name)}",
    ]
    lines += VTIMEZONE_ASIA_TOKYO

    dtstamp = fmt_dtstamp_utc()
    count = 0

    for issue in issues:
        body = issue.get("body") or ""
        due = extract_due(body)
        if due is None:
            continue
        if due < date.today():
            continue

        number = issue.get("number", 0)
        title = (issue.get("title") or "").strip() or f"Issue #{number}"
        html_url = issue.get("html_url") or f"https://github.com/{repo}/issues/{number}"
        uid = f"github-issue-{repo.replace('/', '-')}-{number}@github.com"

        # 終日イベント（VALUE=DATE）
        dtstart = due.strftime("%Y%m%d")
        # 終日イベントの DTEND は翌日
        from datetime import timedelta
        dtend = (due + timedelta(days=1)).strftime("%Y%m%d")

        vevent_lines: List[str] = [
            "BEGIN:VEVENT",
            f"UID:{ics_escape(uid)}",
            f"DTSTAMP:{dtstamp}",
            f"DTSTART;VALUE=DATE:{dtstart}",
            f"DTEND;VALUE=DATE:{dtend}",
            f"SUMMARY:{ics_escape(f'#{number} {title}')}",
            f"URL:{ics_escape(html_url)}",
            f"DESCRIPTION:{ics_escape(html_url)}",
            "END:VEVENT",
        ]

        for ln in vevent_lines:
            lines.extend(ics_fold_line(ln))

        count += 1

    lines.append("END:VCALENDAR")
    print(f"  due あり: {count} / {len(issues)} issues")
    return "\r\n".join(lines) + "\r\n"


# ---------------------------------------------------------------------------
# エントリポイント
# ---------------------------------------------------------------------------

def main() -> int:
    token = os.getenv("GH_TOKEN", "").strip()
    if not token:
        die("GH_TOKEN が未設定です。")

    repo = os.getenv("GITHUB_REPOSITORY", "").strip()
    if not repo or "/" not in repo:
        die("GITHUB_REPOSITORY が未設定または不正です（owner/repo 形式で指定）。")

    out_dir = os.getenv("OUT_DIR", "docs")
    out_file = os.getenv("OUT_FILE", "github-issues.ics")
    os.makedirs(out_dir, exist_ok=True)

    cal_name = f"GitHub Issues ({repo})"

    print(f"Fetching open issues: {repo}")
    issues = fetch_open_issues(repo, token)
    print(f"  取得: {len(issues)} issues")

    ics = build_ics(issues, cal_name=cal_name, repo=repo)

    out_path = os.path.join(out_dir, out_file)
    with open(out_path, "w", encoding="utf-8", newline="") as f:
        f.write(ics)

    print(f"OK  -> {out_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
