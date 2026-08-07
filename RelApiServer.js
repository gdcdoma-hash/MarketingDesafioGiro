function rel_listarOrigens(filtros, acesso) {
  return rel_api_executar_(() => rel_origem_listar_(filtros), acesso);
}

function rel_cadastrarOrigem(dados, acesso) {
  return rel_api_executar_(() => rel_origem_cadastrar_(dados), acesso);
}

function rel_alterarStatusOrigem(idOrigem, novoStatus, acesso) {
  return rel_api_executar_(() => rel_origem_alterarStatus_(idOrigem, novoStatus), acesso);
}

function rel_obterResumo(acesso) {
  return rel_api_executar_(() => rel_resumo_obter_(), acesso);
}

function rel_obterResumoOperacional(acesso) {
  return rel_api_executar_(() => rel_resumoOperacional_obter_(), acesso);
}

function rel_obterOpcoesImportacao(acesso) {
  return rel_api_executar_(() => rel_importacao_obterOpcoes_(), acesso);
}

function rel_preAnalisarImportacao(dados, acesso) {
  return rel_api_executar_(() => rel_importacao_preAnalisar_(dados), acesso);
}

function rel_confirmarImportacao(dados, acesso) {
  return rel_api_executar_(() => rel_importacao_confirmar_(dados), acesso);
}

function rel_preAnalisarGoogleContatos(dados, acesso) {
  return rel_api_executar_(operador => rel_google_contatos_preAnalisar_(dados, operador), acesso);
}

function rel_confirmarGoogleContatos(dados, acesso) {
  return rel_api_executar_(operador => rel_google_contatos_confirmar_(dados, operador), acesso);
}

function rel_cancelarPreviaGoogleContatos(dados, acesso) {
  return rel_api_executar_(operador => rel_google_contatos_cancelarPrevia_(dados, operador), acesso);
}

function rel_analisarContatosPortal(acesso) {
  return rel_api_executar_(() => rel_analise_executar_(), acesso);
}

function rel_listarContatos(filtros, acesso) {
  return rel_api_executar_(() => rel_contatos_listar_(filtros), acesso);
}

function rel_prepararEstruturaContatos(acesso) {
  return rel_api_executar_(() => ({ status: 'OK', mensagem: '', dados: rel_garantirEstruturaContatos_() }), acesso);
}

function rel_atualizarEtapaContato(dados, acesso) {
  return rel_api_executar_(() => rel_contatos_atualizarEtapa_(dados), acesso);
}

function rel_salvarDadosContato(dados, acesso) {
  return rel_api_executar_(() => rel_contatos_salvarDados_(dados), acesso);
}

function rel_listarOpcoesCidades(filtros, acesso) {
  return rel_api_executar_(() => rel_cidades_listarOpcoes_(filtros), acesso);
}

function rel_cadastrarCidade(dados, acesso) {
  return rel_api_executar_(() => rel_cidades_cadastrar_(dados), acesso);
}

function rel_api_executar_(operacao, acesso) {
  try {
    const operador = rel_acesso_exigirOperador_(acesso);
    const resposta = operacao(operador);
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
    if (erro && erro.message === 'REL_ACESSO_INVALIDO') return { status: 'ERRO_ACESSO', mensagem: REL_ACESSO_MENSAGEM_INVALIDA, dados: {} };
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
