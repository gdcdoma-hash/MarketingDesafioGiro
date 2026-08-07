const DG_ROUTER_AREAS_PERMITIDAS = ['divulgadores', 'contatos'];


function doGet(e) {
  const parametros = e && e.parameter ? e.parameter : {};
  const area = String(parametros.area || '').trim().toLowerCase();
  const areaPermitida = DG_ROUTER_AREAS_PERMITIDAS.includes(area)
    ? area
    : 'divulgadores';

  if (areaPermitida === 'contatos') {
    const acesso = String(parametros.acesso || '');
    return rel_acesso_validarOperador_(acesso)
      ? rel_criarPaginaContatos_(acesso)
      : rel_criarPaginaRelacionamentoNegado_();
  }

  // A ausência da área, "divulgadores" e áreas desconhecidas mantêm a rota atual.
  return dg_router_criarPaginaDivulgadores_();
}


function dg_router_criarPaginaDivulgadores_() {
  const template = HtmlService.createTemplateFromFile('Index');
  template.webAppUrl = ScriptApp.getService().getUrl();

  const output = template
    .evaluate()
    .setTitle('Marketing — Desafio Giro')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);

  output.addMetaTag(
    'viewport',
    'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no'
  );

  return output;
}


function rel_criarPaginaContatos_(acesso) {
  const template = HtmlService.createTemplateFromFile('RelIndex');
  template.webAppUrl = ScriptApp.getService().getUrl();
  template.acesso = acesso;

  return template
    .evaluate()
    .setTitle('Contatos e Relacionamento — Desafio Giro')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function rel_criarPaginaRelacionamentoNegado_() {
  return HtmlService.createHtmlOutput('<!DOCTYPE html><html lang="pt-BR"><body><main><h1>Acesso não autorizado</h1><p>' +
    REL_ACESSO_MENSAGEM_INVALIDA + '</p></main></body></html>')
    .setTitle('Acesso não autorizado')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}
