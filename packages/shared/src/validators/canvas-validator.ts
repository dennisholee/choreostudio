import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { createRequire } from 'node:module';

const CANVAS_SCHEMA_VERSION = '0.1.0';
const require = createRequire(import.meta.url);
const schema = require('../../../../docs/schema/canvas.schema.json');

// strict: false ignores unknown keywords (version, x-merge-class) without addVocabulary
const ajv = new Ajv({ allErrors: true, strict: false });
// ajv-formats v3 ships its own ajv types; cast to satisfy the type checker
// eslint-disable-next-line @typescript-eslint/no-explicit-any
addFormats(ajv as any);

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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    : (validate.errors ?? []).map((error: any) => `${error.instancePath || '/'} ${error.message ?? ''}`.trim());

  return {
    valid: versionErrors.length === 0 && schemaValid,
    errors: [...versionErrors, ...schemaErrors],
  };
}
