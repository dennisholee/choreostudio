import { describe, expect, it } from 'vitest';
import { checkPastTense } from '../utils/past-tense-checker';

describe('checkPastTense', () => {
  it('accepts past tense labels', () => {
    expect(checkPastTense('OrderPlaced').valid).toBe(true);
    expect(checkPastTense('UserCreated').valid).toBe(true);
    expect(checkPastTense('PaymentCompleted').valid).toBe(true);
  });

  it('rejects non-past-tense labels', () => {
    expect(checkPastTense('PlaceOrder').valid).toBe(false);
    expect(checkPastTense('CreateUser').valid).toBe(false);
  });

  it('returns a helpful suggestion', () => {
    const result = checkPastTense('PlaceOrder');
    expect(result.message).toContain('past tense');
  });
});
