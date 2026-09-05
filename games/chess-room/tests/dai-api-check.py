"""Creates/deletes test-only accounts; validates variant isolation and portable login."""
import sys,json,http.cookiejar,urllib.request,urllib.error
origin=sys.argv[1] if len(sys.argv)>1 else 'http://localhost:8787'
def client():return urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
def call(c,path,method='GET',body=None,expected=200):
 req=urllib.request.Request(origin+'/api/'+path,method=method,headers={'User-Agent':'DaiShogi-Verification/0.3','Origin':origin,'Content-Type':'application/json'},data=None if body is None else json.dumps(body).encode())
 try:r=c.open(req,timeout=30)
 except urllib.error.HTTPError as e:r=e
 assert r.status==expected,(path,r.status,expected)
 return json.load(r)
a,b=client(),client()
call(a,'dai/session','POST',{'consent':True});call(b,'dai/session','POST',{'consent':True})
chess=call(a,'games','POST',{'mode':'computer'})
call(a,'games/'+chess['id'],'PUT',{'moves':['e4'],'revision':0})
game=call(a,'dai/games','POST',{'mode':'computer'});path='dai/games/'+game['id']
first={'from':150,'path':[135],'promote':False}
second={'from':60,'path':[75],'promote':False}
call(a,path,'PUT',{'moves':[first,second],'revision':0})
assert call(a,'profile')['latest']['moves']==['e4']
assert call(a,'dai/profile')['latest']['moves']==[first,second]
call(a,'games/'+game['id'],'PUT',{'moves':['e4'],'revision':1},404)
call(b,path,'PUT',{'moves':[first],'revision':1},404)
call(a,path,'PUT',{'moves':[first],'revision':0},409)
call(a,path,'PUT',{'moves':[{'from':150,'path':[120],'promote':False}],'revision':1},400)
code=call(a,'dai/account/code','POST')['code']
call(b,'dai/account','DELETE')
call(b,'dai/account/login','POST',{'code':code})
assert call(b,'dai/profile')['latest']['moves']==[first,second]
assert call(b,'profile')['latest']['moves']==['e4']
call(b,'dai/history','DELETE')
assert call(a,'dai/profile')['model']['observations']==0
assert call(a,'profile')['model']['observations']==1
call(a,'account','DELETE')
assert call(b,'dai/profile')['enabled'] is False
print('PASS: Dai replay, cross-user and chess/Dai isolation, invalid move, conflict, cross-device login/resume, scoped deletion, shared revocation')
