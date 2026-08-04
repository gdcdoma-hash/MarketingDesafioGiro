function rel_resumo_obter_() {
  const origens = rel_resumo_listarOrigens_();
  const contatos = rel_resumo_listarContatos_();
  const ultimaImportacao = contatos.reduce((maisRecente, contato) => {
    const valor = contato.DATA_ULTIMA_IMPORTACAO;
    const data = valor instanceof Date ? valor : new Date(valor);
    if (!valor || Number.isNaN(data.getTime())) return maisRecente;
    return !maisRecente || data > maisRecente ? data : maisRecente;
  }, null);

  return {
    status: 'OK',
    mensagem: '',
    dados: {
      totalOrigens: origens.length,
      origensAtivas: origens.filter(origem => origem.STATUS === 'ATIVO').length,
      origensInativas: origens.filter(origem => origem.STATUS === 'INATIVO').length,
      totalContatos: contatos.filter(contato =>
        String(contato.TELEFONE_NORMALIZADO || '').trim()
      ).length,
      ultimaImportacao: ultimaImportacao
    }
  };
}
