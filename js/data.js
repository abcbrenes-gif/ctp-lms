// Datos base de la institución y estudiantes.
// Generado a partir de LISTA.xlsx (Proyecto "COLEGIO IA").
// Puedes editar esta lista directamente si cambian las secciones o estudiantes.

const INSTITUCION = {
  nombre: "CTP Mercedes Norte",
  especialidad: "Contabilidad",
  docente: "Andrés Brenes Conejo"
};

const ESTUDIANTES = [
  // Sección 10-1
  { id: "4-0287-0846", nombre: "VICTORIA", apellido1: "ALVARADO", apellido2: "ARAYA", seccion: "10-1", especialidad: "Contabilidad" },
  { id: "4-0287-0881", nombre: "MARIA VICTORIA", apellido1: "ARGUEDAS", apellido2: "VIQUEZ", seccion: "10-1", especialidad: "Contabilidad" },
  { id: "4-0289-0920", nombre: "KIANY", apellido1: "BLANCO", apellido2: "MOLINA", seccion: "10-1", especialidad: "Contabilidad" },
  { id: "4-0287-0500", nombre: "SANTIAGO", apellido1: "BONILLA", apellido2: "ALFARO", seccion: "10-1", especialidad: "Contabilidad" },
  { id: "4-0286-0372", nombre: "DANA PRISCILLA", apellido1: "CHAVARRIA", apellido2: "ARAYA", seccion: "10-1", especialidad: "Contabilidad" },
  { id: "4-0288-0748", nombre: "NATASHA MARIA", apellido1: "DEL VALLE", apellido2: "ARAYA", seccion: "10-1", especialidad: "Contabilidad" },
  { id: "4-0289-0425", nombre: "VALENTINA", apellido1: "GUTIERREZ", apellido2: "MURILLO", seccion: "10-1", especialidad: "Contabilidad" },
  { id: "4-0288-0526", nombre: "MATIAS", apellido1: "HERNANDEZ", apellido2: "MONTERO", seccion: "10-1", especialidad: "Contabilidad" },
  { id: "2-0930-0937", nombre: "SAUL", apellido1: "HERRERA", apellido2: "ALFARO", seccion: "10-1", especialidad: "Contabilidad" },
  { id: "4-0289-0141", nombre: "SOFIA DE LOS ANGELES", apellido1: "LEON", apellido2: "SANDI", seccion: "10-1", especialidad: "Contabilidad" },
  { id: "4-0287-0624", nombre: "JULIANA", apellido1: "ROJAS", apellido2: "UMAÑA", seccion: "10-1", especialidad: "Contabilidad" },
  { id: "1-2083-0927", nombre: "ESTEFANIA ISABEL", apellido1: "SALAZAR", apellido2: "ARRIETA", seccion: "10-1", especialidad: "Contabilidad" },
  { id: "4-0288-0906", nombre: "MARIANA JULISSA", apellido1: "SALAZAR", apellido2: "BARRIENTOS", seccion: "10-1", especialidad: "Contabilidad" },
  { id: "4-0289-0302", nombre: "BRIANA", apellido1: "SEGURA", apellido2: "SANCHEZ", seccion: "10-1", especialidad: "Contabilidad" },
  { id: "1-2093-0121", nombre: "MARIANNA", apellido1: "SILES", apellido2: "RAMIREZ", seccion: "10-1", especialidad: "Contabilidad" },
  { id: "4-0285-0003", nombre: "LUCIANA", apellido1: "VILCHEZ", apellido2: "MARTINEZ", seccion: "10-1", especialidad: "Contabilidad" },
  { id: "4-0287-0133", nombre: "ARIELA", apellido1: "VILLALOBOS", apellido2: "VILLALOBOS", seccion: "10-1", especialidad: "Contabilidad" },
  { id: "4-0286-0227", nombre: "JOEL FELIPE", apellido1: "ZARATE", apellido2: "ESQUIVEL", seccion: "10-1", especialidad: "Contabilidad" },

  // Sección 11-3
  { id: "4-0283-0991", nombre: "SAMANTHA", apellido1: "ARCE", apellido2: "RIVERA", seccion: "11-3", especialidad: "Contabilidad" },
  { id: "1-2066-0075", nombre: "DANIEL", apellido1: "CHAVES", apellido2: "VILLALOBOS", seccion: "11-3", especialidad: "Contabilidad" },
  { id: "1-2072-0308", nombre: "VALENTINA", apellido1: "GOMEZ", apellido2: "MURILLO", seccion: "11-3", especialidad: "Contabilidad" },
  { id: "4-0283-0879", nombre: "MELISSA MARIA", apellido1: "HIDALGO", apellido2: "BARRANTES", seccion: "11-3", especialidad: "Contabilidad" },
  { id: "4-0283-0632", nombre: "MARIPAZ", apellido1: "HIDALGO", apellido2: "VILLALOBOS", seccion: "11-3", especialidad: "Contabilidad" },
  { id: "4-0283-0209", nombre: "WENDY TAMARA", apellido1: "MASIS", apellido2: "CHAVES", seccion: "11-3", especialidad: "Contabilidad" },
  { id: "4-0284-0099", nombre: "MARIPAZ", apellido1: "MURILLO", apellido2: "ORTEGA", seccion: "11-3", especialidad: "Contabilidad" },
  { id: "4-0283-0405", nombre: "AMANDA DE LOS ANGELES", apellido1: "OJEDAS", apellido2: "MADRIGAL", seccion: "11-3", especialidad: "Contabilidad" },
  { id: "4-0282-0326", nombre: "MARIA CELESTE", apellido1: "OVIEDO", apellido2: "ILAMA", seccion: "11-3", especialidad: "Contabilidad" },
  { id: "1-2048-0621", nombre: "JONATAN", apellido1: "RIOS", apellido2: "VILLALOBOS", seccion: "11-3", especialidad: "Contabilidad" },
  { id: "1-2061-0817", nombre: "DANISHA", apellido1: "RODRIGUEZ", apellido2: "LOPEZ", seccion: "11-3", especialidad: "Contabilidad" },
  { id: "4-0285-0219", nombre: "JAASIEL ISMAIAS", apellido1: "SALAZAR", apellido2: "VARGAS", seccion: "11-3", especialidad: "Contabilidad" }
];

const SECCIONES = [...new Set(ESTUDIANTES.map(e => e.seccion))];
