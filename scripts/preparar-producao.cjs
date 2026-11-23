#!/usr/bin/env node
'use strict';
// Só empacota. Nunca executa clasp push nem altera uma implantação.
const fs = require('node:fs');
const path = require('node:path');
const ROOT = path.resolve(__dirname, '..');
const BUILD = path.join(ROOT, 'build');
const SCRIPT_LEGADO = '1kGOdB_gSWesEqIlJNLWAOWF-zeMAfTH9TEjFXGJsqKKVs7CIYOJQ32S9';
const SCRIPT_LAB = '1qOTRjWCldsxcu2cRa_nNzZPhoUHFO_NoEcCs0IQcItK7a87yR1tcTHYk';
const ARQUIVOS_OBRIGATORIOS = [
  'Code.js','Planilhas.js','Router.js','Index.html',
  'RelIndex.html','MarketingMultidesafios.js','ScriptsMultidesafios.html',
  'LabAutoteste.js','ProdAutoteste.js','appsscript.json'
];
function recusar(m) { throw Error('[PUBLICAÇÃO PROD BLOQUEADA] ' + m); }
function validarCodigo() {
  const manifest = JSON.parse(fs.readFileSync(path.join(ROOT,'appsscript.json'),'utf8'));
  if (manifest.runtimeVersion !== 'V8' || !manifest.webapp ||
      manifest.webapp.executeAs !== 'USER_DEPLOYING' ||
      manifest.webapp.access !== 'MYSELF') {
    recusar('Manifesto deve restringir Web App ao proprietário.');
  }
  const cfg = fs.readFileSync(path.join(ROOT,'Planilhas.js'),'utf8');
  if (!cfg.includes('DG_PROD_EDICAO_LIBERADA') ||
      !cfg.includes('dg_assertEscritaPermitida_') ||
      !cfg.includes('DG_PLANILHA_MARKETING_RELACIONAMENTO_ID') ||
      !cfg.includes("DG_AMBIENTE")) {
    recusar('Configuração sem bloqueio inicial de escrita em produção.');
  }
  const script=fs.readFileSync(path.join(ROOT,'ProdAutoteste.js'),'utf8');
  if (!script.includes('function dg_prod_autoteste()') ||
      !script.includes('!dg_edicaoPermitida_()')) {
    recusar('Falta diagnóstico de produção somente leitura.');
  }
  const arquivos = fs.readdirSync(ROOT,{withFileTypes:true})
    .filter(entry=>entry.isFile() &&
      (/\.(js|gs|html)$/.test(entry.name) || entry.name==='appsscript.json'))
    .map(entry=>entry.name).sort();
  for(const arquivo of ARQUIVOS_OBRIGATORIOS) {
    if (!arquivos.includes(arquivo)) recusar('Falta '+arquivo);
  }
  if (fs.existsSync(path.join(ROOT,'.clasp.json'))) {
    recusar('Remova vínculo local da raiz; não empacotar de pasta associada a outro script.');
  }
  return arquivos;
}
function main(args){
  const files=validarCodigo();
  if(args.includes('--dry-run')){
    console.log('OK: pacote PROD validado, '+files.length+
      ' arquivos, acesso MYSELF, mudanças bloqueadas. Nada foi enviado.');
    return;
  }
  if(!args.includes('--confirm-new-production-project=SIM')){
    recusar('Exija --confirm-new-production-project=SIM.');
  }
  const raw = args.find(x=>x.startsWith('--script-id='));
  const scriptId=raw?raw.slice('--script-id='.length):'';
  if(!/^[A-Za-z0-9_-]{30,150}$/.test(scriptId)) {
    recusar('Informe script ID do NOVO Apps Script de produção.');
  }
  if(scriptId===SCRIPT_LEGADO || scriptId===SCRIPT_LAB){
    recusar('ID do LAB ou de projeto anterior não é permitido.');
  }
  fs.mkdirSync(BUILD,{recursive:true});
  const dir=fs.mkdtempSync(path.join(BUILD,'prod-'));
  for(const file of files)fs.copyFileSync(path.join(ROOT,file),path.join(dir,file));
  fs.writeFileSync(path.join(dir,'.clasp.json'),JSON.stringify({
    scriptId:scriptId,
    rootDir:'.',
    scriptExtensions:['.js','.gs'],
    htmlExtensions:['.html'],
    jsonExtensions:['.json'],
    skipSubdirectories:true
  },null,2)+'\n',{mode:0o600});
  console.log('PACOTE PROD (INICIALMENTE SOMENTE LEITURA): '+dir);
  console.log('Revise o scriptId local antes do envio. Esta ferramenta NAO faz push nem deploy.');
}
try{main(process.argv.slice(2))}
catch(e){console.error(e.message||String(e));process.exitCode=1}
