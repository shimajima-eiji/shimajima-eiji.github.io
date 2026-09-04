import {Chess} from 'chess.js';
export type Observation={position:string;move:string};
export type Learning={counts:Record<string,Record<string,number>>;observations:number;games:number;wins:number;losses:number};
export const emptyLearning=():Learning=>({counts:{},observations:0,games:0,wins:0,losses:0});
export const positionKey=(fen:string)=>fen.split(' ').slice(0,4).join(' ');
export function compileLearning(rows:{observations:string;result:string|null;mode:string}[]):Learning{
 const model=emptyLearning();
 for(const row of rows){if(row.mode!=='computer')continue;const observations=JSON.parse(row.observations) as Observation[];if(observations.length)model.games++;if(row.result==='white')model.wins++;if(row.result==='black')model.losses++;
 for(const o of observations){const counts=model.counts[o.position]??(model.counts[o.position]={});counts[o.move]=(counts[o.move]??0)+1;model.observations++;}}
 return model;
}
export function replay(moves:unknown){
 if(!Array.isArray(moves)||moves.length>500||moves.some(m=>typeof m!=='string'||m.length>12))throw Error('棋譜が不正です（最大500手）。');
 const game=new Chess(),observations:Observation[]=[];
 for(const san of moves){if(game.isGameOver())throw Error('終局後には指せません。');const key=positionKey(game.fen());const move=game.move(san,{strict:true});if(move.color==='w')observations.push({position:key,move:move.lan});}
 const result=game.isCheckmate()?(game.turn()==='w'?'black':'white'):game.isDraw()?'draw':null;
 return {moves:game.history(),observations,result,fen:game.fen()};
}
