# Progresso — Go Planner

> Estado em **2026-06-25**. Snapshot do que está feito, do que está em curso e
> dos próximos passos. Lê em conjunto com `README.md` e `docs/`.

---

## Resumo

**Fase 0 — Fundação: completa.** O esqueleto do *modular monolith* está montado:
tenancy, RBAC, resolução de acesso central (`can()`), contrato de módulo,
registo de módulos e um módulo de exemplo (Escalas).

**Estado:** ✅ **schema aplicado à base de dados (15 tabelas)** — 9 do núcleo
+ 6 do módulo Escalas. A Fase 0 está operacional ponta-a-ponta.

**A seguir:** arrancar a **Fase 1** (autenticação real + painel de admin).

---

## Feito (Fase 0)

### Projeto & build
- [x] Projeto **Next.js 16** (App Router) · **React 19** · **Tailwind v4**.
- [x] `package.json` com scripts de dev, build e base de dados (`db:push`,
      `db:generate`, `db:migrate`, `db:studio`).
- [x] Tokens da marca em [src/app/globals.css](src/app/globals.css)
      (`brand-navy/green/blue/purple/amber`).
- [x] Layout e página inicial — [src/app/layout.tsx](src/app/layout.tsx),
      [src/app/page.tsx](src/app/page.tsx).

### Núcleo da plataforma (`src/core`)
- [x] **Schema RBAC (9 tabelas)** — [src/core/db/schema.ts](src/core/db/schema.ts):
      `organizations`, `communities`, `users`, `roles`, `memberships`,
      `modules`, `organization_modules`, `permissions`, `role_permissions`.
- [x] **Cliente Drizzle** (postgres-js) — [src/core/db/index.ts](src/core/db/index.ts).
- [x] **Serviço central de acesso `can()`** — [src/core/access/can.ts](src/core/access/can.ts).
      Resolução por ordem: admin de org → módulo ativo → âmbito → permissão.
- [x] **Tipos de acesso** (`AccessRequest`, `ResolvedMembership`) —
      [src/core/access/types.ts](src/core/access/types.ts).
- [x] **Contrato de módulo** (`ModuleManifest`, `defineModule()`,
      `ScopedEntity`) — [src/core/modules/contract.ts](src/core/modules/contract.ts).
- [x] **Registo de módulos** + validação de dependências + agregação de
      permissões — [src/core/modules/registry.ts](src/core/modules/registry.ts).
- [x] **Esqueleto de autenticação** (Better Auth, só identidade/sessões) —
      [src/core/auth/index.ts](src/core/auth/index.ts).

### Módulo de exemplo — Escalas (`src/modules/escalas`)
- [x] **Manifesto** (permissões, navegação, eventos, settings, lifecycle) —
      [src/modules/escalas/manifest.ts](src/modules/escalas/manifest.ts).
- [x] **Schema interno** (`esc_teams`, `esc_positions`, `esc_occasions`,
      `esc_slots`, `esc_assignments`, `esc_availability`) —
      [src/modules/escalas/schema.ts](src/modules/escalas/schema.ts).
      `person_id` é referência estável ao núcleo; `event_id` é gancho opcional
      para um futuro módulo Eventos.

### Configuração & documentação
- [x] **Drizzle config** a apanhar núcleo + todos os módulos —
      [drizzle.config.ts](drizzle.config.ts).
- [x] **Docs de arquitetura** — [docs/architecture.md](docs/architecture.md).
- [x] **Modelo de acessos** — [docs/access-model.md](docs/access-model.md).
- [x] `.env.example`, `.gitignore` (protege `.env` e `node_modules`), `LICENSE`
      (MIT), `README.md`.

---

## Base de dados (resolvida)

Schema aplicado com sucesso — **15 tabelas** (9 do núcleo + 6 do módulo Escalas),
com chaves estrangeiras e índices.

### O que correu mal e como se resolveu
1. ✅ `DATABASE_URL` malformado (aspas a fechar sem abrir + host `.com`) — corrigido.
2. ✅ A ligação **direta** `db.<ref>.supabase.co` é **IPv6-only**; quando a
   máquina não tem rota IPv6, o `db:push` fica pendurado em
   *"Pulling schema from database…"* e sai com código 1.
3. ✅ Password da BD estava errada (`password authentication failed`) — corrigida
   com a password real (Supabase → Project Settings → Database).
4. ✅ Schema aplicado com `npx drizzle-kit push --force` (evita o prompt
   interativo de confirmação, que senão precisa de navegação por setas).

### Ligação atual
- O `.env` usa a **ligação direta** (`postgres@db.<ref>.supabase.co:5432`).
  Funciona enquanto a máquina tiver IPv6.
- **Opcional (robustez IPv4):** se a rede não tiver IPv6 fiável, troca para o
  **pooler** (Supavisor), região `eu-central-1`:
  `postgresql://postgres.<ref>:<password>@aws-1-eu-central-1.pooler.supabase.com:5432/postgres?sslmode=require`

### Comandos úteis
```bash
npx drizzle-kit push --force   # aplicar schema sem prompt (dev)
npm run db:studio              # inspecionar os dados no browser
```

> **Nota de segurança:** o `.env` tem uma password real e está protegido pelo
> `.gitignore`. Se alguma vez foi partilhado/commitado, **roda a credencial**.

---

## A seguir (Fase 1 — MVP)

- [x] ~~Desbloquear `db:push`~~ — schema aplicado, **15 tabelas** criadas. ✅
- [ ] **Autenticação real** com Better Auth — gerar tabelas de auth
      (`user`, `session`, `account`, `verification`) e ligar ao Drizzle;
      definir `BETTER_AUTH_SECRET`.
- [ ] **Painel de administração** — gestão de organização, comunidades, roles e
      memberships.
- [ ] Ligar a **navegação** e os **widgets** declarados pelos módulos à UI
      (consumir o registo + filtrar por `can()`).
- [ ] Primeira versão funcional do módulo **Escalas**.

### Roadmap (resumo)
- **Fase 2:** Eventos/Calendário, Grupos, Presenças, Comunicação.
- **Fase 3:** Doações, Portal do membro, Relatórios.
- **Fase 4+:** Cuidado Pastoral, Worship, Discipulado, Sermões.

---

## Mapa rápido

| Área | Ficheiro | Estado |
|---|---|---|
| Schema RBAC | [src/core/db/schema.ts](src/core/db/schema.ts) | ✅ |
| Cliente DB | [src/core/db/index.ts](src/core/db/index.ts) | ✅ |
| Acesso `can()` | [src/core/access/can.ts](src/core/access/can.ts) | ✅ |
| Contrato de módulo | [src/core/modules/contract.ts](src/core/modules/contract.ts) | ✅ |
| Registo de módulos | [src/core/modules/registry.ts](src/core/modules/registry.ts) | ✅ |
| Auth (esqueleto) | [src/core/auth/index.ts](src/core/auth/index.ts) | 🟡 esqueleto |
| Módulo Escalas | [src/modules/escalas/manifest.ts](src/modules/escalas/manifest.ts) | ✅ |
| Ligação à BD | `.env` | ✅ ligado (direta; pooler IPv4 opcional) |
| Aplicar schema à BD | — | ✅ 15 tabelas (`push --force`) |
