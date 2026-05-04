const {createServer} = require('node:http');
const {randomUUID} = require('node:crypto');
const {existsSync, readFileSync} = require('node:fs');
const {resolve} = require('node:path');
const {AGENTS, getAgent, getPublicAgents, selectAgentForMessage} = require('./agents');
const {createMemoryStore} = require('./memory');
const {buildChatMessages, createFallbackReply} = require('./prompts');
const {
  createChatCompletion,
  createChatCompletionStream,
  getOpenRouterModel,
  hasOpenRouterKey
} = require('./openrouter');

loadEnvFiles();

const PORT = Number(process.env.PORT || 8787);
const HOST = process.env.HOST || '0.0.0.0';
const MAX_BODY_SIZE = 1024 * 1024;
const BETA_ACCESS_HEADER = 'x-beta-access-code';
const CHAT_RATE_LIMIT_WINDOW_MS = Number(process.env.CHAT_RATE_LIMIT_WINDOW_MS || 10 * 60 * 1000);
const CHAT_RATE_LIMIT_MAX = Number(process.env.CHAT_RATE_LIMIT_MAX || 40);

const memory = createMemoryStore();
const chatRateLimits = new Map();

function loadEnvFiles(){
  ['.env.local', '.env'].forEach((fileName) => {
    const envPath = resolve(process.cwd(), fileName);

    if(!existsSync(envPath)) return;

    const lines = readFileSync(envPath, 'utf8').split(/\r?\n/);

    lines.forEach((line) => {
      const trimmed = line.trim();

      if(!trimmed || trimmed.startsWith('#')) return;

      const index = trimmed.indexOf('=');
      if(index === -1) return;

      const key = trimmed.slice(0, index).trim();
      const value = trimmed.slice(index + 1).trim().replace(/^["']|["']$/g, '');

      if(key && !process.env[key]){
        process.env[key] = value;
      }
    });
  });
}

function corsHeaders(){
  return {
    'Access-Control-Allow-Origin': process.env.CORS_ORIGIN || '*',
    'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Beta-Access-Code'
  };
}

function sendJson(res, status, payload){
  res.writeHead(status, {
    ...corsHeaders(),
    'Content-Type': 'application/json; charset=utf-8'
  });
  res.end(JSON.stringify(payload));
}

function sendOptions(res){
  res.writeHead(204, corsHeaders());
  res.end();
}

function sendEventStream(res){
  res.writeHead(200, {
    ...corsHeaders(),
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no'
  });
  res.flushHeaders?.();
}

function writeEventStream(res, event, payload){
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

function publicAgent(agent){
  return {
    id: agent.id,
    name: agent.name,
    avatar: agent.avatar,
    color: agent.color,
    publicRole: agent.publicRole,
    car: agent.car || null,
    scene: agent.scene || null
  };
}

function isBetaProtected(){
  return Boolean(process.env.BETA_ACCESS_CODE);
}

function hasBetaAccess(req){
  if(!isBetaProtected()) return true;

  return req.headers[BETA_ACCESS_HEADER] === process.env.BETA_ACCESS_CODE;
}

function requireBetaAccess(req, res){
  if(hasBetaAccess(req)) return true;

  sendJson(res, 401, {
    error: 'Access code required',
    code: 'beta_access_required'
  });
  return false;
}

function getRequestIp(req){
  const forwardedFor = req.headers['x-forwarded-for'];

  if(forwardedFor){
    return String(forwardedFor).split(',')[0].trim();
  }

  return req.socket.remoteAddress || 'unknown';
}

function requireChatRateLimit(req, res){
  if(!CHAT_RATE_LIMIT_MAX) return true;

  const now = Date.now();
  const key = getRequestIp(req);
  const existing = chatRateLimits.get(key);
  const bucket = existing && existing.resetAt > now
    ? existing
    : {count: 0, resetAt: now + CHAT_RATE_LIMIT_WINDOW_MS};

  bucket.count += 1;
  chatRateLimits.set(key, bucket);

  if(bucket.count <= CHAT_RATE_LIMIT_MAX) return true;

  sendJson(res, 429, {
    error: 'Too many chat messages',
    code: 'rate_limited',
    retryAfterMs: Math.max(bucket.resetAt - now, 0)
  });
  return false;
}

function readJsonBody(req){
  return new Promise((resolveBody, reject) => {
    let body = '';

    req.on('data', (chunk) => {
      body += chunk;

      if(body.length > MAX_BODY_SIZE){
        reject(Object.assign(new Error('Request body too large'), {status: 413}));
        req.destroy();
      }
    });

    req.on('end', () => {
      if(!body){
        resolveBody({});
        return;
      }

      try{
        resolveBody(JSON.parse(body));
      }catch{
        reject(Object.assign(new Error('Invalid JSON body'), {status: 400}));
      }
    });

    req.on('error', reject);
  });
}

function resolveChatAgent(body){
  if(body.agentId && body.agentId !== 'auto'){
    const agent = getAgent(body.agentId);

    if(!agent){
      throw Object.assign(new Error(`Unknown agent: ${body.agentId}`), {status: 404});
    }

    return agent;
  }

  return selectAgentForMessage(body.message);
}

function prepareChatTurn(body){
  const userText = String(body.message || '').trim();
  const sessionId = body.sessionId || randomUUID();
  const agent = resolveChatAgent(body);

  if(!agent){
    throw Object.assign(new Error('No agent available'), {status: 500});
  }

  if(!userText){
    throw Object.assign(new Error('message is required'), {status: 400});
  }

  const conversation = memory.getConversation(sessionId, agent.id);
  const messages = buildChatMessages({
    agent,
    agents: AGENTS,
    conversation,
    userText
  });

  return {
    agent,
    agentId: agent.id,
    messages,
    sessionId,
    userText
  };
}

function finalizeChatTurn(context, content){
  memory.appendMessage(context.sessionId, context.agentId, {
    role: 'user',
    content: context.userText
  });
  memory.appendMessage(context.sessionId, context.agentId, {
    role: 'assistant',
    content
  });
}

async function handleChat(body, res){
  const context = prepareChatTurn(body);
  const {agent, agentId, messages, sessionId, userText} = context;

  let provider = 'local-fallback';
  let model = hasOpenRouterKey() ? getOpenRouterModel(agent) : null;
  let usage = null;
  let generationId = null;
  let content;

  try{
    if(hasOpenRouterKey()){
      const completion = await createChatCompletion({
        messages,
        sessionId,
        agentId,
        model
      });

      content = completion.content;
      provider = 'openrouter';
      model = completion.model;
      usage = completion.usage;
      generationId = completion.id;
    }else{
      content = createFallbackReply(agent, userText);
    }
  }catch(error){
    console.error('[chat]', error);
    content = createFallbackReply(agent, userText);
  }

  finalizeChatTurn(context, content);

  sendJson(res, 200, {
    sessionId,
    agent: publicAgent(agent),
    message: {
      role: 'assistant',
      content
    },
    provider,
    model,
    usage,
    generationId
  });
}

async function handleChatStream(body, res){
  const context = prepareChatTurn(body);
  const {agent, agentId, messages, sessionId, userText} = context;

  sendEventStream(res);
  writeEventStream(res, 'meta', {
    sessionId,
    agent: publicAgent(agent),
    provider: hasOpenRouterKey() ? 'openrouter' : 'local-fallback',
    model: hasOpenRouterKey() ? getOpenRouterModel(agent) : null
  });

  let provider = 'local-fallback';
  let model = hasOpenRouterKey() ? getOpenRouterModel(agent) : null;
  let usage = null;
  let generationId = null;
  let content = '';

  try{
    if(hasOpenRouterKey()){
      provider = 'openrouter';

      const completion = await createChatCompletionStream({
        messages,
        sessionId,
        agentId,
        model,
        onDelta: (delta) => {
          content += delta;
          writeEventStream(res, 'delta', {
            content: delta,
            agent: publicAgent(agent)
          });
        }
      });

      content = content || completion.content;
      model = completion.model;
      usage = completion.usage;
      generationId = completion.id;
    }else{
      content = createFallbackReply(agent, userText);
      writeEventStream(res, 'delta', {
        content,
        agent: publicAgent(agent)
      });
    }
  }catch(error){
    console.error('[chat:stream]', error);

    if(!content){
      provider = 'local-fallback';
      content = createFallbackReply(agent, userText);
      writeEventStream(res, 'delta', {
        content,
        agent: publicAgent(agent)
      });
    }
  }

  finalizeChatTurn(context, content);

  writeEventStream(res, 'done', {
    sessionId,
    agent: publicAgent(agent),
    message: {
      role: 'assistant',
      content
    },
    provider,
    model,
    usage,
    generationId
  });
  res.end();
}

async function route(req, res){
  const url = new URL(req.url, `http://${req.headers.host}`);
  const path = url.pathname;

  if(req.method === 'OPTIONS'){
    sendOptions(res);
    return;
  }

  if(req.method === 'GET' && path === '/api/health'){
    sendJson(res, 200, {
      ok: true,
      provider: hasOpenRouterKey() ? 'openrouter' : 'local-fallback',
      model: getOpenRouterModel(),
      agents: AGENTS.length
    });
    return;
  }

  if(req.method === 'GET' && path === '/api/agents'){
    sendJson(res, 200, {agents: getPublicAgents()});
    return;
  }

  if(req.method === 'GET' && path.startsWith('/api/agents/')){
    const agentId = decodeURIComponent(path.split('/').pop());
    const agent = getAgent(agentId);

    if(!agent){
      sendJson(res, 404, {error: `Unknown agent: ${agentId}`});
      return;
    }

    sendJson(res, 200, {agent: publicAgent(agent)});
    return;
  }

  if(req.method === 'POST' && path === '/api/chat'){
    if(!requireBetaAccess(req, res)) return;
    if(!requireChatRateLimit(req, res)) return;

    const body = await readJsonBody(req);

    if(body.stream){
      await handleChatStream(body, res);
      return;
    }

    await handleChat(body, res);
    return;
  }

  if(req.method === 'GET' && path.startsWith('/api/sessions/') && path.endsWith('/memory')){
    if(!requireBetaAccess(req, res)) return;

    const sessionId = decodeURIComponent(path.split('/')[3]);
    sendJson(res, 200, {session: memory.snapshot(sessionId)});
    return;
  }

  if(req.method === 'DELETE' && path.startsWith('/api/sessions/')){
    if(!requireBetaAccess(req, res)) return;

    const sessionId = decodeURIComponent(path.split('/')[3]);
    memory.reset(sessionId);
    sendJson(res, 200, {ok: true, sessionId});
    return;
  }

  sendJson(res, 404, {error: 'Not found'});
}

const server = createServer((req, res) => {
  route(req, res).catch((error) => {
    const status = error.status || 500;

    if(status >= 500){
      console.error(error);
    }

    if(res.headersSent){
      res.end();
      return;
    }

    sendJson(res, status, {
      error: error.message || 'Server error',
      code: error.code || null
    });
  });
});

server.listen(PORT, HOST, () => {
  console.log(`WebVR Car Agents API listening on http://${HOST}:${PORT}`);
  console.log(`Provider: ${hasOpenRouterKey() ? 'openrouter' : 'local-fallback'} (${getOpenRouterModel()})`);
});
