/**
 * =========================================================
 * INTEGRAÇÃO COM A OPENAI (Responses API)
 * =========================================================
 */

const OPENAI_URL = "https://api.openai.com/v1/responses";

/**
 * Formato exigido da resposta (Structured Outputs, modo strict).
 * É uma função (e não const) porque depende de constantes de config.gs,
 * e a ordem de carregamento dos arquivos no Apps Script não é garantida.
 */
function obterSchemaClassificacao() {
  return {
    type: "object",
    additionalProperties: false,
    required: ["precisaAtendimento", "tipo", "prioridade", "urgente",
               "motivoUrgencia", "confianca", "motivo", "resumo"],
    properties: {
      precisaAtendimento: { type: "boolean" },
      tipo: { type: "string", enum: TIPOS_VALIDOS },
      prioridade: { type: "string", enum: PRIORIDADES_VALIDAS },
      urgente: { type: "boolean" },
      motivoUrgencia: { type: "string" },
      confianca: { type: "integer" },
      motivo: { type: "string" },
      resumo: { type: "string" }
    }
  };
}

/**
 * Lê a chave da OpenAI das Script Properties.
 * Configure em: Projeto > Configurações do projeto > Propriedades do script
 * com a chave OPENAI_API_KEY.
 */
function obterApiKey() {
  const key = PropertiesService.getScriptProperties().getProperty("OPENAI_API_KEY");
  if (!key) {
    throw new Error("OPENAI_API_KEY não configurada nas Propriedades do Script.");
  }
  return key;
}

/**
 * Classifica um e-mail via OpenAI, com retentativas e parsing robusto.
 * @param {Object} email
 * @returns {Object} resultado já validado
 */
function classificarComChat(email) {
  const apiKey = obterApiKey();

  const payload = {
    model: CONFIG.MODELO,
    reasoning: { effort: CONFIG.ESFORCO_RACIOCINIO },
    input: [
      {
        role: "system",
        content: [{ type: "input_text", text: obterPromptSistema() }]
      },
      {
        role: "user",
        content: [{
          type: "input_text",
          text: JSON.stringify({
            dataHoje: Utilities.formatDate(new Date(), "America/Sao_Paulo", "yyyy-MM-dd (EEEE)"),
            assunto: email.assunto,
            remetente: email.remetente,
            destinatario: email.destinatario,
            copia: email.copia,
            setorApenasEmCopia: email.setorApenasEmCopia,
            data: email.data,
            corpo: email.corpo,
            anexos: email.anexos,
            totalMensagensConversa: email.totalMensagensConversa,
            historico: email.historico
          }, null, 2)
        }]
      }
    ],
    // Structured Outputs: obriga o modelo a devolver exatamente este JSON.
    text: {
      format: {
        type: "json_schema",
        name: "classificacao_email",
        strict: true,
        schema: obterSchemaClassificacao()
      }
    }
  };

  const options = {
    method: "post",
    contentType: "application/json",
    headers: { Authorization: "Bearer " + apiKey },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  let ultimoErro;

  for (let tentativa = 0; tentativa <= CONFIG.MAX_RETENTATIVAS; tentativa++) {
    try {
      const response = UrlFetchApp.fetch(OPENAI_URL, options);
      const code = response.getResponseCode();
      const texto = response.getContentText();

      // Erros transitórios: rate limit ou servidor. Vale a pena tentar de novo.
      if (code === 429 || code >= 500) {
        ultimoErro = new Error(`OpenAI HTTP ${code}: ${texto.slice(0, 300)}`);
        esperarBackoff(tentativa);
        continue;
      }

      // Erros definitivos (400, 401, 403...): não adianta repetir.
      if (code >= 400) {
        throw new Error(`OpenAI HTTP ${code}: ${texto.slice(0, 300)}`);
      }

      const json = JSON.parse(texto);
      const conteudo = extrairTextoResposta(json);
      return validarResultado(parseJsonSeguro(conteudo));

    } catch (e) {
      ultimoErro = e;
      esperarBackoff(tentativa);
    }
  }

  throw ultimoErro || new Error("Falha desconhecida ao classificar e-mail.");
}

/**
 * Espera com backoff exponencial (não espera após a última tentativa).
 */
function esperarBackoff(tentativa) {
  if (tentativa >= CONFIG.MAX_RETENTATIVAS) return;
  const ms = CONFIG.BACKOFF_BASE_MS * Math.pow(2, tentativa);
  Utilities.sleep(ms);
}

/**
 * Extrai o texto da resposta da Responses API, com fallbacks.
 * @param {Object} json
 * @returns {string}
 */
function extrairTextoResposta(json) {
  // Alguns retornos trazem o atalho output_text.
  if (json && typeof json.output_text === "string" && json.output_text.trim()) {
    return json.output_text;
  }

  if (json && Array.isArray(json.output)) {
    const msg = json.output.find(item => item.type === "message");
    if (msg && Array.isArray(msg.content)) {
      const bloco = msg.content.find(c => c.type === "output_text") || msg.content[0];
      if (bloco && typeof bloco.text === "string") {
        return bloco.text;
      }
    }
  }

  throw new Error("Resposta da OpenAI sem texto reconhecível: " +
    JSON.stringify(json).slice(0, 400));
}

/**
 * Faz parse de JSON tolerante: remove cercas markdown e texto ao redor.
 * @param {string} texto
 * @returns {Object}
 */
function parseJsonSeguro(texto) {
  if (!texto) throw new Error("Texto vazio para parse de JSON.");

  let t = String(texto).trim();

  // Remove cercas ```json ... ``` caso o modelo escape as instruções.
  t = t.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();

  // Isola do primeiro { ao último } (ignora qualquer preâmbulo/rodapé).
  const ini = t.indexOf("{");
  const fim = t.lastIndexOf("}");
  if (ini !== -1 && fim !== -1 && fim > ini) {
    t = t.slice(ini, fim + 1);
  }

  return JSON.parse(t);
}

/**
 * Valida e normaliza o resultado retornado pelo modelo, aplicando fallbacks
 * seguros para nunca quebrar o fluxo por causa de um campo fora do padrão.
 * @param {Object} r
 * @returns {{precisaAtendimento:boolean, tipo:string, prioridade:string, urgente:boolean,
 *            motivoUrgencia:string, confianca:number, motivo:string, resumo:string}}
 */
function validarResultado(r) {
  if (!r || typeof r !== "object") {
    throw new Error("Resultado da classificação não é um objeto.");
  }

  const precisa = r.precisaAtendimento === true || r.precisaAtendimento === "true";

  const tipo = TIPOS_VALIDOS.includes(r.tipo) ? r.tipo : "OUTROS";

  let prioridade = PRIORIDADES_VALIDAS.includes(r.prioridade)
    ? r.prioridade
    : "NORMAL";

  // Urgência só faz sentido para e-mails que vão para alguém atender.
  const urgente = precisa && (r.urgente === true || r.urgente === "true");
  if (urgente) prioridade = "ALTA";

  let confianca = Number(r.confianca);
  if (!Number.isFinite(confianca)) confianca = 0;
  confianca = Math.max(0, Math.min(100, Math.round(confianca)));

  const texto = (v, max) => typeof v === "string" ? v.trim().slice(0, max) : "";

  return {
    precisaAtendimento: precisa,
    tipo: tipo,
    prioridade: prioridade,
    urgente: urgente,
    motivoUrgencia: urgente ? texto(r.motivoUrgencia, 120) : "",
    confianca: confianca,
    motivo: texto(r.motivo, 120),
    resumo: texto(r.resumo, 200)
  };
}