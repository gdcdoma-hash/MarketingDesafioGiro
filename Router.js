const RELACIONAMENTO_PROPRIEDADE_CHAVE = 'RELACIONAMENTO_CHAVE_ACESSO';
const RELACIONAMENTO_PLACEHOLDER_CHAVE = 'SUBSTITUIR_ANTES_DE_EXECUTAR';
const DG_ROUTER_AREAS_PERMITIDAS = ['divulgadores', 'contatos'];


function doGet(e) {
  const parametros = e && e.parameter ? e.parameter : {};
  const area = String(parametros.area || '').trim().toLowerCase();
  const areaPermitida = DG_ROUTER_AREAS_PERMITIDAS.includes(area)
    ? area
    : 'divulgadores';

  if (areaPermitida === 'contatos') {
    return rel_validarAcesso_(parametros.acesso)
      ? rel_criarPaginaContatos_()
      : rel_criarPaginaNaoAutorizada_();
  }

  // A ausência da área, "divulgadores" e áreas desconhecidas mantêm a rota atual.
  return dg_router_criarPaginaDivulgadores_();
}


function dg_router_criarPaginaDivulgadores_() {
  const output = HtmlService
    .createTemplateFromFile('Index')
    .evaluate()
    .setTitle('Marketing — Desafio Giro')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);

  output.addMetaTag(
    'viewport',
    'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no'
  );

  return output;
}


function rel_criarPaginaContatos_() {
  return HtmlService
    .createTemplateFromFile('RelacionamentoIndex')
    .evaluate()
    .setTitle('Contatos e Relacionamento — Desafio Giro')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}


function rel_criarPaginaNaoAutorizada_() {
  const html = [
    '<!DOCTYPE html>',
    '<html lang="pt-BR">',
    '<head><base target="_top"></head>',
    '<body>',
    '<main>',
    '<h1>Acesso não autorizado</h1>',
    '<p>O endereço informado não possui autorização para abrir este módulo.</p>',
    '</main>',
    '</body>',
    '</html>'
  ].join('');

  return HtmlService
    .createHtmlOutput(html)
    .setTitle('Acesso não autorizado')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}


function rel_validarAcesso_(chaveInformada) {
  const chaveConfigurada = PropertiesService
    .getScriptProperties()
    .getProperty(RELACIONAMENTO_PROPRIEDADE_CHAVE);

  if (!chaveConfigurada) return false;

  return String(chaveInformada || '') === chaveConfigurada;
}


/**
 * Função administrativa manual. Substitua o placeholder antes de executá-la.
 */
function rel_configurarChaveAcessoInicial() {
  const chave = 'SUBSTITUIR_ANTES_DE_EXECUTAR';

  if (!chave || chave === RELACIONAMENTO_PLACEHOLDER_CHAVE) {
    throw new Error('Substitua o placeholder antes de executar a configuração.');
  }

  PropertiesService
    .getScriptProperties()
    .setProperty(RELACIONAMENTO_PROPRIEDADE_CHAVE, chave);

  Logger.log('Chave de acesso do módulo de relacionamento configurada com sucesso.');
}
