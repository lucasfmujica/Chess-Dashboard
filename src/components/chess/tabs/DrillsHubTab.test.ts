import { describe, it, expect } from 'vitest';
import { drillsViewFromTab } from './DrillsHubTab';

describe('drillsViewFromTab', () => {
  it('resuelve cada pestaña de Ejercicios, incluida drills-conversion', () => {
    expect(drillsViewFromTab('drills')).toBe('calculation');
    expect(drillsViewFromTab('drills-endgames')).toBe('endgames');
    expect(drillsViewFromTab('drills-conversion')).toBe('conversion');
  });
});
