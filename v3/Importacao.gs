/**
 * Importação V3 independente da navegação.
 * Prévia não grava; confirmação só adiciona números que ainda não existem.
 */
function v3_importacaoPreparar_(dados,book){
 const list=dados&&dados.registros;
 if(!Array.isArray(list)||list.length<1||list.length>300)
  throw Error('Selecione entre 1 e 300 contatos por lote.');
 const tab=v3_tabela_(book,'Relacionamento_Contatos',
   ['TELEFONE_NORMALIZADO','NOME_CONTATO','ETAPA','SITUACAO']);
 const existentes=new Set(tab.records.map(r=>v3_fone_(r.TELEFONE_NORMALIZADO)));
 const locais=new Set(),novos=[],erros=[],repetidos=[],validos=[];
 list.forEach((r,idx)=>{
  const tel=v3_fone_(r&&r.telefone);
  const nome=v3_texto_(r&&r.nome),cidade=v3_texto_(r&&r.cidade);
  const uf=v3_texto_(r&&r.uf).toUpperCase();
  if(!tel||nome.length>120||cidade.length>120||(uf&&!/^[A-Z]{2}$/.test(uf))){
   erros.push(idx+1);return;
  }
  if(locais.has(tel)){repetidos.push(idx+1);return;}
  locais.add(tel);const contato={telefone:tel,nome:nome,cidade:cidade,uf:uf};validos.push(contato);
  if(existentes.has(tel)){repetidos.push(idx+1);return;}novos.push(contato);
 });
 return {tab:tab,novos:novos,validos:validos,erros:erros,repetidos:repetidos,total:list.length};
}
function v3_importacaoVinculos_(book,origem,validos){
 if(!origem)return {tabela:null,novos:[]};
 const o=v3_tabela_(book,'Relacionamento_Origens',['ID_ORIGEM','STATUS']);
 if(!o.records.some(x=>x.ID_ORIGEM===origem&&x.STATUS==='ATIVO'))throw Error('Origem não está ativa.');
 const tabela=v3_tabela_(book,'Relacionamento_ContatoOrigens',['TELEFONE_NORMALIZADO','ID_ORIGEM','DATA_PRIMEIRA_IDENTIFICACAO','DATA_ULTIMA_IDENTIFICACAO','QUANTIDADE_OCORRENCIAS']);
 const existentes=new Set(tabela.records.filter(x=>x.ID_ORIGEM===origem).map(x=>v3_fone_(x.TELEFONE_NORMALIZADO)));
 return {tabela:tabela,novos:validos.filter(c=>!existentes.has(c.telefone))};
}
function v3_analisarImportacao(dados){
 const book=v3_bases_().marketing;
 const p=v3_importacaoPreparar_(dados,book);
 const v=v3_importacaoVinculos_(book,v3_texto_(dados.origemId),p.validos);
 return v3_resposta_('OK',{total:p.total,novos:p.novos.length,novosVinculos:v.novos.length,
  repetidos:p.repetidos.length,invalidos:p.erros.length,
  linhasInvalidas:p.erros.slice(0,15)});
}
function v3_confirmarImportacao(dados){
 v3_escrita_();
 return v3_lock_(()=>{
  // O LAB pode examinar um arquivo, mas não receber cadastros reais.
  // A validação é obrigatória também no servidor, independentemente da interface.
  if(v3_config_().ambiente==='LAB'){
   const registros=dados&&dados.registros;
   const falsos=Array.isArray(registros)&&registros.length>0&&registros.every(c=>
    /^(LAB|TESTE)(?:[\s_-]|$)/.test(v3_normal_(c&&c.nome)));
   if(dados.confirmarFicticio!==true||!falsos)
    throw Error('LAB aceita somente contatos fictícios com nome iniciado por LAB ou TESTE.');
  }
  const book=v3_bases_().marketing,p=v3_importacaoPreparar_(dados,book);
  if(p.erros.length)throw Error('Corrija os telefones ou campos inválidos antes de importar.');
  const origem=v3_texto_(dados.origemId);
  const plano=v3_importacaoVinculos_(book,origem,p.validos),vinculos=plano.tabela;
  const tab=p.tab,agora=new Date();
  const linhas=p.novos.map(c=>{
   const vals={TELEFONE_NORMALIZADO:c.telefone,TELEFONE_EXIBICAO:c.telefone,
    NOME_CONTATO:v3_seguroCelula_(c.nome),CIDADE:v3_seguroCelula_(c.cidade),
    UF:c.uf,ETAPA:'PARA_CONTATAR',SITUACAO:'NAO_CLASSIFICADO',
    E_CICLISTA:'NAO_CONFIRMADO',MODALIDADE:'NAO_INFORMADO',
    DATA_PRIMEIRA_IMPORTACAO:agora,DATA_ULTIMA_IMPORTACAO:agora,ATUALIZADO_EM:agora};
   return tab.header.map(h=>Object.prototype.hasOwnProperty.call(vals,h)?vals[h]:'');
  });
  const inicioContatos=linhas.length?v3_prepararEspaco_(tab.sheet,linhas.length):0;
  const inicioVinculos=plano.novos.length?v3_prepararEspaco_(vinculos.sheet,plano.novos.length):0;
  if(linhas.length)tab.sheet.getRange(inicioContatos,1,linhas.length,tab.header.length).setValues(linhas);
  if(plano.novos.length){
   const novos=plano.novos.map(c=>{
    const vals={TELEFONE_NORMALIZADO:c.telefone,ID_ORIGEM:origem,DATA_PRIMEIRA_IDENTIFICACAO:agora,DATA_ULTIMA_IDENTIFICACAO:agora,QUANTIDADE_OCORRENCIAS:1};
    return vinculos.header.map(h=>Object.prototype.hasOwnProperty.call(vals,h)?vals[h]:'');
   });
   vinculos.sheet.getRange(inicioVinculos,1,novos.length,vinculos.header.length).setValues(novos);
  }
  return v3_resposta_('OK',{gravados:linhas.length,repetidos:p.repetidos.length,novosVinculos:plano.novos.length},
   linhas.length+' contato(s) adicionados; '+plano.novos.length+' vínculos novos. Cadastros anteriores preservados.');
 });
}
function v3_vincularOrigem(dados){
 v3_escrita_();
 return v3_lock_(()=>{
  const phone=v3_fone_(dados&&dados.telefone),origem=v3_texto_(dados&&dados.origemId);
  const b=v3_bases_().marketing;
  const contatos=v3_tabela_(b,'Relacionamento_Contatos',['TELEFONE_NORMALIZADO']);
  const origens=v3_tabela_(b,'Relacionamento_Origens',['ID_ORIGEM','STATUS']);
  const vinc=v3_tabela_(b,'Relacionamento_ContatoOrigens',
    ['TELEFONE_NORMALIZADO','ID_ORIGEM','DATA_PRIMEIRA_IDENTIFICACAO',
     'DATA_ULTIMA_IDENTIFICACAO','QUANTIDADE_OCORRENCIAS']);
  if(!contatos.records.some(x=>v3_fone_(x.TELEFONE_NORMALIZADO)===phone))throw Error('Contato não encontrado.');
  if(!origens.records.some(x=>x.ID_ORIGEM===origem&&x.STATUS==='ATIVO'))throw Error('Origem inválida.');
  if(vinc.records.some(x=>v3_fone_(x.TELEFONE_NORMALIZADO)===phone&&x.ID_ORIGEM===origem))
   return v3_resposta_('OK',{},'Origem já vinculada.');
  const agora=new Date();
  const vals={TELEFONE_NORMALIZADO:phone,ID_ORIGEM:origem,
   DATA_PRIMEIRA_IDENTIFICACAO:agora,DATA_ULTIMA_IDENTIFICACAO:agora,QUANTIDADE_OCORRENCIAS:1};
  vinc.sheet.appendRow(vinc.header.map(h=>Object.prototype.hasOwnProperty.call(vals,h)?vals[h]:''));
  return v3_resposta_('OK',{},'Origem vinculada.');
 });
}
function v3_historicoContato(telefone){
 const phone=v3_fone_(telefone);if(!phone)throw Error('Telefone inválido.');
 const book=v3_bases_().marketing;
 const t=v3_tabela_(book,'Relacionamento_Historico',
   ['TELEFONE_NORMALIZADO','TIPO_EVENTO','DATA_HORA','VALOR_ANTERIOR','VALOR_NOVO']);
 return v3_resposta_('OK',{eventos:t.records
  .filter(x=>v3_fone_(x.TELEFONE_NORMALIZADO)===phone)
  .slice(-25).reverse().map(x=>({
   tipo:x.TIPO_EVENTO,quando:x.DATA_HORA,antes:x.VALOR_ANTERIOR,depois:x.VALOR_NOVO
  }))});
}
