# ひよこ通信係 4枚個別生成版

## 確認方法

1. ZIPを展開する
2. `index.html` をブラウザで開く
3. 待機 / 短点 / 長点 / 完了 のボタンで状態差分を確認する
4. 下部の一覧で4枚がそれぞれ別ファイルになっていることを確認する

## ファイル構成

- `index.html`
- `contact_sheet.jpg`
- `assets/chick/chick_idle.jpg`
- `assets/chick/chick_dot.jpg`
- `assets/chick/chick_dash.jpg`
- `assets/chick/chick_done.jpg`
- `assets/chick/chick_idle.png`
- `assets/chick/chick_dot.png`
- `assets/chick/chick_dash.png`
- `assets/chick/chick_done.png`
- `manifest.json`

## Reactに戻す場合

CHICK_IMAGESを以下のように定義する。

const CHICK_IMAGES = {
  idle: "/assets/chick/chick_idle.jpg",
  dot: "/assets/chick/chick_dot.jpg",
  dash: "/assets/chick/chick_dash.jpg",
  done: "/assets/chick/chick_done.jpg",
};

function getChickImage(activeSignal, mood) {
  if (activeSignal === ".") return CHICK_IMAGES.dot;
  if (activeSignal === "-") return CHICK_IMAGES.dash;
  if (mood === "done") return CHICK_IMAGES.done;
  return CHICK_IMAGES.idle;
}

## メモ

Canvasでの画像埋め込み検証はやめ、通常のWeb構成と同じく画像ファイルを分離して確認するための版。
