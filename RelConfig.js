const REL_CONFIG = Object.freeze({
  ABAS: Object.freeze({
    CONTATOS: Object.freeze({
      NOME: 'Relacionamento_Contatos',
      CABECALHOS: Object.freeze([
        'TELEFONE_NORMALIZADO',
        'TELEFONE_EXIBICAO',
        'ID_DGMB',
        'NOME_PORTAL',
        'NOME_CONTATO',
        'CIDADE_UF_PORTAL',
        'CIDADE',
        'UF',
        'ETAPA',
        'RESULTADO',
        'VALIDADE',
        'E_CICLISTA',
        'MODALIDADE',
        'DATA_PRIMEIRA_IMPORTACAO',
        'DATA_ULTIMA_IMPORTACAO',
        'DATA_ANALISE',
        'DATA_PRIMEIRA_MENSAGEM',
        'DATA_ULTIMA_INTERACAO',
        'DATA_PROXIMO_RETORNO',
        'QUANTIDADE_TENTATIVAS',
        'EXPORTACAO_GOOGLE_STATUS',
        'DATA_ULTIMA_EXPORTACAO',
        'OBSERVACAO',
        'ATUALIZADO_EM',
        'NOME_GOOGLE_CONTATOS',
        'SITUACAO'
      ])
    }),
    ORIGENS: Object.freeze({
      NOME: 'Relacionamento_Origens',
      CABECALHOS: Object.freeze([
        'ID_ORIGEM',
        'NOME_ORIGEM',
        'TIPO_ORIGEM',
        'STATUS',
        'DATA_CADASTRO',
        'OBSERVACAO'
      ])
    }),
    CONTATO_ORIGENS: Object.freeze({
      NOME: 'Relacionamento_ContatoOrigens',
      CABECALHOS: Object.freeze([
        'TELEFONE_NORMALIZADO',
        'ID_ORIGEM',
        'DATA_PRIMEIRA_IDENTIFICACAO',
        'DATA_ULTIMA_IDENTIFICACAO',
        'QUANTIDADE_OCORRENCIAS'
      ])
    }),
    HISTORICO: Object.freeze({
      NOME: 'Relacionamento_Historico',
      CABECALHOS: Object.freeze([
        'ID_EVENTO',
        'TELEFONE_NORMALIZADO',
        'TIPO_EVENTO',
        'DATA_HORA',
        'VALOR_ANTERIOR',
        'VALOR_NOVO',
        'DETALHE',
        'USUARIO'
      ])
    }),
    CIDADES: Object.freeze({
      NOME: 'Relacionamento_Cidades',
      CABECALHOS: Object.freeze([
        'UF',
        'REGIAO',
        'CIDADE',
        'CIDADE_NORMALIZADA',
        'ORIGEM_CADASTRO',
        'STATUS',
        'DATA_CADASTRO'
      ])
    })
  }),
  ENUMS: Object.freeze({
    ETAPA: Object.freeze([
      'PARA_CONTATAR',
      'AGUARDANDO_RESPOSTA',
      'EM_CONVERSA',
      'RETORNAR_DEPOIS',
      'FINALIZADO',
      'NAO_CONTATAR'
    ]),
    RESULTADO: Object.freeze([
      'NAO_DEFINIDO',
      'CONVITE_ENVIADO',
      'INTERESSADO',
      'INSCRITO',
      'SEM_INTERESSE',
      'NAO_CONTATAR'
    ]),
    VALIDADE: Object.freeze(['VALIDO', 'INVALIDO']),
    E_CICLISTA: Object.freeze(['SIM', 'NAO', 'NAO_CONFIRMADO']),
    MODALIDADE: Object.freeze([
      'MTB',
      'SPEED',
      'GRAVEL',
      'URBANO',
      'MULTIPLAS',
      'NAO_INFORMADO'
    ]),
    EXPORTACAO_GOOGLE_STATUS: Object.freeze([
      'NAO_PREPARADO',
      'PENDENTE',
      'EXPORTADO',
      'ATUALIZAR'
    ]),
    SITUACAO: Object.freeze([
      'NAO_CLASSIFICADO',
      'PODE_CONTATAR',
      'NAO_FAZ_DESAFIO',
      'NAO_E_CICLISTA',
      'SEM_INTERESSE',
      'NAO_DESEJA_CONTATO',
      'CONTATO_INADEQUADO',
      'OUTRO'
    ]),
    TIPO_ORIGEM: Object.freeze([
      'GRUPO_WHATSAPP',
      'LOJA',
      'EVENTO',
      'LISTA_MANUAL',
      'OUTRO'
    ]),
    STATUS: Object.freeze(['ATIVO', 'INATIVO'])
  })
});
