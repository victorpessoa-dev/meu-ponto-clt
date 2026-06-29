export const JUSTIFICATION_LABELS = {
  falta: "Falta justificada",
  atestado: "Atestado medico",
  ferias: "Ferias",
  folga: "Folga",
  abono: "Abono de horas",
}

// Jornada padrao: dom 0, seg-sex 8h (480), sab 4h (240).
export const DEFAULT_SCHEDULE = [0, 480, 480, 480, 480, 480, 240]

export const PUNCH_FIELD_OPTIONS = [
  { key: "entry", label: "Entrada" },
  { key: "breakTime", label: "Pausa" },
  { key: "returnTime", label: "Retorno" },
  { key: "exit", label: "Saida" },
]

// Batidas padrao: dom folga, seg-sex completo, sabado apenas entrada/saida.
export const DEFAULT_PUNCH_FIELDS = [
  [],
  ["entry", "breakTime", "returnTime", "exit"],
  ["entry", "breakTime", "returnTime", "exit"],
  ["entry", "breakTime", "returnTime", "exit"],
  ["entry", "breakTime", "returnTime", "exit"],
  ["entry", "breakTime", "returnTime", "exit"],
  ["entry", "exit"],
]
