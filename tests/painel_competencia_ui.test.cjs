'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'Index.html'),'utf8');
const scriptHtml=fs.readFileSync(path.join(root,'ScriptsMultidesafios.html'),'utf8');
const script=scriptHtml.replace(/^\s*<script>\s*/,'').replace(/\s*<\/script>\s*$/,'');
assert.match(html,/id="periodo-configuracoes"[\s\S]{0,150}onchange="mdgTrocarMesDoDesafio\(\)"/);
new Function(script);
function montar(){
 const elementos={
  'periodo-configuracoes':{value:'novembro/2026',innerHTML:''},
  'periodo-atual':{textContent:''},
  'meta-geral-configuracoes':{value:''},
  'metas-desafios-configuracoes':{textContent:'',innerHTML:''},
  'btn-aplicar-configuracoes':{disabled:false,textContent:'SALVAR E APLICAR'}
 };
 const requisicoes=[];
 let salvos=0;
 const document={
  getElementById(id){return elementos[id]||null;},
  querySelectorAll(){return []}
 };
 const google={script:{run:{
  withSuccessHandler(fn){const pedido={success:fn};return {
    withFailureHandler(fail){pedido.fail=fail;return this;},
    obterMetasPeriodoMarketingV2(periodo){pedido.periodo=periodo;requisicoes.push(pedido);}
  }}
 }}};
 const ctx=vm.createContext({
  document,google,console,
  esc:v=>String(v),
  fecharConfiguracoes(){},
  window:{alert(){}}
 });
 vm.runInContext(script,ctx);
 return {ctx,elementos,requisicoes,get salvos(){return salvos}};
}
test('Mudança do mês busca as metas correspondentes, não salva dados antigos',()=>{
 const t=montar();
 t.ctx.mdgTrocarMesDoDesafio();
 assert.equal(t.requisicoes[0].periodo,'novembro/2026');
 assert.equal(t.elementos['btn-aplicar-configuracoes'].disabled,true);
 assert.match(t.elementos['metas-desafios-configuracoes'].textContent,/Carregando/);
 t.ctx.aplicarConfiguracoes(); // Botão desabilitado não salva.
 t.elementos['periodo-configuracoes'].value='dezembro/2026';
 t.ctx.mdgTrocarMesDoDesafio();
 assert.equal(t.requisicoes[1].periodo,'dezembro/2026');
 t.requisicoes[1].success({status:'OK',periodo:'dezembro/2026',
   metaGeral:225,desafios:[{id:'602',nome:'Desafio genérico dezembro',
   codigo:'DEZ602',tipo:'NORMAL',meta:150}]});
 assert.equal(t.elementos['meta-geral-configuracoes'].value,225);
 assert.match(t.elementos['metas-desafios-configuracoes'].innerHTML,/Desafio genérico dezembro/);
 assert.equal(t.elementos['btn-aplicar-configuracoes'].disabled,false);
 // Resposta de novembro chegou atrasada: não pode sobrescrever dezembro.
 t.requisicoes[0].success({status:'OK',periodo:'novembro/2026',
   metaGeral:9,desafios:[{id:'501',nome:'Nome antigo',codigo:'NOV501',tipo:'NORMAL',meta:9}]});
 assert.equal(t.elementos['meta-geral-configuracoes'].value,225);
 assert.doesNotMatch(t.elementos['metas-desafios-configuracoes'].innerHTML,/Nome antigo/);
});
test('Falha ao consultar outro mês impede salvar metas que pertencem ao mês anterior',()=>{
 const t=montar();
 t.elementos['periodo-configuracoes'].value='dezembro/2026';
 t.ctx.mdgTrocarMesDoDesafio();
 t.requisicoes[0].fail(new Error('erro simulado'));
 assert.equal(t.elementos['btn-aplicar-configuracoes'].disabled,true);
 assert.match(t.elementos['metas-desafios-configuracoes'].textContent,/Falha ao consultar/);
});
