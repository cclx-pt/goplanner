# Progresso — Go Planner

> Estado em **2026-06-28**. Snapshot do que está feito, do que está em curso e
> dos próximos passos. Lê em conjunto com `README.md` e `docs/`.

---

## Resumo

**Fase 0 — Fundação: completa.** O esqueleto do *modular monolith* está montado:
tenancy, RBAC, resolução de acesso central (`can()`), contrato de módulo e
registo de módulos.

**Estado:** ✅ Fase 0 completa **e Fase 1 passos 1–4 completos** — autenticação
(Better Auth), bootstrap da organização, painel de admin e navegação dos
módulos filtrada por `can()`. Verificado ponta-a-ponta no browser.

**Admin control tower (camada de plataforma): base montada.** Há agora uma camada
**acima das organizações** — staff que gere todos os tenants — em `/platform`,
separada dos admins de organização. Provisionada por allowlist de emails
(`PLATFORM_ADMIN_EMAILS`), com provisionamento JIT no 1.º acesso.

**A seguir:** enriquecer a torre de controlo (detalhe por tenant, gerir staff).

---

## Refactor #1 — Modelo de identidade (3 camadas) ✅

> Concretizado a **2026-06-28**. Alinha o schema com a nova arquitetura
> multi-tenant (contas globais sobre uma espinha de pessoas por tenant).

- [x] **Account / Person / Membership** separados. A antiga tabela `users` (que
      misturava login + registo de domínio e prendia 1 conta a 1 org) foi
      **dividida**: `people` (registo por tenant) +
      `memberships` (a ponte `account_id` → `organization_id`, com `person_id`
      opcional e `role_id`).
- [x] **Contas globais** — uma conta pode ter memberships em vários tenants; a
      autorização é sempre scoped ao tenant ativo. `can()` carrega memberships
      por `account_id` **+** `organization_id`
      ([src/core/access/can.ts](src/core/access/can.ts)).
- [x] **Switcher de tenant** — qualquer conta com >1 tenant troca de org ativa
      (cookie `goplanner.active_org`), não só admins de plataforma
      ([src/app/admin/layout.tsx](src/app/admin/layout.tsx)).
- [x] **Filtro de tenant central** — [src/core/db/tenant.ts](src/core/db/tenant.ts)
      (`tenantFilter`/`scopedTo`), preparado para Row-Level Security.
- [x] Propagado por bootstrap, criação de membros, guardas, páginas de admin e o
      cascade delete da plataforma (apaga vínculo+pessoa, **nunca** a conta
      global). Schema aplicado (`drizzle-kit push`), 2 contas de teste
      re-seeded, typecheck limpo e **smoke-test ponta-a-ponta** (login →
      /dashboard → /admin → /admin/members) a 200.

**A seguir (Fase 0.5):** i18n + dinheiro em minor units + locale/moeda/país na
org; consentimento GDPR + erasure; espinha People/Household (Módulo 1); scaffold
do workflow engine.

---

## Refactor #2 — i18n + dinheiro + região (fundação) ✅

> Concretizado a **2026-06-28**. Bases de internacionalização, multi-moeda e
> multi-país (caro de fazer à posteriori — feito cedo).

- [x] **Config de região na org** — `organizations` ganha `locale`, `currency`,
      `country`, `timezone` (defaults PT: pt-PT/EUR/PT/Europe/Lisbon). Editável na
      plataforma ([detalhe da org](src/app/platform/organizations/[id]/page.tsx)),
      só-leitura em [/admin/organization](src/app/admin/organization/page.tsx).
- [x] **Dinheiro** — [src/core/money/index.ts](src/core/money/index.ts): SEMPRE
      inteiro em unidades menores + ISO 4217 (nunca float); zero-decimais (JPY),
      `Intl.NumberFormat`. Consumido pelo Giving (futuro).
- [x] **i18n (next-intl, sem routing)** — catálogos
      [pt](messages/pt.json)/[en](messages/en.json); resolução cookie do
      utilizador → default da org → sistema ([src/i18n](src/i18n/locale.ts));
      provider no layout; seletor de idioma
      ([LanguageSwitcher](src/components/LanguageSwitcher.tsx)). Migrados:
      sign-in, sign-up, shell do dashboard. Restantes páginas migram
      incrementalmente. Verificado: dashboard troca pt↔en (`<html lang>`),
      typecheck limpo.

**A seguir:** GDPR consentimento + erasure (#3); espinha People/Household (M1).

---

## Refactor #3 — GDPR: consentimento + esquecimento ✅

> Concretizado a **2026-06-28**. Dados religiosos = categoria especial (Art. 9).

- [x] **`consents`** auditável (org, person, purpose, granted, lawful_basis,
      source) + `people.specialCategory` e `people.retentionUntil`.
- [x] **Consentimento na criação** de membro (checkbox; base legal=consentimento)
      e **badge RGPD** na lista ([membros](src/app/admin/members/page.tsx)).
- [x] **Direito ao esquecimento** — `eraseMemberAction` apaga pessoa +
      consentimentos + memberships (a CONTA global mantém-se), com confirmação
      por nome/email. Cascade da org também apaga consents.

**A seguir:** espinha People/Household (#4); workflow engine (#5).

---

## Refactor #4 — Espinha People/Household (1.º módulo) ✅

> Concretizado a **2026-06-28**. Primeiro módulo do data-plane sobre a espinha.

- [x] **Espinha** — `households`, `people.{householdId,lifecycleStage}`, `tags` +
      `person_tags`, `milestones`. Cascade da org cobre tudo.
- [x] **Módulo `pessoas`** — 1.º manifesto em
      [src/modules/pessoas](src/modules/pessoas/module.ts) (perms
      pessoas.pessoa.ver/editar, nav `/pessoas`); registado em
      [registry](src/core/modules/registry.ts). Página
      [/pessoas](src/app/pessoas/page.tsx) guardada por `can()`.
- [x] **Ciclo de vida** na criação de membro (visitor→leader). Ativado p/ CCLX.
      Verificado: nav "Pessoas" no dashboard + /pessoas 200, typecheck limpo.

**A seguir:** workflow engine (#5); módulos Fase 1 (Check-in, Doações, etc.).

---

## Refactor #5 — Workflow engine (trigger→condição→ação) ✅

> Concretizado a **2026-06-28**. A maior alavanca: automação sem código.

- [x] **Motor** — `workflows` (trigger + conditions/actions JSON + active),
      `workflow_runs` (auditoria), `tasks`. Core
      [src/core/workflows](src/core/workflows/index.ts): `dispatch()` filtra por
      condições e executa ações (create_task / set_field / log) — DEFENSIVO
      (nunca quebra o negócio).
- [x] **Trigger real** — criar membro emite `person.created`. Ações tenant-scoped;
      runs registados.
- [x] **Admin** — [/admin/workflows](src/app/admin/workflows/page.tsx) lista +
      ativa/desativa + execuções recentes. Sample CCLX: visitante → tarefa de
      acolhimento. Cascade cobre workflows/runs/tasks. Verificado, typecheck limpo.

**A seguir:** módulos Fase 1 — Check-in, Doações, Comunicação, Eventos, Grupos.

---

## Fase 1 — Doações (2.º módulo) ✅

> Concretizado a **2026-06-28**. Primeiro módulo de negócio sobre o core de dinheiro.

- [x] **Fundos + doações** — `funds` (moeda por fundo) + `donations` (inteiro em
      unidades menores + ISO 4217). Módulo
      [doacoes](src/modules/doacoes/module.ts) (perms ver/registar, nav `/doacoes`).
- [x] **Página** [/doacoes](src/app/doacoes/page.tsx): totais por fundo
      (`formatMoney`), criar fundo, registar doação. Ativado p/ CCLX, cascade
      cobre funds/donations. Verificado, typecheck limpo.

**A seguir:** Check-in (alto risco), Comunicação, Eventos, Grupos, Relatórios.

---

## Fase 1 — Check-in (3.º módulo, salvaguarda) ✅

> Concretizado a **2026-06-29**. Módulo de maior responsabilidade.

- [x] **Sessões + check-ins** — `checkin_events` + `checkins` com CÓDIGO de
      segurança (tag) gerado no check-in e **obrigatório na recolha**; auditoria
      de quem fez check-in/out e quando. Módulo
      [checkin](src/modules/checkin/module.ts) (nav `/checkin`).
- [x] **Página** [/checkin](src/app/checkin/page.tsx): criar sessão, check-in
      (gera código), lista de presentes, recolha com match de código. Ativado
      CCLX, cascade. Verificado, typecheck limpo.

**A seguir:** Comunicação, Eventos, Grupos, Relatórios.

---

## Fase 1 — Comunicação (4.º módulo) ✅

> Concretizado a **2026-06-29**. Liga-se ao motor de workflows.

- [x] **Mensagens + modelos** — `messages` + `message_templates`; envio
      segmentado (broadcast a todas as pessoas). Estado simulado (sem provider).
- [x] **Ação de workflow `send_message`** — workflows passam a poder enviar
      mensagens. Módulo [comunicacao](src/modules/comunicacao/module.ts) nav
      `/comunicacao`. Página: compor + lista de recentes. CCLX + cascade.

**A seguir:** Eventos, Grupos, Relatórios.

---

## Fase 1 — Eventos (5.º módulo) ✅

> Concretizado a **2026-06-29**.

- [x] **Eventos + inscrições** — `events` + `event_registrations` (RSVP, lotação).
      Módulo [eventos](src/modules/eventos/module.ts) nav `/eventos`. Página:
      criar evento, lista com contagem de inscritos, inscrever. CCLX + cascade.

**A seguir:** Grupos/Células, Relatórios.

---

## Fase 1 — Grupos/Células (6.º módulo) ✅

> Concretizado a **2026-06-29**.

- [x] **Grupos + roster** — `groups` (tipo, `parentGroupId` p/ multiplicação) +
      `group_members`. Módulo [grupos](src/modules/grupos/module.ts) nav
      `/grupos`. Página: criar grupo, contagem de membros, adicionar membro.
      CCLX + cascade.

**A seguir:** Relatórios (último do MVP).

---

## Fase 2 — Finanças ✅

> Concretizado a **2026-06-29**. Perspetiva dupla (organização + comunidade) e
> modelo configurável.

- [x] **Modelo configurável** — `organizations.financeModel`: `global` (livro da
      org + sub-contas por comunidade) ou `autonomous` (cada comunidade
      independente). `accounts` (org-level ou por comunidade) + `transactions`
      (receita/despesa, inteiro em unidades menores + ISO 4217).
- [x] **Saldos** por organização, por comunidade e **consolidado** (`formatMoney`).
      Módulo [financas](src/modules/financas/module.ts) nav `/financas`; toggle de
      modelo, criar conta, registar movimento. CCLX + cascade.

**A seguir:** Relatórios (MVP); depois Fase 3.

---

## Fase 1 — Relatórios (MVP completo) ✅

> Concretizado a **2026-06-29**. KPIs read-only agregando os módulos.

- [x] Módulo [relatorios](src/modules/relatorios/module.ts) nav `/relatorios`:
      KPIs (pessoas, doações totais, grupos, eventos, check-ins) + **funil de
      discipulado** (visitante→líder, %). Só leitura, sem novas tabelas. CCLX.

**MVP completo** (8 módulos). A seguir: Fase 3 (cuidado pastoral, portal, etc.).

---

## Fase 3 — Cuidado pastoral & oração ✅

> Concretizado a **2026-06-29**.

- [x] `prayer_requests` (visibilidade mural/privado/confidencial) + `care_cases`
      (visita/hospital/luto/aconselhamento). Módulo
      [cuidado](src/modules/cuidado/module.ts) nav `/cuidado`: mural de oração +
      casos. CCLX + cascade. A seguir: Portal do membro, engagement scoring.

---

## Fase 3 — Portal do membro ✅

> Concretizado a **2026-06-29**. Camada de engagement (self-service do membro).

- [x] [/portal](src/app/portal/page.tsx): perfil + ciclo de vida, meus grupos,
      próximos eventos, mural de oração, contagem de doações — sobre a MESMA
      espinha (sem BD paralela). Sem tabelas novas. A seguir: engagement scoring.

---

## Fase 3 — Engagement scoring ✅

> Concretizado a **2026-06-29**. Sinal derivado em [/relatorios](src/app/relatorios/page.tsx):
> pessoas sem grupo, sem doações e sem check-in = **em risco** (afastamento).
> Tecido conetivo p/ cuidado pastoral. A seguir: Instalações, Missões, Média, multi-campus.

---

## Fase 3 — Instalações, Missões, Média, Multi-campus ✅

> Concretizado a **2026-06-29**.

- [x] **Instalações** — `rooms` + `bookings` com prevenção de dupla marcação
      (sobreposição). **Missões** — `missionaries`. **Média** — `media_items`
      (sermão/podcast/devocional/livestream). **Campus** — `campuses`. 4 módulos
      (`/instalacoes`,`/missoes`,`/media`,`/campus`), CCLX + cascade.
- **Escalas:** FORA — app externa do utilizador (a integrar via API depois).
- **Fase 3 completa.** A seguir: Fase 4 — SAF-T (PT).

---

## Fase 4 — SAF-T (PT) ✅ (base)

> Concretizado a **2026-06-29**. Export dos movimentos via
> [/api/saft](src/app/api/saft/route.ts) (CSV; XML completo depois) + link em
> Finanças. **Roadmap concluído** (exceto escalas externas).

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
- [x] **Camada de plataforma** (torre de controlo) — tabela `platform_admins` e
      resolução + provisionamento JIT por allowlist
      ([src/core/platform/access.ts](src/core/platform/access.ts)).

### Módulos (`src/modules`)
- Sem módulos registados. O módulo de exemplo (Escalas) foi **removido** — app e
  base de dados — para focar primeiro no **Admin control tower**. O registo
  ([src/core/modules/registry.ts](src/core/modules/registry.ts)) está vazio e
  pronto a receber novos módulos via `defineModule()`.

### Configuração & documentação
- [x] **Drizzle config** a apanhar núcleo + todos os módulos —
      [drizzle.config.ts](drizzle.config.ts).
- [x] **Docs de arquitetura** — [docs/architecture.md](docs/architecture.md).
- [x] **Modelo de acessos** — [docs/access-model.md](docs/access-model.md).
- [x] `.env.example`, `.gitignore` (protege `.env` e `node_modules`), `LICENSE`
      (MIT), `README.md`.

---

## Base de dados (resolvida)

Schema aplicado com sucesso — **14 tabelas** (9 RBAC + 1 de plataforma
`platform_admins` + 4 de auth), com chaves estrangeiras e índices.

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

## Fase 1 — MVP (passos 1–4 ✅)

- [x] **Autenticação real** (Better Auth, email+password) — tabelas
      `user/session/account/verification` ([src/core/auth/schema.ts](src/core/auth/schema.ts)),
      adapter Drizzle + `nextCookies` ([src/core/auth/index.ts](src/core/auth/index.ts)),
      handler em [src/app/api/auth](src/app/api/auth), cliente
      ([src/core/auth/client.ts](src/core/auth/client.ts)) e páginas
      [sign-in](src/app/sign-in/page.tsx) / [sign-up](src/app/sign-up/page.tsx).
- [x] **Bootstrap + sync** — a primeira organização torna o utilizador admin
      ([src/app/bootstrap/actions.ts](src/app/bootstrap/actions.ts)); sincroniza
      módulos+permissões e ativa-os ([src/core/modules/sync.ts](src/core/modules/sync.ts)).
      Ligação auth↔domínio por `users.auth_user_id`.
- [x] **Painel de administração** — comunidades, membros, roles (+ editor de
      permissões) e ativar/desativar módulos, em [src/app/admin](src/app/admin),
      com guarda `requireOrgAdmin` ([src/app/admin/guard.ts](src/app/admin/guard.ts)).
- [x] **Navegação dos módulos via registo + `can()`** — contexto de acesso
      ([src/core/access/context.ts](src/core/access/context.ts)) e dashboard
      ([src/app/dashboard/page.tsx](src/app/dashboard/page.tsx)).
- [x] **Admin control tower (camada de plataforma)** — staff que gere TODOS os
      tenants, acima das organizações, em [src/app/platform](src/app/platform)
      (visão geral, organizações, admins), com guarda `requirePlatformAdmin`
      ([src/app/platform/guard.ts](src/app/platform/guard.ts)). Acesso por
      allowlist `PLATFORM_ADMIN_EMAILS` (provisionamento JIT no 1.º acesso). Não
      passa pelo `can()`.

### A seguir
- [ ] **Torre de controlo:** detalhe por tenant, gerir/convidar staff (em vez de
      só allowlist), métricas.
- [ ] Convidar/associar membros (criar membership a partir de utilizador auth).

### Roadmap (resumo, atualizado 2026-06-29)
- **Fase 1 (MVP):** Pessoas, Doações, Check-in, Comunicação, Eventos, Grupos ✅ — falta **Relatórios**.
- **Fase 2:** **Finanças/contabilidade** (só isto).
- **Fase 3:** Cuidado pastoral & oração, Portal do membro, *engagement scoring*, Instalações, Missões/evangelismo, Média/livestream, analytics avançado, multi-campus.
- **Fase 4:** **SAF-T (PT)**.
- **Removido (por agora):** Planeamento de louvor. **Escalas:** app externa (integração futura).

---

## Mapa rápido

| Área | Ficheiro | Estado |
|---|---|---|
| Schema RBAC | [src/core/db/schema.ts](src/core/db/schema.ts) | ✅ |
| Cliente DB | [src/core/db/index.ts](src/core/db/index.ts) | ✅ |
| Acesso `can()` | [src/core/access/can.ts](src/core/access/can.ts) | ✅ |
| Contrato de módulo | [src/core/modules/contract.ts](src/core/modules/contract.ts) | ✅ |
| Registo de módulos | [src/core/modules/registry.ts](src/core/modules/registry.ts) | ✅ |
| Autenticação (Better Auth) | [src/core/auth/index.ts](src/core/auth/index.ts) | ✅ login/sessões |
| Bootstrap + sync módulos | [src/app/bootstrap/actions.ts](src/app/bootstrap/actions.ts) | ✅ |
| Painel de admin | [src/app/admin](src/app/admin) | ✅ comunidades/membros/roles/módulos |
| Nav por registo + `can()` | [src/app/dashboard/page.tsx](src/app/dashboard/page.tsx) | ✅ |
| Plataforma (torre de controlo) | [src/core/platform/access.ts](src/core/platform/access.ts) · [src/app/platform](src/app/platform) | ✅ allowlist + JIT |
| Ligação à BD | `.env` | ✅ ligado (direta; pooler IPv4 opcional) |
| Aplicar schema à BD | — | ✅ 14 tabelas (9 RBAC + 1 plataforma + 4 auth) |
