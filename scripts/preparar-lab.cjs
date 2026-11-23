#!/usr/bin/env node
'use strict';

// Gera um pacote clasp isolado. NÃO executa clasp push ou cria um deployment.
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const BUILD = path.join(ROOT, 'build');
const PROD_ORIGINAL_SCRIPT_ID = '1kGOdB_gSWesEqIlJNLWAOWF-zeMAfTH9TEjFXGJsqKKVs7CIYOJQ32S9';
const LAB_MARKETING = '1GGV-coN-1cNQ-0sxV-vAHFVqpfjGiKllzQEwyhGBq8Y';
const LAB_PORTAL = '1TpwNegLgeV9p8xDfpTUbnY9iUJdR8q1TQ6SBzHgimFY';

function falhar(mensagem) {
  throw new Error('[PACOTE LAB BLOQUEADO] ' + mensagem);
}

function validarCodigo() {
  const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'appsscript.json'), 'utf8'));
  if (!manifest.webapp || manifest.webapp.access !== 'MYSELF' ||
      manifest.webapp.executeAs !== 'USER_DEPLOYING' ||
      manifest.runtimeVersion !== 'V8') {
    falhar('O manifesto não restringe o acesso ao proprietário.');
  }
  const planilhas = fs.readFileSync(path.join(ROOT, 'Planilhas.js'), 'utf8');
  if (!planilhas.includes(LAB_MARKETING) || !planilhas.includes(LAB_PORTAL) ||
      !planilhas.includes("DG_AMBIENTE") ||
      !planilhas.includes("LAB deve usar somente as duas planilhas fictícias autorizadas.")) {
    falhar('As bases LAB não estão fixadas nem protegidas no código.');
  }
  const contatos = fs.readFileSync(path.join(ROOT, 'RelContatosScripts.html'), 'utf8');
  if (!contatos.includes("window.DG_AMBIENTE === 'LAB'") ||
      !contatos.includes('WhatsApp bloqueado no LAB')) {
    falhar('O bloqueio de WhatsApp do LAB foi removido.');
  }
  const marketing = fs.readFileSync(path.join(ROOT, 'Code.js'), 'utf8');
  if (!marketing.includes("dg_configPlanilhas_().ambiente === 'LAB'")) {
    falhar('O bloqueio dos links públicos do LAB foi removido.');
  }
  const arquivos = fs.readdirSync(ROOT, { withFileTypes: true })
    .filter(e => e.isFile() && (
      /\.(js|gs|html)$/.test(e.name) || e.name === 'appsscript.json'
    )).map(e => e.name).sort();
  if (!arquivos.includes('Code.js') ||
      !arquivos.includes('Planilhas.js') ||
      !arquivos.includes('RelIndex.html') ||
      !arquivos.includes('Router.js') ||
      !arquivos.includes('appsscript.json')) {
    falhar('Faltam arquivos obrigatórios para o aplicativo.');
  }
  return arquivos;
}

function executar(args) {
  const dryRun = args.includes('--dry-run');
  const idArg = args.find(x => x.startsWith('--script-id='));
  const scriptId = idArg ? idArg.slice('--script-id='.length) : '';
  const confirmacao = args.includes('--confirm-new-lab-project=SIM');
  const arquivos = validarCodigo();

  if (dryRun) {
    console.log('OK: validação estática de pacote LAB (' + arquivos.length +
      ' arquivos GAS). Nenhum projeto alterado ou arquivo criado.');
    return { dryRun: true, arquivos };
  }
  if (!confirmacao) {
    falhar('É necessário --confirm-new-lab-project=SIM para gerar o pacote.');
  }
  if (!/^[A-Za-z0-9_-]{30,150}$/.test(scriptId)) {
    falhar('Informe apenas o ID de um projeto Apps Script LAB novo e válido.');
  }
  const legado = path.join(ROOT, '.clasp.json');
  if (scriptId === PROD_ORIGINAL_SCRIPT_ID ||
      (fs.existsSync(legado) &&
       scriptId === String(JSON.parse(fs.readFileSync(legado, 'utf8')).scriptId || ''))) {
    falhar('ID vinculado ao projeto Apps Script anterior: não usar para LAB.');
  }

  fs.mkdirSync(BUILD, { recursive: true });
  const destino = fs.mkdtempSync(path.join(BUILD, 'lab-'));
  for (const arquivo of arquivos) {
    fs.copyFileSync(path.join(ROOT, arquivo), path.join(destino, arquivo));
  }
  fs.writeFileSync(path.join(destino, '.clasp.json'), JSON.stringify({
    scriptId, rootDir: '.', scriptExtensions: ['.js', '.gs'],
    htmlExtensions: ['.html'], jsonExtensions: ['.json'],
    skipSubdirectories: true
  }, null, 2) + '\n', { mode: 0o600 });
  console.log('PACOTE LAB GERADO: ' + destino);
  console.log('Somente dentro dessa pasta: conferir .clasp.json e executar clasp push.');
  console.log('Esta ferramenta não publica nem faz push por conta própria.');
  return { destino, arquivos };
}

try {
  executar(process.argv.slice(2));
} catch (erro) {
  console.error(erro && erro.message || String(erro));
  process.exitCode = 1;
}
