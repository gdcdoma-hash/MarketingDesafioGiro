# Operadores do módulo de Relacionamento

## Armazenamento

O cadastro fica em `ScriptProperties`, na propriedade
`RELACIONAMENTO_OPERADORES_V1`. O valor é um JSON indexado pelo ID interno:

```json
{
  "operador_001": {
    "id": "operador_001",
    "nome": "Nome administrativo",
    "chaveHash": "impressão SHA-256 em Base64 URL-safe",
    "ativo": true
  }
}
```

Somente a impressão digital SHA-256 é persistida. A chave bruta não é salva,
registrada em log ou retornada pelas funções administrativas.

## Provisionamento manual no editor do Apps Script

Gere uma chave aleatória de pelo menos 32 caracteres em um gerenciador de
senhas. Não coloque a chave no Git. No editor GAS, execute manualmente:

```javascript
rel_acesso_cadastrarOperador_('operador_001', 'Nome administrativo', CHAVE_SEGURA)
```

A função recusa ID duplicado e chave já associada a outro operador.

Para desativar ou reativar:

```javascript
rel_acesso_alterarStatusOperador_('operador_001', false)
rel_acesso_alterarStatusOperador_('operador_001', true)
```

Para substituir uma chave comprometida:

```javascript
rel_acesso_substituirChaveOperador_('operador_001', NOVA_CHAVE_SEGURA)
```

A chave antiga deixa de validar imediatamente após a substituição.

## Uso

O operador abre `?area=contatos&acesso=CHAVE_SEGURA`. A rota valida a chave no
servidor. O frontend mantém a chave somente em memória para anexá-la às RPCs do
módulo; não usa `localStorage`, cookies, planilhas ou arquivos temporários.

Todas as funções públicas de `RelApiServer.js` repetem a validação no servidor.
O ID do operador é sempre derivado da chave validada, nunca de um ID informado
pelo navegador.
