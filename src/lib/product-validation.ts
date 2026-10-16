/**
 * Category-specific product validation and spec sanitization rules.
 * Prevents computer specifications (CPU, RAM, Storage, GPU, Display) from
 * appearing on accessories, services, and non-computer components.
 */

export const COMPUTER_SPEC_KEYS = [
  'cpu',
  'generation',
  'ram',
  'ramType',
  'storage',
  'storageType',
  'gpu',
  'displaySize',
] as const;

export type ComputerSpecKey = (typeof COMPUTER_SPEC_KEYS)[number];

// Categories that represent full computer systems
export const COMPUTER_SYSTEM_CATEGORIES = [
  'laptop',
  'desktop',
  'custom pc',
  'all-in-one',
  'server',
] as const;

// Categories that represent accessories / peripherals
export const ACCESSORY_CATEGORIES = [
  'accessories',
  'accessory',
  'keyboard',
  'mouse',
  'cables',
  'adapter',
  'peripherals',
] as const;

export function isAccessoryCategory(category?: string | null): boolean {
  if (!category) return false;
  const normalized = category.trim().toLowerCase();
  return (
    ACCESSORY_CATEGORIES.some((c) => normalized === c || normalized.includes('accessor')) ||
    normalized === 'accessories'
  );
}

export function isComputerSystemCategory(category?: string | null): boolean {
  if (!category) return false;
  const normalized = category.trim().toLowerCase();
  return COMPUTER_SYSTEM_CATEGORIES.some((c) => normalized === c);
}

export interface ProductInput {
  name?: string | null;
  productType?: string | null;
  category?: string | null;
  brand?: string | null;
  model?: string | null;
  cpu?: string | null;
  generation?: string | null;
  ram?: string | null;
  ramType?: string | null;
  storage?: string | null;
  storageType?: string | null;
  gpu?: string | null;
  displaySize?: string | null;
  condition?: string | null;
  hsn?: string | null;
  gstPercent?: number | string | null;
  purchasePrice?: number | string | null;
  sellingPrice?: number | string | null;
  minStock?: number | string | null;
  initialStock?: number | string | null;
  warranty?: string | null;
  notes?: string | null;
  [key: string]: any;
}

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  sanitized: Record<string, any>;
}

/**
 * Validates category-specific constraints and sanitizes incompatible fields.
 * Specifically guarantees accessories will NEVER have computer specifications.
 */
export function validateAndSanitizeProduct(input: ProductInput): ValidationResult {
  const category = (input.category || '').trim();
  const isService =
    input.productType === 'SERVICE' ||
    category.toLowerCase() === 'service' ||
    category.toLowerCase().includes('service');

  const sanitized: Record<string, any> = { ...input };

  // 1. Service rules
  if (isService) {
    sanitized.productType = 'SERVICE';
    sanitized.brand = null;
    sanitized.model = null;
    sanitized.condition = 'Service';
    sanitized.hsn = input.hsn || '9987';
    sanitized.currentStock = 0;
    sanitized.minStock = 0;
    for (const key of COMPUTER_SPEC_KEYS) {
      sanitized[key] = null;
    }
    return { isValid: true, sanitized };
  }

  // 2. Accessories category-specific validation
  if (isAccessoryCategory(category)) {
    // Strip all computer specs for accessories
    for (const key of COMPUTER_SPEC_KEYS) {
      sanitized[key] = null;
    }

    // Default or sanitize condition for accessories:
    // If not set or set to computer default "Refurbished Grade A", set to "Brand New"
    if (!sanitized.condition || sanitized.condition === 'Refurbished Grade A') {
      sanitized.condition = 'Brand New';
    }

    // Default HSN for accessories if blank
    if (!sanitized.hsn) {
      sanitized.hsn = '8471';
    }

    return {
      isValid: true,
      sanitized,
    };
  }

  // 3. Storage components (SSD)
  if (category.toLowerCase() === 'ssd') {
    sanitized.cpu = null;
    sanitized.generation = null;
    sanitized.ram = null;
    sanitized.ramType = null;
    sanitized.gpu = null;
    sanitized.displaySize = null;
    return { isValid: true, sanitized };
  }

  // 4. Memory components (RAM)
  if (category.toLowerCase() === 'ram') {
    sanitized.cpu = null;
    sanitized.generation = null;
    sanitized.storage = null;
    sanitized.storageType = null;
    sanitized.gpu = null;
    sanitized.displaySize = null;
    return { isValid: true, sanitized };
  }

  // 5. Default/Other categories that are NOT computer systems
  if (!isComputerSystemCategory(category)) {
    for (const key of COMPUTER_SPEC_KEYS) {
      sanitized[key] = null;
    }
  }

  return { isValid: true, sanitized };
}
