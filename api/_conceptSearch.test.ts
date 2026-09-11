import { describe, it, expect } from 'vitest';
import { expandConceptQuery, TERM_GROUPS } from './_conceptSearch';

/**
 * Lo que estos tests protegen es una propiedad, no una lista de resultados: que
 * preguntar en castellano y preguntar en inglés busquen lo MISMO. La biblioteca
 * tiene los títulos en castellano y los textos en inglés, así que sin eso el
 * modelo se enteraba de la mitad de lo que Lucas estudió según el idioma en el
 * que se le ocurriera preguntar.
 */
describe('expandConceptQuery', () => {
  it('busca en los dos idiomas, se pregunte en el que sea', () => {
    const es = expandConceptQuery('peón aislado');
    const en = expandConceptQuery('isolated pawn');
    expect(es.terms).toContain('isolated pawn');
    expect(en.terms).toContain('peon aislado');
    // Los dos terminan buscando el mismo conjunto: mismo resultado en la base.
    expect([...es.terms].sort()).toEqual([...en.terms].sort());
  });

  it('saca las tildes, que están en los títulos y no en las consultas', () => {
    expect(expandConceptQuery('peón aislado').terms).toContain('peon aislado');
    expect(expandConceptQuery('peon aislado').terms).toContain('isolated pawn');
  });

  it('no arrastra el grupo genérico cuando pegó uno más específico', () => {
    // "seguridad del rey" también contiene "rey". Traer todo el grupo de "rey"
    // devolvía media biblioteca para cualquier consulta sobre el rey.
    const { terms } = expandConceptQuery('seguridad del rey');
    expect(terms).toContain('king safety');
    expect(terms).not.toContain('king');
  });

  it('sí usa el grupo genérico cuando es lo único que se preguntó', () => {
    expect(expandConceptQuery('rey').terms).toContain('king');
  });

  it('mantiene los grupos que no se solapan entre sí', () => {
    const { terms } = expandConceptQuery('¿los peones doblados son una debilidad?');
    expect(terms).toContain('doubled pawns');
    expect(terms).toContain('weakness');
  });

  it('parte la consulta larga en palabras, sin las que no aportan', () => {
    const { words } = expandConceptQuery('qué dice sobre la estructura de peones');
    expect(words).not.toContain('sobre');
    expect(words).not.toContain('dice');
  });

  it('una consulta vacía no busca nada', () => {
    expect(expandConceptQuery('   ')).toEqual({ terms: [], words: [] });
  });

  it('el glosario está normalizado: sin tildes y en minúsculas', () => {
    // Se comparan contra texto ya plegado, así que una tilde acá no pegaría nunca.
    for (const group of TERM_GROUPS) {
      for (const term of group) {
        expect(term).toBe(term.toLowerCase());
        expect(term).not.toMatch(/[áéíóúñü]/);
      }
    }
  });
});
