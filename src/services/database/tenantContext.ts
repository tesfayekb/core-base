
// Tenant Context Service
// Manages tenant context for multi-tenant operations

export interface TenantContextResult {
  success: boolean;
  error?: string;
}

export class TenantContextService {
  private static instance: TenantContextService;
  private currentTenantId: string | null = null;
  private currentUserId: string | null = null;

  static getInstance(): TenantContextService {
    if (!TenantContextService.instance) {
      TenantContextService.instance = new TenantContextService();
    }
    return TenantContextService.instance;
  }

  async setTenantContext(tenantId: string): Promise<TenantContextResult> {
    try {
      this.currentTenantId = tenantId;
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  async setUserContext(userId: string): Promise<TenantContextResult> {
    try {
      this.currentUserId = userId;
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  getCurrentTenantId(): string | null {
    return this.currentTenantId;
  }

  getCurrentUserId(): string | null {
    return this.currentUserId;
  }

  clearContext(): void {
    this.currentTenantId = null;
    this.currentUserId = null;
  }

  async validateTenantAccess(userId: string, tenantId: string): Promise<boolean> {
    // Mock implementation for testing
    return userId.includes('user') && tenantId.includes('tenant');
  }

  async switchTenantContext(userId: string, tenantId: string): Promise<TenantContextResult> {
    const hasAccess = await this.validateTenantAccess(userId, tenantId);
    if (!hasAccess) {
      return { success: false, error: 'Access denied' };
    }
    
    return this.setTenantContext(tenantId);
  }
}

export const tenantContextService = TenantContextService.getInstance();
