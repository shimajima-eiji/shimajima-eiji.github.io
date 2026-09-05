import {useEffect,useMemo,useRef,useState} from 'react';
import {initialState,allMoves,movesFrom,apply,replayDai,specs,effective,pieceName,coordinate,notation,moveKey,royal} from './engine';
import type {State,Move,Piece} from './engine';
import {useRecording} from '../use-recording';
const sideName=(side:number)=>side===0?'先手':'後手';
const ranks='abcdefghijklmno';
export default function App(){
 const [states,setStates]=useState<State[]>(()=>[initialState()]),[history,setHistory]=useState<Move[]>([]),[mode,setMode]=useState('computer');
 const [selected,setSelected]=useState<number|null>(null),[options,setOptions]=useState<Move[]>([]),[flipped,setFlipped]=useState(false),[zoom,setZoom]=useState(false),[gameKey,setGameKey]=useState(0),[notice,setNotice]=useState(''),[thinking,setThinking]=useState(false);
 const state=states.at(-1)!;
 const current=useRef(state);current.current=state;
 const modeRef=useRef(mode);modeRef.current=mode;
 const recording=useRecording(history,mode,gameKey,saved=>{
  try{let s=initialState();const next=[s];for(const move of saved.moves){s=apply(s,move);next.push(s);}setStates(next);setHistory(saved.moves);setMode(saved.mode);setGameKey(k=>k+1);setSelected(null);setOptions([]);setNotice('保存した対局を開きました。');}catch{setNotice('棋譜を再開できませんでした。');}
 },'dai');
 const modelRef=useRef(recording.model);modelRef.current=recording.model;
 const available=useMemo(()=>selected===null?[]:movesFrom(state,selected),[state,selected]);
 const targets=new Set(available.map(m=>m.path.at(-1)!));
 const activePiece=selected===null?null:state.board[selected];
 const busy=mode==='computer'&&state.turn===1&&state.winner===null;
 function commit(move:Move){
  try{const next=apply(current.current,move);setStates(ss=>[...ss,next]);setHistory(h=>[...h,move]);setSelected(null);setOptions([]);setNotice('');}
  catch(error){setNotice((error as Error).message);}
 }
 const commitRef=useRef(commit);commitRef.current=commit;
 useEffect(()=>{
  if(!busy||!recording.ready)return;setThinking(true);
  const worker=new Worker(new URL('./ai.worker.ts',import.meta.url),{type:'module'});
  let done=false;
  const fallback=()=>{if(done)return;done=true;worker.terminate();setThinking(false);const legal=allMoves(state)[0];if(legal){commitRef.current(legal);setNotice('思考を簡易応手へ切り替えました。');}};
  const timer=setTimeout(fallback,8000);
  worker.onmessage=event=>{if(done)return;if(event.data.error){fallback();return;}done=true;clearTimeout(timer);setThinking(false);worker.terminate();if(event.data.move){commitRef.current(event.data.move);if(event.data.seen)setNotice(`同じ局面の過去${event.data.seen}回の手を参考にしました。`);}};
  worker.onerror=fallback;
  worker.postMessage({id:state.ply,state,model:modelRef.current});
  return()=>{done=true;clearTimeout(timer);worker.terminate();};
 },[state,busy,recording.ready]);
 function click(square:number){
  if(!recording.ready||busy||state.winner!==null)return;
  const choices=available.filter(m=>m.path.at(-1)===square);
  if(choices.length){
   // Empty intermediate squares have no effect; keep distinct captures and promotion choices.
   const unique=new Map<string,Move>();
   for(const m of choices){const captures=m.path.filter(sq=>sq!==m.from&&state.board[sq]?.side===1-state.turn);const key=JSON.stringify([captures.slice().sort((a,b)=>a-b),m.promote]);if(!unique.has(key))unique.set(key,m);}
   const values=[...unique.values()];if(values.length===1)commit(values[0]);else setOptions(values);return;
  }
  setOptions([]);setSelected(state.board[square]?.side===state.turn&&square!==selected?square:null);setNotice('');
 }
 function reset(){setStates([initialState()]);setHistory([]);setSelected(null);setOptions([]);setGameKey(k=>k+1);setNotice('');}
 function undo(){if(!history.length)return;const n=mode==='computer'&&state.turn===0?2:1;setStates(ss=>ss.slice(0,Math.max(1,ss.length-n)));setHistory(h=>h.slice(0,Math.max(0,h.length-n)));setSelected(null);setOptions([]);setNotice('');}
 const actionRef=useRef<(m:Move)=>void>(()=>{});actionRef.current=(m:Move)=>{if(!recording.ready)throw Error('保存完了後に指してください。');if(modeRef.current==='computer'&&current.current.turn===1)throw Error('コンピューターの手番です。');apply(current.current,m);commitRef.current(m);};
 useEffect(()=>{
  const context=(document as Document&{modelContext?:{registerTool:(tool:unknown,options:{signal:AbortSignal})=>unknown}}).modelContext;if(!context)return;
  const lifecycle=new AbortController();
  const tools=[{name:'get_dai_shogi_position',description:'大将棋の盤面・手番・合法手を読む。座標は0〜224、上から行優先。',annotations:{readOnlyHint:true},inputSchema:{type:'object',properties:{},additionalProperties:false},execute:()=>({turn:current.current.turn,board:current.current.board,moves:allMoves(current.current),ply:current.current.ply,winner:current.current.winner})},
   {name:'play_dai_shogi_move',description:'大将棋で1手指す。fromは出発マス、pathは着地点（獅子の二段移動は途中と着地点）、promoteは成り。',annotations:{readOnlyHint:false},inputSchema:{type:'object',properties:{from:{type:'integer',minimum:0,maximum:224},path:{type:'array',items:{type:'integer',minimum:0,maximum:224},minItems:1,maxItems:2},promote:{type:'boolean'}},required:['from','path','promote'],additionalProperties:false},execute:async(m:Move)=>{actionRef.current(m);await new Promise(resolve=>requestAnimationFrame(resolve));return {ply:current.current.ply};}}];
  for(const tool of tools)try{Promise.resolve(context.registerTool(tool,{signal:lifecycle.signal})).catch(()=>{});}catch{}
  return()=>lifecycle.abort();
 },[]);
 const last=history.at(-1),order=Array.from({length:225},(_,i)=>flipped?224-i:i);
 const captured=(side:number)=>{const counts:Record<string,number>={};for(let i=0;i<history.length;i++){const m=history[i],before=states[i];if(before.turn!==side)continue;for(const sq of new Set(m.path)){const p=before.board[sq];if(p&&p.side!==side)counts[pieceName(p)]=(counts[pieceName(p)]??0)+1;}}return Object.entries(counts).map(([name,n])=>`${name}×${n}`).join('　')||'まだありません';};
 function pathLabel(m:Move){const p=state.board[m.from]!;const takes=m.path.filter(sq=>sq!==m.from&&state.board[sq]?.side!==undefined&&state.board[sq]!.side!==p.side).map(sq=>`${coordinate(sq)}の${pieceName(state.board[sq]!)}`);return `${m.path.length===1?'直接移動':m.path.at(-1)===m.from? takes.length?'居喰い':'じっと（パス）':'二段移動'}：${m.path.map(coordinate).join(' → ')}${takes.length?' ／ '+takes.join('・')+'を取る':''}${m.promote?' ／ '+specs[specs[p.kind].to!].name+'に成る':specs[p.kind].to&&!p.promoted?' ／ 不成':''}`;}
 return <main className="dai-room"><header className="masthead"><a href="https://shimajima-eiji.github.io/games/">← Games</a><span>DAI SHOGI / 大将棋</span><a href="/">チェスへ</a></header>
 <div className="dai-layout"><section className="board-section"><div className="board-heading"><div><p className="overline">130 PIECES · ONE BATTLE</p><h1>大将棋を指そう。</h1></div><span className="seal">十五路</span></div>
 <div className="player-strip"><b>{flipped?'▲ 先手':'△ 後手'} {(!flipped&&mode==='computer')?'・コンピューター':''}</b><span>{state.board.filter(p=>p?.side===(flipped?0:1)).length}枚</span></div>
 <div className="board-scroll"><div className={`board-frame ${zoom?'zoom':''}`}><div className="file-labels">{Array.from({length:15},(_,i)=><span key={i}>{flipped?i+1:15-i}</span>)}</div><div className="dai-board" role="group" aria-label="15×15の大将棋盤">{order.map(sq=>{const p=state.board[sq],rank=Math.floor(sq/15);return <button key={sq} data-square={sq} aria-label={`${coordinate(sq)} ${p?sideName(p.side)+' '+pieceName(p):'空きマス'}${targets.has(sq)?' 移動可能':''}`} aria-pressed={selected===sq} onClick={()=>click(sq)} className={`cell ${rank===4||rank===9?'zone-edge':''} ${selected===sq?'selected':''} ${last&&(last.from===sq||last.path.includes(sq))?'last':''} ${targets.has(sq)?'target':''}`}>
 {p&&<span aria-hidden="true" className={`shogi-piece ${(p.side===1)!==flipped?'upside':''} ${p.promoted?'promoted':''}`}><span>{pieceName(p)}</span></span>}
 {!p&&targets.has(sq)&&<span className="dot"/>}{sq%15===(flipped?0:14)&&<small aria-hidden="true">{ranks[rank]}</small>}
 </button>;})}</div></div></div>
 <div className="player-strip"><b>{flipped?'△ 後手':'▲ 先手'} {!flipped&&mode==='computer'?'・あなた':''}</b><span>{state.board.filter(p=>p?.side===(flipped?1:0)).length}枚</span></div>
 <div className="board-buttons"><button onClick={()=>setFlipped(v=>!v)}>盤面を反転</button><button onClick={()=>setZoom(v=>!v)}>{zoom?'全体表示':'駒を拡大'}</button></div><p className="board-caption">駒を選ぶと移動先が光ります。拡大時は盤面を横にスクロールできます。</p>
 </section><aside className="dai-sidebar"><div role="status" aria-live="polite" className="turn-status">{state.winner!==null?`${sideName(state.winner)}の勝ち`:busy?(thinking?'コンピューターが思考中…':'コンピューターの手番'):`${sideName(state.turn)}の手番`}</div><p className="notice" aria-live="polite">{notice||'先手から交互に指します。取った駒を打つルールはありません。'}</p>
 <section className="piece-guide"><h2>{activePiece?`${pieceName(activePiece)}の動き`:'駒の動きがわからなくても。'}</h2><p>{activePiece?specs[effective(activePiece)].hint:'自分の駒を押すと、ここに動きと成り先が表示されます。まずは歩兵か仲人を前へ。'}</p>{activePiece&&!activePiece.promoted&&specs[activePiece.kind].to&&<p className="promotion-note">成り → {specs[specs[activePiece.kind].to!].name}</p>}{activePiece&&specs[effective(activePiece)].lion&&<p>着地点を選び、必要なら経路を選択。居喰い・パスは元のマスをもう一度押します。</p>}</section>
 <label className="mode">対戦相手<select aria-label="対戦相手" value={mode} disabled={!recording.ready} onChange={e=>{setMode(e.target.value);reset();}}><option value="computer">コンピューター（入門）</option><option value="local">この画面で2人対戦</option></select></label><div className="controls"><button onClick={undo} disabled={!history.length||!recording.ready}>待った</button><button onClick={reset} disabled={!recording.ready}>新しい対局</button></div>
 <section className="move-history"><h2>棋譜 <small>{history.length}手</small></h2>{history.length?<ol>{history.map((move,i)=><li key={i}>{notation(states[i],move)}</li>)}</ol>:<p>最初の一手をどうぞ。</p>}</section>
 <details><summary>取った駒</summary><p>先手：{captured(0)}</p><p>後手：{captured(1)}</p><p>持ち駒にはなりません。</p></details>
 {recording.panel}
 <details className="rules"><summary>採用ルールと資料</summary><p>15×15盤・各65枚。成りは一度だけ。敵側の奥5段に入る手、または成り区域に出入りする駒取りで任意に成れます。不成の後は、駒取りまたは区域を出て再進入するまで成れません。最奥段でも強制成りは行いません。</p><p>獅子は二段移動・二枚取り・居喰い・跳躍が可能。中将棋の「獅子同士の取り合い制限」は採用しません。飛鷲・角鷹にも前方の限定的な二段移動があります。</p><p>本アプリの裁定（dai-v1）：相手の王将・玉将・太子をすべて取ると勝ち。動ける手がなくなった側も負けです。王手の放置は指せます。裸玉だけでの自動勝利は採用しません。同じ盤面・手番への反復は禁止（王手例外なし）。史料に差のある反復・裸玉・最奥段での再成りは、この裁定に固定しています。</p><p>コンピューターは入門用です。本人の保存棋譜にある同じ局面の手を応手の評価に反映します。自己対戦や他人の棋譜は使いません。</p><p><a href="https://drericsilverman.com/2020/04/13/dai-shogi-part-i-how-to-play/" target="_blank" rel="noreferrer">Eric Silvermanによる解説</a> / <a href="https://en.wikipedia.org/wiki/Dai_shogi" target="_blank" rel="noreferrer">駒の動き・配置の照合資料</a></p></details>
 </aside></div>
 {!!options.length&&<dialog className="route-dialog" ref={node=>{if(node&&!node.open)node.showModal();}} onCancel={()=>setOptions([])} aria-labelledby="route-title"><h2 id="route-title">指し方を選ぶ</h2><p>経路・取る駒・成りを確認してください。</p><div>{options.map(m=><button key={moveKey(m)} onClick={()=>commit(m)}>{pathLabel(m)}</button>)}</div><button className="cancel" onClick={()=>setOptions([])}>戻る</button></dialog>}
 {recording.gate}</main>;
}
