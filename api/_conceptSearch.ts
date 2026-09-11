/**
 * Búsqueda de conceptos: bilingüe y por términos, no por frase literal.
 *
 * La biblioteca de Lucas está partida en dos idiomas —los títulos los escribió
 * él en castellano, los textos salen de los libros y casi siempre están en
 * inglés— y la búsqueda era un `ILIKE '%frase%'` sobre nombre y resumen. Con eso
 * "peón aislado" traía 2 resultados y "isolated pawn", sobre los MISMOS datos,
 * traía 6: el modelo se enteraba de la mitad de lo que Lucas estudió, según el
 * idioma en el que se le ocurriera preguntar. El parche anterior fue avisarle en
 * la descripción de la herramienta que buscara dos veces, lo que le costaba una
 * vuelta del bucle y dependía de que se acordara.
 *
 * Lo que arregla el caso de raíz es búsqueda semántica, y no está: xAI no tiene
 * modelo de embeddings y es la única clave configurada. Esto es lo que se puede
 * hacer sin ellos, y alcanza para el problema real:
 *
 *  - se parte la consulta en términos y se puntúa por cuántos entran, así una
 *    frase que no está textual igual encuentra ("peón aislado" pega con un
 *    resumen que dice "isolated pawns on the d-file");
 *  - se expanden los términos con el glosario de abajo, así preguntar en
 *    cualquiera de los dos idiomas busca en los dos;
 *  - se comparan sin tildes, porque los títulos las tienen y las consultas del
 *    modelo no siempre.
 */
export const TERM_GROUPS: string[][] = [
  ['peon aislado', 'peones aislados', 'isolated pawn', 'isolated pawns', 'isolani'],
  ['peon doblado', 'peones doblados', 'doubled pawn', 'doubled pawns'],
  ['peon pasado', 'peones pasados', 'passed pawn', 'passed pawns', 'peon libre'],
  ['peon retrasado', 'backward pawn', 'peon atrasado'],
  ['peon colgante', 'peones colgantes', 'hanging pawns'],
  ['cadena de peones', 'pawn chain', 'estructura de peones', 'pawn structure'],
  ['mayoria de peones', 'pawn majority', 'mayoria en el flanco'],
  ['peon de dama', 'queen pawn'],
  ['columna abierta', 'open file', 'columna semiabierta', 'half-open file', 'semi-open file'],
  ['diagonal abierta', 'open diagonal'],
  ['casilla debil', 'casillas debiles', 'weak square', 'weak squares', 'hole'],
  ['puesto avanzado', 'outpost'],
  ['centro', 'center', 'centre', 'control del centro', 'central control'],
  ['espacio', 'space advantage', 'ventaja de espacio'],
  ['desarrollo', 'development', 'tempo', 'iniciativa', 'initiative'],
  ['movilidad', 'mobility'],
  ['pieza mala', 'bad piece', 'alfil malo', 'bad bishop', 'alfil bueno', 'good bishop'],
  ['pareja de alfiles', 'bishop pair', 'two bishops'],
  ['alfiles de distinto color', 'opposite colored bishops', 'opposite-colored bishops'],
  ['caballo', 'knight'],
  ['alfil', 'bishop'],
  ['torre', 'rook'],
  ['dama', 'queen'],
  ['rey', 'king'],
  ['septima fila', 'seventh rank', 'torre en septima'],
  ['seguridad del rey', 'king safety', 'rey expuesto', 'exposed king'],
  ['ataque al rey', 'king attack', 'ataque de mate', 'mating attack'],
  ['enroque', 'castling', 'enroques opuestos', 'opposite side castling'],
  ['clavada', 'pin', 'clavado'],
  ['enfilada', 'skewer'],
  ['ataque doble', 'double attack', 'horquilla', 'fork'],
  ['pieza sobrecargada', 'overloaded piece', 'overworked piece'],
  ['descubierta', 'discovered attack'],
  ['sacrificio', 'sacrifice', 'sacrificio posicional', 'positional sacrifice'],
  ['cambio', 'exchange', 'cambiar piezas', 'trade', 'trades'],
  ['profilaxis', 'prophylaxis', 'jugada profilactica', 'prophylactic move'],
  ['plan', 'planning', 'plan de juego'],
  ['maniobra', 'maneuver', 'manoeuvre', 'reagrupamiento', 'regrouping'],
  ['finales', 'endgame', 'final', 'endgames'],
  ['final de peones', 'pawn endgame', 'king and pawn endgame'],
  ['final de torres', 'rook endgame', 'rook endings'],
  ['rey activo', 'active king', 'centralizar el rey', 'king activity'],
  ['zugzwang', 'zugzwang'],
  ['casillas de la misma color', 'color complex', 'complejo de casillas'],
  ['ventaja material', 'material advantage', 'material'],
  ['compensacion', 'compensation'],
  ['contrajuego', 'counterplay'],
  ['ataque de las minorias', 'minority attack'],
  ['avance de peones', 'pawn storm', 'avalancha de peones'],
  ['apertura', 'opening'],
  ['medio juego', 'middlegame'],
  ['bloqueo', 'blockade', 'bloquear'],
  ['debilidad', 'weakness', 'debilidades', 'weaknesses'],
  ['dos debilidades', 'two weaknesses', 'principio de las dos debilidades'],
  ['presion', 'pressure'],
  ['restriccion', 'restriction', 'restringir'],
  ['dominio', 'domination'],
  ['simplificar', 'simplification', 'simplificacion'],
];

/** Palabras que no aportan nada como término de búsqueda. */
const SEARCH_STOPWORDS = new Set([
  'el', 'la', 'los', 'las', 'un', 'una', 'de', 'del', 'en', 'con', 'sin', 'por',
  'para', 'que', 'como', 'sobre', 'mi', 'su', 'al', 'lo', 'es', 'son', 'the',
  'a', 'an', 'of', 'in', 'on', 'with', 'without', 'for', 'to', 'and', 'or',
  'is', 'are', 'what', 'why', 'how', 'esto', 'esta', 'este', 'acá', 'aca',
  'hay', 'tiene', 'dice', 'mejor', 'peor',
]);

/** Sin tildes y en minúsculas, igual que el `translate()` del SQL. */
const foldAccents = (text: string): string =>
  text
    .toLowerCase()
    .replace(/[áàä]/g, 'a')
    .replace(/[éèë]/g, 'e')
    .replace(/[íìï]/g, 'i')
    .replace(/[óòö]/g, 'o')
    .replace(/[úùü]/g, 'u')
    .replace(/ñ/g, 'n');

/**
 * De una consulta a los términos a buscar, en dos niveles.
 *
 * La distinción es lo que hace que esto sirva. Expandir todo por igual —que fue
 * el primer intento— devuelve doce resultados para cualquier consulta: pedir
 * "seguridad del rey" arrastra "rey", y "rey" está en media biblioteca. Un
 * buscador que siempre contesta lo mismo no informa nada.
 *
 *  - `terms`: la consulta entera y los términos de los grupos del glosario que
 *    activó, en los dos idiomas. Son lo específico, y pesan.
 *  - `words`: las palabras sueltas en las que se parte una consulta larga.
 *    Sirven para encontrar algo cuando ningún término pegó, no para rankear.
 */
export const expandConceptQuery = (query: string): { terms: string[]; words: string[] } => {
  const folded = foldAccents(query.trim());
  if (!folded) return { terms: [], words: [] };

  // Qué término activó cada grupo. Se guarda el más largo: es el más específico.
  const matches = TERM_GROUPS.map(group => {
    const hits = group.filter(term => folded.includes(term) || term === folded);
    return { group, matched: hits.sort((a, b) => b.length - a.length)[0] };
  }).filter((m): m is { group: string[]; matched: string } => m.matched !== undefined);

  // Entre dos grupos que se solapan gana el más específico: "seguridad del rey"
  // también contiene "rey", y traer todo el grupo de "rey" por eso es lo que
  // inundaba la búsqueda.
  const specific = matches.filter(
    m => !matches.some(other => other !== m && other.matched.length > m.matched.length && other.matched.includes(m.matched))
  );

  const terms = new Set<string>([folded]);
  for (const m of specific) for (const term of m.group) terms.add(term);

  const words = new Set<string>();
  for (const word of folded.split(/[^a-z0-9-]+/)) {
    if (word.length >= 4 && !SEARCH_STOPWORDS.has(word) && !terms.has(word)) words.add(word);
  }
  return { terms: [...terms], words: [...words] };
};

/** Un término del glosario pesa como tres palabras sueltas. */
export const TERM_WEIGHT = 3;
