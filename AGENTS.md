# MARKETING DESAFIO GIRO — CONTEXTO DO PROJETO

> **Estado operacional validado em 23/11/2026:** Este projeto tem **planilha independente**
> `MarketingContatoRelacionamento` (ID `1znhdMCmPsMZ6viMJtWl2wXg3G7yWh-0Xu0M8IcJ-9ao`).
> Sua aba `Marketing` contém `REF`, `ID_DGMB`, `NOME_ORIGEM`, `TIPO`, `STATUS`.
> As abas `Relacionamento_*` guardam os contatos, as origens e os históricos.
> O Portal Giro é apenas **fonte consultada**, pela planilha de produção
> `DGMB_PROD_FINAL_20260929_141812` (ID `1h9Rlk5WbsuuaJLPcmSd6CpglP23XkhXY1bo9dON2stQ`)
> configurável pela propriedade `DG_PORTAL_SPREADSHEET_ID`.
> As consultas a `DadosPessoais`, `dgmbDesafios` e `ListaDesafios`
> **não devem gravar** no Portal. A gravação da REF em `dgmbDesafios.REF_MARKETING`
> acontece exclusivamente no **fluxo de inscrição do Portal Giro**.
> Não migrar planilhas. Campanhas seguintes: Medalha **Transmissão** (pedalada,
> duas etapas) e **Coração** (corrida/caminhada, uma etapa). Selim/50 km não
> tiveram divulgação operacional por este mini sistema.
> Não publicar o módulo Relacionamento com acesso anônimo; para o painel
> administrativo a configuração segura proposta é `webapp.access = MYSELF`.
> Consultar `REATIVACAO_MARKETING_RELACIONAMENTO_2026_11_23.md` antes do deploy.
>

## OBJETIVO

Este projeto é um mini sistema auxiliar de marketing do Desafio Giro.

Ele serve para:

- cadastrar divulgadores;
- gerar/copiar links com REF;
- medir origem das inscrições;
- acompanhar métricas por período;
- identificar quais pessoas e canais geram mais inscrições.

Este projeto NÃO é o sistema principal de inscrições.

O Portal Giro continua sendo um projeto separado.

---

## TECNOLOGIAS

- Google Apps Script
- Google Sheets
- HTML
- CSS
- JavaScript
- GitHub
- Clasp

---

## PLANILHA

**Planilha independente para gravações:** `MarketingContatoRelacionamento` (`1znhdMCmPsMZ6viMJtWl2wXg3G7yWh-0Xu0M8IcJ-9ao`).

**Planilha consultada (Portal produção):** `DGMB_PROD_FINAL_20260929_141812` (`1h9Rlk5WbsuuaJLPcmSd6CpglP23XkhXY1bo9dON2stQ`).

O ID anterior `18UCv96cqQMShaSabAhnX0AOLILAOcujCj-yBLUT1eJs` não deve ser usado como fonte atual de inscrições.

Abas utilizadas:

### Marketing

Cadastro das origens/divulgadores.

Colunas atuais:

- REF
- ID_DGMB
- NOME_ORIGEM
- TIPO
- STATUS

### DadosPessoais

Dados dos participantes.

Campos utilizados:

- ID_DGMB
- nome
- Cidade-UF
- whatsapp

### dgmbDesafios

Base das inscrições.

Campos utilizados:

- ID_DGMB
- Observacao
- REF_MARKETING

O ID do desafio atualmente é obtido de Observacao.

Exemplo:

[ID_DESAFIO:150]

### ListaDesafios

Usada para descobrir o período da inscrição.

Campos utilizados:

- id_Desafio_lista
- Periodo

Exemplo:

150 → agosto/2026

---

## REF_MARKETING

O código do Portal Giro inclui a gravação de REF_MARKETING na inscrição; é obrigatória homologação ponta a ponta com link `?ref=CODIGO` no LAB antes de considerar a atribuição validada.

Exemplo:

URL:

...?ref=1145

Resultado em dgmbDesafios:

REF_MARKETING = 1145

REF pode ser:

- ID_DGMB de pessoa;
- INSTAGRAM;
- GRUPO_OFICIAL;
- WHATSAPP;
- outro código de origem.

O mini sistema MarketingDesafioGiro grava seus códigos de referência na aba `Marketing` da planilha própria e consulta `REF_MARKETING` no Portal. Não grava dados de inscrição no Portal.

---

## TIPOS DE ORIGEM

Valores atuais:

- ADMIN
- PARTICIPANTE
- APOIADOR
- GRUPO
- CANAL_PROPRIO

Exemplo:

Adriana:
REF = ID_DGMB dela
TIPO = ADMIN

João:
REF = ID_DGMB dele
TIPO = ADMIN

Mesmo tipo, mas métricas individuais separadas.

---

## INTERFACE

O sistema é mobile-first.

Arquivos:

### Code.js
Backend GAS, leitura da planilha e métricas.

### Index.html
Estrutura principal da interface.

### Styles.html
Todo CSS.

### Scripts.html
JavaScript do frontend.

Manter essa separação.

Não colocar CSS ou JavaScript grande dentro de Index.html.

---

## FUNCIONALIDADES JÁ EXISTENTES

- leitura das abas da planilha;
- métricas por período;
- meta de inscrições;
- total com origem;
- total direto/sem REF;
- ranking de origens;
- listagem de divulgadores;
- copiar link;
- cadastro de divulgador;
- busca por nome ou ID_DGMB;
- identificação automática de nome/cidade/WhatsApp via DadosPessoais;
- prevenção de cadastro duplicado.

---

## DIRETRIZ PRINCIPAL

Este projeto deve permanecer simples.

NÃO transformar em:

- CRM;
- ERP;
- sistema de afiliados;
- sistema de comissão;
- automação de WhatsApp;
- plataforma de influenciadores;
- novo sistema de inscrições.

Priorizar:

- poucos arquivos;
- poucas funções;
- poucos campos;
- mobile-first;
- baixo acoplamento;
- mudanças localizadas;
- preservar o que já funciona.

---

## REGRAS DE DESENVOLVIMENTO

1. Não refatorar código funcionando sem necessidade.
2. Não aumentar escopo de uma missão.
3. Não alterar Portal Giro neste repositório.
4. Não alterar estrutura das abas principais sem autorização.
5. Não inventar novas abas sem necessidade.
6. Não alterar nomes de cabeçalhos existentes.
7. Não usar posições fixas de coluna quando houver cabeçalho disponível.
8. Preservar funcionamento mobile.
9. Não iniciar outra funcionalidade dentro da mesma missão.
10. Antes de alterar arquitetura, explicar e aguardar aprovação.

---

## FLUXO DE TRABALHO

Fluxo esperado:

Codex implementa
↓
gera diff
↓
ChatGPT revisa
↓
se aprovado:
PR
↓
merge
↓
git pull
↓
clasp push
↓
teste

Nunca pular a revisão do diff.

Não fazer merge automaticamente.
Não executar clasp push sem aprovação.