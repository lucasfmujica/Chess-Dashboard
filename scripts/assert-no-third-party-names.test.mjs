// Fixtures inventadas: simulan assets del build.
import { describe, it, expect } from 'vitest';
import { checkNames } from './lib/thirdPartyNames.mjs';

const asset = (path, text) => ({ path, text });

describe('checkNames', () => {
  it('pasa con assets sin nombres prohibidos', () => {
    expect(checkNames([asset('a.js', 'console.log("hola")'), asset('b.pgn', '1. e4 e5')])).toEqual([]);
  });

  it.each([
    ['js', 'x.js', 'var a=`clase con Toto`'],
    ['minúsculas', 'x.css', '.toto{color:red}'],
    ['json', 'data/x.json', '{"coach":"TOTO"}'],
    ['pgn', 'data/x.pgn', '{ repasarla con Toto antes }'],
    ['html', 'index.html', '<p>Toto</p>'],
    ['con _', 'x.js', 'const id = "clase_toto"'],
    ['solo', 'x.js', 'Toto'],
  ])('falla con el nombre en %s', (_l, path, text) => {
    const findings = checkNames([asset(path, text)]);
    expect(findings).toHaveLength(1);
    expect(findings[0]).toContain(path);
    expect(findings[0]).not.toContain('clase con');
  });

  it('no da falso positivo con palabras que lo contienen', () => {
    expect(checkNames([asset('a.js', 'rowToTournament; mototoro; rowToTotal; toTotal; toToTal')])).toEqual([]);
  });

  it('la lista es extensible', () => {
    expect(checkNames([asset('a.js', 'hola Fulano')], ['Toto', 'Fulano'])).toHaveLength(1);
  });
});
