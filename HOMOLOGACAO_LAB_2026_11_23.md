# Homologação LAB — Marketing e Relacionamento — 23/11/2026

## Escopo e limites

A **PR #50 é de desenvolvimento, não de implantação**. O Google Apps Script de produção e o portal não foram alterados. O acesso às planilhas de produção permanece como era no deployment já existente, mesmo que o manifesto novo declare `MYSELF`.

Há **duas planilhas nativas separadas com dados integralmente fictícios** na pasta:
- Pasta LAB: https://drive.google.com/drive/folders/1RU6dJrNZjtbfXjVxcckZwWGPBiMzT7VE
- Marketing LAB: https://docs.google.com/spreadsheets/d/1GGV-coN-1cNQ-0sxV-vAHFVqpfjGiKllzQEwyhGBq8Y/edit
- Portal LAB: https://docs.google.com/spreadsheets/d/1TpwNegLgeV9p8xDfpTUbnY9iUJdR8q1TQ6SBzHgimFY/edit

A planilha de Marketing LAB tem `Marketing` e as cinco abas `Relacionamento_*` esperadas. A planilha Portal LAB tem `DadosPessoais`, `ListaDesafios`, `dgmbDesafios`. As inscrições simuladas estão marcadas em `9001` (Transmissão) e `9002` (Coração): **são IDs estritamente fictícios**, nunca use em páginas públicas.

## Preparar projeto Apps Script separado

1. Criar um **novo** projeto Apps Script **LAB** na conta responsável pela implantação. **Não reutilizar nem editar o projeto Apps Script da produção**. Verificar que é um projeto distinto (outro `scriptId`).
2. Copiar os arquivos do commit validado desta PR #50 para o projeto LAB por `clasp`, com a configuração do **novo projeto**. O `.clasp.json` já versionado no repositório contém uma vinculação de produção; **jamais executar `clasp push` com ele sem substituí-lo pelo script ID novo**. Não registrar tokens no GitHub.
3. Configurar **Script Properties** no novo projeto:
   - `DG_AMBIENTE = LAB`
   - `DG_MARKETING_SPREADSHEET_ID = 1GGV-coN-1cNQ-0sxV-vAHFVqpfjGiKllzQEwyhGBq8Y`
   - `DG_PORTAL_SPREADSHEET_ID = 1TpwNegLgeV9p8xDfpTUbnY9iUJdR8q1TQ6SBzHgimFY`
4. Implantar o **novo projeto** como Web App `executeAs: USER_DEPLOYING`, `access: MYSELF` (somente proprietário), sem permitir incorporação por sites terceiros. Não tornar público; não criar deploy em produção.
5. Verificar `?area=contatos` (banner amarelo **AMBIENTE LAB**; abrir WhatsApp bloqueado) e `?area=divulgadores`. Verificar que o endpoint administrativo não abre em janela anônima de um usuário não autorizado; o diagnóstico `?diagnostico=acesso` sozinho não valida controle de autorização.
6. Executar `rel_auditarEstrutura()` (esperado: cinco estruturas de relacionamento OK), `testarConexaoMarketing()` (somente bases LAB). Conferir identificação de perfis: LAB01 ciclismo, LAB02 caminhada, LAB03 ambos, LAB04 não contatar. Confirmar que nenhum nome ou telefone real aparece.
7. Conferir ranking e filtros com referências `LAB_TRANSMISSAO` e `LAB_CORACAO`; verificar a atribuição de inscrições conforme os IDs de desafio fictícios 9001 e 9002. Alterações de etapa, situação, origem ou importação somente na planilha LAB.
8. Para a **REF pública**, a PR https://github.com/gdcdoma-hash/desafiogiro/pull/190 corrige a preservação de `?ref=...` nas landing pages. Ela também é **draft**. O teste unitário passa sem abrir inscrições reais. Uma homologação ponta a ponta com o Portal real requer ambiente de inscrição separado; **não criar inscrição fictícia na planilha de produção**.

## Bloqueios de segurança

- Sem `DG_AMBIENTE`, qualquer função do novo módulo que abra planilha falha fechada.
- Com `DG_AMBIENTE=LAB`, a configuração exige duas planilhas de teste diferentes e rejeita IDs fixos das bases oficiais. Não substituir esses IDs por planilhas com cópias de contatos reais.
- No LAB a interface do Relacionamento não abre `wa.me`. O módulo não deve disparar mensagens nem pagamentos.
- No LAB o link genérico de divulgação aponta ao Portal público por compatibilidade; **não usar links de teste para inscrições reais**. Testar apenas a montagem de URLs com fixtures.
- Controle de acesso efetivo depende do **deployment criado no Apps Script**, não apenas do manifesto em GitHub. Os métodos remotos são server-side; acesso anônimo na produção histórica precisa ser auditado em sua implantação atual.
- A propriedade `DG_AMBIENTE=PROD` foi tornada explícita e deve ser configurada numa implantação nova somente após revisão operacional.

## Evidências automatizadas

- PR #50: https://github.com/gdcdoma-hash/MarketingDesafioGiro/pull/50
- CI Marketing: ver execução de GitHub Actions do commit HEAD.
- PR #190 landing pages: https://github.com/gdcdoma-hash/desafiogiro/pull/190
- CI landing de REF: https://github.com/gdcdoma-hash/desafiogiro/actions/runs/45173930527

**Estado desta missão:** bases LAB reais (nativas e separadas) criadas e verificadas com dados fictícios; código pronto no GitHub; nenhuma implantação do Apps Script LAB foi feita por falta de ferramenta para criar/configurar projetos Apps Script autenticados. Não marcar como homologação funcional concluída até a execução dentro de um projeto LAB distinto.
