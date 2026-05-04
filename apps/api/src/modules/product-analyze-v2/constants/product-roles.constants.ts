import { VALID_PRODUCT_ROLES, type ProductRole } from '../types/product-role.types.js';

export { VALID_PRODUCT_ROLES } from '../types/product-role.types.js';

export const PRODUCT_ROLES: ProductRole[] = [...VALID_PRODUCT_ROLES];

export const PRODUCT_ROLE_SET: Set<string> = new Set(PRODUCT_ROLES);

export const FALLBACK_ROLE: ProductRole = 'generic_food';
export const MIN_AI_CONFIDENCE = 0.75;
