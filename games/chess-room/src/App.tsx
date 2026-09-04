'use client';
import { useEffect, useRef, useState } from 'react';
import { Chess } from 'chess.js';
import type { Square, PieceSymbol } from 'chess.js';
import { statusText } from './chess-engine';
import {chooseAdaptiveMove} from './adaptive';
import {useRecording} from './use-recording';
const symbols: Record<string,string>={k:'♚',q:'♛',r:'♜',b:'♝',n:'♞',p:'♟'};
const names: Record<string,string>={k:'キング',q:'クイーン',r:'ルーク',b:'ビショップ',n:'ナイト',p:'ポーン'};
const guidance:Record<string,string>={p:'前へ1マス。初手は2マスも可。相手の駒は斜め前で取ります。',n:'縦2・横1、または縦1・横2。間の駒を跳び越えます。',b:'斜めに何マスでも進めます。',r:'縦・横に何マスでも進めます。',q:'縦・横・斜めに何マスでも進めます。',k:'周囲の1マスへ。相手に取られるマスには進めません。'};
type Input={from:Square;to:Square;promotion?:string};
type Tool={name:string;description:string;inputSchema:object;annotations:{readOnlyHint:boolean};execute:(input:unknown)=>unknown};
export default function Home(){
 const game=useRef(new Chess()).current;
 const [selected,setSelected]=useState<Square|null>(null);
 const [version,refresh]=useState(0);
 const [mode,setMode]=useState('computer');
 const [flipped,setFlipped]=useState(false);
 const [promotion,setPromotion]=useState<Input|null>(null);
 const [notice,setNotice]=useState('');
 const [gameKey,setGameKey]=useState(0);
 const recording=useRecording(game.history(),mode,gameKey,saved=>{game.reset();for(const move of saved.moves)game.move(move);setMode(saved.mode);setGameKey(k=>k+1);setSelected(null);setPromotion(null);refresh(n=>n+1);});
 const modelRef=useRef(recording.model);modelRef.current=recording.model;
 const modeRef=useRef(mode);modeRef.current=mode;
 const promotionRef=useRef(promotion);promotionRef.current=promotion;
 const busy=mode==='computer'&&game.turn()==='b'&&!game.isGameOver();
 const moves=selected?game.moves({square:selected,verbose:true}):[];
 const history=game.history({verbose:true});const last=history.at(-1);
 const squares=Array.from({length:64},(_,i)=>('abcdefgh'[i%8]+(8-Math.floor(i/8))) as Square);if(flipped)squares.reverse();
 function applyMove(input:Input){
  if(game.isGameOver())throw Error('対局は終了しています。');
  if(modeRef.current==='computer'&&game.turn()==='b')throw Error('コンピューターの手番です。');
  const options=game.moves({square:input.from,verbose:true}).filter(m=>m.to===input.to);
  if(!options.length)throw Error('そのマスには動かせません。');
  if(options.some(m=>m.promotion)&&!input.promotion)throw Error('昇格する駒を選んでください。');
  const m=game.move(input);setSelected(null);setPromotion(null);setNotice('');refresh(n=>n+1);return m;
 }
 const action=useRef(applyMove);action.current=applyMove;
 useEffect(()=>{
  if(!busy)return;
  const expected=game.fen();
  const timer=setTimeout(()=>{
   if(game.fen()!==expected||modeRef.current!=='computer')return;
   try{const next=chooseAdaptiveMove(game,modelRef.current);if(next.move)game.move(next.move);setNotice(next.adapted?`この局面の過去${next.seen}回の選択を応手に反映しました。`:'');}
   catch{const fallback=game.moves()[0];if(fallback)game.move(fallback);setNotice('簡易応手で続けます。');}
   setSelected(null);refresh(n=>n+1);
  },350);
  return()=>clearTimeout(timer);
 },[version,mode,game,busy]);
 useEffect(()=>{
  const context=(document as Document&{modelContext?:{registerTool:(tool:Tool,options:{signal:AbortSignal})=>unknown}}).modelContext;
  if(!context)return;
  const lifecycle=new AbortController();
  const register=(tool:Tool)=>{try{Promise.resolve(context.registerTool(tool,{signal:lifecycle.signal})).catch(()=>{});}catch{}};
  register({name:'get_chess_position',description:'現在の盤面、手番、棋譜、合法手を取得する。',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true},execute:()=>({fen:game.fen(),turn:game.turn(),history:game.history(),legalMoves:game.moves({verbose:true}).map(m=>({from:m.from,to:m.to,promotion:m.promotion})),status:statusText(game),mode:modeRef.current})});
  register({name:'play_chess_move',description:'現在の対局で1手指す。コンピューター対戦では白のみ。昇格時はq/r/b/nを指定する。',inputSchema:{type:'object',properties:{from:{type:'string',pattern:'^[a-h][1-8]$'},to:{type:'string',pattern:'^[a-h][1-8]$'},promotion:{type:'string',enum:['q','r','b','n']}},required:['from','to'],additionalProperties:false},annotations:{readOnlyHint:false},execute:async(value:unknown)=>{
   if(!value||typeof value!=='object')throw Error('入力が不正です。');
   const v=value as Record<string,unknown>;
   if(typeof v.from!=='string'||typeof v.to!=='string'||! /^[a-h][1-8]$/.test(v.from)||! /^[a-h][1-8]$/.test(v.to)||Object.keys(v).some(k=>!['from','to','promotion'].includes(k))||(v.promotion!==undefined&&!['q','r','b','n'].includes(String(v.promotion))))throw Error('駒の位置または昇格指定が不正です。');
   if(promotionRef.current)throw Error('画面で昇格の選択を完了してください。');
   const m=action.current(v as Input);await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));return {move:m.san,fen:game.fen(),status:statusText(game)};
  }});
  return()=>lifecycle.abort();
 },[game]);
 function click(square:Square){
  if(busy||game.isGameOver()||promotion)return;
  if(selected===square){setSelected(null);return;}
  const options=moves.filter(m=>m.to===square);
  if(selected&&options.length){if(options.some(m=>m.promotion)){setPromotion({from:selected,to:square});return;}applyMove({from:selected,to:square});return;}
  if(game.get(square)?.color===game.turn()){setSelected(square);setNotice('');}
  else{setNotice(selected?'点のついたマスを選んでください。':'手番側の駒を選んでください。');}
 }
 function undo(){
  if(promotion){setPromotion(null);setSelected(null);return;}
  if(!game.history().length)return;
  const wasTurn=game.turn();game.undo();if(mode==='computer'&&wasTurn==='w'&&game.history().length)game.undo();
  setSelected(null);setNotice('');refresh(n=>n+1);
 }
 function reset(){setGameKey(k=>k+1);game.reset();setSelected(null);setPromotion(null);setNotice('');refresh(n=>n+1);}
 const selectedPiece=selected?game.get(selected):null;
 const captured=(color:string)=>history.filter(m=>m.color===color&&m.captured).map((m,i)=><span key={i} aria-label={names[m.captured!]}>{symbols[m.captured!]}</span>);
 return <main className="room"><header><div className="wordmark"><span aria-hidden="true">♞</span> CHESS ROOM</div><span className="edition">PLAY / 01</span></header><div className="game-layout"><section className="play-area"><div className="player"><span className={`avatar ${flipped?'':'black-avatar'}`} aria-hidden="true">{flipped?'♔':'♚'}</span><div><b>{flipped?'白':mode==='computer'?'コンピューター':'黒'}</b><small>{flipped?'WHITE · 先手':mode==='computer'?'BLACK · 入門':'BLACK'}</small></div><div className="captured" aria-label="取った駒">{captured(flipped?'w':'b')}</div></div><div className="board" aria-label="チェス盤">{squares.map((sq,i)=>{const p=game.get(sq),legal=moves.some(m=>m.to===sq),check=p?.type==='k'&&p.color===game.turn()&&game.inCheck();return <button key={sq} data-square={sq} aria-label={`${sq}${p?' '+(p.color==='w'?'白':'黒')+'の'+names[p.type]:' 空きマス'}${legal?' 移動可能':''}`} aria-pressed={selected===sq} onClick={()=>click(sq)} className={`square ${(Math.floor(i/8)+i%8)%2?'dark':'light'} ${last&&(last.from===sq||last.to===sq)?'last-move':''} ${selected===sq?'selected':''} ${check?'in-check':''}`}><span aria-hidden="true" className={`piece ${p?.color==='w'?'white-piece':'black-piece'}`}>{p?symbols[p.type]:''}</span>{legal&&<span className={p?'legal-capture':'legal-dot'}/ >}{i%8===0&&<small aria-hidden="true" className="rank">{sq[1]}</small>}{i>=56&&<small aria-hidden="true" className="file">{sq[0]}</small>}</button>})}</div><div className="player"><span className={`avatar ${flipped?'black-avatar':''}`} aria-hidden="true">{flipped?'♚':'♔'}</span><div><b>{flipped?mode==='computer'?'コンピューター':'黒':mode==='computer'?'あなた':'白'}</b><small>{flipped?'BLACK':'WHITE · 先手'}</small></div><div className="captured" aria-label="取った駒">{captured(flipped?'b':'w')}</div></div></section><aside><p className="eyebrow">YOUR NEXT MOVE</p><h1>一手、指そう。</h1><div className={`status ${game.isGameOver()?'finished':''}`} role="status" aria-live="polite">{statusText(game,busy)}</div><p className="hint" aria-live="polite">{notice|| (selectedPiece?`${names[selectedPiece.type]} — ${guidance[selectedPiece.type]}`:'駒を選んで、移動先のマスを押します。点がついたマスに動かせます。')}</p><label className="mode-label">対戦相手<select aria-label="対戦相手" value={mode} disabled={!!promotion||recording.working} onChange={e=>{setMode(e.target.value);reset();}}><option value="computer">コンピューター（入門）</option><option value="local">2人で対戦</option></select></label><div className="actions"><button onClick={undo} disabled={!history.length&&!promotion}>↶ 待った</button><button onClick={()=>setFlipped(v=>!v)}>⇅ 盤面反転</button></div><button className="new-game" onClick={reset}>新しく始める</button><section className="history"><div className="history-heading"><h2>棋譜</h2><span>{history.length} 手</span></div>{history.length?<ol>{Array.from({length:Math.ceil(history.length/2)},(_,i)=><li key={i}><span>{i+1}.</span><b>{history[i*2]?.san}</b><b>{history[i*2+1]?.san||'…'}</b></li>)}</ol>:<p className="empty-history">最初の一手をどうぞ。</p>}</section><details className="rules"><summary>ルールと操作</summary><p>白から交互に指します。キングへの攻撃がチェック、逃げ道がなければチェックメイトです。</p><p>キャスリング、アンパッサン、4種類への昇格に対応。同一局面3回・50手ルールは自動で引き分けにします。時計はありません。</p><p>「待った」はコンピューター対戦では自分の前の手番まで戻します。記録した対局は「続きを再開」で開けます。対戦相手を変えると新しい対局になります。</p></details>{recording.panel}</aside></div>{promotion&&<dialog className="promotion-panel" aria-labelledby="promotion-title" ref={node=>{if(node&&!node.open)node.showModal();}} onCancel={()=>setPromotion(null)}><h2 id="promotion-title">ポーンを昇格</h2><p>昇格する駒を選んでください。</p><div className="promotion-options">{(['q','r','b','n'] as PieceSymbol[]).map((p,i)=><button autoFocus={i===0} key={p} aria-label={`${names[p]}に昇格`} onClick={()=>applyMove({...promotion,promotion:p})}><span aria-hidden="true">{symbols[p]}</span>{names[p]}</button>)}</div><button className="cancel-promotion" onClick={()=>setPromotion(null)}>戻る</button></dialog>}</main>;
}
