import { mkdir, writeFile, readdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

const directory = 'postman/collections/Spending Diary';
const folders = new Map();
const tests = code => [{ type: 'afterResponse', language: 'text/javascript', code }];
const assertStatus = status => `pm.test('HTTP ${status}', () => pm.response.to.have.status(${status}));`;
const envelope = `pm.test('JSON response envelope', () => { const b = pm.response.json(); if (pm.response.code < 400) pm.expect(b).to.have.property('data'); else { pm.expect(b.error.code).to.be.a('string'); pm.expect(b.error.message).to.be.a('string'); } });`;

function yaml(value, indent = 0) {
  const pad = ' '.repeat(indent);
  if (value === null || typeof value !== 'object') return pad + JSON.stringify(value);
  if (!Array.isArray(value) && !Object.keys(value).length) return pad + '{}';
  if (Array.isArray(value)) return value.length ? value.map(item => `${pad}-\n${yaml(item, indent + 2)}`).join('\n') : `${pad}[]`;
  return Object.entries(value).map(([rawKey, item]) => { const key = JSON.stringify(rawKey);
    if (item && typeof item === 'object') return `${pad}${key}:\n${yaml(item, indent + 2)}`;
    if (typeof item === 'string' && item.includes('\n')) return `${pad}${key}: |-\n${item.split('\n').map(line => `${pad}  ${line}`).join('\n')}`;
    return `${pad}${key}: ${JSON.stringify(item)}`;
  }).join('\n');
}
async function save(path, object) { await mkdir(dirname(path), { recursive: true }); await writeFile(path, yaml(object).replace(/[\t ]+$/gm, '').trimEnd() + '\n'); }
function add(folder, name, method, path, { body, status = 200, role = 'owner', key, code = '', raw = false, authResponse = false, headers = [] } = {}) {
  if (!folders.has(folder)) folders.set(folder, []);
  folders.get(folder).push({ $kind: 'http-request', name, order: (folders.get(folder).length + 1) * 1000,
    method, url: `{{base_url}}${path}`, settings: { followRedirects: false },
    headers: [{ key: 'Cookie', value: `{{${role}_cookie}}` }, { key: 'Origin', value: '{{base_url}}' },
      ...(body !== undefined ? [{ key: 'Content-Type', value: 'application/json' }] : []),
      ...(key ? [{ key: 'Idempotency-Key', value: key }] : []), ...headers],
    ...(body !== undefined ? { body: { type: raw ? 'text' : 'json', content: raw ? body : JSON.stringify(body, null, 2) } } : {}),
    scripts: tests(`${assertStatus(status)}\n${authResponse ? '' : envelope}\n${code}`) });
}
const participant = (userId, paid, extras = {}) => ({ userId: `{{${userId}_id}}`, paid, ...extras });
const expense = (extra = {}) => ({ description: 'Postman regression {{run_id}}', category: 'Food', amount: 10001, currency: 'INR', date: '{{date}}', splitType: 'EQUAL', participants: [participant('owner', extra.amount ?? 10001), participant('friend', 0)], ...extra });
const settlement = (extra = {}) => ({ fromUserId: '{{friend_id}}', toUserId: '{{owner_id}}', amount: 5000, currency: 'INR', method: 'CASH', date: '{{date}}', ...extra });
const remember = key => `if (pm.response.code === 201) pm.collectionVariables.set('${key}', pm.response.json().data.id); pm.test('Created resource ID', () => pm.expect(pm.response.json().data.id).to.be.a('string'));`;
const create = (folder, name, variable, extra = {}, role = 'owner') => add(folder, name, 'POST', '/api/expenses/create', { body: expense(extra), status: 201, role, key: `{{run_id}}-${variable}`, code: remember(variable) });
const balanced = `pm.test('Integer money and balanced participants', () => { const e = pm.response.json().data; pm.expect(Number.isSafeInteger(e.amount)).to.eql(true); pm.expect(e.participants.reduce((sum,p) => sum+p.paid,0)).to.eql(e.amount); pm.expect(e.participants.reduce((sum,p) => sum+p.owed,0)).to.eql(e.amount); e.participants.forEach(p => { pm.expect(Number.isSafeInteger(p.paid)).to.eql(true); pm.expect(Number.isSafeInteger(p.owed)).to.eql(true); }); });`;
const edit = { version: 1, description: 'Edited by owner', splitType: 'EQUAL', participants: [participant('owner', 10001), participant('friend', 0)] };

add('01 Authentication', 'Anonymous session is empty', 'GET', '/api/auth/get-session', { role: 'anon', authResponse: true, code: `pm.test('No session disclosed', () => pm.expect(pm.response.json()).to.eql(null));` });
add('01 Authentication', 'Owner session resolves', 'GET', '/api/auth/get-session', { authResponse: true, code: `pm.test('Session belongs to owner', () => pm.expect(pm.response.json().user.id).to.eql(pm.environment.get('owner_id')));` });
add('01 Authentication', 'Malformed sign-in rejected', 'POST', '/api/auth/sign-in/email', { body: { email: 'not-an-email' }, status: 400, role: 'anon', authResponse: true });
add('01 Authentication', 'Placeholder signup rejected', 'POST', '/api/auth/sign-up/email', { body: { name: 'Invalid placeholder', email: 'fixture@spendingdiary.invalid', password: 'NonCredential-Invalid-123' }, status: 400, role: 'anon', authResponse: true });
add('01 Authentication', 'Untrusted signup origin rejected', 'POST', '/api/auth/sign-up/email', { body: {}, status: 403, role: 'anon', authResponse: true, headers: [{ key: 'Origin', value: 'https://untrusted.example' }] });

for (const [method,path] of [['GET','/api/balances'],['POST','/api/expenses/create'],['GET','/api/expenses/pm-nonexistent'],['PATCH','/api/expenses/pm-nonexistent'],['DELETE','/api/expenses/pm-nonexistent'],['POST','/api/expenses/pm-nonexistent/restore'],['POST','/api/settlements'],['DELETE','/api/settlements/pm-nonexistent']]) {
  add('02 Authentication boundaries', `${method} ${path} requires a session`, method, path, { role: 'anon', status: 401, ...(['POST','PATCH'].includes(method) ? { body: {} } : {}) });
}

add('03 Expense lifecycle', 'Initial balances', 'GET', '/api/balances');
create('03 Expense lifecycle', 'Create equal split with remainder', 'equal_id');
add('03 Expense lifecycle', 'Read equal split', 'GET', '/api/expenses/{{equal_id}}', { code: balanced + `\npm.test('Largest remainder stays within one paisa', () => { const p=pm.response.json().data.participants; pm.expect(Math.abs(p[0].owed-p[1].owed)).to.be.at.most(1); });` });
for (const [type,inputs] of [['EXACT',[{owed:5001},{owed:5000}]],['PERCENTAGE',[{percentage:60},{percentage:40}]],['SHARES',[{shares:2},{shares:1}]]]) {
  const id = `${type.toLowerCase()}_id`;
  create('03 Expense lifecycle', `Create ${type} split`, id, { splitType: type, participants: [participant('owner',10001,inputs[0]),participant('friend',0,inputs[1])] });
  add('03 Expense lifecycle', `Read ${type} split totals`, 'GET', `/api/expenses/{{${id}}}`, { code: balanced });
}
create('03 Expense lifecycle', 'Create multiple payer expense', 'multi_id', { participants: [participant('owner',6001),participant('friend',4000)] });
add('03 Expense lifecycle', 'Read multiple payer totals', 'GET', '/api/expenses/{{multi_id}}', { code: balanced });
create('03 Expense lifecycle', 'Create personal expense', 'personal_id', { amount:1234,participants:[participant('owner',1234)] });
create('03 Expense lifecycle', 'Create group expense', 'group_expense_id', { groupId:'{{group_id}}' });
add('03 Expense lifecycle', 'Edit metadata with version', 'PATCH', '/api/expenses/{{equal_id}}', { body: edit });
add('03 Expense lifecycle', 'Version increments after edit', 'GET', '/api/expenses/{{equal_id}}', { code: balanced + `\npm.test('Version incremented',()=>pm.expect(pm.response.json().data.version).to.eql(2));` });
add('03 Expense lifecycle', 'Stale version rejected', 'PATCH', '/api/expenses/{{equal_id}}', { body: edit, status:409 });
add('03 Expense lifecycle', 'Soft delete expense', 'DELETE', '/api/expenses/{{equal_id}}');
add('03 Expense lifecycle', 'Deleted expense hidden', 'GET', '/api/expenses/{{equal_id}}', {status:404});
add('03 Expense lifecycle', 'Restore expense', 'POST', '/api/expenses/{{equal_id}}/restore');
add('03 Expense lifecycle', 'Restored expense balances', 'GET', '/api/expenses/{{equal_id}}', {code:balanced});

for(const [name,extra] of [['fractional amount',{amount:100.5}],['zero amount',{amount:0}],['negative amount',{amount:-1}],['missing description',{description:''}],['empty participants',{participants:[]}],['invalid split type',{splitType:'UNKNOWN'}],['negative payer',{participants:[participant('owner',-1)]}]]) {
  add('04 Input validation', `Reject ${name}`, 'POST', '/api/expenses/create', {body:expense(extra),key:'{{run_id}}-invalid-'+name,status:400});
}
for(const [name,extra] of [['invalid calendar date',{date:'2026-02-31'}],['integer overflow',{amount:2147483648,participants:[participant('owner',2147483648)]}],['duplicate participants',{participants:[participant('owner',5001),participant('owner',5000)]}],['unknown currency',{currency:'ZZZ'}]]) {
  add('04 Input validation', `Reject ${name}`, 'POST', '/api/expenses/create', {body:expense(extra),key:'{{run_id}}-invalid-'+name,status:400});
}
add('04 Input validation','Reject malformed JSON','POST','/api/expenses/create',{body:'{"amount":',raw:true,key:'{{run_id}}-malformed',status:400});
add('04 Input validation','Missing expense idempotency key','POST','/api/expenses/create',{body:expense(),status:400});
add('04 Input validation','Missing settlement idempotency key','POST','/api/settlements',{body:settlement(),status:400});
add('04 Input validation','Unbalanced payments rejected','POST','/api/expenses/create',{body:expense({participants:[participant('owner',10000),participant('friend',0)]}),key:'{{run_id}}-unbalanced',status:422});
add('04 Input validation','Self settlement rejected','POST','/api/settlements',{body:settlement({fromUserId:'{{owner_id}}'}),key:'{{run_id}}-self',status:422});
add('04 Input validation','Metadata-only PATCH accepted','PATCH','/api/expenses/{{multi_id}}',{body:{version:1,description:'Metadata-only edit'}});

create('05 Idempotency','Create idempotent expense','idem_id');
add('05 Idempotency','Replay same expense key returns same ID','POST','/api/expenses/create',{body:expense(),status:201,key:'{{run_id}}-idem_id',code:`pm.test('Original ID reused',()=>pm.expect(pm.response.json().data.id).to.eql(pm.collectionVariables.get('idem_id')));`});
add('05 Idempotency','Same expense key with changed body conflicts','POST','/api/expenses/create',{body:expense({description:'Conflicting body'}),status:409,key:'{{run_id}}-idem_id'});
add('05 Idempotency','Create idempotent settlement','POST','/api/settlements',{body:settlement(),status:201,key:'{{run_id}}-idem-settlement',code:remember('idem_settlement_id')});
add('05 Idempotency','Replay settlement key returns same ID','POST','/api/settlements',{body:settlement(),status:201,key:'{{run_id}}-idem-settlement',code:`pm.test('Original settlement ID reused',()=>pm.expect(pm.response.json().data.id).to.eql(pm.collectionVariables.get('idem_settlement_id')));`});
add('05 Idempotency','Same settlement key with changed body conflicts','POST','/api/settlements',{body:settlement({amount:1}),status:409,key:'{{run_id}}-idem-settlement'});

create('06 Object authorization','Create private expense for authorization checks','private_id',{amount:1234,participants:[participant('owner',1234)]});
add('06 Object authorization','Outsider cannot read private expense','GET','/api/expenses/{{private_id}}',{role:'outsider',status:404});
add('06 Object authorization','Outsider cannot edit private expense','PATCH','/api/expenses/{{private_id}}',{role:'outsider',body:{...edit,description:'Unauthorized edit attempt'},status:404});
add('06 Object authorization','Outsider cannot delete private expense','DELETE','/api/expenses/{{private_id}}',{role:'outsider',status:404});
create('06 Object authorization','Create separate restore authorization target','restore_private_id',{amount:1234,participants:[participant('owner',1234)]});
add('06 Object authorization','Owner deletes restore authorization target','DELETE','/api/expenses/{{restore_private_id}}');
add('06 Object authorization','Outsider cannot restore private expense','POST','/api/expenses/{{restore_private_id}}/restore',{role:'outsider',status:404});
add('06 Object authorization','Outsider balances disclose no other pairs','GET','/api/balances',{role:'outsider',code:`pm.test('All balances involve viewer',()=>pm.response.json().data.forEach(r=>pm.expect([r.userLowId,r.userHighId]).to.include(pm.environment.get('outsider_id'))));`});
add('06 Object authorization','Outsider cannot create expense in another group','POST','/api/expenses/create',{role:'outsider',body:expense({groupId:'{{group_id}}'}),key:'{{run_id}}-foreign-group',status:404});
add('06 Object authorization','Outsider cannot assign expense to unrelated people','POST','/api/expenses/create',{role:'outsider',body:expense(),key:'{{run_id}}-foreign-participants',status:404});
add('06 Object authorization','Outsider cannot record another pair settlement','POST','/api/settlements',{role:'outsider',body:settlement(),key:'{{run_id}}-foreign-settlement',status:404});
add('06 Object authorization','Outsider cannot delete another pair settlement','DELETE','/api/settlements/{{idem_settlement_id}}',{role:'outsider',status:404});

create('07 Settlement accounting','Create isolated group debt','settle_expense_id',{groupId:'{{settlement_group_id}}',amount:10000});
add('07 Settlement accounting','Read original debt','GET','/api/balances',{code:`const row=pm.response.json().data.find(r=>r.currency==='INR'&&r.scopeId===pm.environment.get('settlement_group_id')); pm.test('Debt is 5000 minor units',()=>pm.expect(Math.abs(row.amount)).to.eql(5000)); pm.collectionVariables.set('debt_before',row.amount);`});
add('07 Settlement accounting','Record payment toward debt','POST','/api/settlements',{body:settlement({groupId:'{{settlement_group_id}}',amount:2000}),status:201,key:'{{run_id}}-payment',code:remember('payment_id')});
add('07 Settlement accounting','Payment reduces debt','GET','/api/balances',{code:`pm.test('Settlement reduces debt from 5000 to 3000',()=>{const row=pm.response.json().data.find(r=>r.currency==='INR'&&r.scopeId===pm.environment.get('settlement_group_id'));pm.expect(Math.abs(row.amount)).to.eql(3000);});`});
add('07 Settlement accounting','Delete settlement','DELETE','/api/settlements/{{payment_id}}');
add('07 Settlement accounting','Voiding restores debt','GET','/api/balances',{code:`pm.test('Debt restored to 5000',()=>{const row=pm.response.json().data.find(r=>r.currency==='INR'&&r.scopeId===pm.environment.get('settlement_group_id'));pm.expect(row.amount).to.eql(pm.collectionVariables.get('debt_before'));});`});

create('08 Currency integrity','Create currency edit target','currency_id',{amount:10000});
add('08 Currency integrity','Unsupported currency edit is rejected','PATCH','/api/expenses/{{currency_id}}',{body:{version:1,currency:'EUR'},status:400});
add('08 Currency integrity','Read unchanged currency','GET','/api/expenses/{{currency_id}}',{code:`pm.test('Rejected currency edit leaves INR unchanged',()=>pm.expect(pm.response.json().data.currency).to.eql('INR'));`});
add('08 Currency integrity','Balances retain supported currency','GET','/api/balances',{code:`pm.test('Rejected currency edit creates no EUR balance',()=>pm.expect(pm.response.json().data.some(r=>r.currency==='EUR')).to.eql(false));`});

create('09 Concurrency','Create concurrency target','race_id');
add('09 Concurrency','Read then race two edits with the same version','GET','/api/expenses/{{race_id}}',{code:`const version=pm.response.json().data.version; const body={version,description:'Concurrent edit',splitType:'EQUAL',participants:[{userId:pm.environment.get('owner_id'),paid:10001},{userId:pm.environment.get('friend_id'),paid:0}]}; const request={url:pm.environment.get('base_url')+'/api/expenses/'+pm.collectionVariables.get('race_id'),method:'PATCH',header:{'Content-Type':'application/json','Cookie':pm.environment.get('owner_cookie')},body:{mode:'raw',raw:JSON.stringify(body)}}; Promise.all([pm.sendRequest(request),pm.sendRequest(request)]).then(responses=>pm.test('One concurrent edit succeeds and one conflicts',()=>pm.expect(responses.map(r=>r.code).sort()).to.eql([200,409]))).catch(error=>pm.test('Concurrent requests completed',()=>{throw error;}));`});

async function walk(path) { const out=[];for(const entry of await readdir(path,{withFileTypes:true})){const name=join(path,entry.name);if(entry.isDirectory())out.push(...await walk(name));else if(/^route\.tsx?$/.test(entry.name))out.push(name);}return out; }
const inventory=[];
for(const file of await walk('src/app/api')) {
  const source=await readFile(file,'utf8'); const path='/api/'+file.replaceAll('\\','/').split('src/app/api/')[1].replace(/\/route\.tsx?$/,'').replace('[id]','{id}');
  const methods=[...source.matchAll(/export (?:async function|function|const) (GET|POST|PATCH|DELETE|PUT)\b/g)].map(m=>m[1]);
  inventory.push({file:file.replaceAll('\\','/'),path,methods,status:source.includes('NOT_IMPLEMENTED')?(source.includes('410')?'retired':'stub'):'implemented'});
  if(source.includes('NOT_IMPLEMENTED')&&!path.includes('[...nextauth]')) for(const method of methods) add('10 Legacy endpoint status',`${method} ${path} is currently a stub`,method,path,{role:'anon',status:501});
}


const variables=['base_url','run_id','date','owner_id','friend_id','outsider_id','group_id','settlement_group_id','owner_cookie','friend_cookie','outsider_cookie','anon_cookie'];
await save(`${directory}/.resources/definition.yaml`,{$kind:'collection',name:'Spending Diary',description:'Local API regression and security tests. Run using node postman/scripts/run-local.mjs against an isolated database. Security assertions enforce the remediated authorization and money invariants; legacy 501 responses are documented separately. No credentials are stored in this collection.',variables:variables.map(key=>({key,value:key==='base_url'?'http://localhost:3000':key==='anon_cookie'?'better-auth.session_token=invalid':''}))});
for(const [folder,requests] of folders) {
  await save(`${directory}/${folder}/.resources/definition.yaml`,{$kind:'collection',name:folder,order:Number(folder.slice(0,2))*1000});
  for(const request of requests) {
    const filename=request.name.replace(/[\\/:*?"<>|]/g,'-');
    await save(`${directory}/${folder}/${filename}.request.yaml`,request);
  }
}
await save('postman/environments/Local.template.environment.yaml',{name:'Spending Diary local template',values:variables.map(key=>({key,value:key==='base_url'?'http://localhost:3000':key==='anon_cookie'?'better-auth.session_token=invalid':'',enabled:true,type:key.endsWith('_cookie')?'secret':'default'}))});
const v2={info:{name:'Spending Diary',schema:'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'},variable:variables.map(key=>({key,value:key==='base_url'?'http://localhost:3000':key==='anon_cookie'?'better-auth.session_token=invalid':''})),item:[...folders].map(([name,requests])=>({name,item:requests.map(r=>({name:r.name,request:{method:r.method,url:r.url,header:r.headers,...(r.body?{body:{mode:'raw',raw:r.body.content,options:{raw:{language:'json'}}}}:{})},protocolProfileBehavior:{followRedirects:false,disableCookies:true},event:r.scripts.map(s=>({listen:'test',script:{type:'text/javascript',exec:s.code.split('\n')}}))}))}))};
await writeFile('postman/Spending-Diary.postman_collection.json',JSON.stringify(v2,null,2)+'\n');
await writeFile('postman/api-inventory.json',JSON.stringify(inventory,null,2)+'\n');
const moneySchema={type:'integer',format:'int32',minimum:1,maximum:2147483647,description:'Integer minor units; INR amounts are paise.'};
const participantSchema={type:'object',required:['userId','paid'],properties:{userId:{type:'string',minLength:1},paid:{...moneySchema,minimum:0},owed:{...moneySchema,minimum:0},percentage:{type:'number',minimum:0,exclusiveMinimum:true,maximum:100},shares:{type:'integer',minimum:1}}};
const expenseProperties={groupId:{type:'string',nullable:true},description:{type:'string',minLength:1,maxLength:255},category:{type:'string',minLength:1,maxLength:100},notes:{type:'string',nullable:true,maxLength:2000},amount:moneySchema,currency:{type:'string',enum:['INR']},date:{type:'string',format:'date'},splitType:{type:'string',enum:['EQUAL','EXACT','PERCENTAGE','SHARES']},participants:{type:'array',minItems:1,maxItems:100,items:participantSchema}};
const schemas={Money:moneySchema,Participant:participantSchema,CreateExpense:{type:'object',required:['description','category','amount','currency','date','splitType','participants'],properties:expenseProperties},EditExpense:{type:'object',required:['version'],properties:{version:{type:'integer',minimum:1},...Object.fromEntries(Object.entries(expenseProperties).filter(([key])=>key!=='groupId'))}},CreateSettlement:{type:'object',required:['fromUserId','toUserId','amount','currency','method','date'],properties:{groupId:{type:'string',nullable:true},fromUserId:{type:'string',minLength:1},toUserId:{type:'string',minLength:1},amount:moneySchema,currency:{type:'string',enum:['INR']},method:{type:'string',enum:['CASH','UPI','OTHER']},date:{type:'string',format:'date'},note:{type:'string',nullable:true,maxLength:2000}}},Error:{type:'object',required:['error'],properties:{error:{type:'object',required:['code','message'],properties:{code:{type:'string'},message:{type:'string'},fields:{type:'object',additionalProperties:{type:'string'}}}}}}};
const paths={};
for(const route of inventory) {
  if(route.path.includes('[...'))continue;
  paths[route.path]={};
  for(const method of route.methods) {
    const stub=route.status==='stub';
    const parameters=route.path.includes('{id}')?[{name:'id',in:'path',required:true,schema:{type:'string'}}]:[];
    const createOperation=method==='POST'&&['/api/expenses/create','/api/settlements'].includes(route.path);
    if(createOperation)parameters.push({name:'Idempotency-Key',in:'header',required:true,schema:{type:'string',minLength:1,maxLength:200}});
    const operation={operationId:(method+'_'+route.path).replace(/[^a-zA-Z0-9]/g,'_'),summary:stub?'Legacy stub returns 501':method+' '+route.path,description:stub?'Not implemented in this checkout. Included for inventory completeness.':'Contract derived from the project rules and shared validation schemas; failing regression tests document implementation gaps.',tags:[stub?'Legacy':route.path.split('/')[2]],security:stub?[]:[{sessionCookie:[]}],...(parameters.length?{parameters}:{}),responses:stub?{'501':{description:'Not implemented',content:{'application/json':{schema:{$ref:'#/components/schemas/Error'}}}}}:{[createOperation?'201':'200']:{description:'Success envelope',content:{'application/json':{schema:{type:'object',required:['data'],properties:{data:{}}}}}},'400':{description:'Invalid input',content:{'application/json':{schema:{$ref:'#/components/schemas/Error'}}}},'401':{description:'Unauthenticated'},'404':{description:'Not found or not visible'},'409':{description:'Version or idempotency conflict'},'422':{description:'Domain invariant violated'}}};
    if(!stub&&(createOperation||method==='PATCH'))operation.requestBody={required:true,content:{'application/json':{schema:{$ref:'#/components/schemas/'+(method==='PATCH'?'EditExpense':route.path==='/api/settlements'?'CreateSettlement':'CreateExpense')}}}};
    paths[route.path][method.toLowerCase()]=operation;
  }
}
paths['/api/auth/get-session']={get:{operationId:'getAuthSession',summary:'Read Better Auth session',description:'Better Auth uses its native response format, not the application data envelope.',tags:['Authentication'],responses:{'200':{description:'Session and user, or null for no valid session'}}}};
await save('postman/specs/spending-diary.openapi.yaml',{openapi:'3.0.3',info:{title:'Spending Diary API',version:'1.0.0',description:'Contract and route inventory for the local checkout. Money uses integer minor units. Authentication is managed by Better Auth; OAuth, verification and reset token flows require separate end-to-end tests.'},servers:[{url:'http://localhost:3000',description:'Local development application'}],paths,components:{securitySchemes:{sessionCookie:{type:'apiKey',in:'cookie',name:'better-auth.session_token'}},schemas}});
console.log(`Generated ${[...folders.values()].reduce((n,r)=>n+r.length,0)} requests across ${folders.size} folders; ${inventory.length} route files inventoried.`);
