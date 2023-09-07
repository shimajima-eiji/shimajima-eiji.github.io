# リポジトリ横断ホスティング
他リポジトリでGithubPagesを経由してiframeで使う。
docsifyのようにmdなど外部ソースを取得してサニタイズされている場合などに必要となる

## iframeホスティング例
1. APIが提供されているならAPIからhtmlをビルドする
2. 場合によりスクレイピング（デイリーパッチ）もやむなし
3. iframeが使えるなら要検討

### iframeページ例
```
<!-- https://shimajima-eiji.github.io/hosting/lapras.html -->
<!-- https://naka-sho.netlify.app/#/profile -->
<iframe src="https://lapras.com/public/nomuraya" width="100%" height="600px"></iframe>
```
