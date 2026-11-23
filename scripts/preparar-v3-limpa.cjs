#!/usr/bin/env node
'use strict';
// Empacota SOMENTE a aplicação V3, sem executar push, deploy ou autorizações.
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),source=path.join(root,'v3');
const required=['Config.gs','Marketing.gs','Relacionamento.gs','Index.html','appsscript.json'];
const blocked=new Set([
 '1kGOdB_gSWesEqIlJNLWAOWF-zeMAfTH9TEjFXGJsqKKVs7CIYOJQ32S9',
 '1qOTRjWCldsxcu2cRa_nNzZPhoUHFO_NoEcCs0IQcItK7a87yR1tcTHYk'
]);
function fail(message){throw Error('[V3 BLOQUEADA] '+message);}
function validate(){
 const files=fs.readdirSync(source).sort();
 if(JSON.stringify(files)!==JSON.stringify(required.slice().sort()))
  fail('O diretório v3 deve conter exatamente os 5 arquivos aprovados.');
 const mf=JSON.parse(fs.readFileSync(path.join(source,'appsscript.json'),'utf8'));
 if(mf.runtimeVersion!=='V8'||mf.webapp?.access!=='MYSELF'||mf.webapp?.executeAs!=='USER_DEPLOYING')
  fail('Web App precisa executar como proprietário e acesso MYSELF.');
 const config=fs.readFileSync(path.join(source,'Config.gs'),'utf8');
 if(!config.includes("DG_PROD_EDICAO_LIBERADA")||
   !config.includes("LAB deve usar apenas as duas planilhas fictícias autorizadas."))
   fail('Validação de ambiente e bloqueio de produção ausentes.');
 for(const f of ['Config.gs','Marketing.gs','Relacionamento.gs']){
  const s=fs.readFileSync(path.join(source,f),'utf8');
  // Verifica compatibilidade sintática de V8 sem transportar código legado.
  new Function(s);
 }
 return files;
}
function main(args){
 const files=validate();
 if(args.includes('--dry-run')){
  console.log('OK: V3 limpa, 5 arquivos, proteção LAB/PROD e acesso MYSELF. Nenhum envio.');
  return;
 }
 if(!args.includes('--confirm-new-project=SIM'))
  fail('Informe --confirm-new-project=SIM.');
 const arg=args.find(v=>v.startsWith('--script-id='));
 const id=arg?arg.slice('--script-id='.length):'';
 if(!/^[\w-]{30,150}$/.test(id))fail('Informe o ID de um projeto Apps Script NOVO.');
 if(blocked.has(id))fail('ID existente de LAB/legado bloqueado. Crie um projeto V3 separado.');
 const build=path.join(root,'build');
 fs.mkdirSync(build,{recursive:true});
 const dir=fs.mkdtempSync(path.join(build,'v3-clean-'));
 for(const file of files)fs.copyFileSync(path.join(source,file),path.join(dir,file));
 fs.writeFileSync(path.join(dir,'.clasp.json'),JSON.stringify({
  scriptId:id,rootDir:'.',scriptExtensions:['.js','.gs'],
  htmlExtensions:['.html'],jsonExtensions:['.json'],skipSubdirectories:true
 },null,2)+'\n',{mode:0o600});
 console.log('PACOTE LIMPO V3: '+dir);
 console.log('Este comando não envia arquivos. Confira .clasp.json; só então, dentro da pasta gerada, execute clasp push.');
}
try{main(process.argv.slice(2));}catch(e){console.error(e.message||String(e));process.exitCode=1;}
