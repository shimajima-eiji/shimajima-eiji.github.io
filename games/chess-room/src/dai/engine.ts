/** Dai Shogi, explicit ruleset dai-v1. See RULES.md for sources and conventions. */
export type Side=0|1;
export type Piece={kind:string;side:Side;promoted:boolean};
export type Move={from:number;path:number[];promote:boolean};
export type State={board:(Piece|null)[];turn:Side;seen:Set<string>;ply:number;winner:Side|null};
type Direction=[number,number];
type Spec={name:string;short:string;value:number;steps?:Direction[];rays?:Direction[];jumps?:Direction[];range?:number;to?:string;lion?:Direction[]|'all';hint:string};
const O:Direction[]=[[0,-1],[1,0],[0,1],[-1,0]],D:Direction[]=[[-1,-1],[1,-1],[-1,1],[1,1]],A:Direction[]=[...O,...D];
const F:Direction[]=[[-1,-1],[0,-1],[1,-1]],V:Direction[]=[[0,-1],[0,1]],H:Direction[]=[[-1,0],[1,0]];
export const specs:Record<string,Spec>={
 K:{name:'玉将',short:'玉',value:10000,steps:A,hint:'周囲8方向へ1マス。王将・太子をすべて取られると負け。'},
 P:{name:'歩兵',short:'歩',value:100,steps:[[0,-1]],to:'G',hint:'前へ1マス。取る動きも同じ。'},
 GB:{name:'仲人',short:'仲',value:130,steps:V,to:'DE',hint:'前後へ1マス。'},
 L:{name:'香車',short:'香',value:300,rays:[[0,-1]],to:'WH',hint:'前へ何マスでも。駒は越えられない。'},
 N:{name:'桂馬',short:'桂',value:200,jumps:[[-1,-2],[1,-2]],to:'G',hint:'前へ2・横へ1の位置に跳ぶ。間の駒を越えられる。'},
 ST:{name:'石将',short:'石',value:120,steps:[[-1,-1],[1,-1]],to:'G',hint:'斜め前へ1マス。'},
 I:{name:'鉄将',short:'鉄',value:180,steps:F,to:'G',hint:'前と斜め前へ1マス。'},
 C:{name:'銅将',short:'銅',value:220,steps:[...F,[0,1]],to:'SM',hint:'前3方向と真後ろへ1マス。'},
 S:{name:'銀将',short:'銀',value:270,steps:[...D,[0,-1]],to:'VM',hint:'斜め4方向と前へ1マス。'},
 G:{name:'金将',short:'金',value:330,steps:[...O,[-1,-1],[1,-1]],to:'R',hint:'縦横と斜め前へ1マス。'},
 RC:{name:'反車',short:'反',value:350,rays:V,to:'WL',hint:'前後へ何マスでも。'},
 CS:{name:'猫刄',short:'猫',value:190,steps:D,to:'G',hint:'斜め4方向へ1マス。'},
 FL:{name:'猛豹',short:'豹',value:300,steps:[...D,...V],to:'B',hint:'前後3方向へ1マス。真横には動けない。'},
 BT:{name:'盲虎',short:'虎',value:330,steps:A.filter(([x,y])=>x!==0||y!==-1),to:'FS',hint:'真前以外の周囲7方向へ1マス。'},
 DE:{name:'酔象',short:'象',value:420,steps:A.filter(([x,y])=>x!==0||y!==1),to:'CP',hint:'真後ろ以外の周囲7方向へ1マス。成ると王駒の太子。'},
 VO:{name:'猛牛',short:'牛',value:350,rays:O,range:2,to:'G',hint:'縦横へ1〜2マス。間の駒は越えられない。'},
 AB:{name:'嗔猪',short:'嗔',value:190,steps:O,to:'G',hint:'縦横へ1マス。'},
 EW:{name:'悪狼',short:'狼',value:250,steps:[...F,...H],to:'G',hint:'前3方向と真横へ1マス。'},
 KR:{name:'麒麟',short:'麒',value:500,steps:D,jumps:O.map(([x,y])=>[x*2,y*2]),to:'LN',hint:'斜めへ1マス、縦横へ2マス跳ぶ。成ると獅子。'},
 LN:{name:'獅子',short:'獅',value:1800,lion:'all',hint:'周囲へ2回まで移動・方向変更・2枚取り。2マス以内へ跳べる。隣を取って元に戻る居喰いも可能。'},
 PH:{name:'鳳凰',short:'鳳',value:450,steps:O,jumps:D.map(([x,y])=>[x*2,y*2]),to:'Q',hint:'縦横へ1マス、斜めへ2マス跳ぶ。成ると奔王。'},
 R:{name:'飛車',short:'飛',value:700,rays:O,to:'DK',hint:'縦横へ何マスでも。'},
 FD:{name:'飛龍',short:'飛龍',value:340,rays:D,range:2,to:'G',hint:'斜めへ1〜2マス。間の駒は越えられない。'},
 SM:{name:'横行',short:'横',value:500,rays:H,steps:V,to:'FB',hint:'横へ何マスでも、前後へ1マス。'},
 VM:{name:'竪行',short:'竪',value:530,rays:V,steps:H,to:'FO',hint:'前後へ何マスでも、横へ1マス。'},
 B:{name:'角行',short:'角',value:650,rays:D,to:'DH',hint:'斜めへ何マスでも。'},
 DH:{name:'龍馬',short:'馬',value:850,rays:D,steps:O,to:'HF',hint:'斜めへ何マスでも、縦横へ1マス。'},
 DK:{name:'龍王',short:'龍',value:900,rays:O,steps:D,to:'SE',hint:'縦横へ何マスでも、斜めへ1マス。'},
 Q:{name:'奔王',short:'奔',value:1300,rays:A,hint:'縦横斜めへ何マスでも。'},
 WH:{name:'白駒',short:'駒',value:750,rays:[...V,[-1,-1],[1,-1]],hint:'前後と斜め前へ何マスでも。'},
 WL:{name:'鯨鯢',short:'鯨',value:750,rays:[...V,[-1,1],[1,1]],hint:'前後と斜め後ろへ何マスでも。'},
 CP:{name:'太子',short:'太',value:10000,steps:A,hint:'周囲8方向へ1マス。玉将とともに王駒となる。'},
 FS:{name:'飛鹿',short:'鹿',value:680,rays:V,steps:[...D,...H],hint:'前後へ何マスでも、横と斜めへ1マス。'},
 FO:{name:'飛牛',short:'飛牛',value:1050,rays:[...V,...D],hint:'前後と斜めへ何マスでも。'},
 FB:{name:'奔猪',short:'猪',value:1000,rays:[...H,...D],hint:'横と斜めへ何マスでも。'},
 HF:{name:'角鷹',short:'鷹',value:1400,rays:A.filter(([x,y])=>x!==0||y!==-1),lion:[[0,-1]],hint:'真前以外へ何マスでも。真前は2マスの跳躍・直線2段取り・居喰いが可能。'},
 SE:{name:'飛鷲',short:'鷲',value:1500,rays:[...O,[-1,1],[1,1]],lion:[[-1,-1],[1,-1]],hint:'斜め前以外へ何マスでも。斜め前は同じ線上で2段取り・跳躍・居喰いが可能。'}
};
export const effective=(p:Piece)=>p.promoted?(specs[p.kind].to??p.kind):p.kind;
export const pieceName=(p:Piece)=>p.kind==='K'&&p.side===1?'王将':specs[effective(p)].name;
export const royal=(p:Piece)=>['K','CP'].includes(effective(p));
export const coordinate=(square:number)=>`${15-square%15}${'abcdefghijklmno'[Math.floor(square/15)]}`;
export const inZone=(sq:number,side:Side)=>side===0?sq<75:sq>=150;
export function positionKey(state:Pick<State,'board'|'turn'>){return state.turn+':'+state.board.map(p=>p?`${p.side}${p.kind}${p.promoted?'+':''}`:'').join(',');}
export function initialState():State{
 const rows=[
 'L N ST I C S G K G S C I ST N L'.split(' '),
 ['RC','','CS','','FL','','BT','DE','BT','','FL','','CS','','RC'],
 ['','VO','','AB','','EW','KR','LN','PH','EW','','AB','','VO',''],
 'R FD SM VM B DH DK Q DK DH B VM SM FD R'.split(' '),Array(15).fill('P'),
 ['','','','','GB','','','','','','GB','','','','']];
 const board:(Piece|null)[]=Array(225).fill(null);
 rows.forEach((row,r)=>row.forEach((kind,c)=>{if(kind){board[(14-r)*15+c]={kind,side:0,promoted:false};board[r*15+14-c]={kind,side:1,promoted:false};}}));
 const state:State={board,turn:0,seen:new Set(),ply:0,winner:null};state.seen.add(positionKey(state));return state;
}
function offset(square:number,[dx,dy]:Direction,side:Side,multiple=1){const d=side===0?1:-1,x=square%15+dx*d*multiple,y=Math.floor(square/15)+dy*d*multiple;return x<0||x>=15||y<0||y>=15?-1:y*15+x;}
export const moveKey=(m:Move)=>`${m.from}:${m.path.join('.')}:${m.promote?1:0}`;
function rawPaths(state:State,from:number):number[][]{
 const p=state.board[from];if(!p)return [];const spec=specs[effective(p)],paths:number[][]=[];
 const add=(to:number)=>{if(to>=0&&state.board[to]?.side!==p.side)paths.push([to]);};
 for(const d of spec.steps??[])add(offset(from,d,p.side));
 for(const d of spec.jumps??[])add(offset(from,d,p.side));
 for(const d of spec.rays??[])for(let n=1;n<=(spec.range??14);n++){
  const to=offset(from,d,p.side,n);if(to<0||state.board[to]?.side===p.side)break;add(to);if(state.board[to])break;
 }
 if(spec.lion){
  const dirs=spec.lion==='all'?A:spec.lion;
  if(spec.lion==='all')for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){if(dx||dy)add(offset(from,[dx,dy],p.side));}
  else for(const dir of dirs){add(offset(from,dir,p.side));add(offset(from,dir,p.side,2));}
  for(const dir of dirs){
   const first=offset(from,dir,p.side);if(first<0||state.board[first]?.side===p.side)continue;
   const destinations=spec.lion==='all'?A.map(d=>offset(first,d,p.side)):[offset(first,dir,p.side),from];
   for(const second of destinations){if(second<0||second===first||(second!==from&&state.board[second]?.side===p.side))continue;paths.push([first,second]);}
  }
 }
 return [...new Map(paths.map(path=>[path.join('.'),path])).values()];
}
export function makeUnchecked(state:State,move:Move):State{
 const board=state.board.slice(),p=board[move.from]!;board[move.from]=null;
 for(const to of move.path)board[to]=null;
 board[move.path.at(-1)!]={...p,promoted:p.promoted||move.promote};
 const next:State={board,turn:(1-state.turn) as Side,ply:state.ply+1,seen:state.seen,winner:null};
 if(!board.some(q=>q?.side===next.turn&&royal(q)))next.winner=state.turn;
 return next;
}
export function movesFrom(state:State,from:number,checkRepeat=true):Move[]{
 const p=state.board[from];if(!p||p.side!==state.turn||state.winner!==null)return [];
 const moves:Move[]=[];
 for(const path of rawPaths(state,from)){
  const to=path.at(-1)!;
  const capture=path.some(sq=>sq!==from&&state.board[sq]?.side===1-p.side);
  const mayPromote=!p.promoted&&!!specs[p.kind].to&&((!inZone(from,p.side)&&inZone(to,p.side))||(capture&&(inZone(from,p.side)||inZone(to,p.side))));
  for(const promote of mayPromote?[false,true]:[false]){
   const move={from,path,promote};if(!checkRepeat||!state.seen.has(positionKey(makeUnchecked(state,move))))moves.push(move);
  }
 }
 return moves;
}
export function allMoves(state:State,checkRepeat=true){return state.board.flatMap((p,i)=>p?.side===state.turn?movesFrom(state,i,checkRepeat):[]);}
export function apply(state:State,input:unknown):State{
 if(!input||typeof input!=='object')throw Error('指し手が不正です。');
 const m=input as Move;
 if(!Number.isInteger(m.from)||m.from<0||m.from>=225||!Array.isArray(m.path)||m.path.length<1||m.path.length>2||m.path.some(n=>!Number.isInteger(n)||n<0||n>=225)||typeof m.promote!=='boolean')throw Error('指し手が不正です。');
 const legal=movesFrom(state,m.from).find(v=>moveKey(v)===moveKey(m));if(!legal)throw Error('その手は指せません（同一局面への反復も禁止）。');
 const next=makeUnchecked(state,legal);next.seen=new Set(state.seen);next.seen.add(positionKey(next));
 if(next.winner===null&&!next.board.some((q,i)=>q?.side===next.turn&&movesFrom(next,i).length))next.winner=state.turn;
 return next;
}
export function notation(state:State,m:Move){const p=state.board[m.from]!;return `${p.side===0?'▲':'△'}${pieceName(p)} ${coordinate(m.from)}→${m.path.map(coordinate).join('→')}${m.promote?' 成':''}`;}
export function replayDai(input:unknown){
 if(!Array.isArray(input)||input.length>2000)throw Error('棋譜は2000手まで保存できます。');
 let state=initialState();const observations:{position:string;move:string}[]=[],moves:Move[]=[],labels:string[]=[];
 for(const m of input){const before=state;state=apply(state,m);const clean={from:m.from,path:[...m.path],promote:m.promote} as Move;moves.push(clean);labels.push(notation(before,clean));if(before.turn===0)observations.push({position:learningKey(before),move:moveKey(clean)});}
 return {moves,observations,result:state.winner===null?null:state.winner===0?'white':'black',state,labels};
}

// Compact, deterministic model key; not used for identity, auth, or repetition rules.
export function learningKey(state:State){
 const text=positionKey(state);let a=2166136261,b=3335557771;
 for(let i=0;i<text.length;i++){a=Math.imul(a^text.charCodeAt(i),16777619);b=Math.imul(b^text.charCodeAt(i),2246822519);}
 return `dai-v1:${(a>>>0).toString(16)}:${(b>>>0).toString(16)}`;
}
