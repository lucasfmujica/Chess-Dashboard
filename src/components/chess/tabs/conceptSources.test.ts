import { describe, it, expect } from 'vitest';
import { SOURCE_TYPES, sourceOptions } from './conceptSources';

describe('sourceOptions', () => {
  it('devuelve la lista tal cual si el valor es conocido o vacío', () => {
    expect(sourceOptions('book')).toBe(SOURCE_TYPES);
    expect(sourceOptions(undefined)).toBe(SOURCE_TYPES);
  });

  it('agrega un valor desconocido con la etiqueta "Clase"', () => {
    const opts = sourceOptions('lesson-profe-x');
    expect(opts).toHaveLength(SOURCE_TYPES.length + 1);
    expect(opts[opts.length - 1]).toEqual({ value: 'lesson-profe-x', label: 'Clase' });
  });
});
