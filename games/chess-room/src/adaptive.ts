import {Chess} from 'chess.js';
import type {Move} from 'chess.js';
import {evaluate,chooseMove} from './chess-engine.ts';
import {positionKey} from './learning.ts';
import type {Learning} from './learning.ts';
export function adaptiveCandidates(game:Chess,model:Learning){
 const candidates: {move:Move;worst:number;expected:number;seen:number}[]=[];
 for(const move of game.moves({verbose:true})){
  game.move(move);
  const counts=model.counts[positionKey(game.fen())]??{};
  let worst=Infinity,total=0,weighted=0;
  if(game.isGameOver())worst=game.isCheckmate()?100001:0;
  else for(const reply of game.moves({verbose:true})){
   game.move(reply);
   const score=game.isCheckmate()?-100000:game.isDraw()?0:evaluate(game);
   game.undo();worst=Math.min(worst,score);
   const n=counts[reply.lan]??0;total+=n;weighted+=score*n;
  }
  game.undo();
  const confidence=total>=2?Math.min(.65,total/(total+5)):0;
  candidates.push({move,worst,expected:worst*(1-confidence)+(total?weighted/total:worst)*confidence,seen:total});
 }
 return candidates;
}
export function chooseAdaptiveMove(game:Chess,model:Learning){
 if(game.turn()!=='b'||!model.observations)return {move:chooseMove(game),adapted:false,seen:0};
 const candidates=adaptiveCandidates(game,model);if(!candidates.length)return {move:null,adapted:false,seen:0};
 const best=Math.max(...candidates.map(c=>c.worst));
 // Recent wins widen the challenge slightly; losses keep play more forgiving.
 // The bounded margin never substitutes for a discovered forced mate.
 const margin=Math.max(40,Math.min(120,80+(model.wins-model.losses)*5));
 const eligible=candidates.filter(c=>c.worst>=best-margin);
 eligible.sort((a,b)=>b.expected-a.expected||b.worst-a.worst);
 const selected=eligible[0];
 return {move:selected.move,adapted:selected.seen>=2,seen:selected.seen};
}
