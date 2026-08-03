function rel_listarOrigens(filtros) {
  return rel_api_executar_(() => rel_origem_listar_(filtros));
}

function rel_cadastrarOrigem(dados) {
  return rel_api_executar_(() => rel_origem_cadastrar_(dados));
}

function rel_alterarStatusOrigem(idOrigem, novoStatus) {
  return rel_api_executar_(() => rel_origem_alterarStatus_(idOrigem, novoStatus));
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
