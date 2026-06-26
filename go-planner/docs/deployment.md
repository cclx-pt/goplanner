# Estratégia de ambientes & deploy — Go Planner

Plano para **3 ambientes** (Produção, QA, Development) com deploy contínuo na
**Vercel** a partir do **GitHub** (`cclx-pt/goplanner`), preparado para **vários
programadores** em simultâneo.

> **Layout do repositório:** a app Next.js está na subpasta `go-planner/`. A raiz
> do repositório Git é o nível acima. Por isso, na Vercel, o **Root Directory** do
> projeto **tem de ser `go-planner`**.

---

## 1. Visão geral

| Fase | Branch Git | Ambiente Vercel | Base de dados | URL típico |
|------|-----------|-----------------|---------------|-----------|
| **Produção** | `main` | Production | Supabase **PROD** | domínio próprio (ex.: `goplanner.app`) |
| **QA** | `qa` | Custom Environment `qa` (ou Preview da branch `qa`) | Supabase **QA** | `goplanner-qa.vercel.app` (estável) |
| **Development** | `develop` + `feature/*` | Preview | Supabase **DEV** | URL única por PR/branch |

Princípios:

- **1 branch = 1 ambiente.** Promover código é fazer merge de uma branch para a
  seguinte.
- **Cada ambiente tem a sua base de dados.** Previews **nunca** tocam na BD de
  Produção.
- **Cada PR gera um Preview isolado** com URL própria — ideal para revisão por
  vários programadores.

---

## 2. Modelo de branches (Git)

```mermaid
flowchart LR
    F1["feature/maria/login"] -->|PR| D[develop]
    F2["feature/joao/escalas"] -->|PR| D
    D -->|PR (promover)| Q[qa]
    Q -->|PR (release)| M[main]
    M -. hotfix .-> H["hotfix/*"] -. PR .-> M
```

- `main` — **Produção**. Só recebe merges vindos de `qa` (ou `hotfix/*`).
- `qa` — **QA/UAT**. Recebe merges de `develop` quando se quer testar um lote.
- `develop` — **integração** contínua do trabalho diário.
- `feature/<nome>/<descrição>` — trabalho individual; sai de `develop`.
- `hotfix/<descrição>` — correção urgente; sai de `main`, volta a `main` e é
  re-merged para `qa` e `develop`.

### Fluxo de promoção

1. Programador cria `feature/...` a partir de `develop`.
2. Abre **PR → `develop`**. O CI corre e a Vercel cria um **Preview** para revisão.
3. Periodicamente: **PR `develop` → `qa`** → deploy no ambiente **QA** (BD QA) para testes/UAT.
4. Aprovado em QA: **PR `qa` → `main`** → **deploy de Produção**.
5. Urgência: `hotfix/*` a partir de `main` → PR para `main` → back-merge para `qa` e `develop`.

---

## 3. Mapeamento na Vercel

A Vercel tem 3 tipos nativos: **Production**, **Preview** e **Development** (local).
Para ter um **QA estável e separado**, há duas opções:

### Opção A — Custom Environment `qa` (recomendado; requer plano Pro)

1. No projeto Vercel → **Settings → Environments → Create Environment** → nome `qa`.
2. Associa-o à branch `qa` (Branch Tracking).
3. Define variáveis de ambiente próprias (BD QA) e, se quiseres, um domínio fixo
   (`qa.goplanner.app`).

### Opção B — Preview com variáveis por branch (funciona no plano gratuito)

1. Todas as branches != produção geram **Preview**.
2. Em **Settings → Environment Variables**, define `DATABASE_URL` (e restantes)
   **com escopo à branch `qa`** apontando para a BD QA.
3. As outras branches (`develop`, `feature/*`) usam as variáveis Preview por
   omissão (BD DEV).

**Produção:** branch de produção = `main` (Settings → Git → Production Branch).

---

## 4. Base de dados por ambiente (Supabase)

Cria **3 projetos Supabase** independentes (todos numa região da **UE** — ex.:
Frankfurt — por residência de dados):

| Projeto | Usado por |
|---------|-----------|
| `goplanner-prod` | Produção (`main`) |
| `goplanner-qa`   | QA (`qa`) |
| `goplanner-dev`  | Development (`develop`, `feature/*`, local) |

- Aplicar schema com Drizzle: `npx drizzle-kit push` (ver `drizzle.config.ts`).
- **Ordem de aplicação de alterações de schema:** primeiro **DEV** → depois **QA**
  → por fim **PROD** (como parte do release).
- As branches de feature/preview **partilham a BD DEV**. Para uma equipa pequena é
  aceitável; se precisarem de isolamento por PR, considerar Supabase Branching.

---

## 5. Variáveis de ambiente (por ambiente, no painel da Vercel)

Define-as em **Settings → Environment Variables**, com o escopo certo
(Production / Preview / `qa`). **Não** ficam no repositório.

| Variável | Production | QA | Preview / Dev |
|----------|-----------|----|----|
| `DATABASE_URL` | Supabase PROD | Supabase QA | Supabase DEV |
| `BETTER_AUTH_SECRET` | segredo único PROD | segredo único QA | segredo DEV |
| `BETTER_AUTH_URL` | `https://<domínio-prod>` | `https://<domínio-qa>` | derivar de `VERCEL_URL` (ver §10) |
| `PLATFORM_ADMIN_EMAILS` | admins reais | admins de teste | admins de teste |

> Gera cada `BETTER_AUTH_SECRET` com `openssl rand -base64 32`. **Nunca** reutilizes
> o segredo de Produção noutros ambientes.

Localmente: copia `.env.example` para `.env` e aponta para a **BD DEV**.

---

## 6. Trabalho com vários programadores

- Cada pessoa trabalha na sua branch `feature/<nome>/<descrição>` (sai de `develop`).
- Ao abrir PR, a Vercel publica um **Preview único** → fácil de rever/partilhar.
- Localmente todos usam a **BD DEV** partilhada (ou um Postgres local).
- Disciplina de schema: alterações via `drizzle-kit push` aplicadas primeiro em DEV
  e comunicadas à equipa (a BD DEV é partilhada).
- Manter PRs pequenos e fazer rebase frequente sobre `develop` para reduzir
  conflitos.

---

## 7. Proteção de branches (GitHub)

Em **Settings → Branches → Branch protection rules**, para `main`, `qa` e
`develop`:

- Exigir **Pull Request** antes do merge (proibir push direto).
- Exigir o check de status **CI / Typecheck & Lint** (ver `.github/workflows/ci.yml`).
- (Opcional) Exigir ≥1 revisão aprovada — recomendado para `main` e `qa`.
- (Opcional) Exigir branch atualizada antes do merge.

---

## 8. Setup passo-a-passo

### GitHub

```bash
# A partir da raiz do repositório (c:\@VSCODE\personal\goplanner)
git checkout main
git pull
git checkout -b develop && git push -u origin develop
git checkout main
git checkout -b qa && git push -u origin qa
git checkout develop
```

Depois aplicar as regras de proteção de branches (§7).

### Vercel

1. **Add New → Project** → importar `cclx-pt/goplanner` do GitHub.
2. **Root Directory = `go-planner`** (passo crítico — a app está na subpasta).
3. Framework: **Next.js** (auto-detetado; reforçado por `go-planner/vercel.json`).
4. **Production Branch = `main`** (Settings → Git).
5. Criar o ambiente **QA** (§3, Opção A ou B).
6. Definir as **variáveis de ambiente** por ambiente (§5).
7. (Opcional) Configurar domínios: `goplanner.app` (prod) e `qa.goplanner.app` (qa).

---

## 9. Vercel MCP (já configurado)

O servidor MCP da Vercel está configurado em `.vscode/mcp.json` (remoto,
`https://mcp.vercel.com`). Para ativar:

1. Command Palette → **MCP: List Servers** → **Vercel** → **Start Server**.
2. Autorizar o acesso à conta Vercel (fluxo OAuth no browser).

Depois de autenticado, o assistente pode gerir projetos/deployments e ler logs de
deploy diretamente.

---

## 10. Notas técnicas

- **Root Directory `go-planner`:** o CI (`.github/workflows/ci.yml`) usa
  `working-directory: go-planner`; a Vercel precisa do mesmo Root Directory.
  Existe um `package-lock.json` "órfão" na raiz do repositório — pode ser removido
  para evitar confusão (a Vercel usa o de `go-planner/`).
- **Região UE:** `go-planner/vercel.json` fixa `regions: ["fra1"]` (Frankfurt) para
  alinhar com a residência de dados na UE da base de dados.
- **`BETTER_AUTH_URL` em Previews:** os URLs de preview são dinâmicos. Para Produção
  e QA, define o URL fixo. Para previews, podes derivar do `VERCEL_URL`. Exemplo de
  ajuste opcional em `src/core/auth/index.ts`:

  ```ts
  const baseURL =
    process.env.BETTER_AUTH_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined);

  export const auth = betterAuth({
    baseURL,
    trustedOrigins: process.env.VERCEL_URL
      ? [`https://${process.env.VERCEL_URL}`]
      : undefined,
    // ...resto da config
  });
  ```

- **CI vs. deploy:** o GitHub Actions só faz typecheck + lint (portões de
  qualidade). O **build e o deploy** são da Vercel, que valida o build em cada
  push/PR.
