const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const router = fs.readFileSync(path.join(__dirname, '..', 'Router.js'), 'utf8');

function criarContexto() {
  const chamadas = { templates: [], getUrl: 0, diagnosticos: 0 };
  function output(html) {
    return {
      html,
      title: '',
      metas: [],
      setTitle(titulo) { this.title = titulo; return this; },
      setXFrameOptionsMode() { return this; },
      addMetaTag(nome, valor) { this.metas.push([nome, valor]); return this; }
    };
  }
  const contexto = {
    console: { info() { chamadas.diagnosticos++; } },
    HtmlService: {
      XFrameOptionsMode: { ALLOWALL: 'ALLOWALL' },
      createHtmlOutput: (html) => output(html),
      createTemplateFromFile: (arquivo) => {
        chamadas.templates.push(arquivo);
        return { webAppUrl: '', evaluate: () => output('TEMPLATE:' + arquivo) };
      }
    },
    ScriptApp: {
      getService() {
        chamadas.getUrl++;
        return { getUrl() { return 'https://example.invalid/exec'; } };
      }
    }
  };
  vm.createContext(contexto);
  vm.runInContext(router, contexto);
  return { contexto, chamadas };
}

{
  const { contexto, chamadas } = criarContexto();
  const pagina = contexto.doGet({ parameter: { diagnostico: 'acesso' } });
  assert.match(pagina.html, /MARKETING_DGMB_ACESSO_OK/);
  assert.equal(chamadas.templates.length, 0, 'diagnostico nao deve avaliar templates');
  assert.equal(chamadas.getUrl, 0, 'diagnostico nao deve chamar ScriptApp');
  assert.equal(chamadas.diagnosticos, 1);
}

{
  const { contexto, chamadas } = criarContexto();
  const pagina = contexto.doGet({ parameter: {} });
  assert.equal(pagina.html, 'TEMPLATE:Index');
  assert.deepEqual(chamadas.templates, ['Index']);
}

{
  const { contexto, chamadas } = criarContexto();
  const pagina = contexto.doGet({ parameter: { area: 'contatos' } });
  assert.equal(pagina.html, 'TEMPLATE:RelIndex');
  assert.deepEqual(chamadas.templates, ['RelIndex']);
}

console.log('OK: rota de diagnostico isolada e rotas normais preservadas.');
