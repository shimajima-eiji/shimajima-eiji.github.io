# 公開確認 — 2026-09-05 JST

実装コミット: `935cff02b053b79d7a654abc5a416379370982ad`。
後続変更は重複した同値のTypeScript設定キーの整理と検証用User-Agentの明示、本文書のみ。

- `npm run build`: 型検査とVite本番ビルド成功。
- `npm test`: 4件成功。固定局面でユーザー履歴のみを変え、選ばれる合法手が変化するA/Bを含む。
- `npm audit`: 修正版Vite 8.2.2導入後 0 vulnerabilities。
- `python3 scripts/validate.py`: 既存サイト・ICS自己テスト PASSED。
- `python3 tests/api-check.py`: ローカル成功。
- 同スクリプトの公開Workers URL指定: 成功。同意・CSRF・合法性・別ID隔離・独立Cookie jar間ログイン/途中再開・競合・待った・削除・全セッション失効。
- 公開入口 `/games/` HTTP200、ゲームURLのリンクを確認。プロフィールの `/games/` リンクも確認。
- 実ブラウザで公開URLの盤面表示、非ログイン e2→e4、コンピューター Nc6、同意後の「保存済み」、新しい盤面から2手の棋譜の再開を確認。
- 公開版の通信はアプリ側のno-storeヘッダーを確認。資格情報・棋譜本文をログ出力する処理はない。

初回Cloudflare version: `80bb33eb-ec66-4fe3-adf9-069e79020694`。
専用D1: `aba81da6-54cc-4c58-bf7d-1a50fd782be2`、対象アカウント `b7c850847e8b19ce4f034620e417b145`。

Python標準User-Agentは公開環境で403になったため、検証ツール名をUser-Agentに明示した。ブラウザとcurlはアクセス成功。サービス側のアクセス制御は変更していない。

限界: 本人の癖に応手が変わる機構を検証した。実ユーザーに適切な難易度になることや棋力向上は未実証。実端末2台の操作テストではなく、APIの独立Cookie jarで端末間共有を検証している。
