import {allMoves,makeUnchecked,effective,specs,royal,learningKey,moveKey,positionKey} from './engine.ts';
import type {State,Move,Side} from './engine.ts';
import type {Learning} from '../learning.ts';
function material(state:State,side:Side){let n=0;for(const p of state.board)if(p)n+=(p.side===side?1:-1)*specs[effective(p)].value;return n;}
function gain(state:State,m:Move){const p=state.board[m.from]!;let value=0;for(const sq of new Set(m.path)){const target=state.board[sq];if(sq!==m.from&&target&&target.side!==p.side)value+=royal(target)?15000:specs[effective(target)].value;}
 if(m.promote)value+=specs[specs[p.kind].to!].value-specs[p.kind].value;
 return value;}
export function chooseDai(state:State,model:Learning){
 const candidates=allMoves(state);if(!candidates.length)return {move:null,seen:0};
 // Search every candidate's immediate opponent captures. No self-play or remote model.
 const starting=material(state,state.turn);let best=-Infinity,chosen:Move|null=null,used=0;
 for(const move of candidates){
  const next=makeUnchecked(state,move);next.seen=new Set(state.seen);next.seen.add(positionKey(next));
  if(next.winner===state.turn)return {move,seen:0};
  const replies=allMoves(next,false);let threat=0,total=0,weighted=0;
  const counts=model.counts[learningKey(next)]??{};
  for(const reply of replies){const g=gain(next,reply);threat=Math.max(threat,g);const n=counts[moveKey(reply)]??0;total+=n;weighted+=g*n;}
  const confidence=total>=2?Math.min(.5,total/(total+6)):0;
  const risk=threat*(1-confidence)+(total?weighted/total:threat)*confidence;
  const piece=state.board[move.from]!;const to=move.path.at(-1)!;
  const forward=(Math.floor(move.from/15)-Math.floor(to/15))*(piece.side===0?1:-1);
  const development=royal(piece)?0:forward*3+(7-Math.abs(7-to%15))*.4;
  const value=material(next,state.turn)-starting-risk+development;
  if(value>best){best=value;chosen=move;used=total>=2?total:0;}
 }
 return {move:chosen,seen:used};
}
