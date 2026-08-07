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

// Reproduz a avaliação real: somente RelIndex é template; includes entram como HTML estático.
const relIndexTemplate = fs.readFileSync('RelIndex.html', 'utf8');
const relApiEstatico = fs.readFileSync('RelApi.html', 'utf8');
const implementacaoInclude = fs.readFileSync('Code.js', 'utf8').match(/function include\(nomeArquivo\) \{[\s\S]*?\n\}/)[0];
ok(implementacaoInclude.includes('createHtmlOutputFromFile(nomeArquivo)'));
ok(implementacaoInclude.includes('.getContent()'));
ok(!implementacaoInclude.includes('createTemplateFromFile'));
ok(!relApiEstatico.includes('<?'));
ok(!relApiEstatico.includes('?>'));
ok(!relApiEstatico.includes('JSON.stringify(acesso)'));
ok(relApiEstatico.includes('window.relApiClient = (() => {'));

const declaracaoChave = relIndexTemplate.indexOf('window.relAcessoChave = <?!= JSON.stringify(acesso) ?>;');
const inclusaoRelApi = relIndexTemplate.indexOf("<?!= include('RelApi'); ?>");
ok(declaracaoChave >= 0 && declaracaoChave < inclusaoRelApi);
const inclusoesConsumidoras = Array.from(relIndexTemplate.matchAll(/<\?!= include\('([^']+)'\);? \?>/g))
  .filter(resultado => resultado[1] !== 'RelApi' && fs.readFileSync(resultado[1] + '.html', 'utf8').includes('relApiClient'));
ok(inclusoesConsumidoras.length > 0 && inclusoesConsumidoras.every(resultado => resultado.index > inclusaoRelApi));

const htmlMontado = relIndexTemplate.replace(/<\?(=|!=)\s*([\s\S]*?)\s*\?>/g, (_, operador, expressao) => {
  const codigo = expressao.replace(/;\s*$/, '');
  const includeEncontrado = codigo.match(/^include\('([^']+)'\)$/);
  if (includeEncontrado) return fs.readFileSync(includeEncontrado[1] + '.html', 'utf8');
  if (codigo === 'JSON.stringify(acesso)') return JSON.stringify(chaveNova);
  if (codigo === 'webAppUrl') return 'https://example.test/app';
  throw new Error('Scriptlet inesperado no template principal: ' + expressao);
});
ok(!htmlMontado.includes('<?') && !htmlMontado.includes('?>'));
ok(htmlMontado.indexOf('window.relAcessoChave =') < htmlMontado.indexOf('window.relApiClient ='));

const chamadasRpc = [];
const executorRpc = {
  withSuccessHandler() { return this; },
  withFailureHandler() { return this; },
  rel_rpc_teste(...argumentos) { chamadasRpc.push(argumentos); }
};
const contextoCliente = { Object, google: { script: { run: executorRpc } } };
contextoCliente.window = contextoCliente;
vm.createContext(contextoCliente);
const scriptsAteRelApi = htmlMontado
  .slice(0, htmlMontado.indexOf('window.relApiClient =') + relApiEstatico.length)
  .match(/<script>([\s\S]*?)<\/script>/g)
  .filter(script => script.includes('window.relAcessoChave') || script.includes('window.relApiClient'))
  .map(script => script.replace(/^<script>|<\/script>$/g, ''));
scriptsAteRelApi.forEach(script => vm.runInContext(script, contextoCliente));
igual(typeof contextoCliente.relApiClient.executar, 'function');
contextoCliente.relApiClient.executar('rel_rpc_teste', { contato: 123 });
igual(chamadasRpc, [[{ contato: 123 }, chaveNova]]);

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
