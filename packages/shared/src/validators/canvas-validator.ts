import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ajv = new Ajv({ allErrors: true });
addFormats(ajv);

const schemaPath = join(dirname(fileURLToPath(import.meta.url)), '../../../../docs/schema/canvas.schema.json');
const schema = JSON.parse(readFileSync(schemaPath, 'utf-8'));
const validate = ajv.compile(schema);

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateCanvas(doc: unknown): ValidationResult {
  const valid = validate(doc) as boolean;

  return {
    valid,
    errors: valid ? [] : (validate.errors ?? []).map((error) => `${error.instancePath} ${error.message ?? ''}`),
  };
}
