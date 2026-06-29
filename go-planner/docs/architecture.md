# Arquitetura — Go Planner

Plataforma modular de gestão de igreja, construída como **modular monolith**.

## Camadas

1. **Plataforma / admin core** (`src/core`) — utilizadores, roles, registo de
   organizações e de módulos. É o teu código, não vem de bibliotecas.
2. **Tenancy & acessos** — organização → comunidades; resolução `role × âmbito ×
   módulo` no serviço `can()`.
3. **Módulos** (`src/modules`) — funcionalidades plugáveis registadas via
   manifesto e geridas por acesso.

## Modelo de identidade (3 camadas)

Mantém as três camadas SEPARADAS:

- **Account** — identidade de login **GLOBAL** (Better Auth `user`), ao nível da
  plataforma. Uma conta pode pertencer a **vários** tenants.
- **Person** — registo de congregação dentro de **um** tenant (tabela `people`).
  É um registo de DOMÍNIO (quem a pessoa é), nunca de login. A maioria das
  pessoas nunca faz login — uma Person é útil **sem** Account.
- **Membership** — a **ponte**: liga uma conta global a um tenant
  (`account_id` → `organization_id`), com um role, um âmbito (`community_id`
  opcional) e um `person_id` **opcional** (null = operador puro, sem registo de
  congregação). A autorização é **sempre** scoped ao tenant da membership.

> Regra: nunca pôr campos de auth na Person; os roles vivem na Membership, não na
> Person; desativar um login ≠ apagar uma pessoa.

## Multi-tenancy

- A **conta é global**; o **tenant ativo** resolve-se pela membership — cookie de
  org ativa (`goplanner.active_org`) quando a conta pertence a vários tenants,
  exposto na UI por um **switcher**.
- O âmbito dentro do tenant (organização vs comunidade) vem do `community_id` da
  membership (null = âmbito de organização).
- O schema é many-to-many — uma conta pode ter várias memberships (vários tenants
  e/ou várias comunidades).
- **Isolamento (decisão: híbrido).** Toda a entidade carrega `organization_id`; o
  filtro de tenant é centralizado em
  [src/core/db/tenant.ts](../src/core/db/tenant.ts) — um único sítio, preparado
  para ligar **Row-Level Security** do Postgres.

## Níveis de administração

- **Admin de plataforma (torre de controlo)** — camada SEPARADA e ACIMA das
  organizações: staff que gere todos os tenants. Não pertence a nenhuma
  organização (não usa `users`/`memberships`); a identidade vem do Better Auth e
  o acesso é provisionado por allowlist de emails (`PLATFORM_ADMIN_EMAILS`). Vive
  em `src/core/platform` + `src/app/platform`. **NÃO** passa pelo `can()` (que é
  scoped a org/comunidade).
- **Admin de organização** — conta com `MEMBERSHIP` org-wide (`community_id` NULL e
  `role.isOrgAdmin = true`) nesse tenant. Vê toda a organização (atalho org-wide
  no `can()`).
- **Admin de comunidade** — uma `MEMBERSHIP` por comunidade que administra. Role
  poderoso, mas continua a passar pelo check de âmbito.

## Contrato de módulo

Cada módulo declara um `ModuleManifest` (`src/core/modules/contract.ts`):
identidade + dependências, permissões, navegação, widgets, eventos, definições e
lifecycle. A plataforma lê o manifesto e orquestra tudo.

Regra de scoping: toda a entidade de módulo carrega `organization_id` +
`community_id`.

## i18n / moeda / região (fundação)

Construído cedo (caro de retroativar):

- **Línguas** — next-intl (sem routing por locale): catálogos `messages/pt.json`
  e `messages/en.json`; resolução por cookie do utilizador → default da
  organização → sistema (`src/i18n/`). Strings via `t()`; seletor de idioma em
  `src/components/LanguageSwitcher.tsx`. A migração das restantes páginas é
  incremental.
- **Moeda** — `src/core/money`: SEMPRE inteiro em unidades menores + ISO 4217
  (nunca float); zero-decimais (JPY) e formatação por `Intl.NumberFormat`.
- **Região** — `organizations.{locale,currency,country,timezone}` (config, não
  código): conduz formatação, moeda, fuso, recibos fiscais, métodos de pagamento
  e residência de dados. Lançar país = mudar definições.- **GDPR** — `consents` (auditable, por pessoa+finalidade) + `people.special_category`
  e `retention_until`. Esquecimento: apagar a Person (tenant) apaga consents +
  memberships; a CONTA global sobrevive. Person/tenant = unidade de erasure.
- **Workflow engine** — `workflows` (trigger→condições→ações, JSON) + `workflow_runs`
  + `tasks`; `dispatch()` em `src/core/workflows`. Triggers do sistema (ex.:
  person.created) correm automações por tenant. Defensivo (nunca quebra o fluxo).