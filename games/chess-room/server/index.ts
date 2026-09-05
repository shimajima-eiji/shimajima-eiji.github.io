import {replayDai} from '../src/dai/engine';
import {compileLearning, emptyLearning, replay} from '../src/learning';
const DAY=86400000,RETENTION=90*DAY;
type GameRow={id:string;player_id:string;mode:string;moves:string;observations:string;revision:number;result:string|null;updated_at:number};
class ApiError extends Error{constructor(public status:number,message:string){super(message);}}
const json=(data:unknown,status=200,headers:Record<string,string>={})=>Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer',...headers}});
const token=()=>Array.from(crypto.getRandomValues(new Uint8Array(24)),b=>b.toString(16).padStart(2,'0')).join('');
async function hash(value:string){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),b=>b.toString(16).padStart(2,'0')).join('');}
const cookie=(request:Request,value:string,age=90*86400)=>`chess_session=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${age}${new URL(request.url).protocol==='https:'?'; Secure':''}`;
async function readBody(request:Request){
 if(!request.headers.get('content-type')?.startsWith('application/json'))throw new ApiError(415,'JSONが必要です。');
 const reader=request.body?.getReader();if(!reader)throw new ApiError(400,'入力がありません。');
 let size=0;const chunks:Uint8Array[]=[];
 while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>(new URL(request.url).pathname.startsWith("/api/dai/")?131072:16384)){await reader.cancel();throw new ApiError(413,'入力が大きすぎます。');}chunks.push(value);}
 const bytes=new Uint8Array(size);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.length;}
 try{return JSON.parse(new TextDecoder().decode(bytes)) as Record<string,unknown>;}catch{throw new ApiError(400,'入力が不正です。');}
}
async function current(request:Request,env:Env){
 const value=request.headers.get('cookie')?.match(/(?:^|;\s*)chess_session=([a-f0-9]{48})(?:;|$)/)?.[1];if(!value)return null;
 return env.DB.prepare('SELECT p.id, p.login_hash FROM sessions s JOIN players p ON p.id=s.player_id WHERE s.id=? AND s.expires_at>?').bind(await hash(value),Date.now()).first<{id:string;login_hash:string|null}>();
}
async function profile(env:Env,id:string,registered:boolean,variant:string){
 const rows=await env.DB.prepare('SELECT * FROM games WHERE player_id=? AND variant=? AND (archive_policy=1 OR updated_at>?) ORDER BY updated_at DESC LIMIT 50').bind(id,variant,Date.now()-RETENTION).all<GameRow>();
 const latest=rows.results[0];
 return {enabled:true,registered,model:compileLearning(rows.results),latest:latest?{id:latest.id,mode:latest.mode,moves:JSON.parse(latest.moves),revision:latest.revision,result:latest.result}:null};
}
async function sessionResponse(request:Request,env:Env,id:string,registered:boolean,variant:string){
 const secret=token();await env.DB.prepare('INSERT INTO sessions(id,player_id,expires_at) VALUES(?,?,?)').bind(await hash(secret),id,Date.now()+RETENTION).run();
 return json(await profile(env,id,registered,variant),200,{'Set-Cookie':cookie(request,secret)});
}
export default {
 async fetch(request:Request,env:Env):Promise<Response>{
  const url=new URL(request.url);
  const variant=url.pathname.startsWith("/api/dai/")?"dai":"chess";
  if(!url.pathname.startsWith('/api/')){
   const response=await env.ASSETS.fetch(request);const headers=new Headers(response.headers);
   headers.set('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; worker-src 'self'");
   headers.set('X-Content-Type-Options','nosniff');headers.set('Referrer-Policy','no-referrer');return new Response(response.body,{status:response.status,headers});
  }
  try{
   if(request.method!=='GET'){
    if(request.headers.get('origin')!==url.origin||request.headers.get('sec-fetch-site')==='cross-site')throw new ApiError(403,'別サイトからの操作は受け付けません。');
   }
   const rateKey=await hash((request.headers.get('CF-Connecting-IP')??'local')+new Date().toISOString().slice(0,10));
   if(!(await env.API_LIMITER.limit({key:rateKey})).success)throw new ApiError(429,'操作が集中しています。少し待ってください。');
   const path=variant==="dai"?url.pathname.replace("/api/dai/","/api/"):url.pathname;
   if(path==='/api/health')return json({ok:true,version:'0.4.0'});
   if(path.startsWith('/api/account')||path==='/api/session'){
    if(!(await env.AUTH_LIMITER.limit({key:rateKey})).success)throw new ApiError(429,'ログイン操作が多すぎます。1分後にお試しください。');
   }
   const user=await current(request,env);
   if(path==='/api/profile'&&request.method==='GET')return json(user?await profile(env,user.id,!!user.login_hash,variant):{enabled:false,registered:false,model:emptyLearning(),latest:null});
   if(path==='/api/session'&&request.method==='POST'){
    const body=await readBody(request);if(body.consent!==true)throw new ApiError(400,'記録への同意が必要です。');
    if(user)return json(await profile(env,user.id,!!user.login_hash,variant));
    const id=crypto.randomUUID();await env.DB.prepare('INSERT INTO players(id,created_at) VALUES(?,?)').bind(id,Date.now()).run();return sessionResponse(request,env,id,false,variant);
   }
   if(path==='/api/account/login'&&request.method==='POST'){
    const body=await readBody(request);if(typeof body.code!=='string'||! /^[a-f0-9]{48}$/.test(body.code))throw new ApiError(401,'引き継ぎコードを確認してください。');
    const account=await env.DB.prepare('SELECT id FROM players WHERE login_hash=?').bind(await hash(body.code)).first<{id:string}>();
    if(!account)throw new ApiError(401,'引き継ぎコードを確認してください。');return sessionResponse(request,env,account.id,true,variant);
   }
   if(!user)throw new ApiError(401,'記録を有効にするか、ログインしてください。');
   if(path==='/api/account/code'&&request.method==='POST'){
    const secret=token();await env.DB.prepare('UPDATE players SET login_hash=? WHERE id=?').bind(await hash(secret),user.id).run();return json({code:secret});
   }
   if(path==='/api/logout'&&request.method==='POST'){
    const value=request.headers.get('cookie')?.match(/chess_session=([a-f0-9]{48})/)?.[1];if(value)await env.DB.prepare('DELETE FROM sessions WHERE id=?').bind(await hash(value)).run();return json({ok:true},200,{'Set-Cookie':cookie(request,'',0)});
   }
   if(path==='/api/history'&&request.method==='DELETE'){
    await env.DB.prepare('DELETE FROM games WHERE player_id=? AND variant=?').bind(user.id,variant).run();return json(await profile(env,user.id,!!user.login_hash,variant));
   }
   if(path==='/api/account'&&request.method==='DELETE'){
    await env.DB.prepare('DELETE FROM players WHERE id=?').bind(user.id).run();return json({ok:true},200,{'Set-Cookie':cookie(request,'',0)});
   }
   if(path==='/api/games'&&request.method==='POST'){
    const body=await readBody(request);if(body.archiveConsent!=='archive-v1')throw new ApiError(428,'画面を再読み込みし、新しい棋譜の保存方針を確認してください。');if(!['computer','local'].includes(String(body.mode)))throw new ApiError(400,'対戦モードが不正です。');
    await env.DB.batch([
     env.DB.prepare('DELETE FROM games WHERE id IN (SELECT id FROM games WHERE archive_policy=0 AND updated_at<? LIMIT 50)').bind(Date.now()-RETENTION),
     env.DB.prepare('DELETE FROM sessions WHERE id IN (SELECT id FROM sessions WHERE expires_at<? LIMIT 100)').bind(Date.now())
    ]);
    const count=await env.DB.prepare('SELECT COUNT(*) AS n FROM games WHERE player_id=? AND created_at>?').bind(user.id,Date.now()-DAY).first<{n:number}>();if((count?.n??0)>=100)throw new ApiError(429,'今日の保存上限（100対局）に達しました。保存できるようになってから再開してください。');
    const id=crypto.randomUUID();await env.DB.prepare('INSERT INTO games(id,player_id,variant,mode,created_at,updated_at,archive_policy,archive_key) VALUES(?,?,?,?,?,?,?,?)').bind(id,user.id,variant,body.mode,Date.now(),Date.now(),body.archiveConsent==='archive-v1'?1:0,crypto.randomUUID()).run();return json({id,revision:0});
   }
   const match=path.match(/^\/api\/games\/([a-f0-9-]{36})$/);
   if(match&&request.method==='PUT'){
    const old=await env.DB.prepare('SELECT * FROM games WHERE id=? AND player_id=? AND variant=?').bind(match[1],user.id,variant).first<GameRow>();if(!old)throw new ApiError(404,'対局がありません。');
    const body=await readBody(request);if(body.archiveConsent!=='archive-v1')throw new ApiError(428,'画面を再読み込みし、新しい棋譜の保存方針を確認してください。');if(!Number.isInteger(body.revision)||body.revision!==old.revision)throw new ApiError(409,'別の端末で対局が進みました。「続きを再開」で最新の盤面を開いてください。');
    let state;try{state=variant==="dai"?replayDai(body.moves):replay(body.moves);}catch{throw new ApiError(400,'合法な棋譜ではありません。');}
    const result=await env.DB.prepare('UPDATE games SET moves=?,observations=?,revision=revision+1,result=?,updated_at=?,archive_policy=CASE WHEN ? THEN 1 ELSE archive_policy END,archive_key=COALESCE(archive_key,?) WHERE id=? AND player_id=? AND revision=?').bind(JSON.stringify(state.moves),JSON.stringify(state.observations),state.result,Date.now(),body.archiveConsent==='archive-v1'?1:0,crypto.randomUUID(),old.id,user.id,old.revision).run();
    if(!result.meta.changes)throw new ApiError(409,'別の端末の更新と重なりました。最新の盤面を再開してください。');
    return json({revision:old.revision+1,...await profile(env,user.id,!!user.login_hash,variant)});
   }
   throw new ApiError(404,'見つかりません。');
  }catch(error){return json({error:error instanceof ApiError?error.message:'保存できませんでした。盤面はそのまま遊べます。'},error instanceof ApiError?error.status:503);}
 }
} satisfies ExportedHandler<Env>;
