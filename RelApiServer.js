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

function rel_obterResumoOperacional() {
  return rel_api_executar_(() => rel_resumoOperacional_obter_());
}

function rel_obterOpcoesImportacao() {
  return rel_api_executar_(() => rel_importacao_obterOpcoes_());
}

function rel_preAnalisarImportacao(dados) {
  return rel_api_executar_(() => rel_importacao_preAnalisar_(dados));
}

function rel_confirmarImportacao(dados) {
  return rel_api_executar_(() => rel_importacao_confirmar_(dados));
}

function rel_analisarContatosPortal() {
  return rel_api_executar_(() => rel_analise_executar_());
}

function rel_listarContatos(filtros) {
  return rel_api_executar_(() => rel_contatos_listar_(filtros));
}

function rel_atualizarEtapaContato(dados) {
  return rel_api_executar_(() => rel_contatos_atualizarEtapa_(dados));
}

function rel_salvarDadosContato(dados) {
  return rel_api_executar_(() => rel_contatos_salvarDados_(dados));
}

function rel_listarOpcoesCidades(filtros) {
  return rel_api_executar_(() => rel_cidades_listarOpcoes_(filtros));
}

function rel_cadastrarCidade(dados) {
  return rel_api_executar_(() => rel_cidades_cadastrar_(dados));
}

function rel_api_executar_(operacao) {
  try {
    const resposta = operacao();
    if (!resposta || typeof resposta !== 'object' || Array.isArray(resposta) ||
        typeof resposta.status !== 'string') {
      throw new Error('A API retornou uma resposta fora do contrato esperado.');
    }
    return rel_api_serializar_({
      status: resposta.status,
      mensagem: resposta.mensagem || '',
      dados: resposta.dados || {}
    });
  } catch (erro) {
    console.error(erro);
    return {
      status: 'ERRO_INTERNO',
      mensagem: 'Não foi possível concluir a operação.',
      dados: {}
    };
  }
}

function rel_api_serializar_(valor) {
  if (valor instanceof Date) {
    return Number.isNaN(valor.getTime()) ? '' : valor.toISOString();
  }
  if (Array.isArray(valor)) return valor.map(item => rel_api_serializar_(item));
  if (valor && typeof valor === 'object') {
    return Object.keys(valor).reduce((serializado, chave) => {
      const item = valor[chave];
      if (item !== undefined && typeof item !== 'function') {
        serializado[chave] = rel_api_serializar_(item);
      }
      return serializado;
    }, {});
  }
  return valor;
}
