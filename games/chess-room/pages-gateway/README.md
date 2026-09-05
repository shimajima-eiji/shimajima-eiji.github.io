# nomuraya Games — is-a.dev 用の接続先

公開URL: https://nomuraya-games.pages.dev/
希望ドメイン: nomuraya.is-a.dev（未取得・申請PRはユーザーが作成）

Cloudflare Pages のカスタムドメインを使う。既存の `nomuraya-chess-room` Worker を固定の `GAME` Service Binding から呼び出す。任意URLへの転送機能はない。ユーザーのブラウザからは同一オリジンで画面・APIへアクセスし、OriginとCookieを維持する。D1・API認証・棋譜保存は既存Workerが担当する。

- `/`: 非商用の個人開発ゲーム一覧
- `/dai-shogi/`: 大将棋
- `/chess/`: チェス（既存Workerの `/` に内部転送）
- `/api/*` とゲームの静的ファイル: 既存Workerへ接続

## DNS接続値

- 取得名: `nomuraya.is-a.dev`
- DNS種類: `CNAME`
- DNS接続先: `nomuraya-games.pages.dev`（スキーム・パスなし）
- GitHubの個人所有者: `shimajima-eiji`

2026-09-05、is-a-dev/register の domains/nomuraya.json は404、nomurayaを含む公開中の申請PRは0件を確認。これは名前の予約・取得完了を意味しない。

Cloudflare側には希望ドメインを登録済み。API応答は initializing / verification pending。実際のDNS委任と証明書発行は未完了。is-a.dev の規約第5項により申請PRは人間が作成する。AIによるfork、申請ファイル・PR本文の生成、PR投稿は行っていない。ユーザーは公式クイックスタートと申請テンプレートに従い、上記接続値を入力し、実際の公開ページのURLとスクリーンショットを添付する。

公式手順:
- https://docs.is-a.dev/quickstart/
- https://docs.is-a.dev/guides/cloudflare-pages/
- https://github.com/is-a-dev/register

## デプロイ

Pages設定では account_id は使用不可。認証に使用するアカウントを環境変数で明示し、必ず `shimajima-eiji` アカウント `b7c850847e8b19ce4f034620e417b145` への接続を確認する。既存のグローバルOAuthをそのまま使用しない。設定ディレクトリで認証済みWranglerを実行する。

```sh
cd games/chess-room/pages-gateway
npx wrangler pages deploy public --project-name nomuraya-games --branch main
```

通常のゲーム更新は既存Workerのデプロイだけで反映される。こちらの一覧・Service Binding変更時だけPagesを更新する。追加の有料契約は作成していない。利用量にはCloudflareアカウントの既存制限が適用される。

## 検証 2026-09-05

- JS構文確認成功。Pages公開ルート・チェス・大将棋・healthが200。
- Pages経由で tests/dai-api-check.py 成功。棋譜保存・ユーザー隔離・ゲーム種別隔離・不正手拒否・更新競合・別Cookieでのログイン再開・履歴削除・アカウント失効を確認。テスト用アカウントのみ使用。
- ブラウザで一覧→大将棋→プライベート→歩兵8kから8jを確認。
- 別ドメインのCookieは自動移行されない。既存アカウントは元URLで発行した引き継ぎコードでログインする。
- is-a.dev の申請承認、DNS到達、HTTPS、最終ドメインでのブラウザ確認は今後の工程。
