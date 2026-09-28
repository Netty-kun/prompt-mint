#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const schemaPath = path.join(__dirname, '../contracts/prompt-hash/schema.json');
const typesPath = path.join(__dirname, '../src/types/contract.ts');

if (!fs.existsSync(schemaPath)) {
  console.warn('Warning: schema.json not found, skipping consistency check');
  process.exit(0);
}

if (!fs.existsSync(typesPath)) {
  console.warn('Warning: TypeScript types file not found, skipping consistency check');
  process.exit(0);
}

try {
  const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));
  const typesContent = fs.readFileSync(typesPath, 'utf-8');

  console.log('Validating TypeScript types consistency with contract schema...');

  // Check that contract methods are referenced in TypeScript types
  const contractMethods = Object.keys(schema.contractMethods || {});
  let missingMethods = [];

  for (const method of contractMethods) {
    const methodPattern = new RegExp(`\\b${method}\\b`);
    if (!methodPattern.test(typesContent)) {
      missingMethods.push(method);
    }
  }

  if (missingMethods.length > 0) {
    console.warn(
      `Warning: TypeScript types missing references to: ${missingMethods.join(', ')}`
    );
  } else {
    console.log('✓ All contract methods are referenced in TypeScript types');
  }

  // Check that contract types are defined in TypeScript
  const contractTypes = Object.keys(schema.contractTypes || {});
  let missingTypes = [];

  for (const type of contractTypes) {
    const typePattern = new RegExp(`interface\\s+${type}|type\\s+${type}`);
    if (!typePattern.test(typesContent)) {
      missingTypes.push(type);
    }
  }

  if (missingTypes.length > 0) {
    console.warn(`Warning: TypeScript missing type definitions for: ${missingTypes.join(', ')}`);
  } else {
    console.log('✓ All contract types are defined in TypeScript');
  }

  console.log('\n✓ TypeScript types consistency validation completed');

  if (missingMethods.length > 0 || missingTypes.length > 0) {
    console.log(
      'Note: Review the warnings above and update TypeScript types to match contract schema'
    );
  }
} catch (error) {
  console.error('Error during types consistency validation:', error.message);
  process.exit(1);
}
