/** Pedido de acesso a avaliar pela resolução. */
export interface AccessRequest {
  /** Utilizador que faz o pedido. */
  userId: string;
  /** Organização (tenant) do pedido. */
  organizationId: string;
  /** Permissão necessária, ex.: 'escalas.escala.editar'. */
  permission: string;
  /** Chave do módulo dono da permissão, ex.: 'escalas'. */
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
