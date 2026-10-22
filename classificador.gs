/**
 * =========================================================
 * CLASSIFICADOR (fachada)
 * =========================================================
 * Ponto único de entrada para classificação. Se um dia trocar
 * de provedor (OpenAI, etc.), basta alterar aqui.
 */
function classificarEmail(email) {
  return classificarComChat(email);
}