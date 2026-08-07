const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const vm = require('vm');
let verificacoes = 0;
function ok(valor, mensagem) { assert.ok(valor, mensagem); verificacoes++; }
function igual(a, b, mensagem) { assert.deepStrictEqual(a, b, mensagem); verificacoes++; }
function falha(fn, padrao) { assert.throws(fn, padrao); verificacoes++; }
const propriedades = {};
const contexto = {
  console,
  JSON,
  Object,
  Array,
  String,
  RegExp,
  PropertiesService: { getScriptProperties: () => ({
    getProperty: chave => propriedades[chave] || null,
    setProperty: (chave, valor) => { propriedades[chave] = valor; }
  }) },
  Utilities: {
    DigestAlgorithm: { SHA_256: 'sha256' }, Charset: { UTF_8: 'utf8' },
    computeDigest: (_, valor) => Array.from(crypto.createHash('sha256').update(valor, 'utf8').digest()),
    base64EncodeWebSafe: bytes => Buffer.from(bytes.map(n => n < 0 ? n + 256 : n)).toString('base64url')
  }
};
vm.createContext(contexto);
vm.runInContext(fs.readFileSync('RelAcessoService.js', 'utf8'), contexto);
const chave1 = 'TESTE_operador_um_32_caracteres_abcdef';
const chave2 = 'TESTE_operador_dois_32_caracteres_ghijk';

// 1, 2 e 6: dois operadores ativos e identidades distintas.
contexto.rel_acesso_cadastrarOperador_('operador_001', 'Operador Um', chave1);
contexto.rel_acesso_cadastrarOperador_('operador_002', 'Operador Dois', chave2);
igual(contexto.rel_acesso_validarOperador_(chave1).id, 'operador_001');
igual(contexto.rel_acesso_validarOperador_(chave2).id, 'operador_002');
ok(contexto.rel_acesso_validarOperador_(chave1).id !== contexto.rel_acesso_validarOperador_(chave2).id);
falha(() => contexto.rel_acesso_cadastrarOperador_('operador_001', 'Duplicado', 'TESTE_outra_chave_com_32_caracteres_xyz'), /já existe/);
falha(() => contexto.rel_acesso_cadastrarOperador_('operador_003', 'Duplicado', chave1), /já pertence/);
const salvo = JSON.parse(propriedades.RELACIONAMENTO_OPERADORES_V1);
ok(salvo.operador_001.chaveHash !== chave1 && salvo.operador_002.chaveHash !== chave2);

// 3 e 4: chave incorreta ou ausente.
igual(contexto.rel_acesso_validarOperador_('TESTE_chave_incorreta_32_caracteres_x'), null);
igual(contexto.rel_acesso_validarOperador_(''), null);

// 5: operador inativo.
contexto.rel_acesso_alterarStatusOperador_('operador_002', false);
igual(contexto.rel_acesso_validarOperador_(chave2), null);
contexto.rel_acesso_alterarStatusOperador_('operador_002', true);

// 7: ID inventado pelo frontend não participa da derivação.
const identidade = contexto.rel_acesso_exigirOperador_(chave1);
igual(identidade.id, 'operador_001');
ok(identidade.id !== 'operador_inventado');

// 8: cadastro inconsistente.
let cadastro = JSON.parse(propriedades.RELACIONAMENTO_OPERADORES_V1);
cadastro.operador_001.id = 'id_divergente';
propriedades.RELACIONAMENTO_OPERADORES_V1 = JSON.stringify(cadastro);
igual(contexto.rel_acesso_validarOperador_(chave1), null);
cadastro.operador_001.id = 'operador_001';
delete cadastro.operador_001.chaveHash;
propriedades.RELACIONAMENTO_OPERADORES_V1 = JSON.stringify(cadastro);
igual(contexto.rel_acesso_validarOperador_(chave1), null);
cadastro.operador_001.chaveHash = contexto.rel_acesso_hashChave_(chave1);

// 9: a mesma impressão em dois operadores é recusada sem escolha arbitrária.
cadastro.operador_002.chaveHash = cadastro.operador_001.chaveHash;
propriedades.RELACIONAMENTO_OPERADORES_V1 = JSON.stringify(cadastro);
igual(contexto.rel_acesso_validarOperador_(chave1), null);
cadastro.operador_002.chaveHash = contexto.rel_acesso_hashChave_(chave2);
propriedades.RELACIONAMENTO_OPERADORES_V1 = JSON.stringify(cadastro);

// Substituição invalida a chave anterior.
const chaveNova = 'TESTE_operador_um_nova_chave_32_xyzabc';
contexto.rel_acesso_substituirChaveOperador_('operador_001', chaveNova);
igual(contexto.rel_acesso_validarOperador_(chave1), null);
igual(contexto.rel_acesso_validarOperador_(chaveNova).id, 'operador_001');

// 10: RPC sem chave válida é recusada no servidor.
vm.runInContext(fs.readFileSync('RelApiServer.js', 'utf8'), contexto);
igual(contexto.rel_api_executar_(() => ({ status: 'OK' }), '').status, 'ERRO_ACESSO');
igual(contexto.rel_api_executar_(operador => ({ status: 'OK', dados: { id: operador.id } }), chaveNova).dados.id, 'operador_001');

// O cliente RPC precisa estar exposto no escopo global para todos os scripts incluídos na página.
const contextoCliente = { Object };
contextoCliente.window = contextoCliente;
vm.createContext(contextoCliente);
const relApiHtml = fs.readFileSync('RelApi.html', 'utf8')
  .replace(/^<script>|<\/script>$/gm, '')
  .replace('<?!= JSON.stringify(acesso) ?>', JSON.stringify(chaveNova));
vm.runInContext(relApiHtml, contextoCliente);
igual(typeof contextoCliente.relApiClient.executar, 'function');

// Rota de Relacionamento protegida; Divulgadores continua independente.
contexto.HtmlService = {}; contexto.ScriptApp = {};
vm.runInContext(fs.readFileSync('Router.js', 'utf8'), contexto);
contexto.rel_criarPaginaContatos_ = acesso => ({ pagina: 'contatos', acesso });
contexto.rel_criarPaginaRelacionamentoNegado_ = () => ({ pagina: 'negado' });
contexto.dg_router_criarPaginaDivulgadores_ = () => ({ pagina: 'divulgadores' });
igual(contexto.doGet({ parameter: { area: 'contatos', acesso: chaveNova } }).pagina, 'contatos');
igual(contexto.doGet({ parameter: { area: 'contatos', acesso: 'invalida' } }).pagina, 'negado');
igual(contexto.doGet({ parameter: { area: 'contatos' } }).pagina, 'negado');
igual(contexto.doGet({ parameter: { area: 'divulgadores' } }).pagina, 'divulgadores');

console.log(verificacoes + ' verificações de acesso aprovadas.');
