# Arquitetura — Go Planner

Plataforma modular de gestão de igreja, construída como **modular monolith**.

## Camadas

1. **Plataforma / admin core** (`src/core`) — utilizadores, roles, registo de
   organizações e de módulos. É o teu código, não vem de bibliotecas.
2. **Tenancy & acessos** — organização → comunidades; resolução `role × âmbito ×
   módulo` no serviço `can()`.
3. **Módulos** (`src/modules`) — funcionalidades plugáveis registadas via
   manifesto e geridas por acesso.

## Multi-tenancy

- O `USER` pertence a **uma** organização (fronteira do tenant).
- A pertença a **comunidades** é feita via `MEMBERSHIP` (tabela de associação),
  que liga utilizador + comunidade + role.
- Por agora impõe-se **uma comunidade por membro** na validação/UI, mas o schema
  é many-to-many — admins de comunidade podem ter várias memberships sem mexer
  no esquema.

## Níveis de administração

- **Admin de plataforma (torre de controlo)** — camada SEPARADA e ACIMA das
  organizações: staff que gere todos os tenants. Não pertence a nenhuma
  organização (não usa `users`/`memberships`); a identidade vem do Better Auth e
  o acesso é provisionado por allowlist de emails (`PLATFORM_ADMIN_EMAILS`). Vive
  em `src/core/platform` + `src/app/platform`. **NÃO** passa pelo `can()` (que é
  scoped a org/comunidade).
- **Admin de organização** — `MEMBERSHIP` com `community_id` NULL e
  `role.isOrgAdmin = true`. Vê toda a organização (atalho org-wide no `can()`).
- **Admin de comunidade** — uma `MEMBERSHIP` por comunidade que administra. Role
  poderoso, mas continua a passar pelo check de âmbito.

## Contrato de módulo

Cada módulo declara um `ModuleManifest` (`src/core/modules/contract.ts`):
identidade + dependências, permissões, navegação, widgets, eventos, definições e
lifecycle. A plataforma lê o manifesto e orquestra tudo.

Regra de scoping: toda a entidade de módulo carrega `organization_id` +
`community_id`.
