#!/usr/bin/env node
'use strict';

/**
 * Recupera um Apps Script LAB V3 JÁ CRIADO pelo Google.
 * NUNCA cria projeto, nunca implanta Web App e não altera planilhas.
 * Usa pasta curta na raiz do volume (D:\...) para evitar caminhos 8.3 do %TEMP%.
 */
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const V3 = path.join(ROOT, 'v3');
const FILES = [
  'Config.gs','Importacao.gs','Index.html',
  'Marketing.gs','Relacionamento.gs','appsscript.json'
];
const OLD_IDS = new Set([
  '1qOTRjWCldsxcu2cRa_nNzZPhoUHFO_NoEcCs0IQcItK7a87yR1tcTHYk',
  '1kGOdB_gSWesEqIlJNLWAOWF-zeMAfTH9TEjFXGJsqKKVs7CIYOJQ32S9'
]);
const SCRIPT_ID_RE = /^[A-Za-z0-9_-]{30,150}$/;

function reject(message) { throw new Error('[RECUPERAÇÃO V3] ' + message); }

function checkSource() {
  const actual = fs.readdirSync(V3).filter(name =>
    /\.(gs|html)$/.test(name) || name === 'appsscript.json').sort();
  if (JSON.stringify(actual) !== JSON.stringify(FILES.slice().sort())) {
    reject('Esperados exatamente os seis arquivos aprovados em v3/.');
  }
  const manifest = JSON.parse(fs.readFileSync(path.join(V3,'appsscript.json'),'utf8'));
  if (manifest.webapp?.executeAs !== 'USER_DEPLOYING' ||
      manifest.webapp?.access !== 'MYSELF' ||
      manifest.runtimeVersion !== 'V8') {
    reject('O manifesto não restringe o acesso ao proprietário.');
  }
  const config = fs.readFileSync(path.join(V3,'Config.gs'),'utf8');
  if (!config.includes('function v3_instalarLab()') ||
      !config.includes('LAB deve usar apenas as duas planilhas fictícias autorizadas.')) {
    reject('Código V3 LAB não foi validado.');
  }
}

function checkId(id) {
  if (!SCRIPT_ID_RE.test(id || '') || OLD_IDS.has(id)) {
    reject('ID ausente, inválido ou pertencente ao projeto antigo/LAB V2.');
  }
  return id;
}

function checkSafePath(folder) {
  const absolute = path.resolve(folder);
  const real = fs.realpathSync.native(absolute);
  // clasp atualmente faz comparação exata entre path.resolve e fs.realpath.
  // Não contornar sua proteção allowSymlinks.
  if (absolute !== real) {
    reject('Pasta não canônica para clasp. Informado: ' + absolute +
      ' | caminho real: ' + real +
      '. Nenhum envio. Use caminho sem atalhos 8.3 nem junctions.');
  }
  const relative=path.relative(ROOT,absolute);
  if (relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative))) {
    reject('A pasta precisa ficar FORA do repositório antigo.');
  }
  for (let current=absolute;;current=path.dirname(current)) {
    if (fs.existsSync(path.join(current,'.clasp.json'))) {
      reject('Pasta herda projeto Apps Script já configurado: ' + current +
        '. Nenhum arquivo enviado.');
    }
    if (path.dirname(current) === current) break;
  }
}

function commandPush(folder) {
  const win = process.platform === 'win32';
  const bin = win ? (process.env.ComSpec || 'cmd.exe') : 'clasp';
  const args = win ? ['/d','/s','/c','clasp.cmd push'] : ['push'];
  const result = cp.spawnSync(bin,args,{
    cwd:folder,stdio:'inherit',encoding:'utf8',
    windowsHide:false,timeout:120000,shell:false
  });
  if (result.error) reject('Falha ao iniciar clasp: '+result.error.message);
  if (result.status !== 0) reject('clasp push falhou. Pasta local mantida: '+folder+
    '. Nenhuma implantação Web foi feita.');
}

function recover(args) {
  checkSource();
  if (args.includes('--dry-run')) {
    console.log('OK: 6 arquivos da V3 conferidos. Não cria projeto nem envia código.');
    return;
  }
  const idArg = args.find(x => x.startsWith('--script-id='));
  const id = checkId(idArg ? idArg.slice('--script-id='.length) : '');
  if (!args.includes('--confirmar-recuperacao=SIM')) {
    reject('Informe --confirmar-recuperacao=SIM. Nenhum envio ocorreu.');
  }
  // Windows: cria na raiz do MESMO volume onde está o repositório.
  // No computador do usuário é o D:\, evitando C:\Users\DESAFI~1\...\Temp.
  // Não usa o caminho dentro de build nem a .clasp.json do projeto antigo.
  const volume = path.parse(ROOT).root;
  if (!volume) reject('Não foi possível localizar a raiz do volume.');
  const folder = fs.mkdtempSync(path.join(volume,'DG-V3-RECUP-'));
  console.log('Pasta local de recuperação:',folder);
  checkSafePath(folder);

  for (const file of FILES) {
    fs.copyFileSync(path.join(V3,file),path.join(folder,file));
  }
  fs.writeFileSync(path.join(folder,'.clasp.json'),
    JSON.stringify({
      scriptId:id,rootDir:'.',
      scriptExtensions:['.js','.gs'],
      htmlExtensions:['.html'],
      jsonExtensions:['.json'],
      skipSubdirectories:true
    },null,2)+'\n',
    {encoding:'utf8',flag:'wx',mode:0o600});

  console.log('Projeto Google EXISTENTE: https://script.google.com/d/'+id+'/edit');
  console.log('Não será criado outro projeto. Enviando somente 6 arquivos...');
  commandPush(folder);
  console.log('Envio concluído. Nenhum Web App implantado.');
  console.log('No editor, execute v3_instalarLab() e depois v3_lab_aceite().');
}
if (require.main === module) {
  try { recover(process.argv.slice(2)); }
  catch (err) { console.error(err.message || String(err));process.exitCode=1; }
}
module.exports={checkSource,checkId,checkSafePath,recover};
