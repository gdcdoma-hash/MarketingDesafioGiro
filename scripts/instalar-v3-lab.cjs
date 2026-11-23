#!/usr/bin/env node
'use strict';
/**
 * Instala V3 em projeto Google Apps Script NOVO. Executa no computador
 * autenticado pelo proprietário; não usa tokens, senhas ou Apps Script PROD.
 * Cria projeto e faz push somente com confirmação explícita no comando.
 */
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const cp=require('node:child_process');
const root=path.resolve(__dirname,'..');
const sourceDir=path.join(root,'v3');
const files=['Config.gs','Importacao.gs','Index.html','Marketing.gs','Relacionamento.gs','appsscript.json'];
const oldIds=new Set([
 '1qOTRjWCldsxcu2cRa_nNzZPhoUHFO_NoEcCs0IQcItK7a87yR1tcTHYk',
 '1kGOdB_gSWesEqIlJNLWAOWF-zeMAfTH9TEjFXGJsqKKVs7CIYOJQ32S9'
]);
function refuse(message){throw Error('[LAB V3] '+message);}
function validate(){
 if(fs.existsSync(path.join(root,'.clasp.json')))
  refuse('Raiz possui vínculo clasp antigo. Use uma cópia limpa desta branch.');
 const actual=fs.readdirSync(sourceDir).filter(x=>/\.(gs|html|json)$/.test(x)).sort();
 if(JSON.stringify(actual)!==JSON.stringify(files.slice().sort()))
  refuse('Pacote inesperado: devem existir somente seis arquivos executáveis.');
 const manifest=JSON.parse(fs.readFileSync(path.join(sourceDir,'appsscript.json'),'utf8'));
 if(manifest.runtimeVersion!=='V8'||manifest.webapp?.access!=='MYSELF'||
   manifest.webapp?.executeAs!=='USER_DEPLOYING')
  refuse('Manifesto não exige execução proprietária e acesso somente eu.');
 const config=fs.readFileSync(path.join(sourceDir,'Config.gs'),'utf8');
 if(!config.includes('function v3_instalarLab()')||
  !config.includes('LAB deve usar apenas as duas planilhas fictícias autorizadas.'))
  refuse('Configuração automática e isolamento LAB não estão presentes.');
 return files;
}
function command(args,cwd,quiet){
 const result=cp.spawnSync('clasp',args,{
  cwd,encoding:'utf8',shell:process.platform==='win32',
  env:process.env,
  stdio:quiet?['inherit','pipe','pipe']:'inherit',
  timeout:120000
 });
 if(result.error)return {status:1,error:result.error.message,stdout:result.stdout||'',stderr:result.stderr||''};
 return {status:result.status,stdout:result.stdout||'',stderr:result.stderr||''};
}
function install(){
 validate();
 const args=process.argv.slice(2);
 if(args.includes('--dry-run')){
  console.log('OK: pacote LAB V3 validado; 6 arquivos. Nenhum projeto criado ou enviado.');
  return;
 }
 if(!args.includes('--confirmar-novo-lab=SIM'))
  refuse('Execute com --confirmar-novo-lab=SIM para criar um NOVO Apps Script V3.');
 const base=path.join(root,'build');
 fs.mkdirSync(base,{recursive:true});
 const dir=fs.mkdtempSync(path.join(base,'v3-lab-novo-'));
 console.log('Projeto local isolado:',dir);
 console.log('Criando novo Apps Script privado na conta autenticada pelo clasp.');
 // A versão atual do clasp usa "create-script"; versões antigas "create".
 let result=command(['create-script','--title','DG-Marketing-Relacionamento-V3-LAB','--type','standalone'],dir,true);
 if(result.status!==0){
  if(fs.existsSync(path.join(dir,'.clasp.json')))
   refuse('O comando criou vínculo mas retornou erro. Verifique a pasta; não criaremos um segundo script.');
  if(!/unknown command|unknown option|is not a command|invalid command/i.test(result.stderr+' '+result.stdout))
   refuse('Não foi possível criar o projeto. Verifique login/API/clasp. '+(result.stderr||result.error||'').slice(0,400));
  result=command(['create','--title','DG-Marketing-Relacionamento-V3-LAB','--type','standalone'],dir,true);
  if(result.status!==0)
   refuse('Falha na criação usando clasp. '+(result.stderr||result.error||'').slice(0,400));
 }
 const claspFile=path.join(dir,'.clasp.json');
 if(!fs.existsSync(claspFile))refuse('Clasp não criou .clasp.json; nenhum push realizado.');
 const cfg=JSON.parse(fs.readFileSync(claspFile,'utf8'));
 const id=cfg.scriptId||'';
 if(!/^[A-Za-z0-9_-]{30,150}$/.test(id)||oldIds.has(id))
  refuse('ID retornado é inválido ou pertence a projeto anterior; push bloqueado.');
 // Pasta recém-criada estava vazia antes do clasp. Remover templates locais
 // gerados por ele (por exemplo Code.js) para não publicar arquivos extras.
 for(const name of fs.readdirSync(dir)){
  if(name==='.clasp.json')continue;
  const dest=path.join(dir,name);
  if(!fs.statSync(dest).isFile())refuse('Subpasta inesperada na instalação V3: '+name);
  fs.unlinkSync(dest);
 }
 // Copiamos somente após criar/validar o ID; jamais enviamos código legado.
 for(const file of files)fs.copyFileSync(path.join(sourceDir,file),path.join(dir,file));
 // Rejeita arquivos criados pelo clasp que não façam parte do pacote.
 const present=fs.readdirSync(dir);
 const extra=present.filter(f=>!files.includes(f)&&f!=='.clasp.json');
 if(extra.length)refuse('Arquivos inesperados no projeto novo: '+extra.join(', '));
 console.log('ID do NOVO Apps Script:',id);
 console.log('Enviando 6 arquivos para o novo projeto isolado.');
 const pushed=command(['push'],dir,false);
 if(pushed.status!==0)
  refuse('Clasp push não concluído. Projeto novo: '+id+'. Revise o erro e execute na pasta informada.');
 console.log('');
 console.log('LAB V3 criado e código enviado (nenhuma implantação Web realizada).');
 console.log('Editor: https://script.google.com/home/projects/'+id+'/edit');
 console.log('No editor, execute v3_instalarLab() para configurar as planilhas fictícias e validar as 11 condições.');
 console.log('Depois execute v3_lab_aceite() para conferir os 13 cenários de negócio.');
 console.log('Web App: Implantações > Nova implantação > App da Web > Eu > Somente eu.');
}
try{install();}catch(e){console.error(e.message||String(e));process.exitCode=1;}
