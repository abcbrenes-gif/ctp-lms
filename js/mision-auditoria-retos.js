// Misión Auditoría · retos de cada misión (una misión por lección de js/auditoria-unidades-datos.js).
// Formatos:
//  ["q",  pregunta, [opciones], índiceCorrecto, explicación]
//  ["vf", afirmación, true|false, explicación]
//  ["cl", instrucción, [categorías], [[elemento, índiceCategoría], ...], explicación]
//  ["or", instrucción, [pasos en el orden correcto], explicación]
//  ["em", instrucción, [[término, definición], ...], explicación]
window.AUD_NIVELES = {
 "1": {
  "nombre": "Auditor junior",
  "ic": "📏",
  "insignia": "🥉 Experto en NIA"
 },
 "2": {
  "nombre": "Conocer al cliente",
  "ic": "🏢",
  "insignia": "🥈 Detective de negocios"
 },
 "3": {
  "nombre": "Cazador de riesgos",
  "ic": "🎯",
  "insignia": "🥇 Guardián del control interno"
 },
 "4": {
  "nombre": "Auditor valiente",
  "ic": "🦁",
  "insignia": "🏆 Auditor íntegro"
 },
 "5": {
  "nombre": "Prevencionista",
  "ic": "🦺",
  "insignia": "🦺 Guardián de la salud ocupacional"
 }
};
window.AUD_MISIONES = {
 "1.3": {
  "ic": "🧭",
  "historia": "Ya sabes qué es auditar. Ahora la socia te pide explicarle a un cliente nuevo qué son las NIA y para qué sirven.",
  "retos": [
   [
    "q",
    "¿Quién emite las Normas Internacionales de Auditoría?",
    [
     "El IAASB, de la Federación Internacional de Contadores (IFAC)",
     "El Ministerio de Hacienda",
     "La CCSS",
     "El Banco Central de Costa Rica"
    ],
    0,
    "Las emite el IAASB, que pertenece a IFAC."
   ],
   [
    "q",
    "¿Quién adopta las NIA en Costa Rica?",
    [
     "El Colegio de Contadores Públicos de Costa Rica",
     "La Contraloría General de la República",
     "El MEP",
     "La SUGEF"
    ],
    0,
    "El Colegio de Contadores Públicos, miembro de IFAC, las adopta para el país."
   ],
   [
    "cl",
    "Ubica cada tema en su serie de NIA.",
    [
     "200 · Principios",
     "300-400 · Riesgo",
     "500 · Evidencia",
     "700 · Informe"
    ],
    [
     [
      "Objetivo global del auditor",
      0
     ],
     [
      "Planificación",
      1
     ],
     [
      "Valoración de riesgos",
      1
     ],
     [
      "Muestreo",
      2
     ],
     [
      "Confirmaciones externas",
      2
     ],
     [
      "Opinión del auditor",
      3
     ]
    ],
    "La 200 trae los principios, la 300 y 400 el riesgo, la 500 la evidencia y la 700 el informe."
   ],
   [
    "vf",
    "«Seguridad razonable» significa que el auditor garantiza al 100 % que no hay errores.",
    false,
    "Es una seguridad alta, pero no absoluta: el auditor trabaja con muestras y juicio."
   ]
  ]
 },
 "1.4": {
  "ic": "✍️",
  "historia": "<b>Café Mercedes S.A.</b> quiere contratar a la firma. Antes de aceptar, te toca revisar la carta de encargo.",
  "retos": [
   [
    "cl",
    "¿Va o no va en la carta de encargo?",
    [
     "Sí va",
     "No va"
    ],
    [
     [
      "Objetivo y alcance de la auditoría",
      0
     ],
     [
      "Responsabilidades del auditor",
      0
     ],
     [
      "Responsabilidades de la dirección",
      0
     ],
     [
      "Marco de información financiera aplicable",
      0
     ],
     [
      "La opinión que se va a dar",
      1
     ],
     [
      "La lista de clientes del café",
      1
     ]
    ],
    "La opinión no se puede prometer de antemano: depende de la evidencia."
   ],
   [
    "q",
    "La gerente dice: «No le vamos a enseñar los estados bancarios». ¿Qué haces?",
    [
     "No aceptar el encargo",
     "Aceptar y opinar igual",
     "Aceptar sin decir nada",
     "Cobrar más caro"
    ],
    0,
    "Si la limitación impide opinar desde el inicio, la NIA 210 dice que no se acepta."
   ],
   [
    "q",
    "¿Cuáles son las condiciones previas para aceptar?",
    [
     "Un marco contable aceptable y que la dirección acepte sus responsabilidades",
     "Que el cliente pague por adelantado",
     "Que la empresa tenga ganancias",
     "Que el auditor conozca al gerente"
    ],
    0,
    "Son las condiciones previas de la NIA 210."
   ]
  ]
 },
 "1.5": {
  "ic": "🔍",
  "historia": "El socio revisa cómo trabajó el equipo en la auditoría pasada. Ayúdale a encontrar fallas de calidad.",
  "retos": [
   [
    "q",
    "¿Quién es el responsable de la calidad de una auditoría?",
    [
     "El socio del encargo",
     "El cliente",
     "El asistente más nuevo",
     "El Ministerio de Hacienda"
    ],
    0,
    "La NIA 220 pone la responsabilidad en el socio del encargo."
   ],
   [
    "cl",
    "¿Falla de calidad o trabajo correcto?",
    [
     "Falla",
     "Correcto"
    ],
    [
     [
      "Un asistente nuevo audita inventarios solo y nadie lo revisa",
      0
     ],
     [
      "El encargado es primo del gerente del cliente",
      0
     ],
     [
      "Se acepta un cliente sin investigar su reputación",
      0
     ],
     [
      "El socio consulta a un especialista en impuestos",
      1
     ],
     [
      "El supervisor revisa los papeles antes de firmar",
      1
     ]
    ],
    "Supervisión, independencia y aceptación de clientes son parte del control de calidad."
   ],
   [
    "vf",
    "La NIGC 1 pide que toda la firma tenga un sistema de gestión de la calidad.",
    true,
    "La NIGC 1 es a nivel de firma; la NIA 220, a nivel de cada auditoría."
   ]
  ]
 },
 "1.6": {
  "ic": "🗂️",
  "historia": "Llegaron 8 documentos desordenados de Café Mercedes. Tu misión: armar el legajo.",
  "retos": [
   [
    "cl",
    "¿Archivo permanente o corriente?",
    [
     "Permanente",
     "Corriente"
    ],
    [
     [
      "Escritura constitutiva",
      0
     ],
     [
      "Estatutos",
      0
     ],
     [
      "Organigrama",
      0
     ],
     [
      "Contrato de préstamo a 10 años",
      0
     ],
     [
      "Arqueo de caja al 31 de diciembre",
      1
     ],
     [
      "Conciliación bancaria de diciembre",
      1
     ],
     [
      "Confirmación de un cliente",
      1
     ],
     [
      "Conteo de inventario",
      1
     ]
    ],
    "El permanente sirve varios años; el corriente es la evidencia del período."
   ],
   [
    "em",
    "Empareja cada índice con su área.",
    [
     [
      "A",
      "Efectivo"
     ],
     [
      "B",
      "Cuentas por cobrar"
     ],
     [
      "C",
      "Inventarios"
     ],
     [
      "AA",
      "Cuentas por pagar"
     ],
     [
      "AP",
      "Archivo permanente"
     ]
    ],
    "Los índices ordenan el legajo y permiten las referencias cruzadas."
   ],
   [
    "q",
    "¿Qué debe llevar todo papel de trabajo?",
    [
     "Quién lo preparó y quién lo revisó, con fechas",
     "Solo el logo de la firma",
     "La firma del cliente",
     "El precio de la auditoría"
    ],
    0,
    "Así queda evidencia de la supervisión (NIA 230)."
   ],
   [
    "vf",
    "El legajo se completa normalmente en no más de 60 días después de la fecha del informe.",
    true,
    "Es el plazo que indica la NIA 230."
   ]
  ]
 },
 "1.8": {
  "ic": "🕵️",
  "historia": "Llegaron denuncias a la firma. Debes separar lo que es fraude de lo que es error.",
  "retos": [
   [
    "cl",
    "¿Fraude o error?",
    [
     "Fraude",
     "Error"
    ],
    [
     [
      "La cajera se lleva dinero y lo repone el lunes",
      0
     ],
     [
      "Un asiento quedó duplicado por cansancio",
      1
     ],
     [
      "El gerente registra ventas de enero en diciembre para cobrar un bono",
      0
     ],
     [
      "Se calculó mal la depreciación sin intención",
      1
     ],
     [
      "Se pagan facturas a un proveedor que no existe",
      0
     ]
    ],
    "La diferencia está en la intención."
   ],
   [
    "cl",
    "Ubica cada caso en el triángulo del fraude.",
    [
     "Presión",
     "Oportunidad",
     "Racionalización"
    ],
    [
     [
      "Tiene deudas personales",
      0
     ],
     [
      "Meta de ventas exigente",
      0
     ],
     [
      "Nadie revisa la caja",
      1
     ],
     [
      "La misma persona cobra y registra",
      1
     ],
     [
      "«Me lo merezco»",
      2
     ],
     [
      "«Lo devuelvo el lunes»",
      2
     ]
    ],
    "Presión, oportunidad y racionalización forman el triángulo."
   ],
   [
    "q",
    "¿Quién tiene la responsabilidad principal de prevenir y detectar el fraude?",
    [
     "La dirección y quienes gobiernan la entidad",
     "El auditor externo",
     "Los clientes",
     "El Colegio de Contadores"
    ],
    0,
    "El auditor busca seguridad razonable, pero la responsabilidad principal es de la dirección."
   ]
  ]
 },
 "1.9": {
  "ic": "⚖️",
  "historia": "El cliente te pregunta cuáles leyes revisa un auditor. Ordénalas según su efecto.",
  "retos": [
   [
    "cl",
    "¿Efecto directo en los estados u otra ley fundamental?",
    [
     "Efecto directo",
     "Otra fundamental"
    ],
    [
     [
      "Ley del Impuesto sobre la Renta",
      0
     ],
     [
      "Ley del IVA",
      0
     ],
     [
      "Cargas sociales de la CCSS",
      0
     ],
     [
      "Código de Trabajo (aguinaldo)",
      0
     ],
     [
      "Permiso sanitario de funcionamiento",
      1
     ],
     [
      "Patente municipal",
      1
     ],
     [
      "Normas ambientales",
      1
     ]
    ],
    "Las de efecto directo cambian montos de los estados; las otras pueden detener el negocio."
   ],
   [
    "q",
    "Encuentras un incumplimiento de la Ley del IVA. ¿Qué haces?",
    [
     "Comunicarlo a la dirección y gobierno, evaluar el efecto y documentarlo",
     "Ignorarlo",
     "Corregir tú la contabilidad",
     "Denunciar en redes sociales"
    ],
    0,
    "Es lo que pide la NIA 250."
   ]
  ]
 },
 "1.10": {
  "ic": "🗓️",
  "historia": "Hay que planear la auditoría de Café Mercedes. Separa lo general de lo detallado.",
  "retos": [
   [
    "cl",
    "¿Estrategia global o plan de auditoría?",
    [
     "Estrategia global",
     "Plan de auditoría"
    ],
    [
     [
      "Alcance de la auditoría",
      0
     ],
     [
      "Equipo y calendario general",
      0
     ],
     [
      "Áreas críticas",
      0
     ],
     [
      "Cuántas facturas revisar",
      1
     ],
     [
      "Qué prueba aplicar al inventario",
      1
     ],
     [
      "Qué día exacto contar el inventario",
      1
     ]
    ],
    "La estrategia da la dirección general; el plan, el detalle de cada procedimiento."
   ],
   [
    "q",
    "¿Qué es la materialidad?",
    [
     "El monto a partir del cual un error cambiaría las decisiones de un usuario",
     "El costo de la auditoría",
     "El total de activos",
     "La cantidad de papeles del legajo"
    ],
    0,
    "Ayuda a decidir qué errores importan (NIA 320)."
   ],
   [
    "vf",
    "La planeación se hace una sola vez y no se cambia.",
    false,
    "Se ajusta durante toda la auditoría."
   ]
  ]
 },
 "1.12": {
  "ic": "🎯",
  "historia": "Antes de probar saldos, tienes que medir los riesgos y el control interno.",
  "retos": [
   [
    "em",
    "Empareja cada riesgo con su significado.",
    [
     [
      "Riesgo inherente",
      "La cuenta es propensa a error por su naturaleza"
     ],
     [
      "Riesgo de control",
      "El control interno no previene ni detecta el error"
     ],
     [
      "Riesgo de detección",
      "Las pruebas del auditor no encuentran el error"
     ]
    ],
    "Inherente y de control forman el riesgo de incorrección material."
   ],
   [
    "q",
    "Riesgo inherente alto y riesgo de control alto. ¿Qué haces?",
    [
     "Bajo el riesgo de detección: más y mejores pruebas",
     "Hago menos pruebas",
     "No hago nada",
     "Doy opinión limpia"
    ],
    0,
    "Relación inversa: más riesgo, más trabajo del auditor."
   ],
   [
    "q",
    "¿Cuál NO es un componente del control interno?",
    [
     "Materialidad",
     "Entorno de control",
     "Actividades de control",
     "Seguimiento"
    ],
    0,
    "La materialidad es un concepto del auditor, no del control interno."
   ],
   [
    "q",
    "Según la NIA 330, ¿cómo responde el auditor a los riesgos?",
    [
     "Con pruebas de controles y procedimientos sustantivos",
     "Con una carta de encargo",
     "Cambiando la contabilidad",
     "Con un párrafo de énfasis"
    ],
    0,
    "Esas son las dos respuestas de la NIA 330."
   ]
  ]
 },
 "1.13": {
  "ic": "📑",
  "historia": "Juntaste evidencia de efectivo. Ahora decide cuál es la más confiable.",
  "retos": [
   [
    "or",
    "Ordena de la MÁS a la MENOS fiable.",
    [
     "Confirmación enviada por el banco directo al auditor",
     "Factura original del proveedor en archivos del cliente",
     "Reporte interno del sistema del cliente",
     "Respuesta verbal del contador"
    ],
    "Externa, obtenida directamente y escrita es más fiable que interna, indirecta u oral."
   ],
   [
    "em",
    "Empareja cada procedimiento con lo que hace.",
    [
     [
      "Inspección",
      "Revisar documentos o activos"
     ],
     [
      "Observación",
      "Ver un proceso mientras ocurre"
     ],
     [
      "Confirmación externa",
      "Respuesta escrita de un tercero"
     ],
     [
      "Recálculo",
      "Comprobar que las operaciones aritméticas estén bien"
     ],
     [
      "Indagación",
      "Preguntar"
     ]
    ],
    "Son procedimientos de la NIA 500."
   ],
   [
    "q",
    "Evidencia «suficiente» se refiere a…",
    [
     "La cantidad",
     "La calidad",
     "El color del documento",
     "El precio"
    ],
    0,
    "Suficiente es cantidad; adecuada es calidad (relevancia y fiabilidad)."
   ]
  ]
 },
 "1.14": {
  "ic": "🚪",
  "historia": "Es el primer año que auditas a Ferretería El Roble. Los saldos de apertura vienen del año pasado.",
  "retos": [
   [
    "q",
    "¿Qué verificas primero?",
    [
     "Que los saldos de cierre del año anterior se trasladaron bien a la apertura",
     "Las ventas de mañana",
     "El salario del gerente",
     "El color de los libros"
    ],
    0,
    "Es el primer procedimiento de la NIA 510."
   ],
   [
    "q",
    "No logras evidencia suficiente sobre los saldos de apertura. ¿Qué opinión puede salir?",
    [
     "Con salvedades o abstención",
     "Siempre favorable",
     "Adversa siempre",
     "Ninguna, no pasa nada"
    ],
    0,
    "La falta de evidencia limita la opinión."
   ],
   [
    "vf",
    "En un encargo inicial el auditor puede revisar los papeles del auditor anterior.",
    true,
    "Es uno de los procedimientos que menciona la NIA 510."
   ]
  ]
 },
 "1.15": {
  "ic": "📊",
  "historia": "Tienes el estado de resultados 2025 y 2026. Busca lo que no cuadra.",
  "retos": [
   [
    "q",
    "Ventas 2025: ₡10 000 000. Ventas 2026: ₡12 000 000. ¿Variación porcentual?",
    [
     "20 %",
     "2 %",
     "12 %",
     "83 %"
    ],
    0,
    "(12 − 10) ÷ 10 = 0,20 = 20 %."
   ],
   [
    "q",
    "Ventas ₡1 000 000 y costo de ventas ₡600 000. ¿Margen bruto?",
    [
     "40 %",
     "60 %",
     "160 %",
     "6 %"
    ],
    0,
    "(1 000 000 − 600 000) ÷ 1 000 000 = 40 %."
   ],
   [
    "or",
    "Ordena los pasos de un procedimiento analítico.",
    [
     "Armar una expectativa",
     "Fijar cuánta diferencia se acepta",
     "Comparar con lo registrado",
     "Investigar las diferencias importantes"
    ],
    "Así lo plantea la NIA 520."
   ],
   [
    "q",
    "¿Cuándo son obligatorios los procedimientos analíticos?",
    [
     "Al valorar riesgos al inicio y en la revisión final",
     "Nunca",
     "Solo si el cliente quiere",
     "Solo en empresas grandes"
    ],
    0,
    "Son obligatorios al inicio (NIA 315) y al final (NIA 520)."
   ]
  ]
 },
 "1.16": {
  "ic": "🎲",
  "historia": "Hay 200 facturas y no da tiempo de revisarlas todas. Toca muestrear.",
  "retos": [
   [
    "q",
    "Población de 200 facturas y muestra de 10. ¿Intervalo?",
    [
     "20",
     "10",
     "2",
     "210"
    ],
    0,
    "200 ÷ 10 = 20."
   ],
   [
    "q",
    "Inicio aleatorio 7 e intervalo 20. ¿Cuál es la tercera partida?",
    [
     "47",
     "27",
     "60",
     "21"
    ],
    0,
    "7, 27, 47…"
   ],
   [
    "vf",
    "La selección en bloque (tomar las primeras 10) normalmente es adecuada.",
    false,
    "No da a todas las partidas oportunidad de ser elegidas."
   ],
   [
    "q",
    "¿Qué es el riesgo de muestreo?",
    [
     "Que la conclusión con la muestra sea distinta a la que daría revisar todo",
     "Que se pierdan las facturas",
     "Que la muestra cueste mucho",
     "Que el cliente no quiera"
    ],
    0,
    "Es el riesgo propio de no revisar el 100 %."
   ]
  ]
 },
 "1.17": {
  "ic": "🤝",
  "historia": "Otros auditores ya trabajaron en el cliente. ¿Puedes usar su trabajo?",
  "retos": [
   [
    "cl",
    "¿Puedes usar el trabajo?",
    [
     "Sí, después de evaluarlo",
     "No"
    ],
    [
     [
      "Conteo de inventario de una auditoría interna objetiva y competente",
      0
     ],
     [
      "Trabajo del auditor de la sucursal de Panamá, evaluado por ti",
      0
     ],
     [
      "Revisión hecha por un auditor interno casado con el contador",
      1
     ],
     [
      "Dejarle todo el juicio de una estimación importante a otro",
      1
     ]
    ],
    "Se evalúa objetividad y competencia; el juicio importante no se delega."
   ],
   [
    "q",
    "Si usas trabajo de otros, ¿quién responde por la opinión?",
    [
     "Solo el auditor externo que firma",
     "El auditor interno",
     "Todos por partes iguales",
     "El cliente"
    ],
    0,
    "La opinión no se delega (NIA 600 y 610)."
   ]
  ]
 },
 "1.18": {
  "ic": "📝",
  "historia": "Terminaste la auditoría. Ahora decide el dictamen en cada caso.",
  "retos": [
   [
    "cl",
    "¿Qué opinión corresponde?",
    [
     "Favorable",
     "Con salvedades",
     "Adversa",
     "Abstención"
    ],
    [
     [
      "Todo se presenta razonablemente",
      0
     ],
     [
      "Error material solo en el inventario",
      1
     ],
     [
      "Errores materiales en casi todas las cuentas",
      2
     ],
     [
      "No dejaron contar el inventario, que es casi todo el activo",
      3
     ]
    ],
    "Pregunta: ¿error o falta de evidencia? ¿material? ¿generalizado?"
   ],
   [
    "vf",
    "Un párrafo de énfasis cambia la opinión.",
    false,
    "Solo resalta algo ya revelado (NIA 706)."
   ],
   [
    "or",
    "Ordena las partes del informe.",
    [
     "Título",
     "Destinatario",
     "Opinión",
     "Fundamento de la opinión",
     "Responsabilidades de la dirección",
     "Responsabilidades del auditor",
     "Firma, lugar y fecha"
    ],
    "Es la estructura de la NIA 700."
   ]
  ]
 },
 "1.19": {
  "ic": "🏪",
  "historia": "Te mandan a auditar la <b>Soda La Esquina</b>. Es pequeña y diferente.",
  "retos": [
   [
    "cl",
    "¿Es una característica típica de una entidad pequeña?",
    [
     "Sí",
     "No"
    ],
    [
     [
      "El dueño también administra",
      0
     ],
     [
      "Poca segregación de funciones",
      0
     ],
     [
      "Contabilidad sencilla",
      0
     ],
     [
      "Muchas sucursales en varios países",
      1
     ],
     [
      "Comité de auditoría independiente",
      1
     ]
    ],
    "Pocas personas hacen casi todo."
   ],
   [
    "q",
    "¿Por qué en una empresa pequeña se hacen más pruebas sustantivas?",
    [
     "Porque hay pocos controles y poca segregación",
     "Porque es más barato",
     "Porque las NIA no aplican",
     "Porque el dueño lo pide"
    ],
    0,
    "Sin controles confiables, el auditor prueba los saldos directamente."
   ]
  ]
 },
 "1.20": {
  "ic": "🏅",
  "historia": "<b>Reto final del nivel:</b> la socia te deja a cargo de Ferretería El Roble. Demuestra todo lo aprendido.",
  "retos": [
   [
    "q",
    "No pudiste revisar la cuenta de bancos, que es material pero no generalizada. ¿Opinión?",
    [
     "Con salvedades",
     "Favorable",
     "Adversa",
     "Abstención"
    ],
    0,
    "Falta de evidencia material, no generalizada → salvedades."
   ],
   [
    "cl",
    "Archivo permanente o corriente.",
    [
     "Permanente",
     "Corriente"
    ],
    [
     [
      "Pacto constitutivo",
      0
     ],
     [
      "Manual de políticas",
      0
     ],
     [
      "Arqueo del 31 de diciembre",
      1
     ],
     [
      "Confirmación del banco",
      1
     ]
    ],
    "Interés continuo vs evidencia del período."
   ],
   [
    "q",
    "Población de 300 recibos y muestra de 15. ¿Intervalo?",
    [
     "20",
     "15",
     "30",
     "45"
    ],
    0,
    "300 ÷ 15 = 20."
   ],
   [
    "q",
    "Nadie concilia los bancos. ¿Qué riesgo sube?",
    [
     "Riesgo de control",
     "Riesgo de detección",
     "Ninguno",
     "Riesgo de muestreo"
    ],
    0,
    "Falta un control: sube el riesgo de control."
   ]
  ]
 },
 "2.1": {
  "ic": "🧩",
  "historia": "La firma ofrece varios tipos de servicio. Asigna cada solicitud a la especialidad correcta.",
  "retos": [
   [
    "em",
    "Empareja cada solicitud con su especialidad.",
    [
     [
      "Financiera",
      "Opinar si los estados son razonables"
     ],
     [
      "Operativa",
      "Medir eficiencia, eficacia y economía"
     ],
     [
      "Administrativa",
      "Revisar planes, organización y políticas"
     ],
     [
      "Fiscal",
      "Revisar el pago de renta e IVA"
     ],
     [
      "De sistemas",
      "Revisar accesos, respaldos y seguridad de datos"
     ],
     [
      "Especial (forense)",
      "Investigar un fraude"
     ]
    ],
    "Cada especialidad tiene un objetivo distinto."
   ],
   [
    "q",
    "El banco quiere saber si los estados son confiables antes de dar un préstamo. ¿Especialidad?",
    [
     "Financiera",
     "Operativa",
     "De sistemas",
     "Ambiental"
    ],
    0,
    "La financiera opina sobre los estados."
   ]
  ]
 },
 "2.2": {
  "ic": "🔄",
  "historia": "Un estudiante de práctica confunde la auditoría interna con la externa. Aclárale las diferencias.",
  "retos": [
   [
    "cl",
    "¿Interna o externa?",
    [
     "Interna",
     "Externa"
    ],
    [
     [
      "La hacen empleados de la entidad",
      0
     ],
     [
      "Evalúa de forma continua el control interno",
      0
     ],
     [
      "En el sector público la regula la Ley 8292",
      0
     ],
     [
      "Informa a la junta o al jerarca",
      0
     ],
     [
      "La hace un contador público independiente",
      1
     ],
     [
      "Da una opinión sobre los estados para terceros",
      1
     ],
     [
      "Se rige por las NIA",
      1
     ],
     [
      "Su informe lo usan bancos e inversionistas",
      1
     ]
    ],
    "Se complementan, pero tienen objetivos y usuarios distintos."
   ],
   [
    "vf",
    "El auditor externo puede usar trabajo de la auditoría interna y dejarle la opinión.",
    false,
    "Puede usar parte del trabajo, pero la opinión es solo suya."
   ]
  ]
 },
 "2.3": {
  "ic": "🗣️",
  "historia": "Te toca leer informes de auditoría. Domina su vocabulario.",
  "retos": [
   [
    "em",
    "Empareja cada término con su significado.",
    [
     [
      "Razonabilidad",
      "Presentación correcta en lo importante"
     ],
     [
      "Materialidad",
      "Lo que cambiaría decisiones de un usuario"
     ],
     [
      "Generalizado",
      "Afecta muchas partes de los estados"
     ],
     [
      "Limitación al alcance",
      "No se pudo obtener la evidencia"
     ],
     [
      "Empresa en funcionamiento",
      "La empresa seguirá operando"
     ]
    ],
    "Estas palabras definen el tipo de dictamen."
   ],
   [
    "q",
    "¿Qué palabra distingue el dictamen adverso del de salvedades?",
    [
     "Generalizado",
     "Razonable",
     "Énfasis",
     "Firma"
    ],
    0,
    "Material y generalizado → adverso; material no generalizado → salvedades."
   ]
  ]
 },
 "2.4": {
  "ic": "🗄️",
  "historia": "El archivo permanente de un cliente está desordenado. Pon orden.",
  "retos": [
   [
    "cl",
    "¿Archivo permanente o corriente?",
    [
     "Permanente",
     "Corriente"
    ],
    [
     [
      "Cédula jurídica",
      0
     ],
     [
      "Actas importantes de socios",
      0
     ],
     [
      "Catálogo de cuentas",
      0
     ],
     [
      "Manual de procedimientos",
      0
     ],
     [
      "Confirmación bancaria de este año",
      1
     ],
     [
      "Hoja de conteo de inventario de este año",
      1
     ]
    ],
    "El permanente tiene interés continuo."
   ],
   [
    "q",
    "¿Por qué es importante el archivo permanente?",
    [
     "Evita pedir lo mismo cada año y da contexto al equipo",
     "Porque lo pide el cliente",
     "Para cobrar más",
     "No es importante"
    ],
    0,
    "Además permite ver cambios en el tiempo."
   ]
  ]
 },
 "2.5": {
  "ic": "📜",
  "historia": "Investiga cómo nació un cliente nuevo y qué leyes le aplican.",
  "retos": [
   [
    "q",
    "¿Dónde se inscribe una sociedad anónima?",
    [
     "En el Registro Nacional",
     "En la CCSS",
     "En la municipalidad",
     "En el MEP"
    ],
    0,
    "Ahí recibe su cédula jurídica."
   ],
   [
    "cl",
    "¿Constitución, ley o permiso?",
    [
     "Constitución",
     "Ley",
     "Permiso"
    ],
    [
     [
      "Escritura constitutiva",
      0
     ],
     [
      "Cédula jurídica",
      0
     ],
     [
      "Ley del IVA",
      1
     ],
     [
      "Código de Trabajo",
      1
     ],
     [
      "Permiso sanitario de funcionamiento",
      2
     ],
     [
      "Patente municipal",
      2
     ]
    ],
    "Cada uno le dice algo distinto al auditor."
   ],
   [
    "q",
    "¿Qué ley genera una cuenta por pagar por cargas sociales?",
    [
     "Ley Constitutiva de la CCSS",
     "Código de Comercio",
     "Ley de Tránsito",
     "Constitución Política"
    ],
    0,
    "Las cuotas obrero-patronales se pagan a la CCSS."
   ]
  ]
 },
 "2.6": {
  "ic": "🌎",
  "historia": "La economía cambió este año. ¿Cómo afecta al cliente?",
  "retos": [
   [
    "cl",
    "¿Factor económico general o de la industria?",
    [
     "General",
     "Industria"
    ],
    [
     [
      "Inflación",
      0
     ],
     [
      "Tipo de cambio",
      0
     ],
     [
      "Desempleo",
      0
     ],
     [
      "Competencia del sector",
      1
     ],
     [
      "Temporadas altas y bajas del sector",
      1
     ],
     [
      "Cambios tecnológicos del sector",
      1
     ]
    ],
    "Los generales afectan a todos; los de la industria, al sector."
   ],
   [
    "em",
    "Empareja el factor con la cuenta afectada.",
    [
     [
      "Sube el tipo de cambio (deuda en dólares)",
      "Préstamo por pagar y diferencial cambiario"
     ],
     [
      "Cae el consumo",
      "Inventario (valoración)"
     ],
     [
      "Suben las tasas de interés",
      "Gasto por intereses"
     ],
     [
      "Temporada baja turística",
      "Ventas y efectivo"
     ]
    ],
    "Cada factor crea un riesgo en una cuenta."
   ]
  ]
 },
 "2.7": {
  "ic": "👥",
  "historia": "Conoce a los dueños y a la administración del cliente. Busca riesgos.",
  "retos": [
   [
    "q",
    "¿Qué es una parte relacionada?",
    [
     "Una persona o empresa vinculada con la entidad o sus dueños",
     "Cualquier cliente",
     "El banco",
     "El auditor"
    ],
    0,
    "Por ejemplo, otra empresa del mismo dueño."
   ],
   [
    "vf",
    "Que el contador cambie todos los años es un riesgo para el auditor.",
    true,
    "Se pierden controles y conocimiento."
   ],
   [
    "q",
    "El dueño también es el gerente y firma todo. ¿Qué riesgo ves?",
    [
     "Que se salte los controles",
     "Ninguno",
     "Que venda mucho",
     "Que pague impuestos"
    ],
    0,
    "La dirección puede anular los controles."
   ]
  ]
 },
 "2.8": {
  "ic": "☕",
  "historia": "Visitas un café de la zona. Describe su negocio como lo haría un auditor.",
  "retos": [
   [
    "cl",
    "Ubica cada dato en la parte del negocio.",
    [
     "Productos",
     "Mercados y clientes",
     "Proveedores",
     "Gastos y operaciones"
    ],
    [
     [
      "Vende café gourmet",
      0
     ],
     [
      "Sus clientes son hoteles de la zona",
      1
     ],
     [
      "Exporta a Estados Unidos",
      1
     ],
     [
      "Compra el grano a una cooperativa",
      2
     ],
     [
      "Paga planillas y alquiler del local",
      3
     ],
     [
      "Tiene una tostadora industrial",
      3
     ]
    ],
    "Con esto se sabe qué cuentas importan más."
   ],
   [
    "q",
    "El negocio vende mucho a crédito. ¿Qué cuenta revisas con más cuidado?",
    [
     "Cuentas por cobrar",
     "Capital social",
     "Gasto por alquiler",
     "Caja chica"
    ],
    0,
    "Y su estimación por incobrables."
   ]
  ]
 },
 "2.10": {
  "ic": "💹",
  "historia": "<b>Reto final del nivel:</b> analiza la salud financiera de un cliente.",
  "retos": [
   [
    "q",
    "Activo corriente ₡800 000 y pasivo corriente ₡1 000 000. ¿Razón corriente?",
    [
     "0,8",
     "1,25",
     "1,8",
     "0,2"
    ],
    0,
    "800 000 ÷ 1 000 000 = 0,8: no alcanza para cubrir el corto plazo."
   ],
   [
    "q",
    "Pasivo total ₡600 000 y activo total ₡1 000 000. ¿Endeudamiento?",
    [
     "60 %",
     "40 %",
     "167 %",
     "6 %"
    ],
    0,
    "600 000 ÷ 1 000 000 = 60 %."
   ],
   [
    "q",
    "Utilidad neta ₡50 000 y ventas ₡1 000 000. ¿Margen neto?",
    [
     "5 %",
     "50 %",
     "20 %",
     "0,5 %"
    ],
    0,
    "50 000 ÷ 1 000 000 = 5 %."
   ],
   [
    "cl",
    "¿Es señal de duda sobre la empresa en funcionamiento?",
    [
     "Sí es señal",
     "No es señal"
    ],
    [
     [
      "Pérdidas varios años seguidos",
      0
     ],
     [
      "Deudas vencidas sin pagar",
      0
     ],
     [
      "Pierde a su cliente principal",
      0
     ],
     [
      "Ventas crecen 10 % con utilidades",
      1
     ]
    ],
    "Lo regula la NIA 570."
   ]
  ]
 },
 "3.1": {
  "ic": "☂️",
  "historia": "Te nombran «cazador de riesgos». Primero, conoce a tus presas.",
  "retos": [
   [
    "em",
    "Empareja cada riesgo con su definición.",
    [
     [
      "Riesgo de auditoría",
      "Dar una opinión equivocada"
     ],
     [
      "Riesgo inherente",
      "Error posible por la naturaleza de la cuenta"
     ],
     [
      "Riesgo de control",
      "El control interno no lo previene ni detecta"
     ],
     [
      "Riesgo de detección",
      "Las pruebas del auditor no lo encuentran"
     ]
    ],
    "Riesgo de auditoría = inherente × control × detección."
   ],
   [
    "q",
    "¿Cuál riesgo controla el auditor?",
    [
     "El de detección",
     "El inherente",
     "El de control",
     "Ninguno"
    ],
    0,
    "Lo baja con más y mejores pruebas."
   ]
  ]
 },
 "3.2": {
  "ic": "💡",
  "historia": "En la reunión del equipo surgen ideas. Ubícalas en el riesgo que aumentan.",
  "retos": [
   [
    "cl",
    "¿Qué riesgo aumenta?",
    [
     "Inherente",
     "De control",
     "De detección"
    ],
    [
     [
      "Mucho efectivo en caja",
      0
     ],
     [
      "Estimaciones complejas",
      0
     ],
     [
      "Nadie concilia los bancos",
      1
     ],
     [
      "La misma persona cobra y registra",
      1
     ],
     [
      "Muestra muy pequeña",
      2
     ],
     [
      "Equipo sin experiencia",
      2
     ]
    ],
    "Cada factor golpea un riesgo distinto."
   ],
   [
    "q",
    "Si el riesgo de control es alto, ¿qué hace el auditor?",
    [
     "Más pruebas sustantivas",
     "Menos pruebas",
     "Nada",
     "Renuncia"
    ],
    0,
    "Baja el riesgo de detección."
   ]
  ]
 },
 "3.3": {
  "ic": "🧮",
  "historia": "Distribuidora Los Pinos te pide la matriz de riesgos. Sigue los pasos.",
  "retos": [
   [
    "or",
    "Ordena los pasos para evaluar riesgos.",
    [
     "Conocer la entidad y su entorno",
     "Identificar riesgos por cuenta y afirmación",
     "Calificar el riesgo inherente",
     "Evaluar el control interno y el riesgo de control",
     "Definir el riesgo de detección aceptable",
     "Diseñar los procedimientos"
    ],
    "Es la ruta de la matriz de riesgos."
   ],
   [
    "q",
    "¿Qué tres aspectos tiene un procedimiento de auditoría?",
    [
     "Naturaleza, momento y extensión",
     "Precio, lugar y color",
     "Debe, haber y saldo",
     "Inicio, medio y fin"
    ],
    0,
    "Qué prueba, cuándo y cuántas partidas."
   ]
  ]
 },
 "3.4": {
  "ic": "💻",
  "historia": "El cliente quiere cambiar de sistema contable. Ayúdale a entender las opciones.",
  "retos": [
   [
    "cl",
    "Clasifica cada elemento.",
    [
     "Sistema contable o ERP",
     "Herramienta de auditoría",
     "Tendencia"
    ],
    [
     [
      "Integra ventas, inventario, planillas y contabilidad",
      0
     ],
     [
      "Emite comprobantes electrónicos",
      0
     ],
     [
      "Programa de análisis de datos (tipo IDEA)",
      1
     ],
     [
      "Programa de papeles de trabajo (tipo TeamMate)",
      1
     ],
     [
      "Analizar el 100 % de las transacciones",
      2
     ],
     [
      "Inteligencia artificial para patrones raros",
      2
     ]
    ],
    "La tecnología cambia cómo se audita."
   ],
   [
    "vf",
    "Si el sistema está en la nube, ya no hay riesgos de control.",
    false,
    "Hay riesgos de acceso no autorizado y pérdida de datos."
   ]
  ]
 },
 "3.5": {
  "ic": "🏛️",
  "historia": "Evalúa el control interno de una municipalidad ficticia.",
  "retos": [
   [
    "cl",
    "¿Ambiente de control o procedimiento de control?",
    [
     "Ambiente de control",
     "Procedimiento de control"
    ],
    [
     [
      "Integridad y valores éticos",
      0
     ],
     [
      "El ejemplo de la dirección",
      0
     ],
     [
      "Estructura organizativa",
      0
     ],
     [
      "Arqueo sorpresa",
      1
     ],
     [
      "Dos firmas en los cheques",
      1
     ],
     [
      "Conciliación bancaria",
      1
     ]
    ],
    "El ambiente es la cultura; los procedimientos, las acciones concretas."
   ],
   [
    "q",
    "¿Cuál NO es un componente del control interno de la Ley 8292?",
    [
     "Materialidad",
     "Ambiente de control",
     "Valoración del riesgo",
     "Actividades de control"
    ],
    0,
    "Los 5 son: ambiente, valoración del riesgo, actividades de control, sistemas de información y seguimiento."
   ]
  ]
 },
 "3.6": {
  "ic": "🛑",
  "historia": "Clasifica los controles del Hotel Brisas del Norte.",
  "retos": [
   [
    "cl",
    "¿Preventivo, detectivo o correctivo?",
    [
     "Preventivo",
     "Detectivo",
     "Correctivo"
    ],
    [
     [
      "Autorización previa de compras",
      0
     ],
     [
      "Contraseña de acceso al sistema",
      0
     ],
     [
      "Conciliación bancaria",
      1
     ],
     [
      "Arqueo sorpresa",
      1
     ],
     [
      "Ajustar el error encontrado",
      2
     ],
     [
      "Seguimiento a las recomendaciones",
      2
     ]
    ],
    "Evitan, encuentran o corrigen."
   ],
   [
    "cl",
    "¿Administrativo, operativo o financiero?",
    [
     "Administrativo",
     "Operativo",
     "Financiero"
    ],
    [
     [
      "Política de quién aprueba compras",
      0
     ],
     [
      "Organigrama con funciones",
      0
     ],
     [
      "Control de calidad en la cocina",
      1
     ],
     [
      "Metas de atención al huésped",
      1
     ],
     [
      "Facturas prenumeradas",
      2
     ],
     [
      "Conciliación de cuentas",
      2
     ]
    ],
    "Así los clasifica el programa del MEP."
   ]
  ]
 },
 "3.7": {
  "ic": "⚖️",
  "historia": "Separa las cuentas reales de las nominales y define qué proteger en cada una.",
  "retos": [
   [
    "cl",
    "¿Cuenta real o nominal?",
    [
     "Real",
     "Nominal"
    ],
    [
     [
      "Caja",
      0
     ],
     [
      "Inventario",
      0
     ],
     [
      "Préstamo por pagar",
      0
     ],
     [
      "Capital social",
      0
     ],
     [
      "Ventas",
      1
     ],
     [
      "Gasto por alquiler",
      1
     ],
     [
      "Gasto por salarios",
      1
     ],
     [
      "Ingreso por intereses",
      1
     ]
    ],
    "Las reales pasan al siguiente período; las nominales se cierran."
   ],
   [
    "em",
    "Empareja el objetivo de control con su significado.",
    [
     [
      "Existencia",
      "Los activos son reales"
     ],
     [
      "Integridad",
      "Están todas las transacciones"
     ],
     [
      "Corte",
      "Registradas en el período correcto"
     ],
     [
      "Valoración",
      "Por el monto correcto"
     ],
     [
      "Clasificación",
      "En la cuenta correcta"
     ]
    ],
    "Son las afirmaciones que protege el control interno."
   ]
  ]
 },
 "3.8": {
  "ic": "🔐",
  "historia": "Diseña los controles de la caja y de las ventas.",
  "retos": [
   [
    "em",
    "Empareja cada principio con un ejemplo.",
    [
     [
      "Segregación de funciones",
      "Quien cobra no registra"
     ],
     [
      "Autorización",
      "El gerente aprueba las compras"
     ],
     [
      "Documentos prenumerados",
      "Facturas con número consecutivo"
     ],
     [
      "Protección física",
      "Bodega con llave"
     ],
     [
      "Verificación independiente",
      "Arqueo sorpresa"
     ],
     [
      "Vacaciones obligatorias",
      "Otra persona hace la tarea un tiempo"
     ]
    ],
    "Los principios se aplican a cuentas reales y nominales."
   ],
   [
    "q",
    "¿Por qué la misma persona no debe cobrar y registrar?",
    [
     "Podría quedarse con el dinero y ocultarlo en los registros",
     "Porque se cansa",
     "Porque lo dice el cliente",
     "No hay problema"
    ],
    0,
    "Es el principio de segregación de funciones."
   ]
  ]
 },
 "3.9": {
  "ic": "🏅",
  "historia": "<b>Reto final del nivel:</b> el Hotel Brisas del Norte tiene problemas de control.",
  "retos": [
   [
    "cl",
    "Ubica cada debilidad con el principio que incumple.",
    [
     "Segregación",
     "Autorización",
     "Protección física"
    ],
    [
     [
      "La recepcionista cobra, registra y deposita",
      0
     ],
     [
      "Cualquiera compra sin aprobación",
      1
     ],
     [
      "La bodega de licores no tiene llave",
      2
     ]
    ],
    "Cada debilidad tiene un principio de control."
   ],
   [
    "q",
    "Inventario de licores con riesgo inherente alto y controles débiles. ¿Qué harías?",
    [
     "Conteo físico sorpresa y más pruebas sustantivas",
     "Confiar en el registro",
     "Nada",
     "Pedir una carta al gerente y ya"
    ],
    0,
    "Riesgo alto → detección baja → más pruebas."
   ],
   [
    "q",
    "¿La conciliación bancaria es un control…?",
    [
     "Detectivo",
     "Preventivo",
     "Correctivo",
     "Ambiental"
    ],
    0,
    "Encuentra errores después de que ocurren."
   ]
  ]
 },
 "4.1": {
  "ic": "🦁",
  "historia": "El gerente te pide no poner un hallazgo en el informe porque afectará un préstamo.",
  "retos": [
   [
    "q",
    "¿Qué haces?",
    [
     "Mantengo el hallazgo con su evidencia y lo comunico por los canales correctos",
     "Lo quito para no tener problemas",
     "Lo publico en redes sociales",
     "Renuncio sin decir nada"
    ],
    0,
    "La valentía se apoya en evidencia y en la norma."
   ],
   [
    "vf",
    "Ser valiente significa acusar aunque no haya evidencia.",
    false,
    "Valentía no es imprudencia: siempre con evidencia."
   ],
   [
    "q",
    "No cambiar una conclusión por presión se relaciona con…",
    [
     "Integridad y objetividad",
     "Confidencialidad",
     "Materialidad",
     "Muestreo"
    ],
    0,
    "Principios del código de ética."
   ]
  ]
 },
 "4.2": {
  "ic": "🛡️",
  "historia": "Revisa si tu equipo es independiente de los clientes.",
  "retos": [
   [
    "cl",
    "Identifica la amenaza a la independencia.",
    [
     "Interés propio",
     "Autorrevisión",
     "Abogacía",
     "Familiaridad",
     "Intimidación"
    ],
    [
     [
      "Tiene acciones del cliente",
      0
     ],
     [
      "Audita la contabilidad que él mismo llevó",
      1
     ],
     [
      "Defiende al cliente en un juicio",
      2
     ],
     [
      "Su hermana es la gerente",
      3
     ],
     [
      "El cliente amenaza con no pagar si no firma limpio",
      4
     ]
    ],
    "Son las amenazas del código de ética del IESBA."
   ],
   [
    "q",
    "¿Qué diferencia hay entre independencia mental y en apariencia?",
    [
     "La mental es la actitud; la aparente es lo que percibe un tercero",
     "Son lo mismo",
     "La mental es por escrito",
     "La aparente no importa"
    ],
    0,
    "Ambas son necesarias."
   ]
  ]
 },
 "4.3": {
  "ic": "🏛️",
  "historia": "Visitas la Contraloría General de la República. Aprende cómo funciona.",
  "retos": [
   [
    "q",
    "La Contraloría es auxiliar de…",
    [
     "La Asamblea Legislativa",
     "El Poder Judicial",
     "El Ministerio de Hacienda",
     "La CCSS"
    ],
    0,
    "Artículo 183 de la Constitución Política."
   ],
   [
    "q",
    "¿Por cuántos años se nombra al Contralor?",
    [
     "8 años",
     "4 años",
     "10 años",
     "De por vida"
    ],
    0,
    "Lo nombra la Asamblea Legislativa."
   ],
   [
    "cl",
    "¿Es función de la Contraloría?",
    [
     "Sí",
     "No"
    ],
    [
     [
      "Fiscalizar la ejecución de los presupuestos",
      0
     ],
     [
      "Aprobar o improbar presupuestos municipales",
      0
     ],
     [
      "Refrendar contratos",
      0
     ],
     [
      "Dictar sentencias penales",
      1
     ],
     [
      "Cobrar impuestos",
      1
     ]
    ],
    "Las sentencias son del Poder Judicial y los impuestos los cobra Hacienda."
   ]
  ]
 },
 "4.4": {
  "ic": "⏳",
  "historia": "Arma la línea de tiempo de la Contraloría para una exposición.",
  "retos": [
   [
    "or",
    "Ordena los hitos del más antiguo al más reciente.",
    [
     "1922 · Oficina de Control",
     "1949 · La Constitución crea la Contraloría",
     "1950 · Primera Ley Orgánica (Ley 1252)",
     "1951 · Inicia funciones",
     "1994 · Ley Orgánica 7428",
     "2002 · Ley General de Control Interno (8292)"
    ],
    "De un control de gastos a una fiscalización integral."
   ],
   [
    "q",
    "¿Quién fue el primer Contralor General?",
    [
     "Amadeo Quirós Blanco",
     "José Figueres Ferrer",
     "Rodrigo Facio",
     "León Cortés"
    ],
    0,
    "La Contraloría inició funciones en 1951 bajo su dirección."
   ]
  ]
 },
 "4.5": {
  "ic": "🤲",
  "historia": "Enfrentas dilemas en tu trabajo. Usa el código de conducta del contador.",
  "retos": [
   [
    "em",
    "Empareja cada valor con una situación.",
    [
     [
      "Integridad",
      "No firmar algo falso"
     ],
     [
      "Objetividad",
      "No dejar que un conflicto de interés influya"
     ],
     [
      "Independencia",
      "No auditar la empresa de un familiar"
     ],
     [
      "Responsabilidad",
      "Responder por los errores de su trabajo"
     ],
     [
      "Observación de normas",
      "Aplicar las NIA y las NIIF"
     ],
     [
      "Actualización",
      "Capacitarse cuando cambian las normas"
     ]
    ],
    "Son los valores que pide el programa del MEP."
   ],
   [
    "q",
    "Un amigo te pide el salario de un compañero. ¿Qué haces?",
    [
     "No lo doy: la información es confidencial",
     "Se lo doy",
     "Lo publico",
     "Lo cambio"
    ],
    0,
    "La confidencialidad protege la información que conoces por el trabajo."
   ]
  ]
 },
 "4.7": {
  "ic": "🏆",
  "historia": "<b>Misión final del nivel:</b> una municipalidad tiene pagos dudosos y el alcalde presiona al auditor. Prepara tu proyecto.",
  "retos": [
   [
    "cl",
    "¿Qué componente del proyecto explica cada idea?",
    [
     "Valentía",
     "Independencia",
     "Contraloría",
     "Código y perfil"
    ],
    [
     [
      "Mantener el hallazgo pese a la presión",
      0
     ],
     [
      "El auditor no debe tener parientes en la administración",
      1
     ],
     [
      "Puede fiscalizar el uso de los fondos públicos",
      2
     ],
     [
      "Actuar con integridad y responsabilidad",
      3
     ]
    ],
    "El proyecto explica todos los componentes en el escenario."
   ],
   [
    "q",
    "¿Qué debe tener la solución del proyecto?",
    [
     "Ser concreta, realista y fundamentada",
     "Ser larga",
     "Copiar otro proyecto",
     "Culpar a alguien sin evidencia"
    ],
    0,
    "Así lo pide la escala de desempeño."
   ]
  ]
 },
 "1.1": {
  "ic": "📜",
  "historia": "Tu primer día en <b>Auditores Mercedes & Asociados</b>. Antes de tocar un papel, la socia quiere saber si entiendes qué es auditar.",
  "retos": [
   [
    "cl",
    "¿Lo hace el contador o el auditor?",
    [
     "Contador",
     "Auditor"
    ],
    [
     [
      "Registra las facturas del mes",
      0
     ],
     [
      "Prepara el balance general",
      0
     ],
     [
      "Revisa si los registros reflejan lo ocurrido",
      1
     ],
     [
      "Emite una opinión sobre los estados",
      1
     ],
     [
      "Trabaja sobre los documentos originales",
      0
     ],
     [
      "Trabaja sobre lo que ya procesó el contador",
      1
     ]
    ],
    "La contabilidad registra; la auditoría revisa y opina."
   ],
   [
    "or",
    "Ordena las etapas de la historia de la auditoría.",
    [
     "Buscar fraudes en negocios pequeños",
     "Verificar la información de los administradores",
     "Revisar el control interno y trabajar con muestras",
     "Informar y recomendar a la empresa"
    ],
    "La auditoría evolucionó con el tamaño de las empresas y la tecnología."
   ],
   [
    "q",
    "¿Cuál de estos es un fin de la auditoría?",
    [
     "Descubrir y prevenir errores y fraudes",
     "Llevar la contabilidad del cliente",
     "Pagar los impuestos de la empresa",
     "Vender los productos"
    ],
    0,
    "También examinar los estados y hacer estudios especiales."
   ]
  ]
 },
 "1.2": {
  "ic": "⚖️",
  "historia": "Un cliente le ofrece un regalo al equipo. Antes de responder, repasa los principios éticos del auditor.",
  "retos": [
   [
    "em",
    "Empareja cada principio con su significado.",
    [
     [
      "Independencia",
      "No aceptar nada que condicione sus decisiones"
     ],
     [
      "Integridad",
      "Rectitud y honestidad en todo"
     ],
     [
      "Objetividad",
      "Imparcialidad al opinar"
     ],
     [
      "Competencia y debido cuidado",
      "Aceptar solo lo que sabe hacer y actualizarse"
     ],
     [
      "Confidencialidad",
      "No revelar la información del cliente"
     ]
    ],
    "Son principios que rigen al auditor."
   ],
   [
    "cl",
    "¿A qué grupo de normas de auditoría pertenece?",
    [
     "Personales",
     "De ejecución",
     "De información"
    ],
    [
     [
      "Tener preparación técnica adecuada",
      0
     ],
     [
      "Mantener una actitud independiente",
      0
     ],
     [
      "Planear y supervisar el trabajo",
      1
     ],
     [
      "Obtener evidencia suficiente",
      1
     ],
     [
      "Decir si los estados siguen el marco contable",
      2
     ],
     [
      "Expresar una opinión o explicar por qué no",
      2
     ]
    ],
    "Personales, de ejecución del trabajo y de información."
   ],
   [
    "q",
    "El cliente le regala un celular al auditor. ¿Qué hace?",
    [
     "Lo rechaza para proteger su independencia",
     "Lo acepta si es barato",
     "Lo acepta y no dice nada",
     "Pide uno mejor"
    ],
    0,
    "Aceptar obsequios por su trabajo amenaza la independencia."
   ]
  ]
 },
 "1.7": {
  "ic": "📋",
  "historia": "Debes documentar el control interno de la caja de Café Mercedes. Escoge bien tus herramientas.",
  "retos": [
   [
    "em",
    "Empareja cada modelo con su uso.",
    [
     [
      "Cuestionario de control interno",
      "Preguntas Sí/No por cuenta o proceso"
     ],
     [
      "Entrevista",
      "Conversar con funcionarios y escribir una narrativa"
     ],
     [
      "Diagrama de flujo",
      "Dibujar el proceso con símbolos"
     ]
    ],
    "Los tres modelos se complementan."
   ],
   [
    "q",
    "En un cuestionario, la respuesta a «¿Se deposita el efectivo intacto el mismo día?» es «No». ¿Qué indica?",
    [
     "Una posible debilidad de control",
     "Que todo está bien",
     "Que el cuestionario está mal",
     "Nada importante"
    ],
    0,
    "Las respuestas «No» se investigan."
   ],
   [
    "vf",
    "El diagrama de flujo ayuda a ver dónde falta segregación de funciones.",
    true,
    "Muestra quién hace cada paso."
   ]
  ]
 },
 "1.11": {
  "ic": "⚖️",
  "historia": "Antes de revisar cuentas, necesitas saber qué errores importan en Café Mercedes.",
  "retos": [
   [
    "q",
    "Utilidad antes de impuestos ₡8 000 000. Si la firma usa el 5 %, ¿cuál es la materialidad?",
    [
     "₡400 000",
     "₡40 000",
     "₡800 000",
     "₡4 000 000"
    ],
    0,
    "8 000 000 × 5 % = 400 000."
   ],
   [
    "q",
    "Con materialidad de ₡400 000, encuentras un error de ₡150 000 sin intención. ¿Es material por su monto?",
    [
     "No",
     "Sí",
     "Siempre",
     "Depende del color"
    ],
    0,
    "Está por debajo de la materialidad (aunque se registra y se comunica)."
   ],
   [
    "vf",
    "Un fraude de monto pequeño puede ser material por su naturaleza.",
    true,
    "La materialidad también es cualitativa."
   ],
   [
    "vf",
    "La NIA 320 fija exactamente el porcentaje que se debe usar.",
    false,
    "Lo define el auditor con su juicio."
   ]
  ]
 },
 "2.9": {
  "ic": "🏦",
  "historia": "Un cliente necesita un préstamo y el banco exige buenos resultados. Analiza su entorno.",
  "retos": [
   [
    "cl",
    "¿Usuario de los estados o ley que la afecta?",
    [
     "Usuario de los estados",
     "Ley que la afecta"
    ],
    [
     [
      "El banco que da el préstamo",
      0
     ],
     [
      "Hacienda",
      0
     ],
     [
      "Los socios",
      0
     ],
     [
      "Ley del IVA",
      1
     ],
     [
      "Código de Trabajo",
      1
     ],
     [
      "Código de Comercio",
      1
     ]
    ],
    "Hacienda usa los estados y además hay leyes tributarias que aplican."
   ],
   [
    "q",
    "El banco exige una utilidad mínima para prestar. ¿Qué riesgo ve el auditor?",
    [
     "Que la administración «maquille» los estados",
     "Ninguno",
     "Que el banco cierre",
     "Que bajen los impuestos"
    ],
    0,
    "Las presiones externas aumentan el riesgo de fraude en los informes."
   ]
  ]
 },
 "4.6": {
  "ic": "🌟",
  "historia": "Te preparan para una entrevista de trabajo como auxiliar contable. Conoce tu perfil.",
  "retos": [
   [
    "cl",
    "¿Perfil profesional o habilidad blanda?",
    [
     "Perfil del contador",
     "Habilidad blanda"
    ],
    [
     [
      "Capacidad de análisis y síntesis",
      0
     ],
     [
      "Capacidad crítica",
      0
     ],
     [
      "Agilidad de pensamiento",
      0
     ],
     [
      "Liderazgo",
      1
     ],
     [
      "Trabajo en equipo",
      1
     ],
     [
      "Creatividad",
      1
     ]
    ],
    "Así los agrupa el programa del MEP."
   ],
   [
    "q",
    "¿Qué característica muestra quien no acepta un dato sin evidencia?",
    [
     "Capacidad crítica",
     "Creatividad",
     "Liderazgo",
     "Retención"
    ],
    0,
    "Es parte del perfil del contador."
   ]
  ]
 },
 "5.1": {
  "ic": "🩺",
  "historia": "Te contratan como auxiliar contable. Antes del cierre de mes, el jefe te pide revisar cómo cuidar tu salud en la oficina.",
  "retos": [
   [
    "q",
    "¿Qué artículo de la Constitución obliga al patrono a adoptar medidas de higiene y seguridad?",
    [
     "Artículo 66",
     "Artículo 183",
     "Artículo 1",
     "Artículo 50"
    ],
    0,
    "El artículo 66 de la Constitución Política."
   ],
   [
    "cl",
    "¿Riesgo del trabajo o no?",
    [
     "Sí es riesgo del trabajo",
     "No lo es"
    ],
    [
     [
      "Se lesiona la muñeca por digitar todo el día",
      0
     ],
     [
      "Se cae en las gradas de la oficina",
      0
     ],
     [
      "Se resfría en un viaje personal de vacaciones",
      1
     ]
    ],
    "Debe ocurrir por causa o con ocasión del trabajo."
   ]
  ]
 },
 "5.2": {
  "ic": "🛡️",
  "historia": "La empresa crece y ya tiene 12 empleados. ¿Qué exige la ley?",
  "retos": [
   [
    "q",
    "Con 12 personas trabajadoras, ¿qué debe formar la empresa?",
    [
     "Una comisión de salud ocupacional",
     "Una oficina de salud ocupacional",
     "Nada",
     "Un sindicato"
    ],
    0,
    "Desde 10 personas trabajadoras se forma la comisión (artículo 288)."
   ],
   [
    "q",
    "¿Desde cuántas personas trabajadoras permanentes se exige una oficina o departamento de salud ocupacional?",
    [
     "Más de 50",
     "Más de 5",
     "Más de 1000",
     "Más de 20"
    ],
    0,
    "Artículo 300 del Código de Trabajo."
   ],
   [
    "vf",
    "La cultura de la prevención significa actuar solo después de un accidente.",
    false,
    "Es actuar antes de que ocurra el daño."
   ]
  ]
 },
 "5.3": {
  "ic": "🗺️",
  "historia": "Te piden el mapa de riesgos del laboratorio de cómputo.",
  "retos": [
   [
    "cl",
    "¿Peligro o riesgo?",
    [
     "Peligro",
     "Riesgo"
    ],
    [
     [
      "Un cable suelto en el pasillo",
      0
     ],
     [
      "Un piso mojado",
      0
     ],
     [
      "La probabilidad de tropezar y lo grave que sería",
      1
     ],
     [
      "La posibilidad de una descarga y su consecuencia",
      1
     ]
    ],
    "El peligro es la fuente; el riesgo combina probabilidad y gravedad."
   ],
   [
    "or",
    "Ordena los pasos de la evaluación de riesgos.",
    [
     "Identificar los peligros",
     "Evaluar probabilidad e impacto",
     "Proponer controles",
     "Dar seguimiento"
    ],
    "Igual que en auditoría: identificar, evaluar, responder y dar seguimiento."
   ]
  ]
 },
 "5.4": {
  "ic": "🧰",
  "historia": "La oficina contable tiene varios riesgos. Clasifícalos y planea la prevención.",
  "retos": [
   [
    "cl",
    "Clasifica el factor de riesgo.",
    [
     "Físico",
     "Ergonómico",
     "Psicosocial",
     "Eléctrico"
    ],
    [
     [
      "Poca iluminación",
      0
     ],
     [
      "Ruido de la calle",
      0
     ],
     [
      "Silla sin respaldo",
      1
     ],
     [
      "Muñeca doblada al digitar",
      1
     ],
     [
      "Estrés por el cierre de mes",
      2
     ],
     [
      "Regleta sobrecargada",
      3
     ]
    ],
    "Hay más tipos: químicos, biológicos y mecánicos."
   ],
   [
    "or",
    "Ordena los controles del más al menos preferido.",
    [
     "Eliminar el peligro",
     "Sustituirlo",
     "Controles de ingeniería",
     "Controles administrativos",
     "Equipo de protección personal"
    ],
    "El equipo de protección es la última barrera."
   ]
  ]
 },
 "5.5": {
  "ic": "💺",
  "historia": "Trabajas desde la casa algunos días. Revisa tu puesto.",
  "retos": [
   [
    "q",
    "¿Dónde debe estar la pantalla?",
    [
     "A la altura de los ojos y a un brazo de distancia",
     "Muy abajo, sobre las piernas",
     "Pegada a la cara",
     "Detrás de una ventana con sol"
    ],
    0,
    "Evita dolor de cuello y fatiga visual."
   ],
   [
    "vf",
    "La ergonomía busca adaptar el trabajo a la persona.",
    true,
    "No la persona al trabajo."
   ],
   [
    "q",
    "¿Qué ley regula el teletrabajo en Costa Rica?",
    [
     "Ley 9738",
     "Ley 8292",
     "Ley 6727",
     "Ley 7428"
    ],
    0,
    "El CSO tiene además una guía de salud ocupacional para el teletrabajo."
   ]
  ]
 },
 "5.6": {
  "ic": "📐",
  "historia": "Debes buscar las normas técnicas que respaldan la señalización del colegio.",
  "retos": [
   [
    "q",
    "¿Qué es INTECO?",
    [
     "El Instituto de Normas Técnicas de Costa Rica",
     "Un impuesto",
     "Un banco",
     "Una ley laboral"
    ],
    0,
    "Elabora las normas nacionales INTE."
   ],
   [
    "q",
    "¿Dónde se consultan las normas técnicas de prevención y guías del CSO?",
    [
     "En el sitio web oficial del Consejo de Salud Ocupacional",
     "En una red social",
     "En el periódico",
     "En el banco"
    ],
    0,
    "Así lo indica el programa del MEP."
   ]
  ]
 },
 "5.7": {
  "ic": "🚨",
  "historia": "<b>Misión final:</b> suena la alarma en el colegio. Demuestra que conoces el plan de evacuación.",
  "retos": [
   [
    "or",
    "Durante un terremoto, ordena lo que haces.",
    [
     "Agacharse",
     "Cubrirse",
     "Sujetarse",
     "Salir por la ruta cuando termine el movimiento"
    ],
    "Primero protegerse; salir cuando pase el movimiento."
   ],
   [
    "cl",
    "¿Correcto o incorrecto en un incendio?",
    [
     "Correcto",
     "Incorrecto"
    ],
    [
     [
      "Dar la alarma",
      0
     ],
     [
      "Salir sin correr",
      0
     ],
     [
      "Gatear si hay humo",
      0
     ],
     [
      "Usar el ascensor",
      1
     ],
     [
      "Regresar por la mochila",
      1
     ]
    ],
    "Nunca ascensor ni regresar por objetos."
   ],
   [
    "q",
    "¿Quién coordina la salud ocupacional en el colegio?",
    [
     "La comisión de salud ocupacional",
     "El comedor",
     "La biblioteca",
     "Nadie"
    ],
    0,
    "Los centros educativos tienen su comisión."
   ]
  ]
 }
};
