// El paquete de Lichess declara el módulo "@lichess-org/stockfish-web" pero no
// los subpaths de cada build, que es como se importa el que uno quiere.
declare module '@lichess-org/stockfish-web/sf_19.js' {
  const makeStockfish: (opts: {
    locateFile?: (file: string) => string;
    wasmMemory?: WebAssembly.Memory;
  }) => Promise<unknown>;
  export default makeStockfish;
}
