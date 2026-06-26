# Modelo de acessos

## Resolução: `can(req)`

Quando um utilizador tenta uma ação num módulo, o serviço `can()`
(`src/core/access/can.ts`) decide por esta ordem — falha cedo, falha barato:

1. **Admin da organização?** — membership org-wide com `isOrgAdmin`. Sim →
   acesso total (ignora o resto).
2. **Módulo ativo na organização?** — consulta `organization_modules`. Não →
   nega.
3. **Âmbito coincide?** — existe uma membership cuja comunidade cobre o pedido?
   Não → nega.
4. **Role concede a permissão?** — sim → concede, não → nega.

## Permissões

Formato: `modulo.recurso.acao` (ex.: `eventos.evento.editar`).

A permissão diz apenas **o quê**. O **onde** (a comunidade) vem da membership,
aplicado no passo 3 da resolução — nunca embutas o âmbito no nome da permissão.

## Roles

Definidos por organização (`roles.organization_id`). Um role é um pacote de
permissões (`role_permissions`). O admin de organização usa a flag
`isOrgAdmin` em vez de enumerar permissões — assim cobre módulos futuros
automaticamente.

## Regra de ouro

Esta resolução vive num único sítio. Nenhum módulo a reimplementa: todos chamam
`can()`. Uma correção de segurança faz-se num lugar só.

## Plataforma (torre de controlo)

Os **admins de plataforma** são uma camada à parte, ACIMA das organizações
(staff que gere todos os tenants). **NÃO** passam pelo `can()` — este é scoped a
org/comunidade. O acesso é provisionado por allowlist de emails
(`PLATFORM_ADMIN_EMAILS`): quem está na lista é ativado (JIT) no primeiro acesso
a `/platform`, e o primeiro de todos fica `owner`. Resolução em
`src/core/platform/access.ts`; guarda `requirePlatformAdmin` em
`src/app/platform/guard.ts`.
