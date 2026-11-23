/**
 * Determinação do perfil esportivo do contato sem migrar ou acrescentar colunas.
 * Prioriza a modalidade registrada no Portal e complementa com informação
 * fornecida manualmente no Relacionamento. Nunca deduz uma modalidade pelo DDD,
 * origem do grupo de WhatsApp, nome do contato ou cidade.
 */
function rel_esporte_normalizarTexto_(valor) {
  return String(valor || '').normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '').toUpperCase().trim()
    .replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, '');
}

function rel_esporte_flags_(valor, contexto) {
  const chave = rel_esporte_normalizarTexto_(valor);
  const ciclismoManual = ['CICLISMO', 'PEDALADA', 'MTB', 'SPEED', 'GRAVEL', 'URBANO', 'MULTIPLAS'];
  const corridaManual = ['CAMINHADA_CORRIDA', 'CAMINHADA', 'CORRIDA'];
  if (chave === 'CICLISMO_E_CAMINHADA_CORRIDA' || chave === 'AMBOS') {
    return { ciclismo: true, corrida: true };
  }
  if (ciclismoManual.includes(chave)) return { ciclismo: true, corrida: false };
  if (corridaManual.includes(chave)) return { ciclismo: false, corrida: true };
  // Fallback para inscrições antigas sem Modalidade_Esportiva: apenas
  // nomes inequivocamente associados às modalidades da campanha.
  if (contexto === 'NOME_DESAFIO') {
    if (/TRANSMISSAO|SELIM|CICLISMO|PEDAL|SPEED|MTB/.test(chave)) {
      return { ciclismo: true, corrida: false };
    }
    if (/CORACAO|CORRIDA|CAMINHADA|MEDALHA_50_KM|MEDALHA_50KM/.test(chave)) {
      return { ciclismo: false, corrida: true };
    }
  }
  return { ciclismo: false, corrida: false };
}

function rel_esporte_mesclar_(atual, novo) {
  return {
    ciclismo: Boolean(atual && atual.ciclismo || novo && novo.ciclismo),
    corrida: Boolean(atual && atual.corrida || novo && novo.corrida)
  };
}

function rel_esporte_perfil_(flags) {
  if (flags.ciclismo && flags.corrida) return 'AMBOS';
  if (flags.ciclismo) return 'CICLISMO';
  if (flags.corrida) return 'CAMINHADA_CORRIDA';
  return 'NAO_IDENTIFICADO';
}

function rel_esporte_carregarIndicesPortal_() {
  const portal = dg_abrirPlanilhaPortal_();
  const pessoas = lerAbaComoObjetos_(portal, 'DadosPessoais');
  const inscricoes = lerAbaComoObjetos_(portal, 'dgmbDesafios');
  const desafios = lerAbaComoObjetos_(portal, 'ListaDesafios');

  const detalhePorId = Object.create(null);
  desafios.forEach(item => {
    const id = String(item.id_Desafio_lista || '').trim();
    if (!id) return;
    detalhePorId[id] = {
      nome: String(item.Nome_Desafio || ''),
      modalidade: String(item.Modalidade_Esportiva || '')
    };
  });

  const modalidadePorId = Object.create(null);
  inscricoes.forEach(item => {
    const id = String(item.ID_DGMB || '').trim();
    if (!id) return;
    const idDesafio = extrairIdDesafio_(item.Observacao);
    const desafio = detalhePorId[idDesafio] || {};
    // Prioridade: modalidade declarada na inscrição > modalidade oficial
    // do desafio > nome inequivocamente esportivo para acervo legado.
    const registro = rel_esporte_flags_(item.Modalidade_Esportiva);
    const oficial = rel_esporte_flags_(desafio.modalidade);
    const nome = rel_esporte_flags_(desafio.nome, 'NOME_DESAFIO');
    const flags = (registro.ciclismo || registro.corrida) ? registro :
      (oficial.ciclismo || oficial.corrida) ? oficial : nome;
    modalidadePorId[id] = rel_esporte_mesclar_(modalidadePorId[id], flags);
  });

  const idsPorTelefone = {};
  pessoas.forEach(item => {
    const telefone = rel_telefone_normalizar_(item.whatsapp);
    const id = String(item.ID_DGMB || '').trim();
    if (!telefone.valido || !id) return;
    if (!idsPorTelefone[telefone.telefoneNormalizado]) {
      idsPorTelefone[telefone.telefoneNormalizado] = {};
    }
    idsPorTelefone[telefone.telefoneNormalizado][id] = true;
  });

  const resultado = {};
  Object.keys(idsPorTelefone).forEach(telefone => {
    const ids = Object.keys(idsPorTelefone[telefone]);
    // O mesmo número pode pertencer a mais de uma pessoa: não inferir
    // interesses individuais sem identificar inequivocamente o cadastro.
    if (ids.length !== 1) {
      resultado[telefone] = { ciclismo: false, corrida: false, ambiguo: true };
      return;
    }
    resultado[telefone] = modalidadePorId[ids[0]] ||
      { ciclismo: false, corrida: false };
  });
  return resultado;
}

function rel_esporte_classificarContato_(contato, indice) {
  const manual = rel_esporte_flags_(contato.modalidade);
  if (contato.eCiclista === 'SIM') manual.ciclismo = true;
  const portal = indice[String(contato.telefoneNormalizado || '')] || {};
  const flags = portal.ambiguo ? manual : rel_esporte_mesclar_(manual, portal);
  const manualInformado = manual.ciclismo || manual.corrida;
  const portalInformado = !portal.ambiguo && (portal.ciclismo || portal.corrida);
  return {
    perfilEsportivo: rel_esporte_perfil_(flags),
    origemPerfilEsportivo: manualInformado && portalInformado ? 'MANUAL_E_PORTAL' :
      (manualInformado ? 'MANUAL' : (portalInformado ? 'PORTAL' : 'NAO_IDENTIFICADA')),
    telefoneAmbiguoNoPortal: Boolean(portal.ambiguo)
  };
}

function rel_esporte_filtrar_(perfil, filtro) {
  if (filtro === 'TODOS') return true;
  if (filtro === 'CICLISMO') return perfil === 'CICLISMO' || perfil === 'AMBOS';
  if (filtro === 'CAMINHADA_CORRIDA') return perfil === 'CAMINHADA_CORRIDA' || perfil === 'AMBOS';
  return perfil === filtro;
}
