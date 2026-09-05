import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState,specs,effective,movesFrom,apply,allMoves,positionKey,replayDai,learningKey,makeUnchecked,moveKey} from '../src/dai/engine.ts';
import {chooseDai} from '../src/dai/computer.ts';
import {emptyLearning} from '../src/learning.ts';
function fixture(pieces,turn=0){const board=Array(225).fill(null);board[224]={kind:'K',side:0,promoted:false};board[0]={kind:'K',side:1,promoted:false};for(const [sq,kind,side=0,promoted=false] of pieces)board[sq]=kind?{kind,side,promoted}:null;const state={board,turn,seen:new Set(),ply:0,winner:null};state.seen.add(positionKey(state));return state;}
const move=(from,path,promote=false)=>({from,path,promote});
const destinations=(s,from)=>new Set(movesFrom(s,from).map(m=>m.path.at(-1)));
test('225 squares, 65 per side, 29 original types, 36 movement types; rotational setup',()=>{
 const s=initialState();assert.equal(s.board.length,225);assert.equal(Object.keys(specs).length,37);
 for(const side of [0,1]){const ps=s.board.filter(p=>p?.side===side);assert.equal(ps.length,65);assert.equal(new Set(ps.map(p=>p.kind)).size,29);}
 for(let i=0;i<225;i++)assert.equal(s.board[i]?.kind,s.board[224-i]?.kind);
 assert.equal(s.board[186].kind,'KR');assert.equal(s.board[38].kind,'KR');
});
test('step and range cardinalities for every non-lion piece on an empty center',()=>{
 const expected={K:8,P:1,GB:2,L:7,N:2,ST:2,I:3,C:4,S:5,G:6,RC:14,CS:4,FL:6,BT:7,DE:7,VO:8,AB:4,EW:5,KR:8,PH:8,R:28,FD:8,SM:16,VM:16,B:28,DH:32,DK:32,Q:56,WH:28,WL:28,CP:8,FS:20,FO:42,FB:42};
 for(const [kind,count] of Object.entries(expected)){const s=fixture([[0,null],[224,null],[112,kind]]);assert.equal(destinations(s,112).size,count,kind);}
});
test('orientation, blockers and leaps are distinguished',()=>{
 assert.ok(destinations(fixture([[112,'P']]),112).has(97));assert.ok(destinations(fixture([[112,'P',1]],1),112).has(127));
 for(const kind of ['VO','R']){const d=destinations(fixture([[112,kind],[97,'P']]),112);assert.ok(!d.has(82));}
 assert.ok(destinations(fixture([[112,'KR'],[97,'P']]),112).has(82));
 assert.ok(destinations(fixture([[112,'PH'],[96,'P']]),112).has(80));
});
test('lion jumps, two captures, igui, pass, and repeated passes',()=>{
 const s=fixture([[112,'LN'],[111,'P',1],[96,'P',1]]);
 const next=apply(s,move(112,[111,96]));assert.equal(next.board[111],null);assert.equal(next.board[96].kind,'LN');
 const igui=apply(s,move(112,[111,112]));assert.equal(igui.board[111],null);assert.equal(igui.board[112].kind,'LN');
 const leap=fixture([[112,'LN'],[97,'P']]);assert.ok(destinations(leap,112).has(82));assert.ok(!movesFrom(leap,112).some(m=>m.path[0]===97));
 const pass=fixture([[112,'LN'],[145,'LN',1]]);const passed=apply(pass,move(112,[111,112]));assert.throws(()=>apply(passed,move(145,[144,145])));
});
test('falcon and eagle directional double capture and jump',()=>{
 const falcon=fixture([[112,'DH',0,true],[97,'P',1],[82,'P',1]]);assert.equal(effective(falcon.board[112]),'HF');assert.equal(apply(falcon,move(112,[97,82])).board[97],null);assert.ok(!movesFrom(falcon,112).some(m=>m.path.join('.')==='97.81'));
 const eagle=fixture([[112,'DK',0,true],[96,'P',1],[80,'P',1]]);assert.equal(apply(eagle,move(112,[96,80])).board[96],null);assert.ok(destinations(eagle,112).has(80));assert.ok(!movesFrom(eagle,112).some(m=>m.path.join('.')==='96.82'));
});
test('optional promotion on entry/capture, no double promotion, dead pieces allowed',()=>{
 const s=fixture([[82,'P']]);assert.equal(movesFrom(s,82).filter(m=>m.path[0]===67).length,2);
 const declined=apply(s,move(82,[67]));declined.turn=0;assert.throws(()=>apply(declined,move(67,[52],true)));
 const take=fixture([[67,'P'],[52,'P',1]]);assert.equal(effective(apply(take,move(67,[52],true)).board[52]),'G');
 const promoted=fixture([[82,'P',0,true]]);assert.ok(movesFrom(promoted,82).every(m=>!m.promote));
 assert.equal(movesFrom(fixture([[7,'P']]),7).length,0);
});
test('king and prince both must be captured, king exposure allowed, no drops',()=>{
 const s=fixture([[15,'R'],[10,'DE',1,true]]);const a=apply(s,move(15,[0]));assert.equal(a.winner,null);a.turn=0;const b=apply(a,move(0,[10]));assert.equal(b.winner,0);
 const lone=fixture([[15,'R']]);assert.equal(apply(lone,move(15,[0])).winner,0);
 assert.throws(()=>apply(s,{drop:'P',path:[100],promote:false}));assert.throws(()=>apply(s,move(15,[16,17])));
});
test('server replay retains every move, rejects invalid input and undo rewrites history',()=>{
 const first=allMoves(initialState()).find(m=>m.from===150);const s=apply(initialState(),first);const second=allMoves(s)[0];const full=replayDai([first,second]);assert.equal(full.state.ply,2);assert.equal(full.observations.length,1);assert.equal(replayDai([]).observations.length,0);assert.throws(()=>replayDai([{from:900,path:[0],promote:false}]));
});
test('computer returns legal move without mutating state; individual history changes decision',()=>{
 const s=fixture([[100,'R',1],[130,'R'],[115,'DE']],1);const original=positionKey(s);const baseline=chooseDai(s,emptyLearning());assert.ok(allMoves(s).some(m=>moveKey(m)===moveKey(baseline.move)));
 let changed=false;
 for(const m of allMoves(s)){
  if(moveKey(m)===moveKey(baseline.move))continue;const next=makeUnchecked(s,m);if(next.winner!==null)continue;
  const reply=allMoves(next).find(r=>!r.path.some(sq=>next.board[sq]?.side===1));if(!reply)continue;
  const model=emptyLearning();model.observations=100;model.counts[learningKey(next)]={[moveKey(reply)]:100};const learned=chooseDai(s,model);
  if(moveKey(learned.move)!==moveKey(baseline.move)&&learned.seen){changed=true;break;}
 }
 assert.ok(changed,'a personal response model must change a move');assert.equal(positionKey(s),original);
});
