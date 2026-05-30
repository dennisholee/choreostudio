import Ajv from 'ajv';
import schema from '../schema/canvas.schema.json';

const CANVAS_SCHEMA_VERSION = '0.1.0';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ajv = new (Ajv as any)({ allErrors: true, strict: false });
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
