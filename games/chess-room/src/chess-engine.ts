import { Chess } from 'chess.js';
import type { Move, PieceSymbol } from 'chess.js';
const values: Record<PieceSymbol,number>={p:100,n:320,b:330,r:500,q:900,k:0};
export function evaluate(game:Chess){
 let score=0;
 for(const row of game.board())for(const p of row){if(!p)continue;const f=p.square.charCodeAt(0)-97,r=Number(p.square[1])-1;const center=3.5-Math.abs(3.5-f)+3.5-Math.abs(3.5-r);let v=values[p.type];if(p.type==='p')v+=(p.color==='w'?r:7-r)*7;else if(p.type==='n'||p.type==='b')v+=center*9;score+=(p.color==='w'?1:-1)*v;}
 return score*(game.turn()==='w'?1:-1);
}
function search(game:Chess,depth:number,alpha:number,beta:number):number{
 if(game.isCheckmate())return -100000-depth;
 if(game.isDraw())return 0;
 if(depth===0)return evaluate(game);
 const moves=game.moves({verbose:true}).sort((a,b)=>(values[b.captured??'k']-values[a.captured??'k']));
 for(const m of moves){game.move(m);const score=-search(game,depth-1,-beta,-alpha);game.undo();if(score>=beta)return beta;alpha=Math.max(alpha,score);}
 return alpha;
}
export function chooseMove(game:Chess):Move|null{
 if(game.isGameOver())return null;
 let best:Move|null=null,score=-Infinity;
 for(const m of game.moves({verbose:true})){game.move(m);const value=-search(game,1,-Infinity,Infinity);game.undo();if(value>score){score=value;best=m;}}
 return best;
}
export function statusText(game:Chess,busy=false){
 const side=game.turn()==='w'?'白':'黒';
 if(game.isCheckmate())return `チェックメイト · ${game.turn()==='w'?'黒':'白'}の勝ち`;
 if(game.isStalemate())return '引き分け · ステイルメイト';
 if(game.isThreefoldRepetition())return '引き分け · 同一局面3回';
 if(game.isInsufficientMaterial())return '引き分け · 戦力不足';
 if(game.isDrawByFiftyMoves())return '引き分け · 50手ルール';
 if(busy)return 'コンピューターが考えています';
 return `${side}の手番${game.inCheck()?' · チェック！':''}`;
}
