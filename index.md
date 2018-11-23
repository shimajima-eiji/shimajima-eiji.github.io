# もっとプログラミングに集中させてくれ！
github-pageのindex.mdのタイトルは最初の#で決まるらしいので、サイト名は「もっとプログラミングに集中させてくれ！」にしました。

これは割と真面目な心の叫びで、git含めプログラムのライブラリは組み合わせて使う事を想定していて、単独で使うならまだしも組み込みを考えると扱いが難しすぎるんですよね。

そういう面倒くさいことから開放されたい！っていう気持ちで作っていたので、サイト名にも気持ちを乗せる事にしました。

# 検索フォーム
なんでGithub公式の検索フォームってあんなに使いにくいんですかね？っていう不満

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
<!-- nomuraya.work link -->
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

# リポジトリ紹介
![image](https://grass-graph.moshimo.works/images/shimajima-eiji.png)

[活動状況](https://github.com/shimajima-eiji)

## [mylib: gistで管理するのがつらくなったのでSub Moduleにしてみた](/utils/)
執筆時点(2018-10)は業務でPythonメイン、個人でGoogleAppScriptメイン

リポジトリ名とサブモジュール名を変えた場合ってどうなるのかも検証

## [gist: （新）ブログで解説しているソースコードの管理リポジトリ](/gist/)
どんどんmylibに以降していくよ～

## [public_kh: （旧）ブログで解説しているソースコードの管理リポジトリ](/public_kh/)
どんどんmylibに以降していくよ～

## [resume: Githubで履歴書・経歴書を作るリポジトリ](/resume/)
履歴書や経歴書、スキルシートも大量に書いて個別に書き直しているからこのリポジトリを作ったので、自己紹介系もまとめて管理したい。

[今ある自己紹介まとめ](https://nomuraya.work/profile)

# 使い方
サブモジュールも一括でcloneする場合は --recursiveを追加します。

```
git clone --recursive (https or ssh)shimajima-eiji/shimajima-eiji.github.io.git
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
