function rel_origem_normalizarNome_(nome) {
  return String(nome || '')
    .trim()
    .replace(/\s+/g, ' ')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();
}

function rel_origem_resposta_(status, mensagem, dados) {
  return {
    status: status,
    mensagem: mensagem || '',
    dados: dados || {}
  };
}

function rel_origem_listar_(filtros) {
  const opcoes = filtros || {};
  const status = String(opcoes.status || 'ATIVO').trim().toUpperCase();
  const busca = rel_origem_normalizarNome_(opcoes.busca);
  if (['ATIVO', 'INATIVO', 'TODOS'].indexOf(status) === -1) {
    return rel_origem_resposta_('ERRO_VALIDACAO', 'Filtro de status inválido.', {});
  }

  const origens = rel_origem_listarRegistros_()
    .filter(origem => status === 'TODOS' || origem.status === status)
    .filter(origem => !busca ||
      rel_origem_normalizarNome_(origem.nomeOrigem).indexOf(busca) !== -1 ||
      origem.idOrigem.toUpperCase().indexOf(busca) !== -1)
    .map(origem => ({
      idOrigem: origem.idOrigem,
      nomeOrigem: origem.nomeOrigem,
      tipoOrigem: origem.tipoOrigem,
      status: origem.status,
      dataCadastro: origem.dataCadastro,
      observacao: origem.observacao
    }));

  return rel_origem_resposta_('OK', '', { origens: origens });
}

function rel_origem_cadastrar_(dados) {
  const entrada = dados || {};
  const nome = String(entrada.nomeOrigem || '').trim().replace(/\s+/g, ' ');
  const tipo = String(entrada.tipoOrigem || '').trim().toUpperCase();
  const observacao = String(entrada.observacao || '').trim();
  if (!nome) return rel_origem_resposta_('ERRO_VALIDACAO', 'Informe o nome da origem.', {});
  if (REL_CONFIG.ENUMS.TIPO_ORIGEM.indexOf(tipo) === -1) {
    return rel_origem_resposta_('ERRO_VALIDACAO', 'Tipo de origem inválido.', {});
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const origens = rel_origem_listarRegistros_();
    const nomeNormalizado = rel_origem_normalizarNome_(nome);
    const existente = origens.find(origem => rel_origem_normalizarNome_(origem.nomeOrigem) === nomeNormalizado);
    if (existente) {
      return rel_origem_resposta_(
        'DUPLICADO',
        'A origem “' + existente.nomeOrigem + '” já existe e está ' +
          (existente.status === 'ATIVO' ? 'ativa' : 'inativa') + '.',
        { origem: { idOrigem: existente.idOrigem, nomeOrigem: existente.nomeOrigem, status: existente.status } }
      );
    }

    const maiorNumero = origens.reduce((maior, origem) => {
      const correspondencia = /^ORG(\d{6})$/.exec(origem.idOrigem);
      return correspondencia ? Math.max(maior, Number(correspondencia[1])) : maior;
    }, 0);
    const idOrigem = 'ORG' + String(maiorNumero + 1).padStart(6, '0');
    rel_origem_inserir_({
      idOrigem: idOrigem,
      nomeOrigem: nome,
      tipoOrigem: tipo,
      status: 'ATIVO',
      dataCadastro: new Date(),
      observacao: observacao
    });
    return rel_origem_resposta_('OK', 'Origem cadastrada com sucesso.', {
      origem: { idOrigem: idOrigem, nomeOrigem: nome, status: 'ATIVO' }
    });
  } finally {
    lock.releaseLock();
  }
}

function rel_origem_alterarStatus_(idOrigem, novoStatus) {
  const id = String(idOrigem || '').trim();
  const status = String(novoStatus || '').trim().toUpperCase();
  if (!id) return rel_origem_resposta_('ERRO_VALIDACAO', 'Informe o ID da origem.', {});
  if (REL_CONFIG.ENUMS.STATUS.indexOf(status) === -1) {
    return rel_origem_resposta_('ERRO_VALIDACAO', 'Status inválido.', {});
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const origem = rel_origem_listarRegistros_().find(item => item.idOrigem === id);
    if (!origem) return rel_origem_resposta_('NAO_ENCONTRADO', 'Origem não encontrada.', {});
    rel_origem_atualizarStatus_(origem.linha, status);
    return rel_origem_resposta_('OK', status === 'ATIVO' ? 'Origem reativada.' : 'Origem inativada.', {
      origem: { idOrigem: id, nomeOrigem: origem.nomeOrigem, status: status }
    });
  } finally {
    lock.releaseLock();
  }
}
