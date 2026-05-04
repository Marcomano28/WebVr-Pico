const OPENROUTER_API_BASE_URL = 'https://openrouter.ai/api/v1';
const OPENROUTER_CHAT_URL = `${OPENROUTER_API_BASE_URL}/chat/completions`;
const OPENROUTER_TRANSCRIPTION_URL = `${OPENROUTER_API_BASE_URL}/audio/transcriptions`;

function hasOpenRouterKey(){
  return Boolean(process.env.OPENROUTER_API_KEY);
}

function getOpenRouterModel(agent = null){
  return agent?.model || process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini';
}

function getOpenRouterTranscriptionModel(){
  return process.env.OPENROUTER_STT_MODEL || 'openai/whisper-large-v3';
}

function buildOpenRouterHeaders(apiKey, sessionId){
  return {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    'HTTP-Referer': process.env.OPENROUTER_SITE_URL || 'http://localhost:3000',
    'X-OpenRouter-Title': process.env.OPENROUTER_APP_NAME || 'WebVR Car Agents',
    'X-Session-Id': sessionId
  };
}

function buildOpenRouterBody({messages, sessionId, agentId, model, stream = false}){
  return JSON.stringify({
    model: model || getOpenRouterModel(),
    messages,
    temperature: Number(process.env.OPENROUTER_TEMPERATURE || 0.72),
    max_tokens: Number(process.env.OPENROUTER_MAX_TOKENS || 360),
    session_id: `${sessionId}:${agentId}`,
    stream
  });
}

async function* iterateSsePayloads(stream){
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while(true){
    const {value, done} = await reader.read();

    if(done) break;

    buffer += decoder.decode(value, {stream: true}).replace(/\r\n/g, '\n');

    while(true){
      const boundary = buffer.indexOf('\n\n');

      if(boundary === -1) break;

      const rawEvent = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);
      const dataLines = rawEvent
        .split('\n')
        .filter((line) => line.startsWith('data:'))
        .map((line) => line.slice(5).trimStart());

      if(!dataLines.length) continue;

      const data = dataLines.join('\n');

      if(data === '[DONE]') return;

      try{
        yield JSON.parse(data);
      }catch{
        // OpenRouter can send intermediary comments; ignore malformed chunks.
      }
    }
  }
}

async function createChatCompletion({messages, sessionId, agentId, model}){
  const apiKey = process.env.OPENROUTER_API_KEY;

  if(!apiKey){
    throw new Error('Missing OPENROUTER_API_KEY');
  }

  const response = await fetch(OPENROUTER_CHAT_URL, {
    method: 'POST',
    headers: buildOpenRouterHeaders(apiKey, sessionId),
    body: buildOpenRouterBody({messages, sessionId, agentId, model})
  });
  const payload = await response.json().catch(() => ({}));

  if(!response.ok){
    const message = payload?.error?.message || payload?.message || `OpenRouter request failed (${response.status})`;
    const error = new Error(message);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  const content = payload?.choices?.[0]?.message?.content?.trim();

  if(!content){
    throw new Error('OpenRouter returned an empty response');
  }

  return {
    content,
    id: payload.id || null,
    model: payload.model || model || getOpenRouterModel(),
    usage: payload.usage || null
  };
}

async function createChatCompletionStream({messages, sessionId, agentId, model, onDelta}){
  const apiKey = process.env.OPENROUTER_API_KEY;

  if(!apiKey){
    throw new Error('Missing OPENROUTER_API_KEY');
  }

  const response = await fetch(OPENROUTER_CHAT_URL, {
    method: 'POST',
    headers: buildOpenRouterHeaders(apiKey, sessionId),
    body: buildOpenRouterBody({messages, sessionId, agentId, model, stream: true})
  });

  if(!response.ok){
    const payload = await response.json().catch(() => ({}));
    const message = payload?.error?.message || payload?.message || `OpenRouter request failed (${response.status})`;
    const error = new Error(message);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  if(!response.body){
    throw new Error('OpenRouter streaming response was empty');
  }

  let content = '';
  let responseModel = model || getOpenRouterModel();
  let usage = null;
  let id = null;

  for await (const payload of iterateSsePayloads(response.body)){
    if(payload?.error){
      const error = new Error(payload.error.message || 'OpenRouter stream failed');
      error.status = payload.error.code || 500;
      error.payload = payload;
      throw error;
    }

    id = payload.id || id;
    responseModel = payload.model || responseModel;
    usage = payload.usage || usage;

    const delta = payload?.choices?.[0]?.delta?.content;

    if(delta){
      content += delta;
      await onDelta?.(delta);
    }
  }

  if(!content){
    throw new Error('OpenRouter returned an empty streaming response');
  }

  return {
    content,
    id,
    model: responseModel,
    usage
  };
}

async function createAudioTranscription({audioBase64, format, language, sessionId, model}){
  const apiKey = process.env.OPENROUTER_API_KEY;

  if(!apiKey){
    throw new Error('Missing OPENROUTER_API_KEY');
  }

  const response = await fetch(OPENROUTER_TRANSCRIPTION_URL, {
    method: 'POST',
    headers: buildOpenRouterHeaders(apiKey, sessionId || 'stt'),
    body: JSON.stringify({
      model: model || getOpenRouterTranscriptionModel(),
      input_audio: {
        data: audioBase64,
        format
      },
      language: language || process.env.OPENROUTER_STT_LANGUAGE || 'es',
      temperature: Number(process.env.OPENROUTER_STT_TEMPERATURE || 0)
    })
  });
  const payload = await response.json().catch(() => ({}));

  if(!response.ok){
    const message = payload?.error?.message || payload?.message || `OpenRouter transcription failed (${response.status})`;
    const error = new Error(message);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  const text = String(payload.text || '').trim();

  if(!text){
    throw new Error('OpenRouter returned an empty transcription');
  }

  return {
    text,
    model: payload.model || model || getOpenRouterTranscriptionModel(),
    usage: payload.usage || null
  };
}

module.exports = {
  createAudioTranscription,
  createChatCompletion,
  createChatCompletionStream,
  getOpenRouterModel,
  getOpenRouterTranscriptionModel,
  hasOpenRouterKey
};
