# shimajima-eiji.github.io

GitHub Pages のルート。`docs/` を公開している。

- 公開ページ: https://shimajima-eiji.github.io/
  - トップ … カレンダー購読 (ICS) 一覧
  - `/apps.html` … AI で作ったミニアプリ集

## カレンダー (ICS) 配信

| ファイル | 中身 | 生成 |
|----------|------|------|
| `docs/{key}.ics` | connpass グループのイベント | `update-ics.yml`（毎日 + 手動） |
| `docs/github-issues.ics` | Issue 本文の `due:` を締切予定に | `update-issues-ics.yml`（毎日 + Issue 変更時） |
| `docs/feeds.json` | トップページが読む connpass 一覧 | 上記と同時生成 |

### connpass グループを増やす

`feeds.yml` に追記するだけ。ICS 生成もトップページ掲載も自動で追従する。

```yaml
  - key: jawsug-tokyo          # 配信ファイル名 → /jawsug-tokyo.ics
    name: "JAWS-UG Tokyo"
    subdomain: "jawsug-tokyo"  # {subdomain}.connpass.com
```

### Issue に締切を付ける

Issue 本文のどこかに `due: 2026-07-01` と書くと、終日予定として配信される（過去日は自動除外）。

### connpass の取得方式（Atom / API v2）

- 既定は **Atom 方式**（API キー不要・直近数件）。
- リポジトリ Secret `CONNPASS_API_KEY` を設定すると **API v2** に切り替わり、今月〜数ヶ月先のイベントをまとめて取得する。キーが無い／取得失敗時は自動で Atom にフォールバックする。
- API キーは connpass の公式サポートへの申請で取得する。

## 開発

```sh
python scripts/generate_all_ics.py     # connpass ICS + feeds.json
python scripts/generate_issues_ics.py  # Issues ICS（GH_TOKEN / GITHUB_REPOSITORY が必要）
python scripts/validate.py             # 静的検査 + 自己テスト（CI と同じ）
```

CI（`ci.yml`）は PR と `main` 以外への push で `validate.py` を実行する。
スケジュールジョブが失敗すると `ci-failure` ラベルの Issue が自動で起票される。
