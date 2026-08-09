const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

class Element {
  constructor(tag = 'div') { this.tagName = tag; this.children = []; this.dataset = {}; this.listeners = {}; this.value = ''; this.hidden = false; this.disabled = false; this.options = []; this.className = ''; this.textContent = ''; this.classList = { toggle() {} }; }
  appendChild(child) { this.children.push(child); child.parent = this; if (this.tagName === 'select') { this.options.push(child); if (child.selected) this.value = child.value; } return child; }
  replaceChildren(...children) { this.children = []; this.options = []; children.forEach(child => this.appendChild(child)); }
  add(child) { this.appendChild(child); }
  addEventListener(type, callback) { (this.listeners[type] ||= []).push(callback); }
  dispatch(type, target = this) { (this.listeners[type] || []).forEach(callback => callback({ target, preventDefault() {} })); }
  setAttribute() {}
  focus() {}
  reset() {}
  querySelector(selector) { for (const child of this.children) { if (child.matches(selector)) return child; const encontrado = child.querySelector(selector); if (encontrado) return encontrado; } return null; }
  matches(selector) { if (selector.startsWith('.')) return this.className.split(' ').includes(selector.slice(1)); return selector === '[data-etapa]' ? 'etapa' in this.dataset : selector === '[data-situacao]' ? 'situacao' in this.dataset : selector === '[data-retorno]' ? 'retorno' in this.dataset : false; }
  closest(selector) { return selector === '.rel-contact-row' && this.className.includes('rel-contact-row') ? this : this.parent && this.parent.closest(selector); }
}

class OptionElement extends Element {
  constructor(text, value) { super('option'); this.textContent = text; this.value = value; this.selected = false; }
}

const ids = {};
const id = name => (ids[name] ||= new Element(name.includes('lista') ? 'div' : name.includes('etapa') || name.includes('situacao') || name.includes('origem') ? 'select' : 'div'));
const document = {
  createElement: tag => new Element(tag),
  querySelector: selector => id(selector),
  querySelectorAll: () => []
};

const contatoBase = {
  telefoneNormalizado: '5598999999999', telefoneExibicao: '(98) 99999-9999', nomeExibicao: 'Contato',
  cidadeUfExibicao: 'São Luís - MA', classificacao: 'CONTATO_NOVO', origemNomeExibicao: '', origens: [],
  etapa: 'PARA_CONTATAR', situacao: 'NAO_CLASSIFICADO', proximoRetorno: ''
};
const fila = [];
const chamadas = [];
const api = (metodo, dados) => {
  chamadas.push({ metodo, dados });
  if (metodo === 'rel_atualizarEtapaContato') return Promise.resolve({ status: 'OK', dados: { etapa: dados.etapa, proximoRetorno: '' } });
  if (metodo === 'rel_atualizarSituacaoContato') return Promise.resolve({ status: 'OK', dados: { situacao: dados.situacao } });
  return new Promise(resolve => fila.push(resolve));
};
const contexto = {
  console, document, Option: OptionElement, navigator: {}, relApiClient: { executar: api },
  relResumoOperacional: { carregar: () => Promise.resolve(), destacarIndicador() {} },
  relOperacao: { iniciar: () => true, finalizar() {} }, relUI: { exibirMensagemTela() {} },
  window: { clearTimeout, setTimeout, confirm: () => true }, setTimeout, clearTimeout
};
vm.createContext(contexto);
const fonte = fs.readFileSync('RelContatosScripts.html', 'utf8').replace(/^<script>|<\/script>$/gm, '') + '\nthis.relContatosTeste = relContatos;';
vm.runInContext(fonte, contexto);
const relContatos = contexto.relContatosTeste;
const respostaLista = contatos => ({ status: 'OK', dados: { pagina: 1, totalPaginas: 1, total: contatos.length, contatos, origens: [] } });
const tick = () => new Promise(resolve => setImmediate(resolve));

(async () => {
  relContatos.iniciar();
  fila.shift()(respostaLista([{ ...contatoBase }]));
  await tick();
  const lista = id('#rel-contatos-lista');
  assert.equal(lista.children.length, 1, 'a lista inicial deve conter o contato');

  const recargaAnterior = relContatos.carregar();
  const card = lista.children[0];
  const etapa = card.querySelector('[data-etapa]');
  etapa.value = 'NAO_CONTATAR';
  lista.dispatch('change', etapa);
  await tick();
  fila.shift()(respostaLista([]));
  await recargaAnterior;
  await tick();
  assert.equal(lista.children.length, 1, 'o card deve sobreviver a Promises e a uma recarga concorrente concluída depois');
  assert.equal(lista.children[0].querySelector('[data-etapa]').value, 'NAO_CONTATAR');

  const situacao = lista.children[0].querySelector('[data-situacao]');
  situacao.value = 'NAO_FAZ_DESAFIO';
  lista.dispatch('change', situacao);
  await tick();
  fila.shift()(respostaLista([]));
  await tick();
  assert.equal(lista.children.length, 0, 'o card pode sair após a Situação ser salva');

  const novaLista = relContatos.carregar();
  fila.shift()(respostaLista([{ ...contatoBase }]));
  await novaLista;
  const novoCard = lista.children[0];
  const novaEtapa = novoCard.querySelector('[data-etapa]');
  novaEtapa.value = 'NAO_CONTATAR';
  lista.dispatch('change', novaEtapa);
  await tick();
  id('#rel-contatos-etapa').dispatch('change');
  fila.shift()(respostaLista([]));
  await tick();
  assert.equal(lista.children.length, 0, 'uma nova ação explícita de filtro encerra a proteção local');
  console.log('OK: permanência sem tempo, conclusão por Situação e nova ação explícita');
})().catch(error => { console.error(error); process.exitCode = 1; });
