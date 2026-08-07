function rel_contatos_obterAba_(configuracao) {
  const aba = dg_abrirPlanilhaMarketingRelacionamento_().getSheetByName(configuracao.NOME);
  if (!aba) throw new Error('A aba ' + configuracao.NOME + ' não foi encontrada.');
  return aba;
}

function rel_contatos_mapaCabecalhos_(aba, obrigatorios) {
  const ultimaColuna = aba.getLastColumn();
  if (!ultimaColuna) throw new Error('A aba ' + aba.getName() + ' não possui cabeçalhos.');
  const mapa = {};
  aba.getRange(1, 1, 1, ultimaColuna).getDisplayValues()[0].forEach((valor, indice) => {
    const nome = String(valor || '').trim();
    if (nome) mapa[nome] = indice;
  });
  obrigatorios.forEach(nome => {
    if (mapa[nome] === undefined) throw new Error('Cabeçalho obrigatório ausente: ' + nome);
  });
  return mapa;
}

function rel_contatos_lerAba_(configuracao, obrigatorios) {
  const aba = rel_contatos_obterAba_(configuracao);
  const mapa = rel_contatos_mapaCabecalhos_(aba, obrigatorios);
  const ultimaLinha = aba.getLastRow();
  return {
    aba: aba,
    mapa: mapa,
    valores: ultimaLinha < 2 ? [] : aba.getRange(2, 1, ultimaLinha - 1, aba.getLastColumn()).getValues()
  };
}

/** Migração controlada e idempotente; nunca é chamada por uma função de leitura. */
function rel_garantirEstruturaContatos_() {
  const aba = rel_contatos_obterAba_(REL_CONFIG.ABAS.CONTATOS);
  const atuais = aba.getLastColumn()
    ? aba.getRange(1, 1, 1, aba.getLastColumn()).getDisplayValues()[0].map(valor => String(valor || '').trim())
    : [];
  const ausentes = ['MOTIVO_NAO_CONTATAR', 'MOTIVO_NAO_CONTATAR_OUTRO']
    .filter(cabecalho => atuais.indexOf(cabecalho) < 0);
  if (ausentes.length) aba.getRange(1, aba.getLastColumn() + 1, 1, ausentes.length).setValues([ausentes]).setFontWeight('bold');
  return { adicionados: ausentes };
}

function rel_contatos_registrarHistoricoEtapa_(registro, anterior, novo, agora) {
  const tabela = rel_contatos_lerAba_(REL_CONFIG.ABAS.HISTORICO, REL_CONFIG.ABAS.HISTORICO.CABECALHOS);
  const linha = new Array(tabela.aba.getLastColumn()).fill('');
  const valores = {
    ID_EVENTO: Utilities.getUuid(), TELEFONE_NORMALIZADO: registro.valores[registro.mapa.TELEFONE_NORMALIZADO],
    TIPO_EVENTO: 'ALTERACAO_ETAPA', DATA_HORA: agora,
    VALOR_ANTERIOR: JSON.stringify(anterior), VALOR_NOVO: JSON.stringify(novo),
    DETALHE: 'Alteração realizada no painel de relacionamento.',
    USUARIO: Session.getActiveUser().getEmail() || ''
  };
  Object.keys(valores).forEach(campo => { linha[tabela.mapa[campo]] = valores[campo]; });
  tabela.aba.getRange(tabela.aba.getLastRow() + 1, 1, 1, linha.length).setValues([linha]);
}

function rel_contatos_restaurarRegistro_(registro, valoresAnteriores) {
  registro.aba.getRange(registro.linha, 1, 1, valoresAnteriores.length).setValues([valoresAnteriores]);
}

function rel_contatos_carregarListagem_() {
  return {
    contatos: rel_contatos_lerAba_(REL_CONFIG.ABAS.CONTATOS, ['TELEFONE_NORMALIZADO']),
    vinculos: rel_contatos_lerAba_(REL_CONFIG.ABAS.CONTATO_ORIGENS, ['TELEFONE_NORMALIZADO', 'ID_ORIGEM']),
    origens: rel_contatos_lerAba_(REL_CONFIG.ABAS.ORIGENS, ['ID_ORIGEM', 'NOME_ORIGEM', 'STATUS']),
    cidades: rel_contatos_lerAba_(REL_CONFIG.ABAS.CIDADES, ['UF', 'REGIAO', 'CIDADE', 'CIDADE_NORMALIZADA', 'STATUS']),
    googleContatos: rel_google_contatos_obterTabela_(false)
  };
}

function rel_contatos_localizar_(telefone) {
  const dados = rel_contatos_lerAba_(REL_CONFIG.ABAS.CONTATOS, ['TELEFONE_NORMALIZADO']);
  const indice = dados.valores.findIndex(linha => String(linha[dados.mapa.TELEFONE_NORMALIZADO] || '').trim() === telefone);
  return indice < 0 ? null : { aba: dados.aba, mapa: dados.mapa, linha: indice + 2, valores: dados.valores[indice] };
}

function rel_contatos_atualizarCampos_(registro, campos) {
  const linhaAtualizada = registro.valores.slice();
  Object.keys(campos).forEach(cabecalho => {
    if (registro.mapa[cabecalho] === undefined) throw new Error('Cabeçalho obrigatório ausente: ' + cabecalho);
    linhaAtualizada[registro.mapa[cabecalho]] = campos[cabecalho];
  });
  registro.aba
    .getRange(registro.linha, 1, 1, linhaAtualizada.length)
    .setValues([linhaAtualizada]);
}

function rel_cidades_ler_() {
  return rel_contatos_lerAba_(REL_CONFIG.ABAS.CIDADES, ['UF', 'REGIAO', 'CIDADE', 'CIDADE_NORMALIZADA', 'STATUS']);
}

function rel_cidades_inserir_(dados) {
  const repositorio = rel_cidades_ler_();
  const linha = new Array(repositorio.aba.getLastColumn()).fill('');
  Object.keys(dados).forEach(cabecalho => {
    if (repositorio.mapa[cabecalho] !== undefined) linha[repositorio.mapa[cabecalho]] = dados[cabecalho];
  });
  repositorio.aba.getRange(repositorio.aba.getLastRow() + 1, 1, 1, linha.length).setValues([linha]);
}
