const DG_ROUTER_AREAS_PERMITIDAS = ['divulgadores', 'contatos'];


function doGet(e) {
  const parametros = e && e.parameter ? e.parameter : {};
  // Diagnostico isolado: sem leitura de planilhas, sessao ou dados pessoais.
  // Se este endpoint nao abrir fora da conta proprietaria, o bloqueio ocorre
  // antes da execucao da aplicacao ou na camada de entrega do Google.
  if (parametros.diagnostico === 'acesso') {
    console.info('MARKETING_DGMB_DIAGNOSTICO_ACESSO_DOGET');
    return HtmlService.createHtmlOutput(
      '<!doctype html><html lang="pt-BR"><head><meta charset="UTF-8">' +
      '<meta name="viewport" content="width=device-width, initial-scale=1">' +
      '<title>Diagnostico de acesso</title></head>' +
      '<body><p>MARKETING_DGMB_ACESSO_OK</p></body></html>'
    ).setTitle('Diagnostico de acesso - Marketing Desafio Giro');
  }

  const area = String(parametros.area || '').trim().toLowerCase();
  const areaPermitida = DG_ROUTER_AREAS_PERMITIDAS.includes(area)
    ? area
    : 'divulgadores';

  if (areaPermitida === 'contatos') {
    return rel_criarPaginaContatos_();
  }

  // A ausência da área, "divulgadores" e áreas desconhecidas mantêm a rota atual.
  return dg_router_criarPaginaDivulgadores_();
}


function dg_router_criarPaginaDivulgadores_() {
  const template = HtmlService.createTemplateFromFile('Index');
  template.webAppUrl = dg_router_urlCanonica_(ScriptApp.getService().getUrl());

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


function rel_criarPaginaContatos_() {
  const template = HtmlService.createTemplateFromFile('RelIndex');
  template.webAppUrl = dg_router_urlCanonica_(ScriptApp.getService().getUrl());

  return template
    .evaluate()
    .setTitle('Contatos e Relacionamento — Desafio Giro')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}



// Mantem links internos independentes do indice da conta que abriu o editor.
// authuser=0 reduz a selecao implicita de outra sessao pelo Google;
// nao substitui autorizacao nem garante suporte a multi-login da plataforma.
function dg_router_urlCanonica_(url) {
  return String(url || '').trim()
    .replace(/^(https:\/\/script\.google\.com\/macros)\/u\/\d+\/s\//, '$1/s/')
    .split(/[?#]/)[0];
}
