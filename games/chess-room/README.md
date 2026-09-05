# Chess Room / 大将棋

誰でも遊べるチェス。匿名での記録は任意。公開コードと私的な棋譜を分離する。

- 入口: https://shimajima-eiji.github.io/games/
- ゲーム: https://nomuraya-chess-room.shimajima-eiji.workers.dev/
- React / chess.js / Vite、Cloudflare Workers Static Assets と D1。
- Cloudflare account: `b7c850847e8b19ce4f034620e417b145` (shimajima-eiji)。別アカウントの ambient OAuth を使わない。

## 開発・検証

Node.js 22.18+、npm、Python 3。

```sh
npm ci
npm run build
npm test
npx wrangler d1 migrations apply nomuraya-chess-room --local
npm run preview
# 別ターミナル（テスト専用IDを作成・削除する）
python3 tests/api-check.py
```

本番更新は対象アカウントの認証を確認し、明示的なリリース時だけ実行する。

```sh
npx wrangler d1 migrations apply nomuraya-chess-room --remote
npm run deploy
```

ルートの `python3 scripts/validate.py` も実行する。認証情報を設定ファイルやコードへ書かない。

## 個人への適応

2手先の評価を基礎に、本人のコンピューター戦で白が選んだ合法手を局面別に集計する。
同じ局面で2回以上の観測があれば、最悪応手の評価と観測頻度に基づく期待評価を混ぜる（重み上限0.65）。
候補は基準の最善評価から40〜120点以内に限定し、最近の勝敗でその幅を調整する。
未観測局面では基礎の探索を使う。自己対戦、他人の棋譜の混入、外部LLM、定期学習ジョブはない。
これは局面別の相手モデルであり、ニューラルネット学習や棋力向上の実証ではない。違う局面への一般化は未対応。
入門用の浅い探索なので強さは限定的。ユーザーの棋力推定は今後の実対局で評価する必要がある。

## データ・ログイン

- 「この対局を記録・学習する」で棋譜・モード・結果・時刻を非公開D1に保存。
- 192ビットのランダムな引き継ぎコードがログイン資格情報。DBにはSHA-256のみ。再発行は旧コードを無効化する。
- セッションも192ビット。HttpOnly / Secure(HTTPS) / SameSite=Strict Cookie。90日で失効。
- 別端末でコードを入力し「続きを再開」を押すと、同じ棋譜を再生して再開。最新1対局をUIから再開できる。
- 競合はrevisionで拒否。棋譜はサーバーでも合法性を検証。「待った」は現行棋譜を置き換え、学習件数を水増ししない。
- 学習は更新から90日以内の最新50対局。古い棋譜は新規対局作成時に最大50件ずつ削除。定期消去ではない。
- 履歴削除、アカウント削除（全セッション失効）を提供。ログアウトやコード発行時は記録が停止する。
- 生IP、名前、メール、引き継ぎコードの平文を棋譜DBへ保存しない。Workers observabilityは無効。
- IPの日替わりハッシュをCloudflare Rate Limitへ渡す。API90回/分、認証操作10回/分、本人の新規保存100対局/日、棋譜500手まで。
- コード紛失後の本人確認・回復窓口、メール/OAuth、端末一覧・個別失効は未実装。コードを保管すること。

## 検証範囲

`tests/chess.test.mjs`: 合法手・特殊手・引き分け、詰み、探索後の盤面維持、個人モデルのA/B。
`tests/api-check.py`: 同意、CSRF、合法性、別ID隔離、2つのCookie jar間のログイン・途中再開、競合、待った、削除、全端末失効。

## 大将棋 (dai-v1)

- 公開パス `/dai-shogi/`、ソース `src/dai/`。`dai-shogi/index.html` を同じViteビルドで配信。
- ルールと出典は [RULES.md](src/dai/RULES.md)。全29初期駒種、成り駒を含め36の動き（玉将と太子を別IDとすると37種）を定義。
- UIは合法手表示、獅子/角鷹/飛鷲の経路選択と任意成り、待った、盤面反転・拡大、2人対戦に対応。
- コンピューターは全候補の次の駒取りを調べる入門向け。Web Workerで実行し、8秒で簡易応手へ切り替える。
- 相手モデルは同じ局面の先手の手。2回以上観測した場合に予想損失へ重み上限0.5で反映。局面キーはコンパクトな64bitダイジェスト（認証・同一局面ルール判定には不使用）。
- `/api/dai/*` が専用API。棋譜テーブルはmigration 0002でvariant列を追加し、既存行はchess。プロフィール・履歴削除・棋譜IDアクセスをvariantで隔離。
- アカウント・引き継ぎコード・ログインCookieはチェスと共通。アカウント削除は両ゲーム・全端末に作用することを画面で明示。
- 最大2000手、リクエスト128KiB。履歴は全指し手をルールエンジンで再生して検証。短い棋譜での本番保存だけで長時間対局の負荷保証はしない。
- `node --test tests/dai.test.mjs` と `python3 tests/dai-api-check.py` が専用検証。後者は専用テストIDを作成して削除する。任意の本番URLを引数で明示できる。
- 大将棋のルール解釈を変更する場合は、保存棋譜が再生できなくなるためdai-v1の意味を上書きしない。
