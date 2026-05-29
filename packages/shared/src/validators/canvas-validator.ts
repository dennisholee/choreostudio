import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { createRequire } from 'node:module';

const CANVAS_SCHEMA_VERSION = '0.1.0';
const require = createRequire(import.meta.url);
const schema = require('../../../../docs/schema/canvas.schema.json');

const ajv = new Ajv({ allErrors: true });
ajv.addVocabulary(['version', 'x-merge-class']);
addFormats(ajv);

const validate = ajv.compile(schema);

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function validateCanvas(doc: unknown): ValidationResult {
  const versionErrors =
    isRecord(doc) && doc.schemaVersion === CANVAS_SCHEMA_VERSION
      ? []
      : [`/schemaVersion must be ${CANVAS_SCHEMA_VERSION}`];
  const schemaValid = validate(doc) as boolean;
  const schemaErrors = schemaValid
    ? []
    : (validate.errors ?? []).map((error) => `${error.instancePath || '/'} ${error.message ?? ''}`.trim());

  return {
    valid: versionErrors.length === 0 && schemaValid,
    errors: [...versionErrors, ...schemaErrors],
  };
}
