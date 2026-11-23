/**
 * Diagnóstico de pré-publicação: só leitura, sem nomes, documentos ou telefones.
 * Valida que o projeto PROD separado consulta as fontes oficiais corretas.
 */
function dg_prod_autoteste() {
  const config = dg_configPlanilhas_();
  if (config.ambiente !== 'PROD') {
    throw new Error('Diagnóstico exclusivo de produção. Não execute no LAB.');
  }
  const checks = [];
  function validar(nome, valor) {
    checks.push({ teste: nome, ok: valor === true });
  }
  validar('Marketing usa sua própria base oficial',
    config.marketingId === DG_PLANILHA_MARKETING_RELACIONAMENTO_ID);
  validar('Portal oficial separado em consulta',
    config.portalId === SPREADSHEET_ID &&
    config.portalId !== config.marketingId);
  validar('Produção inicia com alterações bloqueadas', !dg_edicaoPermitida_());

  const marketing = dg_abrirPlanilhaMarketingRelacionamento_();
  const portal = dg_abrirPlanilhaPortal_();
  validar('ID Marketing confirmado', marketing.getId() === config.marketingId);
  validar('ID Portal confirmado', portal.getId() === config.portalId);

  const referencias = lerAbaComoObjetos_(marketing, 'Marketing');
  const contatos = lerAbaComoObjetos_(marketing, 'Relacionamento_Contatos');
  const desafios = lerAbaComoObjetos_(portal, 'ListaDesafios');
  const inscricoes = lerAbaComoObjetos_(portal, 'dgmbDesafios');
  const refsValidas = referencias.filter(item =>
    /^[A-Za-z0-9_-]{1,100}$/.test(String(item.REF || '').trim()));
  validar('Referências cadastradas com formato válido',
    referencias.length > 0 && refsValidas.length === referencias.length);
  validar('Contatos de relacionamento acessíveis', contatos.length > 0);
  validar('Catálogo de desafios acessível', desafios.length > 0);
  validar('Inscrições do Portal acessíveis', inscricoes.length > 0);
  // Leitura de um período existente, sem retornar detalhes de atletas.
  const periodos = [...new Set(desafios.map(item =>
    String(item.Periodo || '').trim()).filter(Boolean))];
  validar('Desafios com período de realização', periodos.length > 0);

  return {
    status: checks.every(item => item.ok) ? 'OK' : 'FALHA',
    ambiente: 'PROD',
    edicaoLiberada: dg_edicaoPermitida_(),
    verificacoes: checks,
    resumo: {
      referencias: referencias.length,
      contatos: contatos.length,
      desafios: desafios.length,
      inscricoes: inscricoes.length,
      periodos: periodos.length
    }
  };
}
