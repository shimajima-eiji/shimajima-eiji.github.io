# Gighub Pagesのノウハウざっとまとめ、トライアンドエラーの系譜
<form id="cse-search-box" action="http://google.com/cse">
<input type="hidden" name="cx" value="partner-pub-4313452092557553:7524370029"/>
<input type="hidden" name="ie" value="UTF-8"/>
<input type="text" name="q" size="31" placeholder="Github Pages以下のすべてを検索できます。">
<button type="submit" name="sa">検索(Search)</button>
</form>
<script type="text/javascript" src="http://www.google.com/cse/brand?form=cse-search-box&lang=ja"></script>

# To be unable to read Japanese
<div id="google_translate_element"></div><script type="text/javascript">
function googleTranslateElementInit() {
  new google.translate.TranslateElement({pageLanguage: 'ja', layout: google.translate.TranslateElement.InlineLayout.SIMPLE, gaTrack: true, gaId: 'UA-63549092-4'}, 'google_translate_element');
}
</script><script type="text/javascript" src="//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit"></script>

# 注意
このページはTry and Errorでやった事をまとめるためのWebページをmarkdownで書きたいためだけのディレクトリです。

gh-pages（github pages）でWebサイトを作ろうとするとファイル名.htmlを作るしかないんですが、先述のとおりです。

htmlファイルにmd書いても読んでくれないし、mdはindexしか使えません。

もちろん、凝った事をやるならhtmlファイルにスクリプトをガシガシ乗せて書くのが望ましいです。

github page向けに書いているので、ソースコードを見ると悲惨な事になってます。
# .htaccessは使えない
書き方が間違ってるとは思わないんだけどなぁ、うまくいきませんね。

github pagesが便利だとか簡単だとかいろんな事を書いているブログ記事やQiitaの投稿がありますので細かいのはそちらに任せます。

が、凝った事をやり始めるとこの通り、かゆいところに手が届きません。

使い方を間違えているとかアプローチがおかしいとか、正直私もそう思うんですが考えるだけなら誰でもあるんじゃないか？と思ったのがこのページの始まりです。

他己責任にするなら、ほとんどすべてgithubで就職活動・転職活動をするような運動が活発になったのが悪いと言いたいんですが、こういった運用ができるようになってくるとアフィリエイト向きになるので、必然的に私のような事をやりだす人が増えます。

そのうち、github pageでソースを公開しない方法とか調べ始めます。

javascriptで右クリックを禁止してみたり名前を隠そうとしたり、とかかなぁ。

出来ない事は出来ないんでgithub pagesアフィリエイトが流行って負荷を掛けまくる、みたいな大本営に迷惑をかけるような事はないと思いますが、ここではそうなった場合を想定しています。

とはいえ、githubを実務でも使っている人間としては負荷を掛けて他のユーザーに影響を与えたくないので適度なところでスクリプトを抑えています。

.htaccessが使えないのは良いことだな、と思いました。
# SEO対策は出来ない
index.mdを使う場合、_config.ymlの設定に準拠します。

_config.ymlの先を自分で作らない限りムリでしょう。

この時点でindex.mdを使うという選択肢はなくなります。
# 新しいページを作ってmdで書きたい
最初にも述べていますが、リンクさせたいページ名のディレクトリ/index.mdを一つずつ作るしかないです。

ページの管理が大変です、正直おすすめしかねます。

また、githubで見た時とgithu pagesで見た時の差もあるので、このページのgithubを見直してください。

たぶん嫌になるだろう、と思ってこのページを、いつもなら[adiaryブログ](https://nomuraya.work/techzine/)に書くような事をgithub pages向けに書いてみました。

書いていてしんどいです。向かないです。

というか私にとってはadiaryが便利すぎたんです。マークダウンだけじゃ戻ろうと思わないなぁ……
# github pageが更新されない時
いくつか問題は考えられますが、普通に使っているときは起こりえないでしょっていう話ばっかりです。
## シンボリックリンク先が存在しない
Your site is having problems building: The symbolic link (link to) targets a file which does not exist within your site's repository. For more information, see

あなたのサイトはビルドに問題があります：シンボリックリンク(リンク先)は、サイトのリポジトリ内に存在しないファイルをターゲットにしています。詳細は、次を参照してください。

とのことで、リンク先のファイルが存在しない場合に起こります。

実運用だといるけど、.gitignoreなどでコミットされたくないファイルたちがあるケースなんかはこれですね。

対策として、それぞれのディレクトリに必ずindex.mdとREADME.mdを配置するようにすれば解決できるでしょう。
## ページ構成に問題があります
Your site is having problems building: Page build failed. For more information, see

サイトの構築に問題があります。ページビルドに失敗しました。 詳細は、次を参照してください。

https://help.github.com/articles/troubleshooting-github-pages-builds/

一個ずつ心当たりを潰していくしかありません…

<script async src="//pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"></script>
<ins class="adsbygoogle" style="display:block" data-ad-client="ca-pub-4313452092557553" data-ad-slot="9310870936" data-ad-format="link" data-full-width-responsive="true"></ins>
<script>
(adsbygoogle = window.adsbygoogle || []).push({});
</script>
<script src="https://embed.small.chat/TCQBTUWTXGD0U00YLT.js" async></script>
<script async src="//pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"></script>
<script>
(adsbygoogle = window.adsbygoogle || []).push({
  google_ad_client: "ca-pub-4313452092557553",
  enable_page_level_ads: true
});
</script>
