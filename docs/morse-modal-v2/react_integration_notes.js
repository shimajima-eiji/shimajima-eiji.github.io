// Reactへ戻す時の最小方針

const CHICK_IMAGES = {
  idle: "/assets/chick/chick_idle.jpg",
  dot: "/assets/chick/chick_dot.jpg",
  dash: "/assets/chick/chick_dash.jpg",
  done: "/assets/chick/chick_done.jpg",
};

const STATE_TEXT = {
  idle: "再生すると、短点・長点に合わせて反応します。",
  dot: "短点です。短く光る信号を見ています。",
  dash: "長点です。短点より長い信号を見ています。",
  done: "最後まで読み終わりました。文字ごとの区切りを確認できます。",
};

// 親コンポーネントで currentState を持つ。
// 信号分解ビュー・ひよこ補助カード・モーダルは同じ currentState を参照する。
