function rel_resumo_obterRegistros_(configuracaoAba, cabecalhosNecessarios) {
  const aba = dg_abrirPlanilhaMarketingRelacionamento_()
    .getSheetByName(configuracaoAba.NOME);
  if (!aba) throw new Error('A aba ' + configuracaoAba.NOME + ' não foi encontrada.');

  const ultimaColuna = aba.getLastColumn();
  if (!ultimaColuna) throw new Error('A aba ' + configuracaoAba.NOME + ' não possui cabeçalhos.');

  const mapa = {};
  aba.getRange(1, 1, 1, ultimaColuna).getDisplayValues()[0].forEach((valor, indice) => {
    const cabecalho = String(valor || '').trim();
    if (cabecalho) mapa[cabecalho] = indice;
  });
  cabecalhosNecessarios.forEach(cabecalho => {
    if (mapa[cabecalho] === undefined) {
      throw new Error('Cabeçalho obrigatório ausente: ' + cabecalho);
    }
  });

  const ultimaLinha = aba.getLastRow();
  if (ultimaLinha < 2) return [];

  return aba.getRange(2, 1, ultimaLinha - 1, ultimaColuna).getValues()
    .map(linha => cabecalhosNecessarios.reduce((registro, cabecalho) => {
      registro[cabecalho] = linha[mapa[cabecalho]];
      return registro;
    }, {}));
}

function rel_resumo_listarOrigens_() {
  return rel_resumo_obterRegistros_(REL_CONFIG.ABAS.ORIGENS, ['STATUS']);
}

function rel_resumo_listarContatos_() {
  return rel_resumo_obterRegistros_(REL_CONFIG.ABAS.CONTATOS, [
    'TELEFONE_NORMALIZADO',
    'DATA_ULTIMA_IMPORTACAO'
  ]);
}
