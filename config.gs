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

  // Endereços do setor (caixa principal e aliases). Usados para a IA saber
  // se o setor está em PARA ou só em CÓPIA. Se vazio, usa a conta que roda o script.
  EMAILS_SETOR: [],

  // Se a IA quiser arquivar mas a confiança for menor que isto, o e-mail é
  // DISTRIBUÍDO mesmo assim (é melhor alguém olhar do que perder um e-mail).
  CONFIANCA_MINIMA_ARQUIVAR: 70,

  // Tentativas EXTRAS em caso de erro transitório da OpenAI (429/5xx/timeout).
  MAX_RETENTATIVAS: 2,

  // Espera base (ms) entre retentativas (backoff exponencial: 1x, 2x, 4x...).
  BACKOFF_BASE_MS: 1500,

  // Tempo máximo (ms) para adquirir a trava de execução.
  LOCK_TIMEOUT_MS: 5000
};

/**
 * Aviso no espaço do Google Chat sobre os e-mails distribuídos.
 * Ao fim de cada execução é enviado UM resumo agrupado por responsável
 * (nada é enviado se nenhum e-mail foi distribuído).
 *
 * Propriedades do Script usadas:
 *   CHAT_WEBHOOK_URL   → webhook do espaço do Google Chat
 *   EMAIL_<NOME>       → e-mail FUNPAR de cada responsável, para @mencionar
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
  URGENTE: "URGENTE"  // e-mails distribuídos que a IA considerou urgentes
};

/**
 * Responsáveis pela triagem. A ORDEM define o rodízio (round-robin).
 * O nome também é o nome da etiqueta aplicada na distribuição.
 */
const RESPONSAVEIS = [
  "EDUARDO",
  "IAN",
  "NATALIA",
  "ANDRESSA",
  "BRENNO"
];

/**
 * Valores permitidos no retorno do modelo (usados na validação).
 */
const TIPOS_VALIDOS = [
  "SOLICITACAO_PAGAMENTO",
  "NOTA_FISCAL",
  "BOLETO",
  "COBRANCA",
  "FORNECEDOR",
  "ALTERACAO_BANCARIA",
  "COMPROVANTE",
  "CANCELAMENTO",
  "CONTRATO",
  "ORDEM_FORNECIMENTO",
  "PRESTACAO_CONTAS",
  "REEMBOLSO",
  "CADASTRO_FORNECEDOR",
  "INFORMACAO",
  "NEWSLETTER",
  "MARKETING",
  "EVENTO",
  "SPAM",
  "OUTROS"
];

const PRIORIDADES_VALIDAS = ["BAIXA", "NORMAL", "ALTA"];