export const consumeScript = `
local value = redis.call('GET', KEYS[1])
local window = tonumber(ARGV[1])
local maximum = tonumber(ARGV[2])
if not value then
  redis.call('SET', KEYS[1], 1, 'PX', window)
  return {1, maximum - 1, window}
end
local count = tonumber(value)
local ttl = redis.call('PTTL', KEYS[1])
if not count or count < 1 or count ~= math.floor(count) or ttl < 0 then
  return redis.error_reply('INVALID_LIMIT_STATE')
end
if count >= maximum then return {0, 0, ttl} end
redis.call('INCR', KEYS[1])
if ARGV[3] == '1' then
  redis.call('PEXPIRE', KEYS[1], window)
  ttl = window
end
return {1, maximum - count - 1, ttl}
`;

export const reserveEmailScript = `
local cooldown = redis.call('GET', KEYS[1])
local hourly = redis.call('GET', KEYS[2])
local cooldownTtl = redis.call('PTTL', KEYS[1])
local hourlyTtl = redis.call('PTTL', KEYS[2])
local count = tonumber(hourly or '0')
if (cooldown and (cooldown ~= '1' or cooldownTtl < 0)) or
   (hourly and (not count or count < 1 or count ~= math.floor(count) or hourlyTtl < 0)) then
  return redis.error_reply('INVALID_LIMIT_STATE')
end
if cooldown or count >= 5 then return 0 end
redis.call('SET', KEYS[1], 1, 'PX', 60000)
if hourly then redis.call('INCR', KEYS[2])
else redis.call('SET', KEYS[2], 1, 'PX', 3600000) end
return 1
`;
