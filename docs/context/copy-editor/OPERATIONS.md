# Copy Editor - Operacao, Testes e Diagnostico

## Comandos locais

Instalacao:

```bash
npm ci
```

Dev server:

```bash
npm run dev
```

Build:

```bash
npm run build
```

Lint:

```bash
npm run lint
```

Gate antes de push/deploy:

```bash
npm run gate:prepush
```

## Variaveis necessarias

Frontend:

| Variavel | Uso |
| --- | --- |
| `VITE_SUPABASE_URL` | Base das Edge Functions e Supabase Auth |
| `VITE_SUPABASE_ANON_KEY` | `apikey` e cliente Auth no browser |
| `VITE_DASHBOARD_URL` | Base canonica de callbacks de Auth |

Edge Functions:

| Variavel | Uso |
| --- | --- |
| `SUPABASE_URL` | Runtime Deno |
| `SUPABASE_SERVICE_ROLE_KEY` | Leitura/escrita privilegiada no backend |
| `SUPABASE_ANON_KEY` | Validacao de JWT em helpers de Auth quando aplicavel |

## Deploy de Edge Functions

Leitura publica:

```bash
supabase functions deploy get-onboarding-copy --project-ref awqtzoefutnfmnbomujt --no-verify-jwt
```

Publicacao admin:

```bash
supabase functions deploy update-onboarding-copy --project-ref awqtzoefutnfmnbomujt
```

Confirmar na saida do CLI:

```text
Deployed Functions on project
```

## Smoke test manual

1. Rodar `npm run dev`.
2. Entrar com usuario `admin`.
3. Acessar `/copy-editor`.
4. Selecionar `Etapa 1`.
5. Alterar um texto simples.
6. Confirmar badge de etapa editada.
7. Acionar `Comparar` e conferir diff.
8. Publicar com nota curta.
9. Recarregar `/copy-editor`.
10. Confirmar que o texto publicado continua carregado.
11. Abrir onboarding publico com `compra_id` elegivel.
12. Confirmar que o texto publicado aparece no fluxo publico.

## Smoke test de seguranca

1. Sem login, acessar `/copy-editor`.
2. Deve redirecionar para `/login?next=/copy-editor`.
3. Com usuario sem role `admin`, acessar `/copy-editor`.
4. Deve bloquear no frontend via `RequireRole`.
5. Chamar `update-onboarding-copy` sem bearer token.
6. Deve retornar 401.
7. Chamar `update-onboarding-copy` com usuario sem role `admin`.
8. Deve retornar 403.

## Consultas de diagnostico

Ver singleton:

```sql
select version, published_by, updated_at, content
from onboarding_copy
limit 1;
```

Ver historico recente:

```sql
select version, changed_etapas, published_by, notes, created_at
from onboarding_copy_versions
order by version desc
limit 10;
```

Ver permissao de usuario:

```sql
select p.id, p.email, p.status, r.role
from profiles p
left join user_roles r on r.user_id = p.id
where p.email = '<email>';
```

## Sintomas comuns

### Texto aparece no editor mas some depois do reload

Possiveis causas:

- Publicacao falhou e estado estava apenas local.
- `update-onboarding-copy` nao fez merge com `content` existente.
- Usuario nao era `admin` e recebeu erro de RBAC.
- Edge Function errada foi deployada com codigo antigo.

Verificar:

1. Console do browser.
2. Network da chamada `update-onboarding-copy`.
3. `onboarding_copy.version`.
4. Ultima linha de `onboarding_copy_versions`.

### Texto aparece no editor, mas nao no onboarding publico

Possiveis causas:

- `CopyProvider` falhou ao buscar `get-onboarding-copy`.
- `VITE_SUPABASE_URL` ausente/incorreta.
- Override salvo em path diferente do usado pela etapa publica.
- Campo publico usa funcao de `copy.js`, que nao e substituida pelo banco.
- Cache/local state do navegador ainda nao recarregou.

Verificar:

1. Response de `get-onboarding-copy`.
2. `src/context/CopyContext.jsx`.
3. `src/lib/deep-merge.js`.
4. Componente publico `src/pages/Etapa*.jsx`.

### Publicar retorna 401

Possiveis causas:

- Sessao expirada.
- `adminFetch` nao conseguiu refresh.
- Env `VITE_SUPABASE_ANON_KEY` ausente.
- Function deployada com modo de JWT incorreto.

Acao:

- Fazer logout/login.
- Confirmar envs.
- Conferir deploy sem `--no-verify-jwt` para `update-onboarding-copy`.

### Publicar retorna 403

Possiveis causas:

- Usuario nao tem role `admin`.
- `profiles.status` nao esta `active`.
- `user_roles` ausente para o usuario.

Acao:

- Corrigir usuario pelo fluxo de user management, respeitando as regras de RBAC.

### Campo nao e editavel no preview

Possiveis causas:

- Preview da etapa nao usa `EditableText`, `EditableList` ou `EditableObjectList`
  naquele campo.
- Campo e funcao em `src/copy.js`.
- Campo existe no schema legado `EtapaSection`, mas nao no preview ativo.

Acao:

- Alterar o preview ativo em `src/pages/CopyEditor/previews/*`.
- Se necessario, refatorar `src/copy.js` para string/template.

## Checklist antes de concluir mudancas

- `npm run lint`
- `npm run build`
- Smoke test de `/copy-editor`
- Smoke test do onboarding publico se a copy publicada ou o consumo mudou
- Verificar que `update-onboarding-copy` continua protegida por RBAC admin
- Verificar que `get-onboarding-copy` continua somente leitura
- Atualizar esta pasta se contrato, fluxo ou arquivos mudarem

