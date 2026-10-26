/**
 * =========================================================
 * CONFIGURAÇÃO CENTRAL
 * =========================================================
 * Ajuste aqui o comportamento da automação sem mexer na lógica.
 */

const CONFIG = {
  // Se true, apenas registra no Log o que faria, sem etiquetar/arquivar.
  SIMULAR: false,

  // Quantos e-mails processar POR EXECUÇÃO.
  // Cada e-mail faz 1 chamada à OpenAI. Como o Apps Script tem limite de
  // ~6 min por execução, mantenha um lote pequeno. O backlog é drenado
  // ao longo das execuções (o gatilho roda a cada 10 min).
  MAX_THREADS: 10,

  // Modelo da OpenAI (Responses API).
  MODELO: "gpt-5-mini",

  // Esforço de raciocínio do modelo: "minimal", "low", "medium" ou "high".
  // Mais esforço = classificação mais cuidadosa, porém mais lenta e cara.
  // Com MAX_THREADS = 10, "low" cabe com folga no limite de 6 min.
  ESFORCO_RACIOCINIO: "low",

  // Trunca o corpo do e-mail para economizar tokens e evitar payloads gigantes.
  MAX_CHARS_CORPO: 6000,

  // Quantas mensagens ANTERIORES da conversa enviar como contexto à IA
  // (além da última), e quantos caracteres de cada uma.
  MAX_MENSAGENS_HISTORICO: 2,
  MAX_CHARS_HISTORICO: 1200,

  // Se a IA quiser arquivar mas a confiança for menor que isto, o e-mail é
  // DISTRIBUÍDO mesmo assim (é melhor alguém olhar do que perder um e-mail).
  CONFIANCA_MINIMA_ARQUIVAR: 70,

  // Tentativas EXTRAS em caso de erro transitório da OpenAI (429/5xx/timeout).
  MAX_RETENTATIVAS: 2,

  // Espera base (ms) entre retentativas (backoff exponencial: 1x, 2x, 4x...).
  BACKOFF_BASE_MS: 1500,

  // Tempo máximo (ms) para adquirir a trava de execução.
  LOCK_TIMEOUT_MS: 5000,

  // Exemplos de "pode arquivar" lidos da etiqueta LABELS.TREINAMENTO e
  // enviados à IA junto com as instruções. Mais exemplos = mais tokens.
  MAX_EXEMPLOS_TREINAMENTO: 30,
  MAX_CHARS_EXEMPLO: 400,

  // Por quantos minutos os exemplos ficam em cache antes de reler o Gmail.
  // Ao marcar novos exemplos, rode limparCacheTreinamento() para valer na hora.
  CACHE_TREINAMENTO_MIN: 60
};

/**
 * Aviso no espaço do Google Chat sobre os e-mails distribuídos.
 * Ao fim de cada execução é enviado UM resumo agrupado por responsável
 * (nada é enviado se nenhum e-mail foi distribuído).
 *
 * Propriedades do Script usadas:
 *   CHAT_WEBHOOK_URL   → webhook do espaço do Google Chat
 *   EMAIL_<NOME>       → e-mail institucional de cada responsável, para @mencionar
 *                        (ex.: EMAIL_EDUARDO). Sem a propriedade, aparece
 *                        só o nome. A pessoa precisa ser membro do espaço.
 */
const NOTIFICACAO = {
  // false desliga o aviso no Chat sem mexer no resto da automação.
  ATIVO: true
};

/**
 * Etiquetas usadas pela automação.
 */
const LABELS = {
  ARQUIVADO_IA: "ARQUIVADO POR IA",
  PROCESSADO_IA: "PROCESSADO POR IA",
  ERRO_IA: "ERRO IA", // e-mails que falharam na classificação (revisão manual)
  URGENTE: "URGENTE", // e-mails distribuídos que a IA considerou urgentes
  TREINAMENTO: "Treinamento - IA" // exemplos marcados pela equipe, consultados em caso de dúvida
};

/**
 * Tipos comuns a todas as unidades. Os tipos do setor ficam em UNIDADE.TIPOS
 * (unidade.gs).
 */
const TIPOS_GERAIS = [
  { codigo: "INFORMACAO", nome: "Informação", descricao: "comunicado informativo" },
  { codigo: "NEWSLETTER", nome: "Newsletter", descricao: "boletim ou newsletter" },
  { codigo: "MARKETING",  nome: "Marketing",  descricao: "publicidade, promoção" },
  { codigo: "EVENTO",     nome: "Evento",     descricao: "convite, evento, webinar" },
  { codigo: "SPAM",       nome: "Spam",       descricao: "spam ou golpe evidente" },
  { codigo: "OUTROS",     nome: "Outros",     descricao: "nenhum dos anteriores" }
];

/**
 * Todos os tipos aceitos: os do setor primeiro, depois os gerais.
 * É uma função (e não const) porque depende de unidade.gs, e a ordem de
 * carregamento dos arquivos no Apps Script não é garantida.
 * @returns {{codigo:string, nome:string, descricao:string}[]}
 */
function obterTipos() {
  return UNIDADE.TIPOS.concat(TIPOS_GERAIS);
}

/**
 * Códigos permitidos no retorno do modelo (usados na validação).
 * @returns {string[]}
 */
function obterTiposValidos() {
  return obterTipos().map(t => t.codigo);
}

/**
 * Nome amigável de um tipo, para exibir no aviso.
 */
function nomeTipo(codigo) {
  const tipo = obterTipos().find(t => t.codigo === codigo);
  return tipo ? tipo.nome : "Outros";
}

const PRIORIDADES_VALIDAS = ["BAIXA", "NORMAL", "ALTA"];