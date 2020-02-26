<!-- headerタグ -->
<script data-ad-client="ca-pub-4313452092557553" async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"></script>

# もっとプログラミングに集中させてくれ！
[胴元](https://nomuraya.work/github/)

このページは「gitコマンドの複雑なアレコレから開放されたい！」っていう心の叫びで作成しています。

mergeとかconflictとかそういうの。あと運用ルール。git関連のオレオレベストプラクティス？知らんがなって気持ち100%でお届けします。
# 検索フォーム
なんでGithub公式の検索フォームってあんなに使いにくいんですかね？っていう不満を解決してくれるかも知れない方法。

scriptが使えるなら通常のブログやワードプレスサイトの要領でできないかな？

[github pageでないと使えないようです。](https://github.nomuraya.work/)

<form id="cse-search-box" action="http://google.com/cse">
<input type="hidden" name="cx" value="partner-pub-4313452092557553:7524370029"/>
<input type="hidden" name="ie" value="UTF-8"/>
<input type="text" name="q" size="31" placeholder="Github Pages以下のすべてを検索できます。">
<button type="submit" name="sa">検索(Search)</button>
</form>
<script type="text/javascript" src="http://www.google.com/cse/brand?form=cse-search-box&lang=ja"></script>

# クイックフォーム
このサイトの情報をもとに、他にも使いやすいページを自動的に案内してくれるそうです。

レコメンドエンジン、ステキですよね～。

<script async src="//pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"></script>
<ins class="adsbygoogle" style="display:block" data-ad-client="ca-pub-4313452092557553" data-ad-slot="9310870936" data-ad-format="link" data-full-width-responsive="true"></ins>
<script>
(adsbygoogle = window.adsbygoogle || []).push({});
</script>

# ごあいさつ
なんだかんだでgithubpageの可能性に気付いたので、できることを全部やってみよう！みたいなノリで色々拡張しています。

元々の計画は後述のresumeリポジトリに移行しました。
# To be unable to read Japanese
<div id="google_translate_element"></div><script type="text/javascript">
function googleTranslateElementInit() {
  new google.translate.TranslateElement({pageLanguage: 'ja', layout: google.translate.TranslateElement.InlineLayout.SIMPLE, gaTrack: true, gaId: 'UA-63549092-4'}, 'google_translate_element');
}
</script><script type="text/javascript" src="//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit"></script>

# Github pageの試行錯誤
[トライアンドエラー](/tande/)

index.mdにやったこと、ハマったことをざっくりとまとめてますが、他にも細かいものをちょいちょいと。
# リポジトリ紹介
![image](https://grass-graph.moshimo.works/images/shimajima-eiji.png)

[活動状況](https://github.com/shimajima-eiji)
## [mylib: gistで管理するのがつらくなったのでSub Moduleにしてみた](/mylib/)
執筆時点(2018-10)は業務でPythonメイン、個人でGoogleAppScriptメイン

リポジトリ名とサブモジュール名を変えた場合ってどうなるのかも検証
### [gist: （新）ブログで解説しているソースコードの管理リポジトリ](/gist/)
どんどんmylibに以降していくよ～
### [public_kh: （旧）ブログで解説しているソースコードの管理リポジトリ](/public_kh/)
どんどんmylibに以降していくよ～
## [resume: Githubで履歴書・経歴書を作るリポジトリ](/resume/)
履歴書や経歴書、スキルシートも大量に書いて個別に書き直しているからこのリポジトリを作ったので、自己紹介系もまとめて管理したい。

[今ある自己紹介まとめ](https://nomuraya.work/profile)
## [WinSettings: Windowsの環境をGithubで管理したい](/WinSettings/)
Windowsに限らず、開発環境構築をDockerではできないのでGithubで連携してみようという思想で始めたリポジトリ。

Windows10 Pro 64bit Windows Sub-system LinuxとHyper-Vを併用する前提で作っています。

エディタやターミナルはVSCodeを推奨しています。
## [EntranceExam: 日能研の問題をプログラムで解くシリーズ](/EntranceExam/)
電車広告にあった中学入試問題。シカクいアタマをマルくするシリーズ（日能研）とかをプログラムで解決してみた。

何気にgithub初学者向けになるんじゃないかと思ったのでガッツリ触ってみることにします。
# このページ・リポジトリの使い方
サブモジュールも一括でcloneする場合は --recursiveを追加します。

```
git clone --recursive git@github.com:shimajima-eiji/shimajima-eiji.github.io.git
### git remote -v: git@github.com:shimajima-eiji/shimajima-eiji.github.io.git
# or
git clone --recursive https://github.com/shimajima-eiji/shimajima-eiji.github.io.git
### git remote -v: https://github.com/shimajima-eiji/shimajima-eiji.github.io.git
```

# Githubプロジェクト
## github submoduleを運用できるレベルにする
使ってみてますがひっどい。

とはいえ、メリットもあるのでうまーいことこねくり回して使えるようにします。

- [update](https://github.com/shimajima-eiji/shimajima-eiji.github.io/blob/master/update.bsh)
- [push](https://github.com/shimajima-eiji/shimajima-eiji.github.io/blob/master/push_submodules.sh)

## githubで履歴書・経歴書を管理
当然公開できる範囲でしか書いていません。

昔に書いたものをgithub用に書き直しています。
# メディア
- [Qiita](https://qiita.com/nomurasan)
- [gist](https://gist.github.com/shimajima-eiji)
- [サイトポータル](https://nomuraya.work/)
  - [技術情報速報](https://nomuraya.work/techzine/)
  - [開発ノウハウ](https://nomuraya.work/develop/)
  - [OSSコントリビューション](https://nomuraya.work/adiary/)

## github pageをプログラム勉強者向けに使うためには？
github自体は素晴らしいのに、githubを使って私はこうやって勉強しました！っていうのを初学者向けに公開しやすい仕組みができれば後進がどんどん育つんじゃない？っていう話をガチでしていたので、じゃあ俺がやってやんよ！っていう意気込み70%と運用30%ぐらいでやり始めました。
# footer
## サイトでもSlack de チャット
- Github pageでサイトを作ると気軽にコメントができないじゃん！
- Issueに書き込むような内容じゃないし…
- Githubのアカウント持ってないぉ
っていう不満をSlackチャットにぶつけられるように拡張しました。
<script src="https://embed.small.chat/TCQBTUWTXGD0U00YLT.js" async></script>

内容によってはIssueに採用させていただいたり、対応したりしますです。
# Google AdsenseをGithub pageに使えるかな？
もしCloneして使うならgoogle_ad_clientは自身のものに変えてください。

サイトの上とか下とかその他にポコポコページを挟むらしいです、もうちょいやり方はあると思うんだけどGoogleAdsの研究は急務なのでGithub pageにも採用しました。

静的コンテンツなので各ページに手動で埋め込む手間があるので、これは自動化したいですね。
<script async src="//pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"></script>
<script>
(adsbygoogle = window.adsbygoogle || []).push({
  google_ad_client: "ca-pub-4313452092557553",
  enable_page_level_ads: true
});
</script>
