import { BadRequestError } from '../errors.js';

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function requireObject(value: unknown, message = 'Request body must be an object'): Record<string, unknown> {
  if (!isRecord(value)) {
    throw new BadRequestError(message);
  }

  return value;
}

export function requireString(
  body: Record<string, unknown>,
  field: string,
  message = `${field} is required`,
): string {
  const value = body[field];

  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new BadRequestError(message);
  }

  return value.trim();
}

export function optionalString(body: Record<string, unknown>, field: string): string | undefined {
  const value = body[field];

  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== 'string') {
    throw new BadRequestError(`${field} must be a string`);
  }

  const trimmed = value.trim();
  if (trimmed.length === 0) {
    throw new BadRequestError(`${field} must not be empty`);
  }

  return trimmed;
}

export function assertSlug(slug: string, field = 'slug'): void {
  if (!SLUG_PATTERN.test(slug)) {
    throw new BadRequestError(`${field} must be lowercase kebab-case`);
  }
}
