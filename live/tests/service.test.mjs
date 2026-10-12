import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { handleRequest, digest } from '../lib/service.mjs';
const origin = 'https://harvest-hive.bryce19461.chatgpt.site';
const example = { name:'QA Partner',email:'qa.partner@example.com',company:'QA Realty',role:'Realtor',counties:['Broward','Palm Beach'],phone:'' };

function fixture() {
  const sqlite=new DatabaseSync(':memory:');
  sqlite.exec(readFileSync(new URL('../drizzle/0000_nervous_living_lightning.sql',import.meta.url),'utf8'));
  class Statement {
    constructor(query,values=[]){this.query=query;this.values=values;}
    bind(...values){return new Statement(this.query,values);}
    async first(){return sqlite.prepare(this.query).get(...this.values)||null;}
    async all(){return {results:sqlite.prepare(this.query).all(...this.values)};}
    async run(){return sqlite.prepare(this.query).run(...this.values);}
  }
  const DB={prepare:q=>new Statement(q),batch:async statements=>{sqlite.exec('BEGIN');try{const results=[];for(const s of statements)results.push(await s.run());sqlite.exec('COMMIT');return results;}catch(e){sqlite.exec('ROLLBACK');throw e;}}};
  const env={DB,PUBLIC_ORIGIN:origin,RATE_LIMIT_SECRET:'test-salt-not-a-live-secret',GITHUB_CLIENT_ID:'test-public-client-id'};
  const request=(path,method='GET',data,extra={})=>new Request(origin+path,{method,headers:{Origin:origin,'CF-Connecting-IP':'198.51.100.10',...(data?{'Content-Type':'application/json'}:{}),...extra},...(data?{body:JSON.stringify(data)}:{})});
  const send=(path,method='GET',data,extra={},fetcher)=>handleRequest(request(path,method,data,extra),env,fetcher);
  async function start(source='Will'){
    const r=await send('/api/waitlist/start','POST',{source});assert.equal(r.status,201);
    const cookie=r.headers.get('set-cookie').split(';')[0];sqlite.prepare('UPDATE signup_starts SET created_at=?').run(new Date(Date.now()-2500).toISOString());return cookie;
  }
  async function signup(input=example){const cookie=await start();const r=await send('/api/waitlist','POST',input,{Cookie:cookie});assert.equal(r.status,201);return {cookie,data:await r.json()};}
  async function session(id='336628095',login='bryceharvestins',expired=false){const token=crypto.randomUUID().replaceAll('-','').repeat(2);sqlite.prepare('INSERT INTO sessions VALUES(?,?,?,?)').run(await digest(token),id,login,Date.now()+(expired?-1:60000));return '__Host-hive-session='+token;}
  return {sqlite,env,send,start,signup,session};
}

test('public signup persists a normalized real record; approved team identities share it',async()=>{
  const f=fixture(), {data}=await f.signup({...example,email:' QA.PARTNER@example.com '});
  assert.ok(data.profileToken);assert.match(data.id,/^[a-f0-9-]{36}$/);
  const stored=JSON.parse(f.sqlite.prepare('SELECT data FROM partners').get().data);assert.equal(stored.email,'qa.partner@example.com');assert.equal(stored.source,'Will');assert.equal(stored.profile,null);
  for(const [id,login]of [['336628095','bryceharvestins'],['92264048','AI4lifegpt3'],['341621187','mmerriam12']]){
    const r=await f.send('/api/admin/state','GET',undefined,{Cookie:await f.session(id,login)});assert.equal(r.status,200);const state=await r.json();assert.equal(state.leads.length,1);assert.equal(state.leads[0].id,data.id);assert.equal(state.starts.length,1);assert.equal(r.headers.get('cache-control'),'no-store');
  }
});
test('unauthenticated, forged, expired and non-team sessions cannot read records',async()=>{
  const f=fixture();await f.signup();
  for(const cookie of ['', '__Host-hive-session='+'f'.repeat(64),await f.session('7','someone-else'),await f.session('336628095','bryceharvestins',true)]){
    const r=await f.send('/api/admin/state','GET',undefined,{Cookie:cookie});assert.equal(r.status,401);assert.ok(!(await r.text()).includes(example.email));
  }
});
test('foreign origins, missing flows and malformed fields cannot write records',async()=>{
  const f=fixture();assert.equal((await f.send('/api/waitlist/start','POST',{source:'Will'},{Origin:'https://attacker.example'})).status,403);
  assert.equal((await f.send('/api/waitlist','POST',example)).status,400);const cookie=await f.start();
  const r=await f.send('/api/waitlist','POST',{...example,name:{unexpected:true},counties:['Atlantis']},{Cookie:cookie});assert.equal(r.status,400);assert.ok((await r.json()).errors.name);
  assert.equal(f.sqlite.prepare('SELECT count(*) n FROM partners').get().n,0);
});
test('normalized duplicates do not overwrite contacts or issue a profile capability',async()=>{
  const f=fixture(),{cookie}=await f.signup();const r=await f.send('/api/waitlist','POST',{...example,name:'Attacker',email:'QA.PARTNER@EXAMPLE.COM'},{Cookie:cookie});assert.equal(r.status,200);assert.deepEqual(await r.json(),{received:true});assert.equal(f.sqlite.prepare('SELECT count(*) n FROM partners').get().n,1);assert.equal(JSON.parse(f.sqlite.prepare('SELECT data FROM partners').get().data).name,example.name);
});
test('optional preferences require a one-use signup capability and preserve team edits',async()=>{
  const f=fixture(),{data}=await f.signup();const preferences={volume:'6–15',rewards:['HIVE gear'],priority:'Fast quotes',approval:'No',currentInsurance:'Clients find their own',barrier:'Office needs a demo.'};
  assert.equal((await f.send('/api/waitlist/profile','POST',preferences)).status,401);
  assert.equal((await f.send('/api/waitlist/profile','POST',{...preferences,rewards:['HIVE gear','Marketing credits','Vacation prize']},{Authorization:'Bearer '+data.profileToken})).status,400);
  const edit=await f.send('/api/admin/partners/'+data.id,'PATCH',{status:'Contacted',owner:'Will',notes:'Call Tuesday',followUp:'2026-10-13'},{Cookie:await f.session()});assert.equal(edit.status,200);
  assert.equal((await f.send('/api/waitlist/profile','POST',preferences,{Authorization:'Bearer '+data.profileToken})).status,200);
  assert.equal((await f.send('/api/waitlist/profile','POST',preferences,{Authorization:'Bearer '+data.profileToken})).status,401);
  const lead=JSON.parse(f.sqlite.prepare('SELECT data FROM partners').get().data);assert.equal(lead.notes,'Call Tuesday');assert.equal(lead.profile.barrier,preferences.barrier);assert.equal(f.sqlite.prepare('SELECT count(*) n FROM audit_log').get().n,1);
});
test('follow-up changes require a current team session and the correct origin',async()=>{
  const f=fixture(),{data}=await f.signup(),changes={status:'Ready for pilot',owner:'Matthew',notes:'Pilot office',followUp:''};
  assert.equal((await f.send('/api/admin/partners/'+data.id,'PATCH',changes)).status,401);
  assert.equal((await f.send('/api/admin/partners/'+data.id,'PATCH',changes,{Cookie:await f.session(),Origin:'https://attacker.example'})).status,403);
  const cookie=await f.session();assert.equal((await f.send('/api/admin/partners/'+data.id,'PATCH',changes,{Cookie:cookie})).status,200);
  const state=await(await f.send('/api/admin/state','GET',undefined,{Cookie:await f.session('341621187','mmerriam12')})).json();assert.equal(state.leads[0].owner,'Matthew');assert.equal(state.leads[0].status,'Ready for pilot');
  assert.equal((await f.send('/auth/signout','POST',{}, {Cookie:cookie})).status,200);assert.equal((await f.send('/api/admin/state','GET',undefined,{Cookie:cookie})).status,401);
});
test('honeypot and per-address limits prevent stored spam; oversized bodies are refused',async()=>{
  const f=fixture();assert.equal((await f.send('/api/waitlist','POST',{...example,website:'robot'})).status,200);assert.equal(f.sqlite.prepare('SELECT count(*) n FROM partners').get().n,0);
  assert.equal((await f.send('/api/waitlist','POST',{padding:'x'.repeat(17000)})).status,413);
  for(let i=0;i<15;i++)await f.send('/auth/github/start','POST',{}, {},async()=>new Response(JSON.stringify({error:'test-unavailable'})));
  assert.equal((await f.send('/auth/github/start','POST',{})).status,429);
});
test('GitHub verification is cookie-bound, respects polling, and admits only approved IDs',async()=>{
  for(const [id,expected]of [['92264048',200],['7',403]]){
    const f=fixture();let tokenCalls=0;
    const github=async(url,init)=>{
      if(url.endsWith('/login/device/code')){assert.equal(new URLSearchParams(init.body).get('scope'),'');return Response.json({device_code:'server-device-code',user_code:'TEST-CODE',verification_uri:'https://github.com/login/device',interval:5,expires_in:900});}
      if(url.endsWith('/login/oauth/access_token')){tokenCalls++;assert.equal(new URLSearchParams(init.body).get('device_code'),'server-device-code');return Response.json({access_token:'transient-github-access-token'});}
      assert.equal(init.headers.Authorization,'Bearer transient-github-access-token');return Response.json({id:Number(id),login:id==='92264048'?'AI4lifegpt3':'someone-else'});
    };
    const start=await f.send('/auth/github/start','POST',{}, {},github);assert.equal(start.status,201);const startData=await start.json();assert.ok(!JSON.stringify(startData).includes('server-device-code'));
    const oauthCookie=start.headers.get('set-cookie').split(';')[0];assert.equal((await f.send('/auth/github/poll','POST',{}, {},github)).status,401);
    assert.equal((await(await f.send('/auth/github/poll','POST',{}, {Cookie:oauthCookie},github)).json()).pending,true);assert.equal(tokenCalls,0);
    f.sqlite.prepare('UPDATE oauth_states SET next_poll=0').run();const signedIn=await f.send('/auth/github/poll','POST',{}, {Cookie:oauthCookie},github);assert.equal(signedIn.status,expected);assert.equal(tokenCalls,1);
    if(expected===200){const cookie=signedIn.headers.getSetCookie().find(c=>c.startsWith('__Host-hive-session')).split(';')[0];assert.match(signedIn.headers.get('set-cookie'),/Secure; HttpOnly; SameSite=Lax/);assert.equal((await f.send('/api/admin/state','GET',undefined,{Cookie:cookie})).status,200);}
    assert.equal(f.sqlite.prepare('SELECT count(*) n FROM oauth_states').get().n,0);assert.ok(!JSON.stringify(f.sqlite.prepare('SELECT * FROM sessions').all()).includes('transient-github-access-token'));
    assert.equal((await f.send('/auth/github/poll','POST',{}, {Cookie:oauthCookie},github)).status,401);
  }
});
test('expired GitHub challenges cannot be exchanged and slow-down increases the interval',async()=>{
  const f=fixture();const token='a'.repeat(64),hash=await digest(token),cookie='__Host-hive-oauth='+token;
  f.sqlite.prepare('INSERT INTO oauth_states VALUES(?,?,?,?,?)').run(hash,'test-device',Date.now()-1,5,0);
  assert.equal((await f.send('/auth/github/poll','POST',{}, {Cookie:cookie},()=>{throw Error('Must not call GitHub');})).status,401);
  f.sqlite.prepare('UPDATE oauth_states SET expires=?').run(Date.now()+60000);
  const r=await f.send('/auth/github/poll','POST',{}, {Cookie:cookie},async()=>Response.json({error:'slow_down'}));assert.equal(r.status,200);assert.equal((await r.json()).interval,10);
});
