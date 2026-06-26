# Go Planner

> **Organize today. Impact tomorrow.**

Plataforma modular de gestão de igreja — multi-tenant, com uma camada de acessos
forte (organização → comunidades → roles) e módulos plugáveis geridos por
permissões e âmbito.

Construída como um **modular monolith** em TypeScript: um único projeto Next.js
bem organizado, onde a modularidade vem da arquitetura (registo de módulos +
contrato de módulo), não de microserviços.

---

## Índice

- [O que é](#o-que-é)
- [Marca](#marca)
- [Stack](#stack)
- [Abrir no VSCode](#abrir-no-vscode)
- [Pôr a correr](#pôr-a-correr)
- [Estrutura do projeto](#estrutura-do-projeto)
- [Como funcionam os acessos](#como-funcionam-os-acessos)
- [Como adicionar um módulo novo](#como-adicionar-um-módulo-novo)
- [Scripts](#scripts)
- [Lançar no GitHub](#lançar-no-github)
- [Roadmap](#roadmap)
- [Licença](#licença)

---

## O que é

Três camadas:

1. **Plataforma / admin core** — utilizadores, roles, registo de organizações e
   de módulos. É o teu código, não vem de bibliotecas.
2. **Tenancy & acessos** — organização → comunidades; resolução de acesso por
   `role × âmbito × módulo`.
3. **Módulos** — Eventos, Pessoas, etc. Registados via manifesto e
   geridos por acesso.

O princípio central: **o módulo declara, a plataforma orquestra.** Nenhum módulo
decide acessos por si — todos passam pelo serviço central `can()`.

---

## Marca

Paleta (tokens definidos em `src/app/globals.css`, usáveis como
`bg-brand-*` / `text-brand-*`):

| Token | Cor | Uso sugerido |
|---|---|---|
| `brand-navy` | `#1F2A44` | Texto principal, âncora |
| `brand-green` | `#2BB673` | Comunidades, sucesso |
| `brand-blue` | `#2D7DD2` | Acessos, informação |
| `brand-purple` | `#7B5CC4` | Módulos |
| `brand-amber` | `#F5A623` | Destaques, avisos |

> Os hex são aproximados ao logótipo. Se tiveres os valores exatos da identidade
> visual, ajusta-os no bloco `@theme` de `globals.css`.

---

## Stack

| Camada | Tecnologia |
|---|---|
| Interface | Next.js (App Router) · React · Tailwind v4 |
| Aplicação | Modular monolith · camada de acessos própria |
| Autenticação | Better Auth (self-hosted) |
| Dados | Drizzle ORM · PostgreSQL |
| Infra | Alojamento na UE (residência de dados / RGPD) |

Todo o software é open source e gratuito. O único custo é o alojamento.

---

## Abrir no VSCode

1. Descomprime o projeto.
2. No VSCode: **File → Open Folder…** e escolhe a pasta `go-planner`.
3. O VSCode vai sugerir as extensões recomendadas (ESLint, Prettier, Tailwind
   IntelliSense, TypeScript). Aceita para teres autocomplete das classes Tailwind
   e dos tipos.
4. Abre um terminal integrado: **Terminal → New Terminal** (ou `Ctrl+`` ` `` `).

---

## Pôr a correr

Pré-requisitos: **Node.js 20+** e uma base de dados **PostgreSQL**.

```bash
# 1. Instalar dependências (resolve as versões atuais)
npm install

# 2. Variáveis de ambiente
cp .env.example .env
#    -> edita .env e mete o teu DATABASE_URL
#    -> gera um segredo: openssl rand -base64 32  (para BETTER_AUTH_SECRET)

# 3. Criar o schema na base de dados
npm run db:push

# 4. Arrancar em desenvolvimento
npm run dev
```

Abre http://localhost:3000.

> O setup fino do Tailwind v4 e do Better Auth pode pedir pequenos ajustes
> conforme a major instalada — segue a documentação oficial de cada um.

---

## Estrutura do projeto

```
go-planner/
├── README.md                 Este ficheiro
├── docs/                     Arquitetura e modelo de acessos (lê primeiro)
│   ├── architecture.md
│   └── access-model.md
├── package.json
├── drizzle.config.ts         Apanha o schema do núcleo + de cada módulo
├── .env.example              Copia para .env
└── src/
    ├── app/                  Next.js App Router (UI)
    │   ├── layout.tsx
    │   ├── page.tsx
    │   └── globals.css       Tailwind + tokens da marca
    ├── core/                 A PLATAFORMA — o teu código, não vem de libs
    │   ├── db/
    │   │   ├── schema.ts      Schema RBAC da Fase 0 (9 tabelas do ERD)
    │   │   └── index.ts       Cliente Drizzle
    │   ├── auth/index.ts      Setup do Better Auth (esqueleto)
    │   ├── access/
    │   │   ├── can.ts         Serviço central de resolução de acesso
    │   │   └── types.ts
    │   ├── modules/
    │   │   ├── contract.ts    Tipos do ModuleManifest + defineModule()
    │   │   └── registry.ts    Registo + validação de dependências
    │   └── platform/
    │       └── access.ts      Torre de controlo: admins de plataforma (allowlist)
    └── modules/              Os módulos da igreja (ainda vazio)
```

**Por onde começar a ler:** `docs/architecture.md` → `src/core/db/schema.ts` →
`src/core/access/can.ts` → `src/core/modules/contract.ts`.

---

## Como funcionam os acessos

Quando um utilizador tenta uma ação, o serviço `can()`
(`src/core/access/can.ts`) decide por esta ordem — falha cedo, falha barato:

1. **Admin da organização?** → acesso total (atalho org-wide).
2. **Módulo ativo na organização?** → se não, nega.
3. **Âmbito coincide?** → a membership cobre a comunidade do pedido?
4. **Role concede a permissão?** → sim concede, não nega.

Detalhe completo em `docs/access-model.md`.

---

## Como adicionar um módulo novo

1. Cria a pasta `src/modules/<nome>/`.
2. Define o `manifest.ts` com `defineModule({ ... })` — declara `key`, permissões
   (formato `modulo.recurso.acao`), navegação, eventos, etc.
3. Se o módulo tiver dados próprios, cria `schema.ts` (toda a entidade carrega
   `organization_id` + `community_id`).
4. Regista o módulo: importa o manifesto em `src/core/modules/registry.ts` e
   adiciona-o à lista `MODULES`.
5. Corre `npm run db:generate` e `npm run db:migrate` para as novas tabelas.

Consulta o contrato em `src/core/modules/contract.ts` para todos os campos
disponíveis.

---

## Scripts

| Comando | Faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção |
| `npm run start` | Corre o build |
| `npm run db:push` | Aplica o schema diretamente (bom para dev) |
| `npm run db:generate` | Gera ficheiros de migração |
| `npm run db:migrate` | Aplica as migrações |
| `npm run db:studio` | Abre o Drizzle Studio (browser de dados) |

---

## Lançar no GitHub

Cria primeiro um repositório **vazio** no GitHub (sem README, para não colidir
com este). Depois:

```bash
git init
git add .
git commit -m "Initial commit: Go Planner"
git branch -M main
git remote add origin https://github.com/<o-teu-utilizador>/go-planner.git
git push -u origin main
```

O `.gitignore` já protege o `.env` e o `node_modules`.

---

## Roadmap

- **Fase 0 — Fundação** *(coberta por este esqueleto)*: tenancy, comunidades,
  RBAC, resolução de acesso, registo de módulos.
- **Fase 1 — MVP**: autenticação real, painel de admin (Admin control tower).
- **Fase 2**: **Eventos/Calendário**, Grupos, Presenças, Comunicação.
- **Fase 3**: Doações, Portal do membro, Relatórios.
- **Fase 4+**: Cuidado Pastoral, Worship, Discipulado, Sermões.

---

## Licença

MIT — ver `LICENSE`.
