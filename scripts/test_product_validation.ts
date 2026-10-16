import assert from 'assert';
import {
  validateAndSanitizeProduct,
  isAccessoryCategory,
  isComputerSystemCategory,
  COMPUTER_SPEC_KEYS,
} from '../src/lib/product-validation';

console.log('================================================================');
console.log('🧪 CATEGORY-SPECIFIC PRODUCT VALIDATION TEST SUITE');
console.log('================================================================\n');

let passed = 0;

function test(description: string, fn: () => void) {
  try {
    fn();
    console.log(`✅ PASS: ${description}`);
    passed++;
  } catch (err: any) {
    console.error(`❌ FAIL: ${description}`);
    console.error(err);
    process.exit(1);
  }
}

// 1. Accessory category detection
test('isAccessoryCategory recognizes "Accessories" and related variants', () => {
  assert(isAccessoryCategory('Accessories'));
  assert(isAccessoryCategory('accessories'));
  assert(isAccessoryCategory('Accessory'));
  assert(isAccessoryCategory('Keyboard'));
  assert(isAccessoryCategory('Mouse'));
  assert(!isAccessoryCategory('Laptop'));
  assert(!isAccessoryCategory('Desktop'));
  assert(!isAccessoryCategory('Custom PC'));
});

// 2. Stripping computer specifications from accessories
test('validateAndSanitizeProduct strips all computer specs (CPU, RAM, SSD, GPU) for Accessories', () => {
  const dirtyAccessoryInput = {
    name: 'Hammok Wireless Combo Keyboard & Mouse',
    category: 'Accessories',
    brand: 'Hammok',
    cpu: 'Intel Core i5',
    generation: '10th Gen',
    ram: '8GB',
    ramType: 'DDR4',
    storage: '256GB SSD',
    storageType: 'NVMe SSD',
    gpu: 'Intel UHD Graphics',
    displaySize: '14 Inch',
    condition: 'Refurbished Grade A',
    purchasePrice: 700,
    sellingPrice: 1199,
  };

  const { isValid, sanitized } = validateAndSanitizeProduct(dirtyAccessoryInput);
  assert(isValid, 'Validation should succeed with sanitized output');
  for (const key of COMPUTER_SPEC_KEYS) {
    assert.strictEqual(
      sanitized[key],
      null,
      `Spec field "${key}" must be sanitized to null for accessories`
    );
  }
  assert.strictEqual(sanitized.condition, 'Brand New', 'Condition should be sanitized to Brand New');
  assert.strictEqual(sanitized.purchasePrice, 700, 'Purchase cost must be preserved');
  assert.strictEqual(sanitized.sellingPrice, 1199, 'Selling price must be preserved');
});

// 3. Computer systems preserve computer specifications
test('validateAndSanitizeProduct preserves computer specs for Laptop / Desktop / Custom PC', () => {
  const laptopInput = {
    name: 'Dell Latitude 5410',
    category: 'Laptop',
    brand: 'Dell',
    cpu: 'Intel Core i5',
    generation: '10th Gen',
    ram: '16GB',
    ramType: 'DDR4',
    storage: '512GB SSD',
    storageType: 'NVMe SSD',
    condition: 'Refurbished Grade A',
  };

  const { isValid, sanitized } = validateAndSanitizeProduct(laptopInput);
  assert(isValid);
  assert.strictEqual(sanitized.cpu, 'Intel Core i5');
  assert.strictEqual(sanitized.ram, '16GB');
  assert.strictEqual(sanitized.storage, '512GB SSD');
  assert.strictEqual(sanitized.condition, 'Refurbished Grade A');
});

// 4. SSD component strips CPU/RAM but preserves storage
test('validateAndSanitizeProduct strips CPU/RAM from SSD components while preserving storage', () => {
  const ssdInput = {
    name: 'Crucial BX500 500GB SSD',
    category: 'SSD',
    brand: 'Crucial',
    cpu: 'Intel Core i7',
    ram: '16GB',
    storage: '500GB',
    storageType: 'SATA SSD',
  };

  const { isValid, sanitized } = validateAndSanitizeProduct(ssdInput);
  assert(isValid);
  assert.strictEqual(sanitized.cpu, null, 'SSD should not have CPU');
  assert.strictEqual(sanitized.ram, null, 'SSD should not have RAM');
  assert.strictEqual(sanitized.storage, '500GB', 'SSD storage must be preserved');
});

// 5. Service items have no hardware specs and 0 stock
test('validateAndSanitizeProduct strips all hardware specs and zeros stock for Services', () => {
  const serviceInput = {
    name: 'Laptop Deep Clean & Thermal Paste',
    category: 'Repair Service',
    productType: 'SERVICE',
    cpu: 'Intel Core i5',
    storage: '1TB',
    currentStock: 10,
  };

  const { isValid, sanitized } = validateAndSanitizeProduct(serviceInput);
  assert(isValid);
  assert.strictEqual(sanitized.cpu, null);
  assert.strictEqual(sanitized.storage, null);
  assert.strictEqual(sanitized.currentStock, 0);
  assert.strictEqual(sanitized.condition, 'Service');
});

console.log('\n================================================================');
console.log(`🎉 ALL ${passed} CATEGORY VALIDATION TESTS PASSED!`);
console.log('================================================================\n');
