export const SOURCE_TYPES = [
  { value: 'book', label: 'Libro' },
  { value: 'studer', label: 'Curso Studer' },
  { value: 'lesson-profe', label: 'Clase del profe' },
  { value: 'lesson-juancruz', label: 'Clase Juan Cruz' },
  { value: 'video', label: 'Video' },
];

/** SOURCE_TYPES plus the draft's own value when it isn't listed, so it never renders blank. */
export const sourceOptions = (current?: string) =>
  current && !SOURCE_TYPES.some(s => s.value === current)
    ? [...SOURCE_TYPES, { value: current, label: 'Clase' }]
    : SOURCE_TYPES;
