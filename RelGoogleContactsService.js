function rel_agendaGoogle_resposta_(status, mensagem, dados) {
  return { status: status, mensagem: mensagem || '', dados: dados || {} };
}

function rel_agendaGoogle_analisar_(dados) {
  const registros = Array.isArray(dados && dados.registros) ? dados.registros : [];
  if (registros.length > 20000) {
    return { erro: rel_agendaGoogle_resposta_('ERRO_VALIDACAO', 'O limite é de 20.000 telefones por arquivo.', {}) };
  }
  const nomesPorTelefone = {};
  const conflitos = {};
  const telefonesValidos = {};
  let invalidos = 0;
  let duplicadosEquivalentes = 0;
  registros.forEach(registro => {
    const nome = String(registro && registro.nome || '').trim().replace(/\s+/g, ' ');
    const original = String(registro && registro.telefoneOriginal || '').trim();
    if (!original) return;
    const normalizado = rel_telefone_normalizar_(original);
    if (!normalizado.valido) { invalidos++; return; }
    const telefone = normalizado.telefoneNormalizado;
    telefonesValidos[telefone] = true;
    if (!nome) return;
    if (conflitos[telefone]) {
      if (conflitos[telefone].indexOf(nome) < 0) conflitos[telefone].push(nome);
      return;
    }
    if (nomesPorTelefone[telefone] === undefined) nomesPorTelefone[telefone] = nome;
    else if (nomesPorTelefone[telefone] === nome) duplicadosEquivalentes++;
    else {
      conflitos[telefone] = [nomesPorTelefone[telefone], nome];
      delete nomesPorTelefone[telefone];
    }
  });

  const tabela = rel_contatos_lerAba_(REL_CONFIG.ABAS.CONTATOS, [
    'TELEFONE_NORMALIZADO', 'NOME_GOOGLE_CONTATOS'
  ]);
  const contatosPorTelefone = {};
  tabela.valores.forEach((linha, indice) => {
    const telefone = String(linha[tabela.mapa.TELEFONE_NORMALIZADO] || '').trim();
    if (telefone) contatosPorTelefone[telefone] = { indice: indice, linha: linha };
  });
  const telefonesAgenda = Object.keys(nomesPorTelefone);
  const encontrados = telefonesAgenda.filter(telefone => contatosPorTelefone[telefone]);
  const encontradosNoArquivo = Object.keys(telefonesValidos).filter(telefone => contatosPorTelefone[telefone]);
  let novos = 0;
  let atualizados = 0;
  let iguais = 0;
  encontrados.forEach(telefone => {
    const atual = String(contatosPorTelefone[telefone].linha[tabela.mapa.NOME_GOOGLE_CONTATOS] || '').trim();
    if (!atual) novos++;
    else if (atual === nomesPorTelefone[telefone]) iguais++;
    else atualizados++;
  });
  return {
    tabela: tabela,
    nomesPorTelefone: nomesPorTelefone,
    contatosPorTelefone: contatosPorTelefone,
    resumo: {
      linhasLidas: Number(dados && dados.linhasLidas) || 0,
      telefonesValidos: Object.keys(telefonesValidos).length,
      telefonesInvalidos: invalidos,
      duplicadosEquivalentes: duplicadosEquivalentes,
      conflitos: Object.keys(conflitos).length,
      contatosEncontrados: encontradosNoArquivo.length,
      contatosNaoEncontrados: tabela.valores.length - encontradosNoArquivo.length,
      nomesNovos: novos,
      nomesAtualizados: atualizados,
      nomesIguais: iguais
    },
    amostraConflitos: Object.keys(conflitos).slice(0, 10).map(telefone => ({
      telefoneNormalizado: telefone,
      nomes: conflitos[telefone]
    }))
  };
}

function rel_agendaGoogle_preAnalisar_(dados) {
  const analise = rel_agendaGoogle_analisar_(dados);
  if (analise.erro) return analise.erro;
  return rel_agendaGoogle_resposta_('OK', 'Pré-análise da agenda concluída.', {
    resumo: analise.resumo,
    amostraConflitos: analise.amostraConflitos
  });
}

function rel_agendaGoogle_confirmar_(dados) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const analise = rel_agendaGoogle_analisar_(dados);
    if (analise.erro) return analise.erro;
    const coluna = analise.tabela.mapa.NOME_GOOGLE_CONTATOS;
    let gravados = 0;
    Object.keys(analise.nomesPorTelefone).forEach(telefone => {
      const contato = analise.contatosPorTelefone[telefone];
      if (!contato || String(contato.linha[coluna] || '').trim() === analise.nomesPorTelefone[telefone]) return;
      contato.linha[coluna] = analise.nomesPorTelefone[telefone];
      gravados++;
    });
    if (gravados) {
      analise.tabela.aba.getRange(2, coluna + 1, analise.tabela.valores.length, 1)
        .setValues(analise.tabela.valores.map(linha => [linha[coluna]]));
    }
    return rel_agendaGoogle_resposta_('OK', 'Nomes da agenda atualizados com sucesso.', {
      resumo: Object.assign({}, analise.resumo, { nomesGravados: gravados }),
      amostraConflitos: analise.amostraConflitos
    });
  } finally {
    lock.releaseLock();
  }
}
