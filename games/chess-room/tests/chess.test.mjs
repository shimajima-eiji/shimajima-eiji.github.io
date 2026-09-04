import test from 'node:test';
import assert from 'node:assert/strict';
import {Chess} from 'chess.js';
import {chooseMove,statusText} from '../src/chess-engine.ts';
import {chooseAdaptiveMove,adaptiveCandidates} from '../src/adaptive.ts';
import {emptyLearning,compileLearning,replay,positionKey} from '../src/learning.ts';
test('legal moves, special moves and repetition survive replay',()=>{
 assert.equal(new Chess().moves().length,20);
 const castling=new Chess('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1');assert.ok(castling.moves().includes('O-O'));castling.move('O-O');assert.equal(castling.get('f1').type,'r');
 const ep=new Chess();['e4','a6','e5','d5','exd6'].forEach(m=>ep.move(m));assert.equal(ep.get('d5'),undefined);
 const promotion=new Chess('7k/P7/8/8/8/8/8/7K w - - 0 1');assert.equal(promotion.moves({verbose:true}).filter(m=>m.promotion).length,4);
 const repetition=replay(['Nf3','Nf6','Ng1','Ng8','Nf3','Nf6','Ng1','Ng8']);assert.equal(repetition.result,'draw');
 assert.throws(()=>replay(['e5']));assert.throws(()=>replay(Array(501).fill('e4')));
});
test('mate is recognized; search preserves the full game',()=>{
 const game=new Chess();['f3','e5','g4'].forEach(m=>game.move(m));const before=game.history();const best=chooseMove(game);assert.equal(best.san,'Qh4#');assert.deepEqual(game.history(),before);game.move(best);assert.match(statusText(game),/チェックメイト/);
});
test('logging records white choices and excludes local two-player games',()=>{
 const game=replay(['e4','e5','Nf3']);assert.equal(game.observations.length,2);
 const row={observations:JSON.stringify(game.observations),mode:'computer',result:null};
 assert.equal(compileLearning([row,{...row,mode:'local'}]).observations,2);
 assert.equal(compileLearning([{...row,observations:'[]'}]).observations,0);
});
test('empty model uses baseline, individual repeated responses change legal choice',()=>{
 const game=new Chess();game.move('e4');const initial=game.fen(),history=game.history();
 const baseline=chooseAdaptiveMove(game,emptyLearning());assert.equal(baseline.move.lan,chooseMove(game).lan);
 let found=false;
 // A/B: hold position fixed and vary only one player's observed response frequencies.
 for(const candidate of adaptiveCandidates(game,emptyLearning())){
  if(candidate.move.lan===baseline.move.lan)continue;
  game.move(candidate.move);const key=positionKey(game.fen());const replies=game.moves({verbose:true});game.undo();
  for(const reply of replies){const model=emptyLearning();model.observations=20;model.games=20;model.counts[key]={[reply.lan]:20};const learned=chooseAdaptiveMove(game,model);
   if(learned.move.lan!==baseline.move.lan&&learned.adapted){assert.ok(game.moves().includes(learned.move.san));found=true;break;}}
  if(found)break;
 }
 assert.ok(found,'user history must affect a real choice');assert.equal(game.fen(),initial);assert.deepEqual(game.history(),history);
});
