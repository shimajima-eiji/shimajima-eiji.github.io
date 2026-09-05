// Fixed service binding: only this account's game application can be reached.
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/') return env.ASSETS.fetch(request);
    if (url.pathname === '/chess' || url.pathname === '/chess/') {
      url.pathname = '/';
      request = new Request(url, request);
    }
    try { return await env.GAME.fetch(request); }
    catch { return new Response('ゲームに接続できません。しばらくしてから再度お試しください。', {status: 503, headers: {'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store'}}); }
  }
};
