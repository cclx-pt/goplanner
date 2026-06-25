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

## Dois níveis de administração

- **Admin de organização** — `MEMBERSHIP` com `community_id` NULL e
  `role.isOrgAdmin = true`. Vê toda a organização (atalho org-wide no `can()`).
- **Admin de comunidade** — uma `MEMBERSHIP` por comunidade que administra. Role
  poderoso, mas continua a passar pelo check de âmbito.

## Contrato de módulo

Cada módulo declara um `ModuleManifest` (`src/core/modules/contract.ts`):
identidade + dependências, permissões, navegação, widgets, eventos, definições e
lifecycle. A plataforma lê o manifesto e orquestra tudo. Ver
`src/modules/escalas/manifest.ts` como exemplo.

Regra de scoping: toda a entidade de módulo carrega `organization_id` +
`community_id`.
