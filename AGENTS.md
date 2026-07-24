# MARKETING DESAFIO GIRO — CONTEXTO DO PROJETO

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

ID da planilha:

18UCv96cqQMShaSabAhnX0AOLILAOcujCj-yBLUT1eJs

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

O Portal Giro já grava REF_MARKETING na inscrição.

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

O mini sistema MarketingDesafioGiro apenas lê essa informação.

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