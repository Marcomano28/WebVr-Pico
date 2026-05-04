const MAX_MESSAGES_PER_AGENT = 18;

function createMemoryStore(){
  const sessions = new Map();

  function getSession(sessionId){
    if(!sessions.has(sessionId)){
      sessions.set(sessionId, {
        id: sessionId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        conversations: {}
      });
    }

    return sessions.get(sessionId);
  }

  function getConversation(sessionId, agentId){
    const session = getSession(sessionId);

    if(!session.conversations[agentId]){
      session.conversations[agentId] = [];
    }

    return session.conversations[agentId];
  }

  function appendMessage(sessionId, agentId, message){
    const session = getSession(sessionId);
    const conversation = getConversation(sessionId, agentId);

    conversation.push({
      role: message.role,
      content: String(message.content || ''),
      createdAt: new Date().toISOString()
    });

    session.conversations[agentId] = conversation.slice(-MAX_MESSAGES_PER_AGENT);
    session.updatedAt = new Date().toISOString();
  }

  function snapshot(sessionId){
    return getSession(sessionId);
  }

  function reset(sessionId){
    sessions.delete(sessionId);
  }

  return {
    appendMessage,
    getConversation,
    reset,
    snapshot
  };
}

module.exports = {
  createMemoryStore
};
