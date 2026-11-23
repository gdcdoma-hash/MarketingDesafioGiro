/**
 * DESAFIO GIRO — V3 LIMPO
 * Um único aplicativo administrativo. Fonte Portal: SOMENTE LEITURA.
 * Uma única base operacional para Marketing e Relacionamento.
 */
const V3_IDS = Object.freeze({
  PROD_MARKETING:'1znhdMCmPsMZ6viMJtWl2wXg3G7yWh-0Xu0M8IcJ-9ao',
  PROD_PORTAL:'1h9Rlk5WbsuuaJLPcmSd6CpglP23XkhXY1bo9dON2stQ',
  LAB_MARKETING:'1bHR_mjL4vrVOTv-szVd__X3sgM0k4zhBe947I3hZcgE',
  LAB_PORTAL:'1pVIcTNdZN8yuEqyQ_WQ_aNfWzc9Wq8HcFFaMoye3dMM',
  PORTAL_URL:'https://desafiogiro.gmbd.com.br/'
});
const V3_ETAPAS=Object.freeze(['PARA_CONTATAR','AGUARDANDO_RESPOSTA','EM_CONVERSA','RETORNAR_DEPOIS','FINALIZADO','NAO_CONTATAR']);
const V3_SITUACOES=Object.freeze(['NAO_CLASSIFICADO','PODE_CONTATAR','NAO_FAZ_DESAFIO','NAO_E_CICLISTA','SEM_INTERESSE','NAO_DESEJA_CONTATO','CONTATO_INADEQUADO','OUTRO']);

function v3_texto_(v){return String(v===null||v===undefined?'':v).trim();}
function v3_normal_(v){return v3_texto_(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();}
function v3_ref_(v){const s=v3_texto_(v);return /^[A-Za-z0-9_-]{1,100}$/.test(s)?s:'';}
function v3_fone_(v){
 const raw=v3_texto_(v).replace(/\D/g,'');
 // Contatos brasileiros de 10/11 dígitos precisam do DDI para deduplicação.
 const s=(raw.length===10||raw.length===11)?'55'+raw:raw;
 return s.length>=12&&s.length<=15?s:'';
}
function v3_seguroCelula_(v){const s=v3_texto_(v);return /^[=+@\-]/.test(s)?"'"+s:s;}
function v3_periodoValor_(periodo){
 const meses=['janeiro','fevereiro','marco','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
 const m=v3_normal_(periodo).toLowerCase().match(/^([a-z]+)\/(\d{4})$/);
 if(!m)return -1;const i=meses.indexOf(m[1]);return i<0?-1:Number(m[2])*12+i;
}
function v3_config_(){
 const p=PropertiesService.getScriptProperties();
 const env=v3_texto_(p.getProperty('DG_AMBIENTE')).toUpperCase();
 if(env!=='LAB'&&env!=='PROD')throw Error('Defina DG_AMBIENTE=LAB ou PROD.');
 if(env==='LAB'){
   if(p.getProperty('DG_MARKETING_SPREADSHEET_ID')!==V3_IDS.LAB_MARKETING ||
      p.getProperty('DG_PORTAL_SPREADSHEET_ID')!==V3_IDS.LAB_PORTAL)
      throw Error('LAB deve usar apenas as duas planilhas fictícias autorizadas.');
   return {ambiente:env,marketingId:V3_IDS.LAB_MARKETING,portalId:V3_IDS.LAB_PORTAL,edicao:true};
 }
 if(v3_texto_(p.getProperty('DG_PORTAL_SPREADSHEET_ID'))!==V3_IDS.PROD_PORTAL)
   throw Error('Configure o ID oficial do Portal antes da produção.');
 if(p.getProperty('DG_MARKETING_SPREADSHEET_ID') &&
    p.getProperty('DG_MARKETING_SPREADSHEET_ID')!==V3_IDS.PROD_MARKETING)
   throw Error('Planilha Marketing PROD divergente.');
 return {ambiente:env,marketingId:V3_IDS.PROD_MARKETING,portalId:V3_IDS.PROD_PORTAL,
   edicao:v3_texto_(p.getProperty('DG_PROD_EDICAO_LIBERADA')).toUpperCase()==='SIM'};
}
function v3_escrita_(){if(!v3_config_().edicao)throw Error('Modo somente leitura: alterações não liberadas.');}
function v3_bases_(){const c=v3_config_();return {config:c,
  marketing:SpreadsheetApp.openById(c.marketingId),portal:SpreadsheetApp.openById(c.portalId)};}
function v3_tabela_(book,aba,obrigatorios){
 const sheet=book.getSheetByName(aba);if(!sheet)throw Error('Aba obrigatória ausente: '+aba);
 const values=sheet.getDataRange().getDisplayValues();
 const header=(values[0]||[]).map(v3_texto_);
 for(const nome of obrigatorios||[])if(header.indexOf(nome)<0)throw Error('Coluna '+nome+' ausente em '+aba);
 const records=values.slice(1).map((cells,i)=>{
   const obj=Object.create(null);
   header.forEach((h,j)=>{if(h)obj[h]=v3_texto_(cells[j]);});
   obj.__linha=i+2;return obj;
 }).filter(r=>header.some(h=>h&&r[h]));
 return {sheet:sheet,header:header,records:records};
}
function v3_gravarCampos_(tabela,registro,alteracoes){
 // Só alterações localizadas, nunca reescreve linhas inteiras.
 const campos=Object.keys(alteracoes);
 for(const h of campos)if(tabela.header.indexOf(h)<0)throw Error('Coluna ausente: '+h);
 for(const h of campos){
   const coluna=tabela.header.indexOf(h)+1;
   tabela.sheet.getRange(registro.__linha,coluna).setValue(alteracoes[h]);
 }
}
function v3_resposta_(status,dados,mensagem){return {status:status,dados:dados||{},mensagem:mensagem||''};}
/**
 * Reserva espaço antes de qualquer escrita em lote.
 * O Apps Script não amplia automaticamente todas as abas ao usar setValues.
 */
function v3_prepararEspaco_(sheet,quantidade){
 if(!Number.isSafeInteger(quantidade)||quantidade<1)throw Error('Quantidade de linhas inválida.');
 const inicio=sheet.getLastRow()+1,necessario=inicio+quantidade-1;
 if(typeof sheet.getMaxRows==='function'){
  const max=sheet.getMaxRows();
  if(necessario>max)sheet.insertRowsAfter(max,necessario-max);
 }
 return inicio;
}
function v3_lock_(f){
 const lock=LockService.getScriptLock();lock.waitLock(20000);
 try{return f();}finally{lock.releaseLock();}
}
function v3_dataISO_(v){
 const s=v3_texto_(v);
 let iso='';
 if(/^\d{4}-\d{2}-\d{2}$/.test(s))iso=s;
 else{
  const m=s.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s|$)/);
  if(m)iso=m[3]+'-'+m[2]+'-'+m[1];
 }
 if(!iso)return '';
 const [ano,mes,dia]=iso.split('-').map(Number);
 if(ano<1900||ano>2100||mes<1||mes>12||dia<1||dia>31)return '';
 const d=new Date(Date.UTC(ano,mes-1,dia));
 return d.getUTCFullYear()===ano&&d.getUTCMonth()+1===mes&&
  d.getUTCDate()===dia?iso:'';
}
function v3_hoje_(){return Utilities.formatDate(new Date(),Session.getScriptTimeZone()||'America/Fortaleza','yyyy-MM-dd');}
function v3_elegivel_(r){
 return ![r.Status_Usuario_Desafio,r.Status_Desafio].some(v=>
   /CANCEL|DESISTENT|EXPIRAD/.test(v3_normal_(v)));
}
function v3_idDesafio_(r){
 const match=v3_texto_(r.Observacao).match(/\[ID_DESAFIO:\s*([^\]\s]+)\s*\]/i);
 return match?match[1]:'';
}
function v3_catalogo_(portal){
 const data=v3_tabela_(portal,'ListaDesafios',['id_Desafio_lista','Nome_Desafio','Periodo']);
 const items=data.records.filter(r=>r.id_Desafio_lista&&r.Periodo).map(r=>({
   id:r.id_Desafio_lista,nome:r.Nome_Desafio||r.id_Desafio_lista,
   tipo:r.Tipo||'',periodo:r.Periodo,modalidade:r.Modalidade_Esportiva||''
 }));
 const porId=Object.create(null),periodos=new Set();
 items.forEach(r=>{porId[r.id]=r;periodos.add(r.periodo);});
 return {items:items,porId:porId,periodos:[...periodos].sort((a,b)=>v3_periodoValor_(b)-v3_periodoValor_(a))};
}
function v3_opcoes(){
 const b=v3_bases_(),cat=v3_catalogo_(b.portal);
 const refs=v3_tabela_(b.marketing,'Marketing',['REF','NOME_ORIGEM','TIPO','STATUS']).records;
 return {ambiente:b.config.ambiente,edicao:b.config.edicao,periodos:cat.periodos,
   desafios:cat.items,refAtivas:refs.filter(r=>r.STATUS==='ATIVO'&&v3_ref_(r.REF))
   .map(r=>({ref:r.REF,nome:r.NOME_ORIGEM||r.REF})),etapas:V3_ETAPAS,situacoes:V3_SITUACOES};
}
function doGet(e){
 const c=v3_config_();
 const template=HtmlService.createTemplateFromFile('Index');
 template.ambiente=c.ambiente;template.edicao=c.edicao;
 template.area=e&&e.parameter&&e.parameter.area==='relacionamento'?'relacionamento':'marketing';
 return template.evaluate().setTitle('Desafio Giro | Gestão');
}
function v3_autoteste(){
 const b=v3_bases_(),catalogo=v3_catalogo_(b.portal);
 const marketing=v3_tabela_(b.marketing,'Marketing',
  ['REF','ID_DGMB','NOME_ORIGEM','TIPO','STATUS']);
 const contatos=v3_tabela_(b.marketing,'Relacionamento_Contatos',
  ['TELEFONE_NORMALIZADO','ETAPA','SITUACAO','ATUALIZADO_EM',
   'MODALIDADE','NOME_CONTATO','DATA_PROXIMO_RETORNO','OBSERVACAO']);
 const origens=v3_tabela_(b.marketing,'Relacionamento_Origens',
  ['ID_ORIGEM','NOME_ORIGEM','TIPO_ORIGEM','STATUS']);
 const vinculos=v3_tabela_(b.marketing,'Relacionamento_ContatoOrigens',
  ['TELEFONE_NORMALIZADO','ID_ORIGEM','DATA_PRIMEIRA_IDENTIFICACAO',
   'DATA_ULTIMA_IDENTIFICACAO','QUANTIDADE_OCORRENCIAS']);
 const historico=v3_tabela_(b.marketing,'Relacionamento_Historico',
  ['ID_EVENTO','TELEFONE_NORMALIZADO','TIPO_EVENTO','DATA_HORA',
   'VALOR_ANTERIOR','VALOR_NOVO','DETALHE','USUARIO']);
 const inscritos=v3_tabela_(b.portal,'dgmbDesafios',
  ['ID_DGMB','Observacao','REF_MARKETING','Modalidade_Esportiva',
   'Status_Usuario_Desafio','Status_Desafio']);
 const refs=marketing.records.map(r=>v3_texto_(r.REF));
 const ok=[catalogo.items.length>0,marketing.records.length>0,contatos.records.length>0,
  inscritos.records.length>0,b.config.portalId!==b.config.marketingId,
  refs.every(r=>!!v3_ref_(r)),new Set(refs).size===refs.length,
  !!origens.sheet,!!vinculos.sheet,!!historico.sheet,catalogo.periodos.length>0];
 return {status:ok.every(Boolean)?'OK':'FALHA',ambiente:b.config.ambiente,
  edicao:b.config.edicao,verificacoes:ok.length,aprovadas:ok.filter(Boolean).length,
  totais:{desafios:catalogo.items.length,referencias:marketing.records.length,
   contatos:contatos.records.length,inscricoes:inscritos.records.length,
   origens:origens.records.length,vinculos:vinculos.records.length,
   eventosHistorico:historico.records.length}};
}

/**
 * Aceite das planilhas fictícias exclusivas da V3.
 * Não escreve nada e não aceita execução em produção.
 * O teste pressupõe as inscrições da demonstração dezembro/2026 e janeiro/2027.
 */
function v3_lab_aceite() {
 const config=v3_config_();
 if(config.ambiente!=='LAB')throw Error('Teste de aceite disponível somente no LAB.');
 const verificacoes=[];
 function verificar(nome,valor){verificacoes.push({nome:nome,ok:valor===true});}
 const opcoes=v3_opcoes();
 const dezembro=v3_painel('dezembro/2026','').dados;
 const janeiro=v3_painel('janeiro/2027','').dados;
 const esporteBike=v3_contatos({esporte:'CICLISMO',etapa:'TODOS'}).dados;
 const esportePassos=v3_contatos({esporte:'CAMINHADA_CORRIDA',etapa:'TODOS'}).dados;
 const contatos=v3_contatos({etapa:'TODOS'}).dados;
 verificar('Duas bases fictícias isoladas',config.marketingId===V3_IDS.LAB_MARKETING&&
  config.portalId===V3_IDS.LAB_PORTAL&&config.portalId!==config.marketingId);
 verificar('Dezembro contém duas campanhas genéricas',dezembro.desafios.length===2);
 verificar('Dezembro inclui inscrições antecipadas de novembro',dezembro.total===4);
 verificar('Dezembro possui REF conhecidas',dezembro.atribuido===4&&dezembro.direto===0);
 verificar('Primeiro desafio de dezembro tem duas inscrições',
  v3_painel('dezembro/2026','9001').dados.total===2);
 verificar('Segundo desafio de dezembro tem duas inscrições',
  v3_painel('dezembro/2026','9002').dados.total===2);
 verificar('Janeiro recebe inscrição feita em dezembro',janeiro.total===1);
 verificar('Desafio fora da competência retorna zero',
  v3_painel('dezembro/2026','9003').dados.total===0&&
  v3_painel('dezembro/2026','9003').dados.invalido===true);
 verificar('Quatro contatos fictícios',contatos.total===4);
 verificar('Contato não contatar permanece separado',
  contatos.indicadores.NAO_CONTATAR===1);
 verificar('Ciclismo inclui perfil ambos',esporteBike.total===2);
 verificar('Corrida/caminhada inclui perfil ambos',esportePassos.total===2);
 verificar('Referências de marketing fictícias ativas',opcoes.refAtivas.length===2);
 return {status:verificacoes.every(v=>v.ok)?'OK':'FALHA',
  ambiente:'LAB',verificacoes:verificacoes,
  aprovadas:verificacoes.filter(v=>v.ok).length,total:verificacoes.length};
}
