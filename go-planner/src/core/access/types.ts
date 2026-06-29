/** Pedido de acesso a avaliar pela resolução. */
export interface AccessRequest {
  /** Conta GLOBAL (Better Auth user.id) que faz o pedido. */
  accountId: string;
  /** Organização (tenant) do pedido. */
  organizationId: string;
  /** Permissão necessária, ex.: 'eventos.evento.editar'. */
  permission: string;
  /** Chave do módulo dono da permissão, ex.: 'eventos'. */
  moduleKey: string;
  /**
   * Âmbito do pedido. NULL = âmbito de organização.
   * Preenchido = comunidade concreta.
   */
  communityId: string | null;
}

/** Membership resolvida (com o role já carregado). */
export interface ResolvedMembership {
  communityId: string | null;
  role: {
    id: string;
    isOrgAdmin: boolean;
  };
}
