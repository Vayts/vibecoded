import { PRODUCT_ROLE_CONFIG } from '../constants/product-role-config.constants.js';
import type { ProductRole } from '../types/product-role.types.js';
import type { ProductRoleConfig } from '../types/goal-fit.types.js';

export function getProductRoleConfig(role: ProductRole): ProductRoleConfig {
  return PRODUCT_ROLE_CONFIG[role] ?? PRODUCT_ROLE_CONFIG.generic_food;
}

export function shouldSuppressLowRiskPositives(roleConfig: ProductRoleConfig): boolean {
  return roleConfig.suppressLowRiskPositives ?? false;
}
