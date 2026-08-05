function rel_resumoOperacional_dataLocal_(valor) {
  if (!valor) return null;
  if (valor instanceof Date) {
    if (Number.isNaN(valor.getTime())) return null;
    return new Date(valor.getFullYear(), valor.getMonth(), valor.getDate());
  }
  const texto = String(valor || '').trim();
  const iso = texto.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
  const br = texto.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (br) return new Date(Number(br[3]), Number(br[2]) - 1, Number(br[1]));
  const data = new Date(texto);
  if (Number.isNaN(data.getTime())) return null;
  return new Date(data.getFullYear(), data.getMonth(), data.getDate());
}

function rel_resumoOperacional_obter_() {
  const dados = rel_contatos_lerAba_(REL_CONFIG.ABAS.CONTATOS, ['TELEFONE_NORMALIZADO', 'ETAPA', 'DATA_PROXIMO_RETORNO']);
  const mapa = dados.mapa;
  const hoje = new Date();
  const hojeLocal = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  const resumo = {
    paraContatar: 0,
    aguardandoResposta: 0,
    retornarHoje: 0,
    emConversa: 0,
    finalizados: 0
  };

  dados.valores.forEach(linha => {
    if (!String(linha[mapa.TELEFONE_NORMALIZADO] || '').trim()) return;
    const etapa = String(linha[mapa.ETAPA] || 'PARA_CONTATAR').trim().toUpperCase();
    if (etapa === 'PARA_CONTATAR') resumo.paraContatar++;
    if (etapa === 'AGUARDANDO_RESPOSTA') resumo.aguardandoResposta++;
    if (etapa === 'EM_CONVERSA') resumo.emConversa++;
    if (etapa === 'FINALIZADO') resumo.finalizados++;
    if (etapa === 'RETORNAR_DEPOIS') {
      const retorno = rel_resumoOperacional_dataLocal_(linha[mapa.DATA_PROXIMO_RETORNO]);
      if (retorno && retorno <= hojeLocal) resumo.retornarHoje++;
    }
  });

  return { status: 'OK', mensagem: '', dados: resumo };
}
