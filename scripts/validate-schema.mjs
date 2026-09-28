#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const schemaPath = path.join(__dirname, '../contracts/prompt-hash/schema.json');

if (!fs.existsSync(schemaPath)) {
  console.error('Error: Contract schema.json not found');
  process.exit(1);
}

try {
  const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));

  console.log('✓ Schema is valid JSON');

  // Validate required schema properties
  const requiredProps = ['contractMethods', 'contractTypes'];
  const missingProps = requiredProps.filter(prop => !(prop in schema));

  if (missingProps.length > 0) {
    console.error(`Error: Missing required schema properties: ${missingProps.join(', ')}`);
    process.exit(1);
  }

  console.log('✓ Schema contains required properties');
  console.log(`✓ Contract defines ${Object.keys(schema.contractMethods || {}).length} methods`);
  console.log(`✓ Contract defines ${Object.keys(schema.contractTypes || {}).length} types`);

  console.log('\n✓ Soroban schema validation passed');
} catch (error) {
  console.error('Error parsing schema.json:', error.message);
  process.exit(1);
}
