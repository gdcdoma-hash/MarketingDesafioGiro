# Propriedade das prévias do Google Contatos

## Fluxo de autenticação

As operações públicas de pré-análise, confirmação e cancelamento recebem a chave
`acesso` pelo cliente já existente. `rel_api_executar_` valida essa chave no
servidor por meio de `rel_acesso_exigirOperador_` e repassa às funções internas
somente o objeto do operador validado. O proprietário persistido é exclusivamente
o `operador.id` estável; nome, chave, hash da chave e e-mail de sessão não são
usados nem armazenados na prévia.

Não existe parâmetro público de proprietário. Um eventual `proprietarioId`
incluído nos dados enviados pelo navegador não participa da autenticação e é
ignorado.

## Formato persistido

O formato anterior usava `usuario: "email:..."` nos metadados de
`ScriptProperties` e no JSON temporário do Drive, sem versão explícita.

O formato 2 usa os mesmos campos operacionais já existentes e acrescenta a
identificação de propriedade abaixo em ambas as fontes:

```json
{
  "versao": 2,
  "modulo": "REL_GOOGLE_CONTATOS",
  "proprietarioTipo": "OPERADOR_RELACIONAMENTO",
  "proprietarioId": "operador_001",
  "criadoEm": 0,
  "token": "...",
  "expiraEm": 0,
  "utilizado": false
}
```

Os metadados também mantêm `fileId` e `nomeArquivo`. O JSON mantém os dados da
análise (`porTelefone`, `resumo` e `conflitos`). Nenhuma das duas fontes recebe a
chave de acesso, sua impressão digital ou o e-mail da sessão.

## Validação e compatibilidade

`rel_google_contatos_validarPrevia_` centraliza a validação. Ela exige versão 2,
módulo e tipo de proprietário esperados, ID não vazio e igualdade exata entre o
operador autenticado, os metadados e o JSON. As verificações existentes de token,
arquivo, nome, expiração, uso único e integridade do conteúdo permanecem ativas.

Prévia antiga, sem proprietário ou com propriedade divergente é recusada. Ela
não é migrada, atribuída ao operador atual nem apagada por essa decisão; o usuário
deve gerar uma nova prévia. A rotina geral de limpeza de temporários não foi
alterada nesta missão.

## Assinaturas internas

- `rel_google_contatos_preAnalisar_(dados)` passou a receber `(dados, operador)`.
- `rel_google_contatos_confirmar_(dados)` passou a receber `(dados, operador)`.
- `rel_google_contatos_cancelarPrevia_(dados)` passou a receber `(dados, operador)`.
- `rel_google_contatos_validarPrevia_(token, usuarioAtual)` passou a receber
  `(token, operadorId)`.

As assinaturas públicas continuam `(dados, acesso)`. Apenas os três adaptadores
em `RelApiServer.js` foram ajustados para encaminhar o operador validado; os
chamadores do navegador não mudaram.

## Validação manual pendente no GAS/Web App

1. Cadastre ou use dois operadores de teste ativos, com chaves distintas.
2. Acesse o Relacionamento como operador 1 e crie uma prévia; espere sucesso e
   anote somente o token retornado.
3. Acesse como operador 2 e tente consultar/validar, confirmar e cancelar o token
   do operador 1; espere recusa em todas as tentativas, sem dados retornados e sem
   descarte do arquivo.
4. Crie uma prévia do operador 2; espere que cada operador opere somente a sua.
5. Confirme cada prévia pelo respectivo proprietário; espere o fluxo normal.
6. Tente as operações com chave inválida e sem chave; espere recusa no servidor.
7. Desative um proprietário e repita; espere recusa mesmo para a própria prévia.
8. Substitua a chave do operador sem mudar seu ID; espere que a chave nova acesse
   a prévia existente e que a chave antiga seja recusada.
9. Tente usar uma prévia antiga baseada em e-mail, se existir; espere orientação
   para gerar uma nova, sem migração ou exclusão automática.
10. Inspecione `ScriptProperties`, JSON, planilhas e logs; espere ausência de chave,
    hash e e-mail de sessão nos dados de propriedade.
11. Verifique que o fluxo funciona com e-mail de sessão vazio; espere identidade
    derivada normalmente da chave validada e do ID do operador.
12. Abra o módulo de Divulgadores, busque um atleta, identifique um divulgador e
    copie o link; espere o comportamento anterior sem bloqueio novo.
13. Confira os registros de execução do GAS; espere ausência de segredos e de
    erros inesperados.

**Teste de isolamento das prévias pendente no ambiente Google Apps Script/Web App.**
