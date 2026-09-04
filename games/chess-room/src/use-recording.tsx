import {useEffect,useRef,useState} from 'react';
import {emptyLearning} from './learning';
import type {Learning} from './learning';
type Saved={id:string;mode:string;moves:string[];revision:number;result:string|null};
type Profile={enabled:boolean;registered:boolean;model:Learning;latest:Saved|null};
const empty=():Profile=>({enabled:false,registered:false,model:emptyLearning(),latest:null});
async function api<T=Profile>(path:string,method='GET',body?:unknown){
 const response=await fetch('/api/'+path,{method,credentials:'same-origin',headers:body===undefined?{}:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(12000)});
 const data=await response.json() as T & {error?:string};if(!response.ok)throw Error(data.error??'接続できません。');return data;
}
export function useRecording(moves:string[],mode:string,gameKey:number,onResume:(saved:Saved)=>void){
 const [profile,setProfile]=useState<Profile>(empty),[recording,setRecording]=useState(false),[working,setWorking]=useState(false),[status,setStatus]=useState('記録なしで遊べます。');
 const [code,setCode]=useState(''),[login,setLogin]=useState('');
 const queue=useRef<Promise<void>>(Promise.resolve()),generation=useRef(0),remote=useRef<{key:number;id:string;revision:number}|null>(null);
 const currentKey=useRef(gameKey);currentKey.current=gameKey;
 useEffect(()=>{let active=true;api('profile').then(p=>{if(active)setProfile(p);}).catch(()=>{if(active)setStatus('保存先に接続できません。記録なしで遊べます。');});return()=>{active=false;};},[]);
 const serialized=JSON.stringify(moves);
 useEffect(()=>{
  if(!recording)return;
  const gen=generation.current;
  queue.current=queue.current.then(async()=>{
   if(gen!==generation.current)return;
   if(!moves.length&&remote.current?.key!==gameKey)return;
   setStatus('保存中…');
   try{
    if(remote.current?.key!==gameKey){const created=await api<{id:string;revision:number}>('games','POST',{mode});remote.current={key:gameKey,...created};}
    const r=remote.current!;
    const data=await api<Profile & {revision:number}>('games/'+r.id,'PUT',{moves,revision:r.revision});r.revision=data.revision;
    if(gen===generation.current){setProfile(data);setStatus('保存済み');}
   }catch(error){if(gen===generation.current){generation.current++;setRecording(false);setStatus(String((error as Error).message)+' 記録を停止しました。');}}
  });
 },[serialized,mode,gameKey,recording]);
 async function operation(task:()=>Promise<void>){
  if(working)return;
  generation.current++;setRecording(false);setWorking(true);setCode('');
  try{await queue.current;await task();}catch(error){setStatus((error as Error).message);}finally{setWorking(false);}
 }
 async function enable(){await operation(async()=>{const p=await api('session','POST',{consent:true});setProfile(p);setRecording(true);setStatus('この対局の記録を開始しました。');});}
 async function resume(){await operation(async()=>{const p:Profile=await api('profile');setProfile(p);if(!p.latest){setStatus('再開できる対局がありません。');return;}remote.current={key:currentKey.current+1,id:p.latest.id,revision:p.latest.revision};onResume(p.latest);setRecording(true);setStatus('保存した盤面を再開しました。');});}
 const panel=<section className="account"><h2>あなたを覚えるチェス</h2><p>記録したコンピューター戦の白の手を学習します。直近90日・最大50対局を参照し、同じ局面の選択に合わせて応手を変えます。</p><p className="learning-count">{profile.model.games} 対局 / {profile.model.observations} 手を記憶</p><p role="status" aria-live="polite">{status}</p><div className="account-actions">
 <button disabled={working} onClick={()=>recording?operation(async()=>{setStatus('記録を停止しました。保存済み棋譜は残ります。');}):enable()}>{recording?'記録を止める':'この対局を記録・学習する'}</button>
 {profile.latest&&<button disabled={working} onClick={resume}>続きを再開（{profile.latest.moves.length}手）</button>}
 </div><details><summary>ログイン・端末の引き継ぎ</summary><p>引き継ぎコードで別端末からログインすると、最新の対局と学習履歴を開けます。コードを知る人は履歴にアクセスできるため、パスワードとして保管してください。</p>
 {profile.enabled&&<button disabled={working} onClick={()=>operation(async()=>{const data=await api<{code:string}>('account/code','POST');setCode(data.code);setProfile(p=>({...p,registered:true}));setStatus('コードを保管してください。記録は停止中です。');})}>{profile.registered?'コードを再発行（旧コードを無効化）':'引き継ぎコードを発行'}</button>}
 {code&&<label>今回だけ表示する引き継ぎコード<input aria-label="発行した引き継ぎコード" readOnly value={code} onFocus={e=>e.currentTarget.select()}/></label>}
 <form onSubmit={e=>{e.preventDefault();const value=login.trim();setLogin('');operation(async()=>{const p=await api('account/login','POST',{code:value});remote.current=null;setProfile(p);setStatus('ログインしました。「続きを再開」で保存した盤面を開けます。');});}}><label>引き継ぎコード<input aria-label="ログイン用引き継ぎコード" type="password" autoComplete="off" value={login} onChange={e=>setLogin(e.target.value)} required pattern="[a-f0-9]{48}"/></label><button disabled={working}>ログイン</button></form>
 {profile.enabled&&<button disabled={working} onClick={()=>operation(async()=>{await api('logout','POST');remote.current=null;setProfile(empty());setStatus('ログアウトしました。記録なしで遊べます。');})}>ログアウト</button>}
 </details><details><summary>記録とプライバシー</summary><p>記録は任意です。棋譜・対戦モード・結果・保存日時とランダムな識別子を非公開で保存します。名前やメールは収集しません。本人のログイン済み端末だけが取得できます。ログイン維持には90日間のCookieを使います。</p><p>90日を過ぎた棋譜は参照対象から外れ、次の対局作成時に順次削除します。Cloudflareの通信処理にはIPアドレスが使われますが、このアプリの棋譜DBには保存しません。自己対戦や他のユーザーの棋譜での学習は行いません。記録しない対局は再読み込みで失われます。</p>
 {profile.enabled&&<><button disabled={working} onClick={()=>{if(confirm('保存した全棋譜と学習履歴を削除しますか？'))operation(async()=>{setProfile(await api('history','DELETE'));remote.current=null;setStatus('棋譜と学習履歴を削除しました。記録は停止中です。');});}}>棋譜と学習履歴を削除</button><button disabled={working} onClick={()=>{if(confirm('アカウント・全棋譜・全端末のログインを削除しますか？'))operation(async()=>{await api('account','DELETE');remote.current=null;setProfile(empty());setStatus('アカウントを削除しました。');});}}>アカウントを削除</button></>}
 </details></section>;
 return {panel,model:profile.model,working};
}
