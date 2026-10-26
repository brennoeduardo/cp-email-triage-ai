/**
 * =========================================================
 * AVISO PARA A EQUIPE (GOOGLE CHAT)
 * =========================================================
 * Envia ao espaço do Google Chat um card com os e-mails distribuídos na
 * execução, uma seção por responsável e com os urgentes primeiro.
 *
 * Propriedade do Script usada:
 *   CHAT_WEBHOOK_URL → webhook do espaço do Google Chat
 */

const COR_URGENTE = "#d93025";
const COR_SECUNDARIA = "#5f6368";

/**
 * @param {Object[]} distribuidos itens gerados por montarDistribuicao()
 */
function notificarEquipe(distribuidos) {
  if (!distribuidos.length || !NOTIFICACAO.ATIVO) return;

  const grupos = agruparPorResponsavel(distribuidos);

  if (CONFIG.SIMULAR) {
    Logger.log("======== AVISO (SIMULAÇÃO) ========\n" + resumoTexto(grupos));
    return;
  }

  enviarParaChat(montarCard(grupos));
}

/**
 * Agrupa por responsável, mantendo a ordem do rodízio e urgentes no topo.
 * @returns {{responsavel:string, itens:Object[]}[]}
 */
function agruparPorResponsavel(distribuidos) {
  return RESPONSAVEIS
    .map(responsavel => ({
      responsavel: responsavel,
      itens: distribuidos
        .filter(d => d.responsavel === responsavel)
        .sort((a, b) => Number(b.urgente) - Number(a.urgente))
    }))
    .filter(g => g.itens.length);
}

function enviarParaChat(mensagem) {
  const url = PropertiesService.getScriptProperties().getProperty("CHAT_WEBHOOK_URL");
  if (!url) throw new Error("CHAT_WEBHOOK_URL não configurada nas Propriedades do Script.");

  const response = UrlFetchApp.fetch(url, {
    method: "post",
    contentType: "application/json; charset=UTF-8",
    payload: JSON.stringify(mensagem),
    muteHttpExceptions: true
  });
  const code = response.getResponseCode();
  if (code >= 400) {
    throw new Error(`Google Chat HTTP ${code}: ${response.getContentText().slice(0, 300)}`);
  }

  Logger.log("📣 Aviso enviado ao Google Chat.");
}

// ---------------------------------------------------------
// MONTAGEM DO CARD
// ---------------------------------------------------------

/**
 * Monta a mensagem (cardsV2) do Google Chat.
 */
function montarCard(grupos) {
  const total = grupos.reduce((s, g) => s + g.itens.length, 0);
  const urgentes = grupos.reduce((s, g) => s + g.itens.filter(i => i.urgente).length, 0);
  const agora = Utilities.formatDate(new Date(), "America/Sao_Paulo", "dd/MM 'às' HH:mm");

  const subtitulo = [
    plural(total, "e-mail distribuído", "e-mails distribuídos"),
    urgentes ? plural(urgentes, "urgente", "urgentes") : null,
    agora
  ].filter(Boolean).join("  ·  ");

  const secoes = grupos.map(g => ({
    header: `👤  ${g.responsavel}  ·  ${plural(g.itens.length, "e-mail", "e-mails")}`,
    widgets: g.itens.flatMap((item, idx) =>
      (idx > 0 ? [{ divider: {} }] : []).concat(widgetsDoItem(item)))
  }));

  return {
    // Menções só funcionam no texto da mensagem (não dentro do card).
    text: linhaMencoes(grupos),
    fallbackText: `📬 ${subtitulo}`,
    cardsV2: [{
      cardId: "triagem-" + Date.now(),
      card: {
        header: {
          title: urgentes ? "🔴  Triagem de e-mails" : "📬  Triagem de e-mails",
          subtitle: subtitulo
        },
        sections: secoes
      }
    }]
  };
}

/**
 * Linha acima do card: "📬 Novos e-mails para @Eduardo (2 · 🔴 1 urgente), @Ian (1)".
 */
function linhaMencoes(grupos) {
  const partes = grupos.map(g => {
    const urgentes = g.itens.filter(i => i.urgente).length;
    return `${mencao(g.responsavel)} (${g.itens.length}` +
           (urgentes ? ` · 🔴 ${urgentes} urgente${urgentes > 1 ? "s" : ""}` : "") + ")";
  });
  return "📬 Novos e-mails para " + partes.join(", ");
}

/**
 * "<users/ID>" (menção real) quando o ID do responsável é encontrado;
 * senão, apenas o nome em negrito.
 */
function mencao(responsavel) {
  const email = obterEmailResponsavel(responsavel);
  const id = email ? obterIdChat(email) : null;
  return id ? `<users/${id}>` : `*${responsavel}*`;
}

/**
 * E-mail do responsável, lido da Propriedade do Script EMAIL_<NOME>.
 * Fica fora do código para não expor dados da equipe no repositório.
 * @returns {string|null}
 */
function obterEmailResponsavel(responsavel) {
  return PropertiesService.getScriptProperties().getProperty("EMAIL_" + responsavel);
}

/**
 * O Chat só menciona pelo ID numérico do usuário (o mesmo da People API).
 * Busca o ID no diretório da organização pelo e-mail e guarda nas Propriedades
 * do Script, para consultar o diretório só na primeira vez.
 * Aceita também o ID numérico direto na propriedade EMAIL_<NOME>.
 * @returns {string|null}
 */
function obterIdChat(email) {
  const valor = String(email).trim().toLowerCase();
  if (/^\d+$/.test(valor)) return valor;

  const props = PropertiesService.getScriptProperties();
  const chave = "CHAT_ID_" + valor;
  const salvo = props.getProperty(chave);
  if (salvo) return salvo;

  try {
    const r = People.People.searchDirectoryPeople({
      query: valor,
      readMask: "emailAddresses",
      sources: ["DIRECTORY_SOURCE_TYPE_DOMAIN_PROFILE"]
    });
    const pessoa = (r.people || []).find(p =>
      (p.emailAddresses || []).some(e => String(e.value).toLowerCase() === valor));
    if (!pessoa) {
      Logger.log(`Menção: ${valor} não encontrado no diretório.`);
      return null;
    }
    const id = pessoa.resourceName.split("/")[1];
    props.setProperty(chave, id);
    return id;
  } catch (e) {
    Logger.log(`Menção: falha ao buscar ID de ${valor}: ${e}`);
    return null;
  }
}

/**
 * Widgets de um e-mail: etiqueta do tipo, assunto, resumo, remetente e botão.
 */
function widgetsDoItem(item) {
  const tipo = nomeTipo(item.tipo);

  let texto = `<b>${escaparHtml(item.assunto) || "(sem assunto)"}</b>`;
  if (item.urgente) {
    texto = `<font color="${COR_URGENTE}"><b>URGENTE</b>` +
            (item.motivoUrgencia ? ` · ${escaparHtml(item.motivoUrgencia)}` : "") +
            `</font><br>` + texto;
  }
  if (item.resumo) {
    texto += `<br><font color="${COR_SECUNDARIA}">${escaparHtml(item.resumo)}</font>`;
  }

  return [
    {
      decoratedText: {
        topLabel: `${tipo}  ·  ${nomeRemetente(item.remetente)}`,
        text: texto,
        wrapText: true
      }
    },
    {
      buttonList: {
        buttons: [{
          text: "Abrir e-mail",
          onClick: { openLink: { url: item.link } }
        }]
      }
    }
  ];
}

/**
 * Texto simples para o Log no modo simulação.
 */
function resumoTexto(grupos) {
  return grupos.map(g =>
    `${g.responsavel}:\n` + g.itens.map(i =>
      `  ${i.urgente ? "[URGENTE] " : ""}${i.assunto} — ${i.resumo}`).join("\n")
  ).join("\n");
}

// ---------------------------------------------------------
// AUXILIARES
// ---------------------------------------------------------

/**
 * "Fulano <fulano@x.com>" → "Fulano"; sem nome → o próprio e-mail.
 */
function nomeRemetente(remetente) {
  const r = String(remetente || "");
  const nome = r.replace(/<.*>/, "").replace(/"/g, "").trim();
  const email = (r.match(/<([^>]+)>/) || [])[1] || r;
  return (nome || email).replace(/[<>&]/g, "").trim();
}

function plural(n, singular, pluralTexto) {
  return `${n} ${n === 1 ? singular : pluralTexto}`;
}

function escaparHtml(texto) {
  return String(texto || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
