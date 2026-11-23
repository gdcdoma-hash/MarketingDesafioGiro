'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const marketingId = '1GGV-coN-1cNQ-0sxV-vAHFVqpfjGiKllzQEwyhGBq8Y';
const portalId = '1TpwNegLgeV9p8xDfpTUbnY9iUJdR8q1TQ6SBzHgimFY';
const phones = ['5598991234501','5598991234502','5598991234503','5598991234504'];
const fixture = {
  Marketing: [
    ['REF','ID_DGMB','NOME_ORIGEM','TIPO','STATUS'],
    ['LAB_TRANSMISSAO','','Equipe LAB Bike','CANAL_PROPRIO','ATIVO'],
    ['LAB_CORACAO','','Equipe LAB Corrida','CANAL_PROPRIO','ATIVO']
  ],
  Relacionamento_Contatos: [
    ['ID_DGMB','NOME_PORTAL','TELEFONE_NORMALIZADO'],
    ...phones.map((phone,i)=>['LAB0'+(i+1),
      ['Pessoa Teste Bike','Pessoa Teste Caminhada','Pessoa Teste Duas Modalidades','Pessoa Teste Nao Contatar'][i],phone])
  ],
  DadosPessoais: [
    ['ID_DGMB','nome','Cidade-UF','whatsapp'],
    ...phones.map((phone,i)=>['LAB0'+(i+1),'Pessoa Teste '+(i+1),'Cidade LAB - MA',phone])
  ],
  ListaDesafios: [
    ['id_Desafio_lista','Periodo','Nome_Desafio','Tipo'],
    ['9001','novembro/2026','Medalha Transmissão — LAB','Normal'],
    ['9002','novembro/2026','Medalha Coração — LAB','Normal']
  ],
  dgmbDesafios: [
    ['ID_DGMB','Observacao','Modalidade_Esportiva',
      'Status_Usuario_Desafio','Status_Desafio','REF_MARKETING'],
    ['LAB01','[ID_DESAFIO:9001]','CICLISMO','EM_ANDAMENTO','Ativo','LAB_TRANSMISSAO'],
    ['LAB02','[ID_DESAFIO:9002]','CAMINHADA_CORRIDA','EM_ANDAMENTO','Ativo','LAB_CORACAO'],
    ['LAB03','[ID_DESAFIO:9001]','CICLISMO','EM_ANDAMENTO','Ativo','LAB_TRANSMISSAO'],
    ['LAB03','[ID_DESAFIO:9002]','CAMINHADA_CORRIDA','EM_ANDAMENTO','Ativo','LAB_CORACAO']
  ]
};
const arquivo = name => fs.readFileSync(path.join(__dirname,'..',name), 'utf8');
function criarContexto(ambiente, dados=fixture) {
  const ss = (id,abas) => ({
    getId: () => id,
    getSheetByName(name) {
      const matriz = abas[name];
      return !matriz ? null : {
        getDataRange() { return { getDisplayValues() { return matriz; } }; }
      };
    }
  });
  const operacao=ss(marketingId,{
    Marketing:dados.Marketing,
    Relacionamento_Contatos:dados.Relacionamento_Contatos
  });
  const portal=ss(portalId,{
    DadosPessoais:dados.DadosPessoais,
    ListaDesafios:dados.ListaDesafios,
    dgmbDesafios:dados.dgmbDesafios
  });
  const ctx=vm.createContext({
    SpreadsheetApp:{openById(id){
      if(id===marketingId)return operacao;
      if(id===portalId)return portal;
      throw Error('ID inesperado em LAB');
    }},
    PropertiesService:{getScriptProperties(){return {getProperty(key) {
      if(key==='DG_AMBIENTE')return ambiente;
      if(key==='DG_MARKETING_SPREADSHEET_ID')return marketingId;
      if(key==='DG_PORTAL_SPREADSHEET_ID')return portalId;
      return '';
    }};}}
  });
  for (const file of ['Code.js','Planilhas.js','RelTelefoneNormalizer.js',
    'RelEsporteService.js','MarketingMultidesafios.js','LabAutoteste.js']) {
    vm.runInContext(arquivo(file),ctx,{filename:file});
  }
  return ctx;
}

const ctx=criarContexto('LAB');
const resultado=ctx.dg_lab_autoteste();
assert.equal(resultado.status,'OK',JSON.stringify(resultado.verificacoes));
assert.equal(resultado.verificacoes.length,16);
assert.equal(resultado.resumo.inscricoes,4);
assert.ok(resultado.verificacoes.every(x=>x.ok));
assert.equal(ctx.montarLinkDivulgacao_('LAB_TRANSMISSAO'), '');
assert.throws(()=>criarContexto('PROD').dg_lab_autoteste(),/exclusivamente/);

const contaminado=JSON.parse(JSON.stringify(fixture));
contaminado.Relacionamento_Contatos.push(['ATLETA_REAL','Joao Real','5598999876543']);
const falha=criarContexto('LAB',contaminado).dg_lab_autoteste();
assert.equal(falha.status,'FALHA');
assert.ok(falha.verificacoes.some(x=>!x.ok));
assert.equal(JSON.stringify(falha).includes('Joao Real'),false,
  'O relatório de falha não deve expor nomes');
console.log('OK: diagnóstico LAB sem dados pessoais e sem links de produção.');
