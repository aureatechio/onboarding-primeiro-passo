# Git Rebase, Reflog e Recuperação de Arquivos

**Data:** 2026-04-02
**Contexto:** Em 02/04/2026, os 134 arquivos fonte do dashboard aparentemente "sumiram" do repositório. Este documento explica exatamente o que aconteceu, os conceitos de git envolvidos e como se proteger no futuro.

---

## O que aconteceu no nosso caso

### A timeline real

```
ANTES (seus commits locais):

  c2e130e  refactor(context): otimiza engenharia de contexto
  c738ffd  refactor(context): remove playbooks duplicados
  49b790d  fix(omie): resolver cidade de prestação via IBGE
  a43a96c  fix(omie): corrige nPercentual incorreto
  f862169  docs(omie): melhoria de engenharia de contexto ← TEM os 134 arquivos do dashboard

REMOTE (origin/main) recebeu um commit novo:

  260a0d4  feat: adiciona Edge Functions do onboarding (push do novo repo)

ENTÃO: git pull --rebase foi executado
```

O `git pull --rebase` fez o seguinte:

```
ANTES do rebase:                        DEPOIS do rebase:

  origin/main                             origin/main
       |                                       |
    260a0d4 ← novo commit                   260a0d4
       |                                       |
       |    f862169 ← seus commits          30ac6f3 ← replay do fix(omie)
       |    a43a96c    locais                  |
       |    49b790d                          7876ce6 ← replay do docs(omie)
       |      |                                |
       +------+ (divergem)                  main HEAD
```

O git tentou "replayar" seus commits locais (a43a96c e f862169) em cima do 260a0d4. Mas os arquivos do dashboard existiam nos seus commits locais e **não existiam** no remote. O git marcou isso como conflito ("deleted by us") e, como o rebase finalizou sem resolver explicitamente, os arquivos foram descartados.

### Por que os arquivos nunca estavam no remote?

Os 134 arquivos do dashboard foram incluídos em commits locais que tinham outro propósito (docs do OMIE, fixes). Eles foram commitados junto, mas quando os commits anteriores (49b790d, c738ffd) foram pushados, os arquivos do dashboard podem não ter sido staged — ou os commits que os adicionaram (a43a96c, f862169) simplesmente nunca foram pushados antes do rebase acontecer.

---

## Conceito 1: O que é `git rebase`

### Merge vs Rebase

Quando seu branch local diverge do remote, existem duas formas de reconciliar:

**Merge** (`git pull` padrão):
```
    A---B---C  (seus commits locais)
   /         \
  D---E---F---M  (merge commit)
       (remote)
```
Cria um commit de merge (M) que junta as duas linhas. O histórico fica com "bifurcação".

**Rebase** (`git pull --rebase`):
```
  ANTES:                    DEPOIS:
    A---B---C  (local)        D---E---F---A'---B'---C'  (rebaseado)
   /                               (remote)
  D---E---F  (remote)
```
Pega seus commits locais, "descola" eles, e "replaya" um a um em cima do remote. Os commits originais (A, B, C) são substituídos por cópias (A', B', C') com hashes novos.

### O perigo do rebase

O rebase **reescreve histórico**. Os commits originais (A, B, C) ficam "órfãos" — nenhuma branch aponta para eles mais. Se houver conflito durante o replay, o git pode descartar mudanças silenciosamente (como aconteceu com o dashboard).

### Quando o rebase dá problema

O cenário clássico é exatamente o nosso: você tem arquivos **que nunca existiram no remote**, commitados localmente. O rebase vê que o remote não tem esses arquivos e trata como "deleted by us" — a versão do remote (sem os arquivos) é a base, e seus commits locais estão sendo aplicados em cima. Se o conflito não é resolvido manualmente, os arquivos somem.

---

## Conceito 2: O que é `git reflog`

O reflog é o "diário de bordo" do git. Ele registra **toda** movimentação do HEAD — commits, checkouts, rebases, resets, merges. Mesmo quando um commit fica órfão (nenhuma branch aponta para ele), o reflog mantém a referência.

```bash
$ git reflog -10

7876ce6 HEAD@{0}: rebase (finish): returning to refs/heads/main
7876ce6 HEAD@{1}: rebase (continue): docs(omie)
30ac6f3 HEAD@{2}: rebase (continue): fix(omie)
260a0d4 HEAD@{3}: pull --rebase (start): checkout 260a0d4
f862169 HEAD@{4}: reset: moving to HEAD
f862169 HEAD@{5}: commit: docs(omie): melhoria de engenharia de contexto
```

O reflog nos mostra que:

- `HEAD@{3}` — o rebase começou, fazendo checkout no commit 260a0d4 do remote
- `HEAD@{5}` — o commit f862169 (que **tem** os arquivos do dashboard) ainda existe

Commits órfãos ficam no reflog por **90 dias** por padrão. Depois disso, o `git gc` (garbage collection) pode removê-los. Ou seja: tínhamos 90 dias para recuperar.

### Como usar o reflog para recuperar

```bash
# Ver o reflog
git reflog

# Ver o que um commit órfão contém
git show f862169 --stat

# Listar arquivos de um commit específico
git ls-tree -r f862169 -- apps/dashboard/src/

# Restaurar arquivos de um commit órfão
git checkout f862169 -- apps/dashboard/src/
```

O `git checkout <commit> -- <path>` copia os arquivos daquele commit para o working directory e staging area, sem mudar de branch. É a ferramenta de recuperação.

---

## Conceito 3: Estados "Unmerged" e conflitos de rebase

Quando o git encontra um conflito durante rebase, ele para e pede resolução. Os arquivos conflitantes ficam em estado **"unmerged"** com marcadores como:

- `deleted by us` — o rebase (que rebasa em cima do remote) não encontrou o arquivo no remote, mas o commit local o tinha
- `deleted by them` — o oposto: o commit local deletou, mas o remote tem
- `both modified` — ambos modificaram o mesmo arquivo
- `both added` — ambos criaram um arquivo com o mesmo nome

No nosso caso, 4 arquivos ficaram como `deleted by us` (visíveis no `git status`). Os outros ~130 foram resolvidos automaticamente pelo git — como "a versão do remote (sem os arquivos) vence" — e descartados silenciosamente.

### O estado `REBASE_HEAD`

Quando um rebase para por conflito, o git cria o arquivo `.git/REBASE_HEAD` apontando para o commit sendo aplicado. Isso indica que o rebase está **incompleto**. Você precisa:

```bash
# Resolver conflitos, depois:
git add <arquivos-resolvidos>
git rebase --continue

# Ou abortar o rebase inteiro (volta ao estado anterior):
git rebase --abort
```

Se o rebase finalizou mas deixou unmerged paths (como no nosso caso), o repo fica num estado "sujo" que precisa ser resolvido manualmente.

---

## Conceito 4: Como o git armazena dados

Entender isso explica por que recuperação é possível.

O git é um **banco de dados de objetos**. Cada commit, cada arquivo, cada árvore de diretório é um objeto identificado por um hash SHA-1. Quando você faz um commit, o git:

1. Cria **blobs** — o conteúdo de cada arquivo
2. Cria **trees** — a estrutura de diretórios apontando para os blobs
3. Cria um **commit** — aponta para a tree raiz + commit pai + metadados

```
commit f862169
    │
    ├── tree (raiz do repo)
    │     ├── apps/
    │     │     ├── dashboard/
    │     │     │     └── src/     ← 134 arquivos como blobs
    │     │     ├── omie/
    │     │     └── onboarding/
    │     ├── packages/
    │     └── supabase/
    │
    └── parent: a43a96c
```

Quando o rebase cria novos commits (7876ce6), ele cria **novos objetos commit** mas pode reutilizar os mesmos blobs (conteúdo dos arquivos). Os objetos antigos (f862169 e seus blobs) continuam existindo no banco — só perdem a referência de branch. O reflog é a última referência que impede o garbage collector de apagá-los.

---

## Como se proteger no futuro

### 1. Prefira `git pull` sem `--rebase` quando tiver muitas mudanças locais

```bash
# Mais seguro — cria merge commit, não reescreve histórico
git pull origin main

# Se quiser rebase, faça com cuidado
git fetch origin
git rebase origin/main  # assim você controla quando resolver conflitos
```

### 2. Faça push frequente

A regra de ouro: **commit pushado é commit protegido**. Se os arquivos do dashboard tivessem sido pushados antes do rebase, o remote teria eles e não haveria conflito.

```bash
# Fluxo seguro
git add .
git commit -m "feat(dashboard): adiciona componentes"
git push origin main   # ← protege o commit imediatamente
```

### 3. Antes de um rebase, crie uma branch de backup

```bash
git branch backup-antes-do-rebase
git pull --rebase origin main
# Se algo der errado:
git checkout backup-antes-do-rebase
```

### 4. Configure `git pull` para avisar sobre conflitos

```bash
# Opção 1: git pull faz merge por padrão (mais seguro)
git config pull.rebase false

# Opção 2: git pull faz rebase por padrão (mais limpo, mas arriscado)
git config pull.rebase true

# Opção 3: git pull exige que você escolha explicitamente (recomendado)
git config pull.ff only
# Isso faz "fast-forward only" — se houver divergência, recusa e você decide
```

A opção 3 é a mais segura para equipes pequenas. Se o `git pull` falhar por divergência, você escolhe conscientemente entre merge ou rebase.

### 5. Use `git stash` antes de operações arriscadas

```bash
git stash                    # guarda mudanças não commitadas
git pull --rebase            # faz o rebase
git stash pop                # restaura as mudanças
```

### 6. Conheça os comandos de emergência

```bash
# Ver o diário de tudo que aconteceu
git reflog

# Restaurar arquivos de qualquer commit (mesmo órfão)
git checkout <hash> -- <caminho>

# Voltar o branch inteiro para um commit anterior
git reset --hard <hash>      # CUIDADO: descarta mudanças não commitadas

# Abortar um rebase em andamento
git rebase --abort

# Ver o que um commit contém
git show <hash> --stat
git ls-tree -r <hash> -- <caminho>
```

---

## Glossário rápido

| Termo | O que é |
|-------|---------|
| **rebase** | Reescreve commits locais em cima de outra base (geralmente o remote) |
| **reflog** | Log de todas as movimentações do HEAD — sobrevive a rebases e resets |
| **commit órfão** | Commit que nenhuma branch referencia, mas ainda existe no banco de objetos |
| **garbage collection** | Processo que limpa objetos sem referência (por padrão, após 90 dias) |
| **unmerged** | Arquivo com conflito não resolvido durante merge ou rebase |
| **deleted by us** | Conflito: o rebase não encontrou o arquivo na base, mas seu commit o tinha |
| **REBASE_HEAD** | Arquivo em `.git/` que indica um rebase incompleto |
| **HEAD** | Ponteiro para o commit atual do branch ativo |
| **fast-forward** | Merge sem divergência — apenas avança o ponteiro, sem criar merge commit |
| **staging area** | Área intermediária entre working directory e commit (o que `git add` coloca lá) |

---

## Referências

- [Pro Git Book — Rebasing](https://git-scm.com/book/en/v2/Git-Branching-Rebasing) — explicação completa com diagramas
- [Pro Git Book — Data Recovery](https://git-scm.com/book/en/v2/Git-Internals-Maintenance-and-Data-Recovery) — como recuperar objetos perdidos
- [Atlassian — Merging vs Rebasing](https://www.atlassian.com/git/tutorials/merging-vs-rebasing) — comparação visual dos dois approaches
