const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const ler = arquivo => fs.readFileSync(arquivo, 'utf8');
let verificacoes = 0;
function ok(valor, mensagem) { assert.ok(valor, mensagem); verificacoes++; }
function igual(a, b, mensagem) { assert.strictEqual(a, b, mensagem); verificacoes++; }

const index = ler('RelIndex.html');
const api = ler('RelApi.html');
const router = ler('Router.js');
const servidor = ler('RelApiServer.js');
const setup = ler('RelSetup.js');
const google = ler('RelGoogleContatosService.js');
igual(index.includes('window.relAcessoChave'), false);
igual(api.includes('relAcessoChave'), false);
ok(api.includes('[nomeFuncao](...argumentos);'));
ok(index.indexOf("include('RelApi')") < index.indexOf("include('RelUI')"));
ok(index.indexOf("include('RelApi')") < index.indexOf("include('RelContatosScripts')"));
ok(api.includes('window.relApiClient ='));
ok(api.includes('google.script.run'));
ok(api.includes('withSuccessHandler') && api.includes('withFailureHandler'));
ok(router.includes("return rel_criarPaginaContatos_();"));
igual(router.includes('rel_acesso_'), false);
igual(router.includes('parametros.acesso'), false);
igual(servidor.includes('acesso'), false);
igual(servidor.includes('rel_acesso_'), false);
ok(servidor.includes('const resposta = operacao();'));
ok(setup.includes('function rel_configurarEstruturaInicial()'));
ok(setup.includes('function rel_auditarEstrutura()'));
igual(setup.includes('rel_acesso_'), false);
igual(google.includes('OPERADOR_RELACIONAMENTO'), false);
igual(google.includes('operador'), false);
ok(google.includes('rel_google_contatos_limparTemporariosExpirados_'));
ok(ler('RelContatos.html').includes('rel-contatos-etapa'));
ok(index.includes('rel-nao-contatar-modal'));

const chamadas = [];
const contexto = { window: {}, google: { script: { run: {
  withSuccessHandler(fn) { this.sucesso = fn; return this; },
  withFailureHandler(fn) { this.falha = fn; return this; },
  rel_listarContatos(...args) { chamadas.push(args); this.sucesso({ status: 'OK' }); }
}}}, Promise, Error, String };
vm.createContext(contexto);
vm.runInContext(api.replace(/^<script>|<\/script>$/gm, ''), contexto);
contexto.window.relApiClient.executar('rel_listarContatos', { pagina: 2 }).then(resposta => {
  igual(resposta.status, 'OK');
  igual(chamadas.length, 1);
  igual(chamadas[0].length, 1);
  igual(chamadas[0][0].pagina, 2);
  console.log(verificacoes + ' verificações do contrato sem autenticação aprovadas.');
}).catch(erro => { console.error(erro); process.exitCode = 1; });
