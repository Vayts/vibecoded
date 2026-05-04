import type { ProductRole } from '../types/product-role.types.js';
import type { NormalizedProductV2 } from '../types/normalized-product.types.js';
import { VALIDATION_RULES } from '../constants/validation-rules.constants.js';

export function validateProductRole(role: ProductRole, product: NormalizedProductV2): boolean {
  const rule = VALIDATION_RULES[role];
  if (!rule) return true;
  return rule.check(product);
}
