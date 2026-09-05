import {useEffect,useRef,useState} from 'react';
import {emptyLearning} from './learning';
import type {Learning} from './learning';
type Saved<T>={id:string;mode:string;moves:T[];revision:number;result:string|null};
type Profile<T=string>={enabled:boolean;registered:boolean;model:Learning;latest:Saved<T>|null};
const empty=<T,>():Profile<T>=>({enabled:false,registered:false,model:emptyLearning(),latest:null});
async function api<T=Profile>(path:string,method='GET',body?:unknown){
 const response=await fetch('/api/'+path,{method,credentials:'same-origin',headers:body===undefined?{}:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(12000)});
 const data=await response.json() as T & {error?:string};if(!response.ok)throw Error(data.error??'接続できません。');return data;
}
export function useRecording<T=string>(moves:T[],mode:string,gameKey:number,onResume:(saved:Saved<T>)=>void,variant: 'chess'|'dai'='chess'){
 const endpoint=(path:string)=>variant==='dai'?'dai/'+path:path;
 const request=<R=Profile<T>,>(path:string,method='GET',body?:unknown)=>api<R>(endpoint(path),method,body);
 const [profile,setProfile]=useState<Profile<T>>(()=>empty<T>()),[recording,setRecording]=useState(false),[working,setWorking]=useState(false),[status,setStatus]=useState('保存方針を確認して対局を開始してください。');
 const [privateMode,setPrivateMode]=useState(false);
 const [accepted,setAccepted]=useState(false),[savedSignature,setSavedSignature]=useState('');
 const [code,setCode]=useState(''),[login,setLogin]=useState('');
 const queue=useRef<Promise<void>>(Promise.resolve()),generation=useRef(0),remote=useRef<{key:number;id:string;revision:number}|null>(null);
 const currentKey=useRef(gameKey);currentKey.current=gameKey;
 useEffect(()=>{let active=true;request('profile').then(p=>{if(active)setProfile(p);}).catch(()=>{if(active)setStatus('保存先に接続できません。再接続してから対局を開始してください。');});return()=>{active=false;};},[]);
 const serialized=JSON.stringify(moves);
 useEffect(()=>{
  if(!recording||privateMode)return;
  const gen=generation.current;
  queue.current=queue.current.then(async()=>{
   if(gen!==generation.current)return;
   if(!moves.length&&remote.current?.key!==gameKey){setSavedSignature(JSON.stringify([serialized,mode,gameKey]));setStatus('保存準備完了。一手ごとに自動保存します。');return;}
   setStatus('保存中…');
   try{
    if(remote.current?.key!==gameKey){const created=await request<{id:string;revision:number}>('games','POST',{mode,archiveConsent:'archive-v1'});remote.current={key:gameKey,...created};}
    const r=remote.current!;
    const data=await request<Profile<T> & {revision:number}>('games/'+r.id,'PUT',{moves,revision:r.revision,archiveConsent:'archive-v1'});r.revision=data.revision;
    if(gen===generation.current){setProfile(data);setSavedSignature(JSON.stringify([serialized,mode,gameKey]));setStatus('保存済み');}
   }catch(error){if(gen===generation.current){generation.current++;setRecording(false);setStatus(String((error as Error).message)+' 記録を停止しました。');}}
  });
 },[serialized,mode,gameKey,recording,privateMode]);
 async function operation(task:()=>Promise<void>){
  if(working)return;
  setWorking(true);setCode('');
  try{await queue.current;generation.current++;setRecording(false);await task();}catch(error){setStatus((error as Error).message);}finally{setWorking(false);}
 }
 async function enable(){await operation(async()=>{const p=await request('session','POST',{consent:true});setProfile(p);setAccepted(true);setRecording(true);setStatus('この対局の記録を開始しました。');});}
 async function resume(){await operation(async()=>{const p:Profile<T>=await request('profile');setProfile(p);if(!p.latest){setStatus('再開できる対局がありません。');return;}remote.current={key:currentKey.current+1,id:p.latest.id,revision:p.latest.revision};onResume(p.latest);setRecording(true);setStatus('保存した盤面を再開しました。');});}
 const purpose=variant==='dai'?'大将棋はプレイヤーが少なく、AIを開発するための棋譜を集めるのが難しいゲームです。あなたの対局を、今後のAIの開発・改善に役立てたいと考えています。棋譜の収集にご協力いただけると、大変ありがたいです。':null;
 const panel=privateMode?<section className="account"><h2>プライベートで対局中</h2><p>棋譜はサーバーに送信しません。画面を閉じると対局は失われます。</p></section>:<section className="account"><h2>{variant==='dai'?'あなたを覚える大将棋':'あなたを覚えるチェス'}</h2><p>記録したコンピューター戦の{variant==='dai'?'先手':'白'}の手を学習します。直近最大50対局を参照し、同じ局面の選択に合わせて応手を変えます。</p><p className="learning-count">{profile.model.games} 対局 / {profile.model.observations} 手を記憶</p><p role="status" aria-live="polite">{status}</p><div className="account-actions">
 <button disabled={working||recording} onClick={enable}>{recording?'全ての手を自動保存中':'保存して対局を再開'}</button>
 {profile.latest&&<button disabled={working} onClick={resume}>続きを再開（{profile.latest.moves.length}手）</button>}
 </div><details><summary>ログイン・端末の引き継ぎ</summary><p>引き継ぎコードで別端末からログインすると、最新の対局と学習履歴を開けます。コードを知る人は履歴にアクセスできるため、パスワードとして保管してください。</p>
 {profile.enabled&&<button disabled={working} onClick={()=>operation(async()=>{const data=await request<{code:string}>('account/code','POST');setCode(data.code);setProfile(p=>({...p,registered:true}));setStatus('コードを保管してください。記録は停止中です。');})}>{profile.registered?'コードを再発行（旧コードを無効化）':'引き継ぎコードを発行'}</button>}
 {code&&<label>今回だけ表示する引き継ぎコード<input aria-label="発行した引き継ぎコード" readOnly value={code} onFocus={e=>e.currentTarget.select()}/></label>}
 <form onSubmit={e=>{e.preventDefault();const value=login.trim();setLogin('');operation(async()=>{const p=await request('account/login','POST',{code:value});remote.current=null;setProfile(p);setStatus('ログインしました。「続きを再開」で保存した盤面を開けます。');});}}><label>引き継ぎコード<input aria-label="ログイン用引き継ぎコード" type="password" autoComplete="off" value={login} onChange={e=>setLogin(e.target.value)} required pattern="[a-f0-9]{48}"/></label><button disabled={working}>ログイン</button></form>
 {profile.enabled&&<button disabled={working} onClick={()=>operation(async()=>{await request('logout','POST');remote.current=null;setProfile(empty<T>());setStatus('ログアウトしました。対局を再開すると新しい匿名ユーザーとして記録します。');})}>ログアウト</button>}
 </details><details><summary>記録とプライバシー</summary>{purpose&&<p>{purpose}</p>}<p>棋譜提供を選んだ対局の棋譜・対戦モード・結果・保存日時を、途中の盤面と「待った」前の履歴も含めて管理側に期限を設けず非公開で保存します。名前やメールは収集しません。管理者と本人のログイン済み端末が棋譜を取得できます。ログイン維持には90日間のCookieを使います。</p><p>履歴・アカウントを削除すると、棋譜とユーザーの紐づけを外し、棋譜自体は管理側に残します。現在の対戦AIは、本人の棋譜を使って応手を調整します。他のユーザーの棋譜での自動学習や自己対戦は行っていません。IPアドレスは棋譜DBに保存しません。通信エラー時は対局を一時停止します。以前の保存方針の棋譜は、ここで再開した場合に新しい保存方針へ移ります。</p>
 {profile.enabled&&<><button disabled={working} onClick={()=>{if(confirm('このゲームの履歴と学習情報を削除しますか？新しい保存方針の棋譜は本人との紐づけを外して管理側に残ります。'))operation(async()=>{setProfile(await request('history','DELETE'));remote.current=null;setStatus('本人の履歴と学習情報を削除しました。管理側の棋譜は紐づけを外して保持しています。');});}}>このゲームの棋譜と学習履歴を削除</button><button disabled={working} onClick={()=>{if(confirm('チェスと大将棋のアカウント・本人の履歴・全端末のログインを削除しますか？新しい保存方針の棋譜は本人との紐づけを外して管理側に残ります。'))operation(async()=>{await request('account','DELETE');remote.current=null;setProfile(empty<T>());setStatus('アカウントを削除しました。管理側の棋譜は紐づけを外して保持しています。');});}}>共通アカウントを削除</button></>}
 </details></section>;
 const gate=!accepted?<dialog ref={node=>{if(node&&!node.open)node.showModal();}} onCancel={event=>event.preventDefault()}><h2>あなたの指し方を覚えるAIと遊ぼう</h2><p><strong>棋譜を送ると、AIがあなたのよく選ぶ手を覚え、応手を変えていきます。</strong></p><p>{variant==='dai'?'棋譜が集まりにくい大将棋。あなたの一局が、AIの開発・改善の助けになります。':'あなたの一局を、AIの開発・改善に役立てたいと考えています。'}</p><p>提供した棋譜は非公開・期限なしで保存し、アカウント削除後も本人との紐づけを外して保持します。</p><p>プライベートでは棋譜を送信せず、この画面だけで遊べます。</p>{working&&<p role="status">接続中…</p>}{!working&&status!=='保存方針を確認して対局を開始してください。'&&<p role="status">{status}</p>}<button disabled={working} onClick={enable}>棋譜提供に協力して遊ぶ</button><button disabled={working} onClick={()=>{setPrivateMode(true);setAccepted(true);}}>プライベートで遊ぶ</button></dialog>:null;
 return {panel,gate,model:privateMode?emptyLearning():profile.model,working,ready:privateMode||recording&&!working&&savedSignature===JSON.stringify([serialized,mode,gameKey])};
}
