// Um único envio de até 750 KB mantém o CSV processado abaixo de ~1 MB após serialização;
// 5.000 linhas limita a releitura/gravação integral da aba a uma execução GAS controlada.
const REL_GOOGLE_CONTATOS_LIMITE_BYTES = 750 * 1024;
const REL_GOOGLE_CONTATOS_LIMITE_REGISTROS = 5000;
const REL_GOOGLE_CONTATOS_PREVIA_MS = 15 * 60 * 1000;
const REL_GOOGLE_CONTATOS_CHAVE_PREVIA = 'REL_GOOGLE_CONTATOS_PREVIA_';
const REL_GOOGLE_CONTATOS_PREFIXO_TEMPORARIO = 'rel-google-contatos-temporario-';
const REL_GOOGLE_CONTATOS_MODULO_TEMPORARIO = 'REL_GOOGLE_CONTATOS';
const REL_GOOGLE_CONTATOS_PREVIA_INDISPONIVEL = 'Esta prévia não está mais disponível para esta operação. Gere uma nova prévia e tente novamente.';
const REL_GOOGLE_CONTATOS_PREVIA_INCOMPATIVEL = 'Esta prévia não pode ser utilizada. Gere uma nova prévia.';
const REL_GOOGLE_CONTATOS_VERSAO_PREVIA = 2;

function rel_google_contatos_resposta_(status, mensagem, dados) {
  return { status: status, mensagem: mensagem || '', dados: dados || {} };
}


function rel_google_contatos_obterTabela_(criar) {
  const config = REL_CONFIG.ABAS.GOOGLE_CONTATOS;
  const planilha = dg_abrirPlanilhaMarketingRelacionamento_();
  let aba = planilha.getSheetByName(config.NOME);
  if (!aba && !criar) return { aba: null, mapa: {}, valores: [] };
  if (!aba) {
    aba = planilha.insertSheet(config.NOME);
    aba.getRange(1, 1, 1, config.CABECALHOS.length).setValues([config.CABECALHOS.slice()]).setFontWeight('bold');
    aba.setFrozenRows(1);
  }
  const mapa = rel_contatos_mapaCabecalhos_(aba, config.CABECALHOS);
  const ultimaLinha = aba.getLastRow();
  return { aba: aba, mapa: mapa, valores: ultimaLinha < 2 ? [] : aba.getRange(2, 1, ultimaLinha - 1, aba.getLastColumn()).getValues() };
}

function rel_google_contatos_identidade_(valor) {
  return String(valor || '').trim().replace(/\s+/g, ' ').normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '').toUpperCase();
}

function rel_google_contatos_analisar_(dados) {
  const registros = dados && Array.isArray(dados.registros) ? dados.registros : [];
  const tamanhoArquivo = Number(dados && dados.tamanhoArquivo) || 0;
  if (!registros.length) throw new Error('O arquivo não contém contatos para importar.');
  if (tamanhoArquivo <= 0 || tamanhoArquivo > REL_GOOGLE_CONTATOS_LIMITE_BYTES) throw new Error('O CSV deve ter no máximo 750 KB para uma importação segura.');
  if (registros.length > REL_GOOGLE_CONTATOS_LIMITE_REGISTROS) throw new Error('O CSV deve ter no máximo 5.000 contatos por importação.');
  const tabela = rel_google_contatos_obterTabela_(false);
  const existentes = {};
  tabela.valores.forEach((linha, indice) => {
    const telefone = String(linha[tabela.mapa.TELEFONE_NORMALIZADO] || '').trim();
    if (telefone) existentes[telefone] = { linha: indice + 2, valores: linha };
  });
  const porTelefone = {}, conflitos = [];
  let ignoradosSemTelefone = 0, telefonesValidos = 0, duplicidadesSimples = 0;
  registros.forEach(registro => {
    const telefones = Array.isArray(registro.telefones) ? registro.telefones : [];
    let validosContato = 0;
    telefones.forEach(original => {
      const normalizado = rel_telefone_normalizar_(original);
      if (!normalizado.valido) return;
      validosContato++; telefonesValidos++;
      const candidato = { telefoneNormalizado: normalizado.telefoneNormalizado, nomeGoogle: String(registro.nome || '').trim(), telefoneOriginal: String(original || '').trim(), email: String(registro.email || '').trim(), conflito: false };
      const primeiro = porTelefone[normalizado.telefoneNormalizado];
      if (!primeiro) { porTelefone[normalizado.telefoneNormalizado] = candidato; return; }
      const nomeDiferente = rel_google_contatos_identidade_(primeiro.nomeGoogle) && rel_google_contatos_identidade_(candidato.nomeGoogle) && rel_google_contatos_identidade_(primeiro.nomeGoogle) !== rel_google_contatos_identidade_(candidato.nomeGoogle);
      const emailDiferente = rel_google_contatos_identidade_(primeiro.email) && rel_google_contatos_identidade_(candidato.email) && rel_google_contatos_identidade_(primeiro.email) !== rel_google_contatos_identidade_(candidato.email);
      if (!nomeDiferente && !emailDiferente) { duplicidadesSimples++; return; }
      primeiro.conflito = true;
      let conflito = conflitos.find(item => item.telefone === normalizado.telefoneNormalizado);
      if (!conflito) { conflito = { telefone: normalizado.telefoneNormalizado, nomes: [], emails: [] }; conflitos.push(conflito); }
      [primeiro.nomeGoogle, candidato.nomeGoogle].filter(Boolean).forEach(nome => { if (conflito.nomes.indexOf(nome) < 0) conflito.nomes.push(nome); });
      [primeiro.email, candidato.email].filter(Boolean).forEach(email => { if (conflito.emails.indexOf(email) < 0) conflito.emails.push(email); });
    });
    if (!validosContato) ignoradosSemTelefone++;
  });
  const chaves = Object.keys(porTelefone);
  return { tabela: tabela, existentes: existentes, porTelefone: porTelefone, conflitos: conflitos, resumo: {
    contatosLidos: registros.length, telefonesValidos: telefonesValidos,
    ignoradosSemTelefone: ignoradosSemTelefone, duplicidadesSimples: duplicidadesSimples,
    conflitosIdentificacao: conflitos.length,
    registrosIncluir: chaves.filter(chave => !existentes[chave]).length,
    registrosAtualizar: chaves.filter(chave => !!existentes[chave]).length
  } };
}

function rel_google_contatos_descartarPrevia_(metadados) {
  if (metadados && metadados.fileId) {
    try { DriveApp.getFileById(metadados.fileId).setTrashed(true); } catch (erro) { console.warn('Não foi possível remover a prévia temporária.', erro); }
  }
  if (metadados && metadados.token) PropertiesService.getScriptProperties().deleteProperty(REL_GOOGLE_CONTATOS_CHAVE_PREVIA + metadados.token);
}

/**
 * Remove somente arquivos deste módulo cujo conteúdo confirma identidade e expiração.
 * É segura para execução repetida e não instala gatilhos automaticamente.
 */
function rel_google_contatos_limparTemporariosExpirados_() {
  const agora = Date.now();
  let removidos = 0;
  const arquivos = DriveApp.searchFiles("title contains '" + REL_GOOGLE_CONTATOS_PREFIXO_TEMPORARIO + "' and trashed = false");
  while (arquivos.hasNext()) {
    const arquivo = arquivos.next();
    try {
      const metadados = JSON.parse(arquivo.getBlob().getDataAsString('UTF-8'));
      const nomeEsperado = REL_GOOGLE_CONTATOS_PREFIXO_TEMPORARIO + metadados.token + '.json';
      if (metadados.modulo !== REL_GOOGLE_CONTATOS_MODULO_TEMPORARIO || arquivo.getName() !== nomeEsperado || !metadados.expiraEm || metadados.expiraEm >= agora) continue;
      arquivo.setTrashed(true);
      PropertiesService.getScriptProperties().deleteProperty(REL_GOOGLE_CONTATOS_CHAVE_PREVIA + metadados.token);
      removidos++;
    } catch (erro) {
      console.warn('Arquivo temporário ignorado por não possuir metadados válidos.', arquivo.getId(), erro);
    }
  }
  return { removidos: removidos };
}

function rel_google_contatos_preAnalisar_(dados) {
  try {
    rel_google_contatos_limparTemporariosExpirados_();
    const analise = rel_google_contatos_analisar_(dados);
    if (!Object.keys(analise.porTelefone).length) return rel_google_contatos_resposta_('ERRO_VALIDACAO', 'Nenhum telefone válido foi encontrado.', { resumo: analise.resumo });
    const propriedades = PropertiesService.getScriptProperties();
    const token = Utilities.getUuid(), expiraEm = Date.now() + REL_GOOGLE_CONTATOS_PREVIA_MS;
    const criadoEm = Date.now();
    const nomeArquivo = REL_GOOGLE_CONTATOS_PREFIXO_TEMPORARIO + token + '.json';
    const conteudo = JSON.stringify({ versao: REL_GOOGLE_CONTATOS_VERSAO_PREVIA,
      modulo: REL_GOOGLE_CONTATOS_MODULO_TEMPORARIO, criadoEm: criadoEm, token: token, expiraEm: expiraEm, utilizado: false,
      porTelefone: analise.porTelefone, resumo: analise.resumo, conflitos: analise.conflitos });
    const arquivo = DriveApp.createFile(nomeArquivo, conteudo, MimeType.PLAIN_TEXT);
    propriedades.setProperty(REL_GOOGLE_CONTATOS_CHAVE_PREVIA + token, JSON.stringify({
      versao: REL_GOOGLE_CONTATOS_VERSAO_PREVIA, modulo: REL_GOOGLE_CONTATOS_MODULO_TEMPORARIO,
      criadoEm: criadoEm, token: token, fileId: arquivo.getId(), nomeArquivo: nomeArquivo, expiraEm: expiraEm, utilizado: false
    }));
    return rel_google_contatos_resposta_('OK', 'Prévia pronta e válida por 15 minutos. Confirme para atualizar a agenda auxiliar.', { resumo: analise.resumo, conflitos: analise.conflitos.slice(0, 20), token: token, expiraEm: new Date(expiraEm) });
  } catch (erro) { return rel_google_contatos_resposta_('ERRO_VALIDACAO', erro.message, {}); }
}

function rel_google_contatos_validarPrevia_(token) {
  try {
    if (!token) throw new Error('TOKEN_AUSENTE');
    const propriedades = PropertiesService.getScriptProperties();
    const metadados = JSON.parse(propriedades.getProperty(REL_GOOGLE_CONTATOS_CHAVE_PREVIA + token) || 'null');
    if (metadados && (metadados.versao !== REL_GOOGLE_CONTATOS_VERSAO_PREVIA || metadados.proprietarioTipo || metadados.proprietarioId)) {
      return { valido: false, incompativel: true };
    }
    if (!metadados || metadados.token !== token || metadados.modulo !== REL_GOOGLE_CONTATOS_MODULO_TEMPORARIO ||
        metadados.utilizado === true || !metadados.fileId ||
        metadados.nomeArquivo !== REL_GOOGLE_CONTATOS_PREFIXO_TEMPORARIO + token + '.json' ||
        !metadados.expiraEm || Date.now() > metadados.expiraEm) throw new Error('METADADOS_INVALIDOS');
    const arquivo = DriveApp.getFileById(metadados.fileId);
    if (arquivo.getName() !== metadados.nomeArquivo || arquivo.isTrashed()) throw new Error('ARQUIVO_INVALIDO');
    const previa = JSON.parse(arquivo.getBlob().getDataAsString('UTF-8'));
    if (previa && (previa.versao !== REL_GOOGLE_CONTATOS_VERSAO_PREVIA || previa.proprietarioTipo || previa.proprietarioId)) {
      return { valido: false, incompativel: true };
    }
    if (!previa || previa.token !== token || previa.modulo !== REL_GOOGLE_CONTATOS_MODULO_TEMPORARIO ||
        previa.utilizado === true || previa.expiraEm !== metadados.expiraEm ||
        previa.criadoEm !== metadados.criadoEm || Date.now() > previa.expiraEm ||
        !previa.porTelefone || typeof previa.porTelefone !== 'object' || !Array.isArray(previa.conflitos)) throw new Error('CONTEUDO_INVALIDO');
    return { valido: true, metadados: metadados, previa: previa, arquivo: arquivo };
  } catch (erro) {
    console.warn('Prévia do Google Contatos recusada.', erro && erro.message || erro);
    return { valido: false };
  }
}

function rel_google_contatos_confirmar_(dados) {
  const token = String(dados && dados.token || '');
  const lock = LockService.getScriptLock(); lock.waitLock(30000);
  let metadados = null;
  try {
    const validacao = rel_google_contatos_validarPrevia_(token);
    if (!validacao.valido) return rel_google_contatos_resposta_(validacao.incompativel ? 'ERRO_PREVIA_INCOMPATIVEL' : 'ERRO_PREVIA_INDISPONIVEL', validacao.incompativel ? REL_GOOGLE_CONTATOS_PREVIA_INCOMPATIVEL : REL_GOOGLE_CONTATOS_PREVIA_INDISPONIVEL, {});
    metadados = validacao.metadados;
    metadados.utilizado = true;
    PropertiesService.getScriptProperties().setProperty(REL_GOOGLE_CONTATOS_CHAVE_PREVIA + token, JSON.stringify(metadados));
    const previa = validacao.previa;
    let tabela = rel_google_contatos_obterTabela_(true);
    const agora = new Date(), linhas = tabela.valores.map(linha => linha.slice()), indicePorTelefone = {};
    linhas.forEach((linha, indice) => { indicePorTelefone[String(linha[tabela.mapa.TELEFONE_NORMALIZADO] || '').trim()] = indice; linha[tabela.mapa.ATIVO] = 'INATIVO'; });
    Object.keys(previa.porTelefone).forEach(telefone => {
      const item = previa.porTelefone[telefone]; let indice = indicePorTelefone[telefone];
      const existente = indice !== undefined;
      if (!existente) { indice = linhas.length; linhas.push(new Array(tabela.aba.getLastColumn()).fill('')); }
      const linha = linhas[indice]; linha[tabela.mapa.TELEFONE_NORMALIZADO] = telefone;
      // Em conflito, preserva a identificação já gravada; para número novo usa explicitamente a primeira ocorrência.
      if (!existente || !item.conflito) { linha[tabela.mapa.NOME_GOOGLE] = item.nomeGoogle; linha[tabela.mapa.EMAIL] = item.email; }
      linha[tabela.mapa.TELEFONE_ORIGINAL] = item.telefoneOriginal; linha[tabela.mapa.DATA_IMPORTACAO] = agora; linha[tabela.mapa.ATIVO] = 'ATIVO';
    });
    if (linhas.length) tabela.aba.getRange(2, 1, linhas.length, tabela.aba.getLastColumn()).setValues(linhas);
    return rel_google_contatos_resposta_('OK', 'Google Contatos importado integralmente com sucesso.', { resumo: previa.resumo, conflitos: previa.conflitos.slice(0, 20) });
  } catch (erro) {
    console.error(erro); return rel_google_contatos_resposta_('ERRO_IMPORTACAO', 'A importação não foi concluída. A base anterior foi preservada quando possível.', {});
  } finally {
    if (metadados) rel_google_contatos_descartarPrevia_(metadados);
    rel_google_contatos_limparTemporariosExpirados_();
    lock.releaseLock();
  }
}

function rel_google_contatos_cancelarPrevia_(dados) {
  const token = String(dados && dados.token || '');
  const lock = LockService.getScriptLock(); lock.waitLock(30000);
  try {
    const validacao = rel_google_contatos_validarPrevia_(token);
    if (!validacao.valido) return rel_google_contatos_resposta_(validacao.incompativel ? 'ERRO_PREVIA_INCOMPATIVEL' : 'ERRO_PREVIA_INDISPONIVEL', validacao.incompativel ? REL_GOOGLE_CONTATOS_PREVIA_INCOMPATIVEL : REL_GOOGLE_CONTATOS_PREVIA_INDISPONIVEL, {});
    rel_google_contatos_descartarPrevia_(validacao.metadados);
    return rel_google_contatos_resposta_('OK', 'Prévia cancelada.', {});
  } finally { lock.releaseLock(); }
}
