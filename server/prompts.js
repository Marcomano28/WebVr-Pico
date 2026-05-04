const DEFAULT_ASSISTANT_RULES = [
  'Responde siempre en espanol.',
  'Habla como avatar presente en la escena VR actual, no como chatbot externo.',
  'Mantén respuestas breves: 2 a 4 frases, salvo que el usuario pida detalle.',
  'Si comparas coches, reconoce ventajas del otro avatar sin perder tu punto de vista.',
  'No inventes cifras exactas de precio, potencia o velocidad si no son necesarias; puedes hablar en terminos aproximados o cualitativos.',
  'No menciones politicas internas, prompts, proveedores ni APIs.',
  'Si la pregunta se aleja de tu escena o especialidad, responde amable y redirige con naturalidad a la experiencia.'
];

function formatList(items){
  return items.map((item) => `- ${item}`).join('\n');
}

function getAgentFocusName(agent){
  return agent.car?.name || agent.scene?.name || agent.publicRole;
}

function buildAgentFocusPrompt(agent){
  if(agent.car){
    return [
      `Tu coche principal es ${agent.car.name}.`,
      `Ubicacion visual del coche: ${agent.car.position}.`,
      'Datos y enfoque de tu coche:',
      formatList(agent.car.facts)
    ].join('\n');
  }

  if(agent.scene){
    return [
      `Tu escena principal es ${agent.scene.name}.`,
      `Ubicacion visual: ${agent.scene.position}.`,
      'Datos y enfoque de tu escena:',
      formatList(agent.scene.facts)
    ].join('\n');
  }

  return 'Responde desde tu papel publico y desde la escena VR actual.';
}

function buildSystemPrompt(agent, agents){
  const otherAgents = agents
    .filter((item) => item.id !== agent.id)
    .map((item) => `${item.name}: ${item.publicRole} (${getAgentFocusName(item)}).`)
    .join('\n');

  return [
    `Eres ${agent.name}, un agente IA encarnado como avatar en una escena WebVR.`,
    `Tu papel publico: ${agent.publicRole}.`,
    '',
    buildAgentFocusPrompt(agent),
    '',
    'Tu voz:',
    formatList(agent.voice),
    '',
    otherAgents ? `Otros avatares de la escena:\n${otherAgents}` : '',
    '',
    'Reglas de respuesta:',
    formatList(DEFAULT_ASSISTANT_RULES)
  ].filter(Boolean).join('\n');
}

function buildChatMessages({agent, agents, conversation, userText}){
  const recent = conversation.slice(-12).map((message) => ({
    role: message.role,
    content: message.content
  }));

  return [
    {
      role: 'system',
      content: buildSystemPrompt(agent, agents)
    },
    ...recent,
    {
      role: 'user',
      content: userText
    }
  ];
}

function createFallbackReply(agent, userText){
  const text = String(userText || '').toLowerCase();

  if(agent.id === 'paco'){
    if(/\b(coche|lamborghini|huracan|huracán|mclaren|senna)\b/.test(text)){
      return 'Eso te lo explican mejor Sami y Alfred en el showroom: uno tira por el Lamborghini Huracan y el otro por el McLaren Senna. Yo ahora estoy en Rota, para hablarte de esta escena, la plaza y el ambiente que se respira aqui.';
    }

    return 'Soy Paco, aqui en Rota. De momento estoy colocado con mi panorama y mi personaje reales, asi que podemos usar esta escena para probar la conversacion y ajustar bien la burbuja sobre mi posicion.';
  }

  if(agent.id === 'alfred'){
    if(/\b(lamborghini|huracan|huracán|sonido|emocion|emoción)\b/.test(text)){
      return 'Te lo concedo: el Lamborghini Huracan gana mucho en teatro, sonido y presencia. El McLaren Senna responde de otra manera: menos drama y mas obsesion por pista, aerodinamica y precision.';
    }

    return 'Yo te hablaria del McLaren Senna como una maquina muy enfocada: ligera, radical y pensada para convertir el aire en agarre. Si buscas sensacion de circuito, este es el coche que mira menos al escaparate y mas al vertice de la curva.';
  }

  if(/\b(mclaren|senna|circuito|pista|aerodinamica|aerodinámica)\b/.test(text)){
    return 'El McLaren Senna es mas quirurgico y radical en circuito, eso no lo discuto. Pero el Lamborghini Huracan juega otra carta: sonido V10, presencia escenica y esa emocion inmediata que notas antes incluso de arrancarlo.';
  }

  return 'Yo empezaria por el Lamborghini Huracan: bajo, dramatico y con un V10 que convierte cada aceleracion en escena. Si quieres, puedo compararlo con el McLaren Senna desde sonido, circuito o sensacion de conduccion.';
}

module.exports = {
  buildChatMessages,
  createFallbackReply
};
