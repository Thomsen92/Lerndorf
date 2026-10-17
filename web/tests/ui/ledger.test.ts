import { describe, it, expect } from 'vitest';
import { formatWhen, REASON_LABEL } from '../../src/ui/ledgerView';

describe('ledger labels', () => {
  it('names every booking reason in German', () => {
    for (const reason of ['task', 'stamp', 'purchase', 'refund', 'teacher']) {
      expect(REASON_LABEL[reason]).toBeTruthy();
    }
  });
});

describe('formatWhen', () => {
  it('shows day, month and time in Berlin time', () => {
    // 2026-10-17 10:05 UTC is 12:05 in Berlin (summer time)
    expect(formatWhen('2026-10-17T10:05:00Z')).toMatch(/17\.10\..*12:05/);
  });
});
