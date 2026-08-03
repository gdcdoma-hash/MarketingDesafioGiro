function rel_origem_obterAba_() {
  const aba = SpreadsheetApp.openById(SPREADSHEET_ID)
    .getSheetByName(REL_CONFIG.ABAS.ORIGENS.NOME);

  if (!aba) throw new Error('A aba Relacionamento_Origens não foi encontrada.');
  return aba;
}

function rel_origem_obterMapaCabecalhos_(aba) {
  const ultimaColuna = aba.getLastColumn();
  if (!ultimaColuna) throw new Error('A aba de origens não possui cabeçalhos.');

  const mapa = {};
  aba.getRange(1, 1, 1, ultimaColuna).getDisplayValues()[0].forEach((valor, indice) => {
    const cabecalho = String(valor || '').trim();
    if (cabecalho) mapa[cabecalho] = indice;
  });

  REL_CONFIG.ABAS.ORIGENS.CABECALHOS.forEach(cabecalho => {
    if (mapa[cabecalho] === undefined) {
      throw new Error('Cabeçalho obrigatório ausente: ' + cabecalho);
    }
  });
  return mapa;
}

function rel_origem_listarRegistros_() {
  const aba = rel_origem_obterAba_();
  const mapa = rel_origem_obterMapaCabecalhos_(aba);
  const ultimaLinha = aba.getLastRow();
  if (ultimaLinha < 2) return [];

  return aba.getRange(2, 1, ultimaLinha - 1, aba.getLastColumn()).getValues()
    .map((linha, indice) => ({
      linha: indice + 2,
      idOrigem: String(linha[mapa.ID_ORIGEM] || '').trim(),
      nomeOrigem: String(linha[mapa.NOME_ORIGEM] || '').trim(),
      tipoOrigem: String(linha[mapa.TIPO_ORIGEM] || '').trim(),
      status: String(linha[mapa.STATUS] || '').trim(),
      dataCadastro: linha[mapa.DATA_CADASTRO],
      observacao: String(linha[mapa.OBSERVACAO] || '').trim()
    }));
}

function rel_origem_inserir_(origem) {
  const aba = rel_origem_obterAba_();
  const mapa = rel_origem_obterMapaCabecalhos_(aba);
  const linha = new Array(aba.getLastColumn()).fill('');
  linha[mapa.ID_ORIGEM] = origem.idOrigem;
  linha[mapa.NOME_ORIGEM] = origem.nomeOrigem;
  linha[mapa.TIPO_ORIGEM] = origem.tipoOrigem;
  linha[mapa.STATUS] = origem.status;
  linha[mapa.DATA_CADASTRO] = origem.dataCadastro;
  linha[mapa.OBSERVACAO] = origem.observacao;
  aba.appendRow(linha);
}

function rel_origem_atualizarStatus_(linha, status) {
  const aba = rel_origem_obterAba_();
  const mapa = rel_origem_obterMapaCabecalhos_(aba);
  aba.getRange(linha, mapa.STATUS + 1).setValue(status);
}
