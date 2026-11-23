'use strict';
const assert = require('node:assert/strict');
const cp = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const script = path.join(root, 'scripts/preparar-lab.cjs');
const run = args => cp.spawnSync(process.execPath, [script, ...args], {
  cwd: root, encoding: 'utf8'
});
const check = run(['--dry-run']);
assert.equal(check.status, 0, check.stderr);
assert.match(check.stdout, /Nenhum projeto alterado ou arquivo criado/);

const noId = run(['--confirm-new-lab-project=SIM']);
assert.notEqual(noId.status, 0);
assert.match(noId.stderr, /ID de um projeto Apps Script LAB novo/);
const noConfirmation = run(['--script-id=' + 'A'.repeat(45)]);
assert.notEqual(noConfirmation.status, 0);
assert.match(noConfirmation.stderr, /confirm-new-lab-project/);
const oldProject = run([
  '--script-id=1kGOdB_gSWesEqIlJNLWAOWF-zeMAfTH9TEjFXGJsqKKVs7CIYOJQ32S9',
  '--confirm-new-lab-project=SIM'
]);
assert.notEqual(oldProject.status, 0);
assert.match(oldProject.stderr, /projeto Apps Script anterior/);

const newId = '1LAB_FICTICIO_' + 'X'.repeat(32);
const built = run(['--script-id=' + newId, '--confirm-new-lab-project=SIM']);
assert.equal(built.status, 0, built.stderr);
const pathMatch = built.stdout.match(/PACOTE LAB GERADO: ([^\r\n]+)/);
assert.ok(pathMatch, 'Deve informar a pasta gerada');
const directory = path.resolve(pathMatch[1]);
const buildRoot = path.join(root, 'build');
assert.equal(path.dirname(directory), buildRoot);
assert.match(path.basename(directory), /^lab-/);

try {
  const files = fs.readdirSync(directory).sort();
  for (const filename of files) {
    assert.ok(filename === '.clasp.json' || filename === 'appsscript.json' ||
      /\.(?:js|gs|html)$/.test(filename), 'Conteúdo indevido: ' + filename);
  }
  assert.ok(files.includes('Code.js'));
  assert.ok(files.includes('Router.js'));
  assert.ok(files.includes('RelEsporteService.js'));
  assert.ok(files.includes('appsscript.json'));
  assert.ok(!files.includes('tests'));
  assert.ok(!files.includes('AGENTS.md'));
  const config = JSON.parse(fs.readFileSync(path.join(directory, '.clasp.json'), 'utf8'));
  assert.equal(config.scriptId, newId);
  assert.equal(config.rootDir, '.');
  assert.equal(config.skipSubdirectories, true);
  assert.equal(JSON.parse(fs.readFileSync(path.join(directory, 'appsscript.json'), 'utf8')).webapp.access, 'MYSELF');
} finally {
  // Apenas uma pasta recém-gerada em /build/lab-* pode ser removida.
  if (path.dirname(directory) === buildRoot && path.basename(directory).startsWith('lab-')) {
    fs.rmSync(directory, { recursive: true, force: true });
  }
}
console.log('OK: empacotamento LAB isolado; produção, entradas inválidas e credenciais não incluídas.');
