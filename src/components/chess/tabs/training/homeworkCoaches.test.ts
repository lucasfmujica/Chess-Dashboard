import { describe, it, expect } from 'vitest';
import { coachOptions, defaultCoach } from './homeworkCoaches';

const hw = (...coaches: string[]) => coaches.map(coach => ({ coach }));

describe('defaultCoach', () => {
  it('usa el coach más frecuente distinto de Juan Cruz', () => {
    expect(defaultCoach(hw('Juan Cruz', 'Juan Cruz', 'Juan Cruz', 'Profe X', 'Profe X', 'Otro'))).toBe('Profe X');
  });

  it('cae a "Profe" sin tareas o solo con Juan Cruz', () => {
    expect(defaultCoach([])).toBe('Profe');
    expect(defaultCoach(hw('Juan Cruz'))).toBe('Profe');
  });
});

describe('coachOptions', () => {
  it('une valor actual, coaches de los datos y Juan Cruz, sin duplicados ni vacíos', () => {
    expect(coachOptions('Profe X', hw('Profe X', '', 'Juan Cruz', 'Otro'))).toEqual(['Profe X', 'Juan Cruz', 'Otro']);
  });

  it('conserva un valor actual desconocido al editar', () => {
    expect(coachOptions('Desconocido', hw('Profe X'))).toContain('Desconocido');
  });
});
