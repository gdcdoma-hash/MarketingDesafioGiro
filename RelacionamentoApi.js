function rel_listarOrigens(filtros) {
  return rel_api_executar_(() => rel_origem_listar_(filtros));
}

function rel_cadastrarOrigem(dados) {
  return rel_api_executar_(() => rel_origem_cadastrar_(dados));
}

function rel_alterarStatusOrigem(idOrigem, novoStatus) {
  return rel_api_executar_(() => rel_origem_alterarStatus_(idOrigem, novoStatus));
}

function rel_obterResumo() {
  return rel_api_executar_(() => rel_resumo_obter_());
}

function rel_obterOpcoesImportacao() {
  return rel_api_executar_(() => rel_importacao_obterOpcoes_());
}

function rel_listarColunasImportacao(idAba) {
  return rel_api_executar_(() => rel_importacao_listarColunas_(idAba));
}

function rel_preAnalisarImportacao(dados) {
  return rel_api_executar_(() => rel_importacao_preAnalisar_(dados));
}

function rel_confirmarImportacao(dados) {
  return rel_api_executar_(() => rel_importacao_confirmar_(dados));
}

function rel_api_executar_(operacao) {
  try {
    return operacao();
  } catch (erro) {
    console.error(erro);
    return {
      status: 'ERRO_INTERNO',
      mensagem: 'Não foi possível concluir a operação.',
      dados: {}
    };
  }
}
