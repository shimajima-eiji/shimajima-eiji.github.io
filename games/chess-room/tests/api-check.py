"""Opt-in integration check: creates two test identities, verifies isolation, deletes them.
Run against a local server, or explicitly pass the deployed origin.
Tokens stay in memory and are never printed.
"""
import sys,json,http.cookiejar,urllib.request,urllib.error
origin=sys.argv[1] if len(sys.argv)>1 else 'http://localhost:8787'
def client(): return urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
def call(c,path,method='GET',body=None,expected=200,request_origin=None):
    headers={'User-Agent':'ChessRoom-Verification/0.2','Origin':request_origin or origin,'Content-Type':'application/json'}
    req=urllib.request.Request(origin+'/api/'+path,method=method,headers=headers,data=json.dumps(body).encode() if body is not None else None)
    try: response=c.open(req,timeout=30)
    except urllib.error.HTTPError as e: response=e
    assert response.status==expected, (path,response.status,expected)
    return json.load(response)
a,b=client(),client()
assert call(a,'profile')['enabled'] is False
call(a,'session','POST',{'consent':True},403,'https://untrusted.example')
call(a,'session','POST',{'consent':False},400)
call(a,'session','POST',{'consent':True})
call(b,'session','POST',{'consent':True})
game=call(a,'games','POST',{'mode':'computer'})
path='games/'+game['id']
call(b,path,'PUT',{'moves':['e4'],'revision':0},404)
call(a,path,'PUT',{'moves':['e5'],'revision':0},400)
saved=call(a,path,'PUT',{'moves':['e4','e5','Nf3'],'revision':0})
assert saved['latest']['moves']==['e4','e5','Nf3'] and saved['model']['observations']==2
call(a,path,'PUT',{'moves':['d4'],'revision':0},409)
assert call(b,'profile')['latest'] is None
secret=call(a,'account/code','POST')['code']
call(b,'account','DELETE')
call(b,'account/login','POST',{'code':secret})
assert call(b,'profile')['latest']['moves']==['e4','e5','Nf3']
updated=call(b,path,'PUT',{'moves':['e4','e5','Nf3','Nc6'],'revision':1})
assert call(a,'profile')['latest']['revision']==2
# Undo replaces observations rather than counting the same moves twice.
call(a,path,'PUT',{'moves':['e4','e5'],'revision':2})
assert call(a,'profile')['model']['observations']==1
call(b,'history','DELETE')
assert call(a,'profile')['model']['observations']==0
call(a,'account','DELETE')
assert call(b,'profile')['enabled'] is False
print('PASS: consent, CSRF, illegal moves, isolation, cross-device login/resume, conflict, undo, deletion, session revocation')
