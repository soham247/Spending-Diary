export function productContract(paths, schemas) {
  if (paths["/api/cron/maintenance"]?.get) paths["/api/cron/maintenance"].get.security = [{ maintenanceBearer: [] }];
  const ref = name => ({ $ref: '#/components/schemas/' + name });
  const id = { type: 'string', minLength: 1, maxLength: 128 };
  const group = { name: { type: 'string', minLength: 1, maxLength: 100 }, type: { type: 'string', enum: ['TRIP', 'HOME', 'COUPLE', 'OTHER'] }, currency: { type: 'string', enum: ['INR'] }, simplifyDebts: { type: 'boolean' } };
  schemas.CreateGroup = { type: 'object', required: ['name'], properties: group, additionalProperties: false };
  schemas.UpdateGroup = { type: 'object', properties: { name: group.name, type: group.type, simplifyDebts: group.simplifyDebts, archived: { type: 'boolean' } }, additionalProperties: false };
  schemas.MemberAction = { type: 'object', required: ['action'], properties: { action: { type: 'string', enum: ['LEAVE', 'REMOVE', 'PROMOTE', 'REJOIN'] }, userId: id, confirmOutstandingBalance: { type: 'boolean' } }, additionalProperties: false };
  schemas.Placeholder = { type: 'object', required: ['name'], properties: { name: group.name, phone: { type: 'string', maxLength: 30 }, groupId: id }, additionalProperties: false };
  schemas.Invite = { type: 'object', required: ['type'], properties: { type: { type: 'string', enum: ['GROUP_LINK', 'DIRECT', 'PERSONAL'] }, groupId: id, placeholderId: id }, additionalProperties: false };
  schemas.ClaimInvite = { type: 'object', required: ['token'], properties: { token: { type: 'string', minLength: 64, maxLength: 64, pattern: '^[a-f0-9]{64}$' } }, additionalProperties: false };
  schemas.ClaimReport = { type: 'object', properties: { reason: { type: 'string', maxLength: 2000 } }, additionalProperties: false };
  schemas.DeleteAccount = { type: 'object', properties: { password: { type: 'string', maxLength: 128 } }, additionalProperties: false };
  schemas.Subscription = { type: 'object', required: ['endpoint','keys'], properties: { endpoint: { type: 'string', format: 'uri' }, keys: { type: 'object', required: ['p256dh','auth'], properties: { p256dh: { type: 'string' }, auth: { type: 'string' } } } } };
  schemas.DeleteSubscription = { type: 'object', required: ['endpoint'], properties: { endpoint: { type: 'string', format: 'uri' } } };
  schemas.FriendUpdate = { type: 'object', properties: { blocked: { type: 'boolean' }, nickname: { type: 'string', maxLength: 100, nullable: true } }, additionalProperties: false };
  const defs = [
    ['/api/groups','get'], ['/api/groups','post','CreateGroup',true], ['/api/groups/{id}','get'], ['/api/groups/{id}','patch','UpdateGroup'], ['/api/groups/{id}/members','post','MemberAction'],
    ['/api/friends','get'], ['/api/friends','post','Placeholder',true], ['/api/friends/{id}','get'], ['/api/friends/{id}','patch','FriendUpdate'],
    ['/api/invites/{id}/report','post','ClaimReport',true], ['/api/invites','post','Invite',true], ['/api/invites/{id}','delete'], ['/api/invites/claim','post','ClaimInvite'], ['/api/invites/preview','get',null,false,true],
    ['/api/me/anonymize','post','DeleteAccount'], ['/api/push/config','get'], ['/api/push/subscription','put','Subscription'], ['/api/push/subscription','delete','DeleteSubscription'],
    ['/api/settlements','get'], ['/api/activity','get'], ['/api/activity/{id}','patch'], ['/api/insights','get'], ['/api/settlements/{id}/restore','post']
  ];
  for (const [path, method, body, create, publicRead] of defs) {
    const parameters = path.includes('{id}') ? [{ name: 'id', in: 'path', required: true, schema: id }] : [];
    if (create) parameters.push({ name: 'Idempotency-Key', in: 'header', required: true, schema: { type: 'string', minLength: 1, maxLength: 200 } });
    if (path.endsWith('/preview')) parameters.push({ name: 'token', in: 'query', required: true, schema: { type: 'string', pattern: '^[a-f0-9]{64}$' } });
    if (path === '/api/insights') parameters.push({ name: 'month', in: 'query', required: true, schema: { type: 'string', pattern: '^[0-9]{4}-(0[1-9]|1[0-2])$' } }, { name: 'kind', in: 'query', schema: { type: 'string', enum: ['PERSONAL', 'SHARED'] } });
    if (path === '/api/settlements' && method === 'get') parameters.push({ name: 'cursor', in: 'query', schema: id }, { name: 'groupId', in: 'query', schema: id }, { name: 'friendId', in: 'query', schema: id }, { name: 'deleted', in: 'query', schema: { type: 'string', enum: ['true','false'] } });
    if (path === '/api/activity') parameters.push({ name: 'cursor', in: 'query', schema: id }, { name: 'groupId', in: 'query', schema: id }, { name: 'expenseId', in: 'query', schema: id });
    const operation = { operationId: (method + path).replace(/[^a-zA-Z0-9]/g,'_'), summary: method.toUpperCase() + ' ' + path, security: publicRead ? [] : [{ sessionCookie: [] }], parameters, responses: {
      [create ? '201' : '200']: { description: 'Success envelope', content: { 'application/json': { schema: { type: 'object', required: ['data'], properties: { data: {} } } } } },
      '400': { description: 'Invalid input', content: { 'application/json': { schema: ref('Error') } } }, '401': { description: 'Unauthenticated' }, '403': { description: 'Forbidden' }, '404': { description: 'Not found or not visible' }, '409': { description: 'Conflict' }, '422': { description: 'Domain invariant violated' }
    }, ...(body ? { requestBody: { required: true, content: { 'application/json': { schema: ref(body) } } } } : {}) };
    (paths[path] ??= {})[method] = operation;
  }
}
