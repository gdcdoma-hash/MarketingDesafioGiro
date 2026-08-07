const REL_ACESSO_PROPRIEDADE_OPERADORES = 'RELACIONAMENTO_OPERADORES_V1';
const REL_ACESSO_MENSAGEM_INVALIDA = 'Acesso inválido ou indisponível. Solicite um novo link ao administrador.';

function rel_acesso_hashChave_(chave) {
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(chave || ''), Utilities.Charset.UTF_8);
  return Utilities.base64EncodeWebSafe(bytes).replace(/=+$/g, '');
}

function rel_acesso_lerOperadores_() {
  const bruto = PropertiesService.getScriptProperties().getProperty(REL_ACESSO_PROPRIEDADE_OPERADORES);
  if (!bruto) return {};
  const operadores = JSON.parse(bruto);
  return operadores && typeof operadores === 'object' && !Array.isArray(operadores) ? operadores : {};
}

function rel_acesso_salvarOperadores_(operadores) {
  PropertiesService.getScriptProperties().setProperty(REL_ACESSO_PROPRIEDADE_OPERADORES, JSON.stringify(operadores));
}

function rel_acesso_validarFormatoChave_(chave) {
  return typeof chave === 'string' && chave.length >= 32 && chave.length <= 256 && !/\s/.test(chave);
}

function rel_acesso_validarOperador_(chaveRecebida) {
  if (!rel_acesso_validarFormatoChave_(chaveRecebida)) return null;
  let operadores;
  try { operadores = rel_acesso_lerOperadores_(); } catch (erro) { console.error('Cadastro de operadores inválido.', erro); return null; }
  const hash = rel_acesso_hashChave_(chaveRecebida);
  const encontrados = Object.keys(operadores).filter(id => {
    const item = operadores[id];
    return item && item.id === id && item.chaveHash === hash;
  }).map(id => operadores[id]);
  if (encontrados.length !== 1) return null;
  const operador = encontrados[0];
  if (operador.ativo !== true || !/^[a-z0-9][a-z0-9_-]{2,63}$/.test(operador.id) ||
      typeof operador.nome !== 'string' || !operador.nome.trim()) return null;
  return { id: operador.id, nome: operador.nome.trim() };
}

function rel_acesso_exigirOperador_(chaveRecebida) {
  const operador = rel_acesso_validarOperador_(chaveRecebida);
  if (!operador) throw new Error('REL_ACESSO_INVALIDO');
  return operador;
}

/** Função administrativa: execute manualmente no editor GAS; não é exposta por RelApiServer. */
function rel_acesso_cadastrarOperador_(idOperador, nome, chave) {
  const id = String(idOperador || '').trim().toLowerCase();
  const nomeLimpo = String(nome || '').trim();
  if (!/^[a-z0-9][a-z0-9_-]{2,63}$/.test(id)) throw new Error('ID de operador inválido.');
  if (!nomeLimpo || nomeLimpo.length > 120) throw new Error('Nome administrativo inválido.');
  if (!rel_acesso_validarFormatoChave_(chave)) throw new Error('A chave deve ter de 32 a 256 caracteres, sem espaços.');
  const operadores = rel_acesso_lerOperadores_();
  if (operadores[id]) throw new Error('O ID do operador já existe.');
  const chaveHash = rel_acesso_hashChave_(chave);
  if (Object.keys(operadores).some(outroId => operadores[outroId] && operadores[outroId].chaveHash === chaveHash)) {
    throw new Error('A chave já pertence a outro operador.');
  }
  operadores[id] = { id: id, nome: nomeLimpo, chaveHash: chaveHash, ativo: true };
  rel_acesso_salvarOperadores_(operadores);
  return { id: id, nome: nomeLimpo, ativo: true };
}

function rel_acesso_alterarStatusOperador_(idOperador, ativo) {
  const id = String(idOperador || '').trim().toLowerCase();
  const operadores = rel_acesso_lerOperadores_();
  if (!operadores[id]) throw new Error('Operador não encontrado.');
  operadores[id].ativo = ativo === true;
  rel_acesso_salvarOperadores_(operadores);
  return { id: id, ativo: operadores[id].ativo };
}

function rel_acesso_substituirChaveOperador_(idOperador, novaChave) {
  const id = String(idOperador || '').trim().toLowerCase();
  if (!rel_acesso_validarFormatoChave_(novaChave)) throw new Error('A chave deve ter de 32 a 256 caracteres, sem espaços.');
  const operadores = rel_acesso_lerOperadores_();
  if (!operadores[id]) throw new Error('Operador não encontrado.');
  const chaveHash = rel_acesso_hashChave_(novaChave);
  if (Object.keys(operadores).some(outroId => outroId !== id && operadores[outroId] && operadores[outroId].chaveHash === chaveHash)) {
    throw new Error('A chave já pertence a outro operador.');
  }
  operadores[id].chaveHash = chaveHash;
  rel_acesso_salvarOperadores_(operadores);
  return { id: id, ativo: operadores[id].ativo === true };
}
