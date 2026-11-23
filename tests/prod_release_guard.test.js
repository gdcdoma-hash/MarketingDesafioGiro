'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const cp = require('node:child_process');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root,file),'utf8');
const sources = {
  planilhas: read('Planilhas.js'),
  codigo: read('Code.js'),
  diag: read('ProdAutoteste.js')
};
const ids = {
  marketing: '1znhdMCmPsMZ6viMJtWl2wXg3G7yWh-0Xu0M8IcJ-9ao',
  portal: '1h9Rlk5WbsuuaJLPcmSd6CpglP23XkhXY1bo9dON2stQ',
  labMarketing:'1GGV-coN-1cNQ-0sxV-vAHFVqpfjGiKllzQEwyhGBq8Y',
  labPortal:'1TpwNegLgeV9p8xDfpTUbnY9iUJdR8q1TQ6SBzHgimFY'
};
const dados={
  Marketing: [
    ['REF','ID_DGMB','NOME_ORIGEM','TIPO','STATUS'],
    ['1145','','Canal teste','APOIADOR','ATIVO']
  ],
  Relacionamento_Contatos: [
    ['TELEFONE_NORMALIZADO','NOME_PORTAL','ID_DGMB'],
    ['5598991234501','Pessoa teste','LAB1']
  ],
  ListaDesafios: [
    ['id_Desafio_lista','Periodo','Nome_Desafio','Tipo'],
    ['9001','novembro/2026','Desafio de teste','Normal']
  ],
  dgmbDesafios: [
    ['ID_DGMB','Observacao','REF_MARKETING','Status_Desafio'],
    ['LAB1','[ID_DESAFIO:9001]','1145','Ativo']
  ]
};
function pasta(id) {
  return {
    getId(){return id},
    getSheetByName(nome) {
      if(!dados[nome])return null;
      return {getDataRange(){return {getDisplayValues(){return dados[nome]}}}};
    }
  };
}
function contexto(env,edit='',options={}) {
  const props={
    DG_AMBIENTE:env,
    DG_PORTAL_SPREADSHEET_ID:env==='LAB'?ids.labPortal:ids.portal,
    DG_MARKETING_SPREADSHEET_ID:env==='LAB'?ids.labMarketing:'',
    DG_PROD_EDICAO_LIBERADA:edit
  };
  const ctx=vm.createContext({
    SpreadsheetApp:{openById(id) {
      if(id===ids.portal || id===ids.labPortal)return pasta(id);
      if(id===ids.marketing || id===ids.labMarketing)return pasta(id);
      throw Error('Não permitir outro id');
    }},
    PropertiesService:{getScriptProperties(){return {getProperty(k){return props[k]||''}}}},
    ...options
  });
  vm.runInContext(sources.codigo,ctx,{filename:'Code.js'});
  vm.runInContext(sources.planilhas,ctx,{filename:'Planilhas.js'});
  vm.runInContext(sources.diag,ctx,{filename:'ProdAutoteste.js'});
  return ctx;
}
const produtor=contexto('PROD');
assert.equal(produtor.dg_edicaoPermitida_(),false);
assert.throws(()=>produtor.dg_assertEscritaPermitida_(),/somente leitura/);
assert.equal(produtor.dg_prod_autoteste().status,'OK');
assert.equal(produtor.dg_prod_autoteste().resumo.inscricoes,1);
assert.equal(produtor.dg_prod_autoteste().edicaoLiberada,false);
assert.equal(JSON.stringify(produtor.dg_prod_autoteste()).includes('Pessoa teste'),false);
for(const flag of ['Nao','1','TRUE','']) {
  const t=contexto('PROD',flag);
  assert.equal(t.dg_edicaoPermitida_(),false,flag);
}
const liberado=contexto('PROD','SIM');
assert.equal(liberado.dg_edicaoPermitida_(),true);
assert.doesNotThrow(()=>liberado.dg_assertEscritaPermitida_());
assert.equal(liberado.dg_prod_autoteste().status,'FALHA','O diagnóstico exige bloqueio inicial');
const lab=contexto('LAB');
assert.equal(lab.dg_edicaoPermitida_(),true);
assert.doesNotThrow(()=>lab.dg_assertEscritaPermitida_());
assert.throws(()=>lab.dg_prod_autoteste(),/exclusivo de produção/);

const protegidos = {
 'Code.js':['salvarDivulgadorMarketing','alterarStatusOrigemMarketing'],
 'MarketingMultidesafios.js':['salvarMetasMarketingV2'],
 'RelContatosRepo.js':['rel_contatos_atualizarCampos_','rel_contatos_persistirSituacao_','rel_cidades_inserir_'],
 'RelImportRepo.js':['rel_importacao_inserirLinhas_','rel_importacao_atualizarContatos_','rel_importacao_atualizarVinculos_'],
 'RelOrigemRepo.js':['rel_origem_inserir_','rel_origem_atualizarStatus_'],
 'RelGoogleContactsService.js':['rel_agendaGoogle_confirmar_'],
 'RelSetup.js':['rel_configurarEstruturaInicial','rel_migrarEstruturaContatosSituacaoGoogle'],
 'MigracaoBaseMarketingRelacionamento.js':[
   'dg_migrarBaseMarketingRelacionamento','dg_removerAbasAntigasRelacionamentoPortal','dg_copiarConteudoAba_'
 ]
};
for (const [filename,methods] of Object.entries(protegidos)){
  const source=read(filename);
  for (const name of methods) {
    const re = new RegExp('function '+name+'\\([^\\n]*\\) \\{\\s*dg_assertEscritaPermitida_\\(\\);');
    assert.match(source,re,filename+':'+name);
  }
}
const run=args=>cp.spawnSync(process.execPath,
  [path.join(root,'scripts/preparar-producao.cjs'),...args],{cwd:root,encoding:'utf8'});
const dry=run(['--dry-run']);
assert.equal(dry.status,0,dry.stderr);
assert.match(dry.stdout,/Nada foi enviado/);
const old=run(['--script-id=1kGOdB_gSWesEqIlJNLWAOWF-zeMAfTH9TEjFXGJsqKKVs7CIYOJQ32S9',
  '--confirm-new-production-project=SIM']);
assert.notEqual(old.status,0);
assert.match(old.stderr,/não é permitido/);
const labId=run(['--script-id=1qOTRjWCldsxcu2cRa_nNzZPhoUHFO_NoEcCs0IQcItK7a87yR1tcTHYk',
  '--confirm-new-production-project=SIM']);
assert.notEqual(labId.status,0);
assert.match(labId.stderr,/não é permitido/);
const missing=run(['--script-id='+'A'.repeat(45)]);
assert.notEqual(missing.status,0);
assert.match(missing.stderr,/confirm-new-production-project/);
const validId='1PRD_'+'X'.repeat(40);
const built=run(['--script-id='+validId,'--confirm-new-production-project=SIM']);
assert.equal(built.status,0,built.stderr);
const match=built.stdout.match(/PACOTE PROD \(INICIALMENTE SOMENTE LEITURA\): ([^\r\n]+)/);
assert.ok(match,built.stdout);
const dir=path.resolve(match[1]);
const expectedRoot=path.join(root,'build');
assert.equal(path.dirname(dir),expectedRoot);
try {
  const clasp=JSON.parse(fs.readFileSync(path.join(dir,'.clasp.json'),'utf8'));
  assert.equal(clasp.scriptId,validId);
  assert.ok(fs.existsSync(path.join(dir,'ProdAutoteste.js')));
  assert.ok(!fs.existsSync(path.join(dir,'tests')));
  assert.equal(JSON.parse(fs.readFileSync(path.join(dir,'appsscript.json'),'utf8')).webapp.access,'MYSELF');
} finally {
  if(path.dirname(dir)===expectedRoot && path.basename(dir).startsWith('prod-')){
    fs.rmSync(dir,{recursive:true,force:true});
  }
}
console.log('OK: produção inicia leitura; 17 guardas de escrita, diagnóstico e pacote seguros.');
