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

// モーダル側も同じsrcを使う。
// 表示中の状態を親コンポーネントで保持して、
// guide panel / modal / timeline が同じ状態を見るようにする。
