import { describe, expect, it } from 'vitest';
import { detectLeakage } from './leakage.js';

describe('detectLeakage', () => {
  it('flags phone, email, and external messenger contact details', () => {
    const result = detectLeakage('mail me at demo@example.com or telegram @demo, phone 9911 2233');

    expect(result.flagged).toBe(true);
    expect(result.reasons).toHaveLength(3);
    expect(result.reasons.every(Boolean)).toBe(true);
  });

  it('resets regex state between calls', () => {
    expect(detectLeakage('call 99112233').flagged).toBe(true);
    expect(detectLeakage('no contact detail here').flagged).toBe(false);
    expect(detectLeakage('call 99112233').flagged).toBe(true);
  });
});

