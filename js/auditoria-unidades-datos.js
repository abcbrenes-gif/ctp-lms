// Auditoría · Unidades de estudio (2027). Sale del plan del MEP (AUDITORIA.docx).
// Cada lección dura entre 30 y 45 minutos: explicación, formación (práctica guiada),
// trabajo del estudiante y cierre. El indicador va con verbo + contenido + condición
// y el instrumento con niveles Inicial (1), Intermedio (2) y Avanzado (3); 0 = sin evidencia.
// Cotejado con el programa oficial del MEP (DUODECIMO.pdf, unidad de estudio Auditoría, págs. 93 a 99) y el material docente de OneDrive.
// indMEP = indicadores de logro del programa; indPlan = indicadores del plan del docente (AUDITORIA.docx).
window.AUD_UNIDADES = [
 {
  "n": 1,
  "horas": null,
  "ra": "Aplicar principios éticos y las Normas Internacionales de Auditoría (NIA) en la resolución de situaciones.",
  "evaluacion": "Conocimiento: resolución de casos.",
  "indMEP": [
   "Discrimina las generalidades, principios éticos y modelos de control interno, usados en Auditoría.",
   "Usa los principios éticos en la resolución de situaciones, según lo establecido en las NIAs.",
   "Diseña un legajo de auditoría sencillo, según las nuevas tendencias.",
   "Explica las NIAs por tema.",
   "Resuelve casos usando las versiones vigentes de las NIAs."
  ],
  "lecciones": [
   {
    "dev": true,
    "min": 40,
    "tit": "Concepto, fines e importancia de la auditoría",
    "contenidos": "Concepto, fines e importancia de la auditoría.",
    "ind": "Discrimina el concepto, los fines y la importancia de la auditoría frente a la contabilidad, mediante un cuadro comparativo.",
    "explica": [
     "<b>Auditoría:</b> examen objetivo, sistemático e independiente de la información de una entidad (con o sin fines de lucro, de cualquier tamaño) para expresar una <b>opinión</b> sobre ella y dar recomendaciones.",
     "<b>Un poco de historia:</b> al inicio el auditor buscaba fraudes en negocios pequeños; cuando las empresas crecieron y los dueños dejaron la administración a otros, pasó a verificar la información de los administradores; con la tecnología empezó a trabajar con muestras y a revisar el control interno; hoy además informa y recomienda.",
     "<b>Fines:</b> examinar el estado patrimonial y los estados financieros, descubrir y prevenir errores y fraudes, y hacer estudios especiales (aspectos fiscales y legales, compra de una empresa).",
     "<b>Importancia:</b> da confianza a los usuarios de la información, mejora el control interno y apoya las decisiones de la administración.",
     "<b>Contabilidad y auditoría no son lo mismo:</b> la contabilidad registra, clasifica y resume las transacciones; la auditoría revisa lo registrado y opina. El auditor no lleva la contabilidad de la empresa que audita: eso cuida su independencia."
    ],
    "formacion": "El docente presenta 6 tareas (registrar una factura, revisar una conciliación, preparar el balance, opinar sobre los estados…) y el grupo dice si es trabajo del contador o del auditor.",
    "trabajo": {
     "tipo": "Cuadro comparativo",
     "txt": "En parejas: cuadro contabilidad vs auditoría (qué hace, con qué documentos trabaja, de quién depende, qué entrega) y una línea de tiempo con las 4 etapas de la historia de la auditoría."
    },
    "cierre": [
     [
      "¿Qué entrega el auditor al final de su trabajo?",
      "Una opinión (informe o dictamen) y recomendaciones."
     ],
     [
      "¿Por qué el auditor no debe llevar la contabilidad que audita?",
      "Porque perdería independencia: estaría revisando su propio trabajo."
     ]
    ],
    "niveles": [
     "Define la auditoría sin diferenciarla de la contabilidad.",
     "Diferencia auditoría y contabilidad, con fines o importancia incompletos.",
     "Diferencia ambas en todos los criterios y explica fines, importancia y la evolución histórica."
    ],
    "id": "1.1",
    "fuentes": [
     "Manrique, Introducción a la Auditoría, pág. 16",
     "Sandoval, Introducción a la auditoría, págs. 5, 27",
     "Auditoría y papeles de trabajo (doc 142), pág. 1"
    ]
   },
   {
    "dev": true,
    "min": 45,
    "tit": "Principios éticos del auditor y normas de auditoría",
    "contenidos": "Principios éticos que rigen al auditor: ética profesional, independencia, integridad, objetividad, competencia profesional y debido cuidado, confidencialidad, conducta profesional, normas técnicas.",
    "ind": "Usa los principios éticos del auditor en la resolución de situaciones, según lo establecido en las NIA.",
    "explica": [
     "<b>Ética profesional (deontología):</b> el conjunto de deberes que una profesión se da a sí misma y que sus miembros deben respetar, aunque no siempre estén en una ley.",
     "<b>Independencia:</b> no aceptar nada que condicione sus decisiones. <b>Integridad:</b> rectitud y honestidad en todo lo que hace. <b>Objetividad:</b> imparcialidad, sobre todo al opinar sobre los estados financieros.",
     "<b>Competencia profesional y debido cuidado:</b> aceptar solo lo que sabe hacer y actualizarse siempre. <b>Confidencialidad:</b> no revelar ni usar la información del cliente, salvo obligación legal.",
     "<b>Conducta profesional:</b> actuar según las normas y la conciencia moral. <b>Normas técnicas:</b> trabajar con diligencia según las normas aceptadas por el Colegio de Contadores Públicos (NIA, NIIF).",
     "<b>Ante un dilema ético:</b> 1) identificar el problema y las acciones posibles, 2) ver los límites y efectos de cada acción, 3) escoger la mejor.",
     "<b>Normas de auditoría</b> (agrupación tradicional): <b>personales</b> (preparación técnica, independencia, debido cuidado), <b>de ejecución del trabajo</b> (planear y supervisar, estudiar el control interno, obtener evidencia suficiente) y <b>de información</b> (lo mínimo que debe decir el informe)."
    ],
    "formacion": "Lectura guiada de un dilema y resolución en voz alta con los 3 pasos.",
    "trabajo": {
     "tipo": "Resolución de situaciones",
     "txt": "En grupos, resolver 4 dilemas (un regalo del cliente, un amigo que pide datos, un trabajo que no domina, presión para firmar rápido): principio en juego, acciones posibles y decisión. Cerrar clasificando 6 normas de auditoría en personales, de ejecución o de información."
    },
    "cierre": [
     [
      "Un cliente le regala un celular al auditor después de la auditoría. ¿Qué principio está en riesgo?",
      "La independencia (y la objetividad)."
     ],
     [
      "¿En qué grupo de normas está «obtener evidencia suficiente»?",
      "Normas de ejecución del trabajo."
     ]
    ],
    "niveles": [
     "Nombra principios sin aplicarlos a las situaciones.",
     "Aplica principios en algunas situaciones, sin seguir los pasos del dilema.",
     "Resuelve las 4 situaciones con el principio correcto, los 3 pasos y clasifica bien las normas."
    ],
    "id": "1.2",
    "fuentes": [
     "NIAS (compendio), pág. 20",
     "Manrique, Introducción a la Auditoría, págs. 23, 44"
    ]
   },
   {
    "id": "1.3",
    "dev": true,
    "min": 40,
    "tit": "¿Qué son las NIA? Concepto, importancia, objetivos y aplicación",
    "contenidos": "NIA: concepto, importancia, objetivos y aplicación.",
    "ind": "Explica el concepto, la importancia, los objetivos y la aplicación de las NIA al elaborar un mapa conceptual en parejas.",
    "explica": [
     "<b>Auditoría de estados financieros:</b> examen independiente, objetivo y sistemático que hace un contador público autorizado para dar una <b>opinión</b> sobre si los estados financieros se presentan razonablemente según un marco (por ejemplo, las NIIF).",
     "<b>NIA:</b> Normas Internacionales de Auditoría. Las emite el IAASB (Consejo de Normas Internacionales de Auditoría y Aseguramiento), de la Federación Internacional de Contadores (IFAC). En Costa Rica las adopta el <b>Colegio de Contadores Públicos</b>, que es miembro de IFAC.",
     "<b>Importancia:</b> todos los auditores trabajan con las mismas reglas, los usuarios (bancos, inversionistas, Hacienda, socios) pueden confiar en el informe y los informes se entienden en cualquier país.",
     "<b>Objetivo global del auditor (NIA 200):</b> obtener una <b>seguridad razonable</b> (alta, pero no absoluta) de que los estados financieros no tienen incorrecciones materiales por fraude o error, y emitir un informe.",
     "<b>Aplicación:</b> se ordenan por series: 200 principios y responsabilidades · 300 y 400 riesgo y respuesta · 500 evidencia · 600 uso del trabajo de otros · 700 conclusiones e informe.",
     "Dos actitudes que piden todas las NIA: <b>escepticismo profesional</b> (no creer sin evidencia) y <b>juicio profesional</b>.",
     "<b>En Costa Rica:</b> solo puede ejercer como contador público quien sea Contador Público Autorizado (CPA), según la Ley 1038 del Colegio de Contadores Públicos, que es miembro de IFAC."
    ],
    "formacion": "El docente proyecta el mapa de series de las NIA con espacios en blanco. Los estudiantes, en voz alta, ubican 6 tarjetas (por ejemplo «muestreo», «informe», «evidencia», «carta de encargo») en la serie que corresponde.",
    "trabajo": {
     "tipo": "Mapa conceptual en parejas",
     "txt": "Con 4 ramas: qué son las NIA, quién las emite y adopta en Costa Rica, para qué sirven (3 razones) y el objetivo del auditor. Cada rama con un ejemplo propio."
    },
    "cierre": [
     [
      "¿Quién adopta las NIA en Costa Rica?",
      "El Colegio de Contadores Públicos de Costa Rica."
     ],
     [
      "¿Por qué se dice «seguridad razonable» y no absoluta?",
      "Porque el auditor trabaja con muestras, con juicio y con evidencia persuasiva, no concluyente."
     ],
     [
      "¿En qué serie de NIA está el informe del auditor?",
      "En la serie 700."
     ]
    ],
    "niveles": [
     "Menciona qué son las NIA sin indicar quién las emite ni para qué sirven.",
     "Explica qué son las NIA y quién las emite, con importancia u objetivo incompletos.",
     "Explica el concepto, quién las emite y adopta, la importancia y el objetivo, con un ejemplo propio en cada rama."
    ],
    "fuentes": [
     "Manrique, Introducción a la Auditoría, pág. 51",
     "NIAS (compendio), pág. 35",
     "Larios, Generalidades sobre auditoría (presentación semana II), diap. 2",
     "Línea de tiempo de IFAC, pág. 1",
     "Circular 06-2014 del Colegio de Contadores Públicos (NIIF), pág. 3",
     "Perfil del Contador Público Autorizado (Colegio de Contadores Públicos, 2016), pág. 2"
    ]
   },
   {
    "id": "1.4",
    "dev": true,
    "min": 40,
    "tit": "NIA 210 · Términos del encargo de auditoría",
    "contenidos": "Tema 210: términos de los trabajos de auditoría.",
    "ind": "Redacta una carta de encargo simplificada según la NIA 210, a partir del caso de una empresa ficticia.",
    "explica": [
     "Antes de aceptar el trabajo, el auditor verifica las <b>condiciones previas</b>: que el marco de información financiera sea aceptable y que la dirección acepte sus responsabilidades.",
     "<b>Responsabilidades de la dirección:</b> preparar los estados financieros, mantener el control interno necesario y dar al auditor acceso a toda la información y a las personas.",
     "La <b>carta de encargo</b> deja por escrito: objetivo y alcance de la auditoría, responsabilidades del auditor, responsabilidades de la dirección, marco de información aplicable y la forma del informe que se espera.",
     "Si la dirección limita el alcance desde el inicio, de modo que el auditor no podría dar una opinión, el auditor <b>no acepta</b> el encargo.",
     "En auditorías recurrentes se revisa cada año si hay que actualizar la carta (cambios de alcance, de dueños, de ley)."
    ],
    "formacion": "Lectura guiada de una carta de encargo modelo: el grupo subraya con colores cada una de las 5 partes obligatorias.",
    "trabajo": {
     "tipo": "Redacción con lista de cotejo",
     "txt": "Caso «Café Mercedes S.A.» (empresa ficticia, cierre al 31 de diciembre). Redactar una carta de encargo de una página con las 5 partes. Luego intercambian con otra pareja y revisan con la lista de cotejo."
    },
    "cierre": [
     [
      "Nombre dos responsabilidades de la dirección.",
      "Preparar los estados financieros y mantener el control interno (también dar acceso a la información)."
     ],
     [
      "¿Qué hace el auditor si la dirección le prohíbe revisar los bancos desde el inicio?",
      "No acepta el encargo, porque esa limitación le impediría opinar."
     ],
     [
      "¿Para qué sirve la carta de encargo?",
      "Para que ambas partes tengan claro por escrito el alcance y las responsabilidades."
     ]
    ],
    "niveles": [
     "La carta tiene 1 o 2 de las partes obligatorias.",
     "La carta tiene 3 o 4 de las partes obligatorias.",
     "La carta tiene las 5 partes obligatorias, redactadas de forma clara y coherente con el caso."
    ],
    "fuentes": [
     "NIA 210, págs. 1, 4",
     "NIA 210, págs. 1, 3",
     "NIAS (compendio), págs. 64, 74"
    ]
   },
   {
    "id": "1.5",
    "dev": true,
    "min": 35,
    "tit": "NIA 220 · Control de calidad del trabajo de auditoría",
    "contenidos": "Tema 220: control de calidad para el trabajo de auditoría.",
    "ind": "Identifica fallas de control de calidad según la NIA 220 al analizar situaciones de un equipo de auditoría.",
    "explica": [
     "El <b>socio del encargo</b> es el responsable de la calidad de cada auditoría.",
     "Elementos: cumplir los requisitos de ética (en especial la <b>independencia</b>), aceptar y continuar clientes con cuidado, asignar un equipo competente, dirigir, supervisar y <b>revisar</b> el trabajo, y hacer consultas cuando hay temas difíciles.",
     "En auditorías de mayor riesgo se hace una revisión de calidad por alguien que no participó en el trabajo.",
     "Hoy la NIA 220 trabaja junto con la Norma Internacional de Gestión de la Calidad 1 (NIGC 1), que obliga a toda la firma a tener un sistema de gestión de la calidad."
    ],
    "formacion": "El docente presenta una situación y el grupo responde con tarjeta verde (bien) o roja (falla) y explica cuál elemento se cumple o se incumple.",
    "trabajo": {
     "tipo": "Análisis de casos",
     "txt": "Cuatro situaciones: un asistente nuevo audita inventarios solo y nadie revisa su trabajo; el encargado es primo del gerente del cliente; se acepta un cliente sin investigar su reputación; el socio consulta a un especialista en impuestos. Para cada una: ¿hay falla?, ¿qué elemento de la NIA 220 está en juego?, ¿qué haría?"
    },
    "cierre": [
     [
      "¿Quién responde por la calidad de una auditoría?",
      "El socio del encargo."
     ],
     [
      "¿Por qué el parentesco con el gerente es un problema?",
      "Afecta la independencia del auditor."
     ]
    ],
    "niveles": [
     "Identifica la falla en 1 o 2 situaciones, sin nombrar el elemento.",
     "Identifica la falla en 3 o 4 situaciones y nombra el elemento en algunas.",
     "Identifica la falla en las 4 situaciones, nombra el elemento y propone una acción correcta."
    ],
    "fuentes": [
     "NIA 220, págs. 4, 5",
     "Manrique, Introducción a la Auditoría, págs. 22, 103"
    ]
   },
   {
    "id": "1.6",
    "dev": true,
    "min": 45,
    "tit": "NIA 230 · Documentación, papeles de trabajo y legajo con índices",
    "contenidos": "Tema 230: documentación. Ejemplo de legajo de auditoría.",
    "ind": "Construye el índice de un legajo de auditoría con archivo permanente y archivo corriente, según la NIA 230, a partir de una lista de documentos.",
    "explica": [
     "<b>Papeles de trabajo:</b> el registro de los procedimientos aplicados, la evidencia obtenida y las conclusiones. Deben permitir que otro auditor con experiencia, que no participó, entienda qué se hizo y por qué.",
     "Cada papel lleva: nombre de la entidad, período, título, <b>índice</b>, quién lo preparó y cuándo, quién lo revisó y cuándo, y las <b>marcas</b> (tildes) con su significado.",
     "<b>Legajo:</b> el conjunto ordenado de papeles. Se divide en <b>archivo permanente</b> (información que sirve varios años: escritura constitutiva, estatutos, organigrama, contratos importantes) y <b>archivo corriente</b> (la evidencia del período: arqueos, conciliaciones, confirmaciones).",
     "<b>Índices:</b> códigos que ordenan y cruzan los papeles. Un esquema sencillo: AP = archivo permanente · A = efectivo · B = cuentas por cobrar · C = inventarios · D = propiedad, planta y equipo · AA = cuentas por pagar · BB = préstamos · CC = patrimonio · R = ingresos · G = gastos. La hoja sumaria de efectivo es «A» y sus detalles A-1, A-2…",
     "El legajo se completa poco después de la fecha del informe (la NIA indica que normalmente no más de 60 días) y se conserva por el plazo que exija la ley o la firma, normalmente no menos de 5 años."
    ],
    "formacion": "El docente muestra un legajo armado de un caso pequeño y el grupo sigue una «referencia cruzada»: de la hoja sumaria de efectivo (A) al arqueo (A-1) y a la conciliación bancaria (A-2).",
    "trabajo": {
     "tipo": "Construcción de esquema (legajo)",
     "txt": "Se entrega una lista de 15 documentos desordenados del caso «Café Mercedes S.A.». En grupos de 3: separar archivo permanente y corriente, asignar índice a cada documento, dibujar el esquema del legajo y crear 4 marcas con su significado."
    },
    "cierre": [
     [
      "¿Qué diferencia hay entre archivo permanente y corriente?",
      "El permanente sirve varios años; el corriente es la evidencia del período auditado."
     ],
     [
      "¿Qué índice le daría a una confirmación de un cliente?",
      "B (cuentas por cobrar), por ejemplo B-3."
     ],
     [
      "¿Por qué cada papel lleva quién lo revisó?",
      "Para dejar evidencia de la supervisión y la calidad."
     ]
    ],
    "niveles": [
     "Separa algunos documentos, sin índices o con índices sin orden.",
     "Separa permanente y corriente y asigna índices con algunos errores o sin marcas.",
     "Separa todos los documentos, asigna índices coherentes con referencias cruzadas y define las marcas."
    ],
    "fuentes": [
     "NIA 230, págs. 3, 4",
     "Concepto de papeles de trabajo (docx), págs. 1, 2",
     "Manrique, Introducción a la Auditoría, pág. 209"
    ]
   },
   {
    "dev": true,
    "min": 40,
    "tit": "Modelos para evaluar el control interno: cuestionario, entrevista y diagrama de flujo",
    "contenidos": "Modelos para el control interno: cuestionarios de control interno, entrevista, diagrama de flujo.",
    "ind": "Elabora un cuestionario de control interno y un diagrama de flujo sencillos para evaluar un proceso de una empresa.",
    "explica": [
     "Para evaluar el control interno el auditor necesita documentarlo. Usa tres modelos que se complementan.",
     "<b>Cuestionario de control interno:</b> preguntas cerradas por cuenta, departamento o ciclo (por ejemplo, «¿se deposita el efectivo intacto el mismo día?»). Una respuesta «No» señala una posible debilidad que hay que investigar.",
     "<b>Entrevista:</b> conversación con funcionarios y supervisores para entender cómo se hace realmente el proceso. Se documenta en una <b>narrativa</b> y se confirma con observación.",
     "<b>Diagrama de flujo:</b> dibuja el proceso con símbolos (inicio y fin, actividad, documento, decisión, archivo) y muestra quién hace qué. Así se ve dónde falta segregación de funciones o una autorización.",
     "Otras fuentes: organigrama, manuales de procedimientos, descripción de puestos, observación personal y papeles de la auditoría interna."
    ],
    "formacion": "El docente dibuja en la pizarra el flujo de una venta al contado y el grupo marca con rojo dónde falta un control.",
    "trabajo": {
     "tipo": "Construcción de esquemas",
     "txt": "En parejas: un cuestionario de 8 preguntas (Sí/No) para el efectivo de un comercio y un diagrama de flujo del proceso de compras, señalando 2 puntos de control y 1 debilidad."
    },
    "cierre": [
     [
      "En un cuestionario de control interno, ¿qué indica una respuesta «No»?",
      "Una posible debilidad de control."
     ],
     [
      "¿Cómo se documenta una entrevista?",
      "En una narrativa, confirmada con observación."
     ]
    ],
    "niveles": [
     "Presenta el cuestionario o el diagrama incompletos.",
     "Presenta ambos, con preguntas poco relacionadas o símbolos con errores.",
     "Presenta un cuestionario pertinente y un diagrama correcto que señala controles y una debilidad."
    ],
    "id": "1.7",
    "fuentes": [
     "Manrique, Introducción a la Auditoría, págs. 166, 167",
     "Manrique, Introducción a la Auditoría, pág. 165"
    ]
   },
   {
    "id": "1.8",
    "dev": true,
    "min": 40,
    "tit": "NIA 240 · Fraude y error",
    "contenidos": "Tema 240: fraude y error.",
    "ind": "Clasifica situaciones como fraude o error e identifica el elemento del triángulo del fraude según la NIA 240, al resolver casos.",
    "explica": [
     "<b>Error:</b> incorrección no intencional (un cálculo mal hecho, un registro olvidado). <b>Fraude:</b> acto intencional para obtener una ventaja injusta o ilegal.",
     "Dos tipos de fraude: <b>información financiera fraudulenta</b> (maquillar los estados: inflar ventas, ocultar deudas) y <b>apropiación indebida de activos</b> (robo de dinero o inventario, pagos a proveedores falsos).",
     "<b>Triángulo del fraude:</b> incentivo o presión (deudas, metas), oportunidad (controles débiles) y actitud o racionalización («me lo merezco», «lo devuelvo luego»).",
     "La responsabilidad principal de prevenir y detectar el fraude es de la <b>dirección</b> y de quienes la gobiernan. El auditor busca seguridad razonable y mantiene el escepticismo durante toda la auditoría.",
     "Es más difícil detectar un fraude que un error, porque el fraude se oculta. La NIA presume riesgo de fraude en el reconocimiento de ingresos y siempre considera que la dirección puede saltarse los controles."
    ],
    "formacion": "Lluvia de ideas: el grupo propone ejemplos de la vida diaria (en el colegio, en un comercio) y el docente los clasifica en el triángulo en la pizarra.",
    "trabajo": {
     "tipo": "Resolución de casos",
     "txt": "Seis casos cortos (cajera que se lleva dinero y lo repone el lunes; asiento duplicado por cansancio; gerente que registra ventas de enero en diciembre para cobrar un bono; etc.). Para cada uno: ¿fraude o error?, tipo de fraude, elemento del triángulo y un control que lo habría evitado."
    },
    "cierre": [
     [
      "¿Qué diferencia al fraude del error?",
      "La intención."
     ],
     [
      "Nombre los 3 elementos del triángulo del fraude.",
      "Incentivo o presión, oportunidad y racionalización."
     ],
     [
      "¿Quién tiene la responsabilidad principal de prevenir el fraude?",
      "La dirección de la entidad y quienes la gobiernan."
     ]
    ],
    "niveles": [
     "Clasifica algunos casos como fraude o error sin justificar.",
     "Clasifica la mayoría de casos y nombra el elemento del triángulo en algunos.",
     "Clasifica los 6 casos, indica tipo de fraude y elemento del triángulo, y propone un control para cada uno."
    ],
    "fuentes": [
     "NIA 240, págs. 3, 8",
     "Manrique, Introducción a la Auditoría, pág. 176",
     "NIA 240, págs. 5, 11"
    ]
   },
   {
    "id": "1.9",
    "dev": true,
    "min": 35,
    "tit": "NIA 250 · Leyes y reglamentos en una auditoría",
    "contenidos": "Tema 250: consideración de leyes y reglamentos en una auditoría de estados financieros.",
    "ind": "Clasifica leyes y reglamentos costarricenses según su efecto en los estados financieros, de acuerdo con la NIA 250, en un cuadro comparativo.",
    "explica": [
     "Cumplir las leyes es responsabilidad de la dirección; el auditor no es un abogado, pero debe considerar su efecto en los estados.",
     "<b>Leyes con efecto directo</b> en los montos de los estados: impuesto sobre la renta, IVA, cargas sociales de la CCSS, Código de Trabajo (aguinaldo, vacaciones, cesantía). Aquí el auditor busca evidencia suficiente de que se cumplen.",
     "<b>Otras leyes fundamentales</b> para operar: permisos de funcionamiento, permisos sanitarios, normas ambientales. Su incumplimiento puede traer multas o el cierre. Aquí el auditor hace procedimientos limitados: preguntar a la dirección y revisar correspondencia con las autoridades.",
     "Si detecta un incumplimiento: lo comunica a la dirección y a quienes gobiernan la entidad, evalúa su efecto en los estados y en el informe, y lo documenta."
    ],
    "formacion": "El docente muestra 3 noticias o situaciones (multa de Tributación, cierre por permiso sanitario, demanda laboral) y el grupo decide si afecta los montos de los estados y cómo.",
    "trabajo": {
     "tipo": "Cuadro comparativo",
     "txt": "Clasificar 10 leyes o reglamentos de Costa Rica en dos columnas (efecto directo / otras fundamentales) y, para 3 de ellas, escribir qué cuenta de los estados se vería afectada si no se cumplen."
    },
    "cierre": [
     [
      "Dé un ejemplo de ley con efecto directo en los estados.",
      "Ley del Impuesto sobre la Renta, IVA o cargas sociales."
     ],
     [
      "¿Qué hace el auditor si encuentra un incumplimiento?",
      "Lo comunica a la dirección y gobierno, evalúa el efecto en los estados y en el informe, y lo documenta."
     ]
    ],
    "niveles": [
     "Clasifica menos de la mitad de las leyes correctamente.",
     "Clasifica la mayoría de las leyes, pero no explica el efecto en las cuentas.",
     "Clasifica las 10 leyes y explica correctamente el efecto en las cuentas en 3 de ellas."
    ],
    "fuentes": [
     "NIAS (compendio), pág. 54",
     "Normas Internacionales de Auditoría Financiera, pág. 70"
    ]
   },
   {
    "id": "1.10",
    "dev": true,
    "min": 45,
    "tit": "NIA 300 y 310 · Planeación y conocimiento del negocio",
    "contenidos": "Tema 300: planeación. Tema 310: conocimiento del negocio.",
    "ind": "Elabora un plan básico de auditoría con estrategia global y cronograma, según la NIA 300, a partir del conocimiento de una empresa ficticia.",
    "explica": [
     "Planear no es una etapa aislada: se ajusta durante toda la auditoría.",
     "<b>Estrategia global:</b> alcance, momento y dirección de la auditoría (qué se audita, cuándo, con qué equipo, qué áreas son críticas).",
     "<b>Plan de auditoría:</b> el detalle de los procedimientos: naturaleza (qué pruebas), momento (cuándo) y extensión (cuántas partidas).",
     "<b>Conocimiento del negocio</b> (la antigua NIA 310, hoy dentro de la NIA 315): sector y competencia, leyes que le aplican, dueños y administración, productos, clientes y proveedores, cómo mide su desempeño.",
     "<b>Materialidad</b> (NIA 320): el monto a partir del cual un error cambiaría las decisiones de un usuario. Ayuda a decidir dónde concentrar el trabajo."
    ],
    "formacion": "Con la ficha de «Café Mercedes S.A.», el grupo responde 6 preguntas de conocimiento del negocio y el docente las convierte en «áreas de riesgo» en la pizarra.",
    "trabajo": {
     "tipo": "Construcción de esquema (plan)",
     "txt": "En parejas: completar la plantilla de plan de auditoría (objetivo, áreas críticas, equipo, cronograma de 4 semanas en forma de diagrama) para Café Mercedes S.A."
    },
    "cierre": [
     [
      "¿Qué diferencia hay entre estrategia global y plan de auditoría?",
      "La estrategia da el alcance y la dirección general; el plan detalla los procedimientos."
     ],
     [
      "¿Para qué sirve la materialidad?",
      "Para decidir qué errores importan y dónde concentrar el trabajo."
     ]
    ],
    "niveles": [
     "El plan tiene objetivo o cronograma, sin relación con el negocio.",
     "El plan tiene objetivo, áreas y cronograma, pero las áreas críticas no se justifican.",
     "El plan es completo y las áreas críticas se justifican con el conocimiento del negocio."
    ],
    "fuentes": [
     "NIA 300, págs. 1, 2",
     "NIA 300, págs. 2, 3",
     "NIA 310, págs. 1, 2",
     "Material AUDI 2 (estrategia global), págs. 1, 2, 3"
    ]
   },
   {
    "dev": true,
    "min": 40,
    "tit": "NIA 320 · Importancia relativa (materialidad)",
    "contenidos": "Tema 320: importancia relativa de la auditoría.",
    "ind": "Calcula la importancia relativa de una empresa con una base cuantitativa y la aplica para decidir si un error es material, según la NIA 320.",
    "explica": [
     "<b>Importancia relativa (materialidad):</b> una información es material si su omisión o error puede influir en las decisiones de quienes usan los estados financieros.",
     "Se evalúa en forma <b>cuantitativa</b> (por el monto) y <b>cualitativa</b> (por su naturaleza: un fraude pequeño o un incumplimiento legal pueden ser materiales aunque el monto sea bajo).",
     "Para calcularla se toma un porcentaje de una cifra clave: <b>utilidad antes de impuestos</b>, <b>ingresos</b> o <b>total de activos</b>. El porcentaje lo define el auditor con su juicio; por ejemplo, una firma puede usar el 5 % de la utilidad antes de impuestos.",
     "Si la empresa está cerca del punto de equilibrio, la utilidad da una materialidad muy baja; entonces conviene usar los ingresos o el total de activos.",
     "Se fija en la planeación (para centrar el trabajo en lo importante) y se vuelve a evaluar al final, con los estados ajustados. También se considera por cuenta."
    ],
    "formacion": "Cálculo guiado: utilidad antes de impuestos ₡8 000 000 × 5 % = ₡400 000. ¿Un error de ₡150 000 es material? ¿Y uno de ₡500 000?",
    "trabajo": {
     "tipo": "Resolución de caso",
     "txt": "Con los estados de Café Mercedes S.A.: calcular la materialidad con dos bases distintas, escoger una y justificar, y decidir si 5 errores encontrados son materiales (incluye uno pequeño pero fraudulento)."
    },
    "cierre": [
     [
      "¿La NIA fija el porcentaje exacto de materialidad?",
      "No; lo define el auditor con su juicio profesional."
     ],
     [
      "¿Puede ser material un error de monto pequeño?",
      "Sí, por su naturaleza (por ejemplo, un fraude)."
     ]
    ],
    "niveles": [
     "Calcula la materialidad con errores o sin base.",
     "Calcula la materialidad correctamente, pero decide mal en algunos errores.",
     "Calcula con dos bases, justifica la escogida y decide bien los 5 errores, incluido el cualitativo."
    ],
    "id": "1.11",
    "fuentes": [
     "NIA 320, págs. 1, 2",
     "Manrique, Introducción a la Auditoría, pág. 59"
    ]
   },
   {
    "id": "1.12",
    "dev": true,
    "min": 45,
    "tit": "Evaluación del riesgo y control interno (antes NIA 400; hoy NIA 315 y 330)",
    "contenidos": "Evaluación del riesgo. Tema 400: evaluación de riesgos y control interno.",
    "ind": "Analiza el control interno de una empresa ficticia mediante una matriz de riesgos según las NIA 315 y 330.",
    "explica": [
     "<b>Riesgo de auditoría:</b> que el auditor dé una opinión equivocada cuando los estados tienen errores importantes.",
     "Sus componentes: <b>riesgo inherente</b> (la cuenta es propensa a error por su naturaleza, como el efectivo), <b>riesgo de control</b> (que el control interno no lo prevenga ni lo detecte) y <b>riesgo de detección</b> (que las pruebas del auditor no lo encuentren). Los dos primeros forman el riesgo de incorrección material.",
     "Relación inversa: si el riesgo inherente y de control son altos, el auditor debe bajar el riesgo de detección haciendo <b>más y mejores pruebas</b>.",
     "<b>Control interno</b>, 5 componentes: entorno de control, proceso de valoración de riesgos de la entidad, proceso de seguimiento, sistema de información y comunicación, y actividades de control.",
     "<b>Respuesta (NIA 330):</b> pruebas de controles (¿el control funciona?) y procedimientos sustantivos (¿el saldo está bien?).",
     "En el plan del MEP esto se llamaba «Tema 400»; la norma vigente es la NIA 315 revisada, que unió la antigua 310 y la 400."
    ],
    "formacion": "El docente resuelve en la pizarra la matriz para una sola cuenta (efectivo): riesgo inherente, control existente, riesgo de control y prueba que se haría.",
    "trabajo": {
     "tipo": "Matriz de riesgos (caso)",
     "txt": "Para 4 cuentas de Café Mercedes S.A. (efectivo, inventario, cuentas por cobrar, planillas): completar la matriz con riesgo inherente, control que existe o falta, riesgo de control (alto, medio, bajo), componente del control interno afectado y la prueba que propone."
    },
    "cierre": [
     [
      "Nombre los 3 componentes del riesgo de auditoría.",
      "Inherente, de control y de detección."
     ],
     [
      "Si el control interno es débil, ¿más o menos pruebas?",
      "Más pruebas sustantivas."
     ],
     [
      "Nombre 3 componentes del control interno.",
      "Entorno de control, valoración de riesgos, actividades de control (también información y comunicación, seguimiento)."
     ]
    ],
    "niveles": [
     "Completa la matriz para 1 o 2 cuentas, sin relacionar riesgo y prueba.",
     "Completa la matriz para las 4 cuentas con algunas incoherencias entre riesgo y prueba.",
     "Completa las 4 cuentas con riesgos, componente del control interno y pruebas coherentes."
    ],
    "fuentes": [
     "Manrique, Introducción a la Auditoría, págs. 66, 67",
     "NIA 400, págs. 1, 3",
     "NIAS (compendio), pág. 21",
     "NIA 315 (revisada), págs. 1, 2, 4",
     "Larios, Control interno (presentación semana V), diap. 2, 3, 4"
    ]
   },
   {
    "id": "1.13",
    "dev": true,
    "min": 40,
    "tit": "NIA 500 · Evidencia de auditoría",
    "contenidos": "Tema 500: evidencia de auditoría.",
    "ind": "Ordena tipos de evidencia según su fiabilidad y los relaciona con procedimientos de auditoría según la NIA 500, en un ejercicio de clasificación.",
    "explica": [
     "La evidencia debe ser <b>suficiente</b> (cantidad) y <b>adecuada</b> (calidad: relevante y fiable).",
     "Reglas de fiabilidad: externa a la empresa es más fiable que interna; la que obtiene el auditor directamente más que la indirecta; la escrita más que la verbal; los originales más que las copias.",
     "<b>Procedimientos:</b> inspección (revisar documentos o activos), observación (ver un proceso), confirmación externa (carta al banco o al cliente), recálculo, reejecución (volver a hacer un control), procedimientos analíticos e indagación (preguntar).",
     "<b>Afirmaciones</b> que se prueban: existencia, integridad (que esté todo), exactitud, corte (en el período correcto), valoración, derechos y obligaciones, clasificación y presentación."
    ],
    "formacion": "Juego de antorcha: el docente dice una evidencia (por ejemplo «estado de cuenta enviado por el banco directamente al auditor») y quien tiene la antorcha dice el procedimiento y si es muy fiable o poco fiable.",
    "trabajo": {
     "tipo": "Clasificación",
     "txt": "Ordenar 8 evidencias de la más a la menos fiable, justificar 3 posiciones y emparejar cada una con el procedimiento y la afirmación que prueba."
    },
    "cierre": [
     [
      "¿Qué significa evidencia suficiente y adecuada?",
      "Suficiente es la cantidad; adecuada es la calidad (relevancia y fiabilidad)."
     ],
     [
      "¿Qué es más fiable, una confirmación del banco o una copia del estado de cuenta que da el cliente?",
      "La confirmación enviada por el banco al auditor."
     ]
    ],
    "niveles": [
     "Ordena las evidencias sin justificar y sin relacionar procedimientos.",
     "Ordena con algunos errores y relaciona procedimientos en la mayoría.",
     "Ordena correctamente, justifica con las reglas de fiabilidad y relaciona procedimiento y afirmación."
    ],
    "fuentes": [
     "NIA 500, págs. 1, 2",
     "NIA 500, pág. 7",
     "Manrique, Introducción a la Auditoría, pág. 26"
    ]
   },
   {
    "id": "1.14",
    "dev": true,
    "min": 35,
    "tit": "NIA 510 · Encargos iniciales: saldos de apertura",
    "contenidos": "Tema 510: trabajos iniciales, balances de apertura.",
    "ind": "Verifica saldos de apertura comparando el balance de cierre del período anterior con los saldos iniciales, según la NIA 510, en un ejercicio práctico.",
    "explica": [
     "Es el primer año que el auditor revisa a esa empresa. Los saldos con los que empieza el año (apertura) vienen del año anterior, que no auditó él.",
     "Objetivo: que los saldos de apertura no tengan errores que afecten los estados actuales y que las políticas contables se hayan aplicado igual.",
     "Procedimientos: comprobar que los saldos de cierre se trasladaron correctamente, revisar los papeles del auditor anterior (si lo hubo) y hacer pruebas específicas (por ejemplo, cobros de enero de cuentas por cobrar de diciembre).",
     "Si no logra evidencia suficiente sobre la apertura, su opinión puede ser con salvedades o puede abstenerse."
    ],
    "formacion": "El docente compara en pantalla 5 saldos del cierre 2025 con la apertura 2026 y el grupo encuentra la diferencia.",
    "trabajo": {
     "tipo": "Ejercicio práctico",
     "txt": "Comparar el balance de cierre 2025 con la balanza de apertura 2026 (12 cuentas, 3 diferencias escondidas). Señalar cada diferencia, su posible causa y la prueba que haría."
    },
    "cierre": [
     [
      "¿Qué son los saldos de apertura?",
      "Los saldos con que inicia el período, que vienen del cierre anterior."
     ],
     [
      "¿Qué pasa si no puede verificarlos?",
      "Puede emitir una opinión con salvedades o abstenerse."
     ]
    ],
    "niveles": [
     "Encuentra 1 diferencia sin explicar.",
     "Encuentra 2 o 3 diferencias con causa o prueba incompletas.",
     "Encuentra las 3 diferencias, explica la causa posible y propone la prueba."
    ],
    "fuentes": [
     "NIA 510, págs. 1, 2",
     "NIAS (compendio), pág. 39"
    ]
   },
   {
    "id": "1.15",
    "dev": true,
    "min": 40,
    "tit": "NIA 520 · Procedimientos analíticos",
    "contenidos": "Tema 520: procedimientos analíticos.",
    "ind": "Calcula variaciones e indicadores de un estado de resultados para señalar partidas a investigar, según la NIA 520.",
    "explica": [
     "Son el análisis de relaciones razonables entre datos financieros y no financieros: variaciones de un año a otro, porcentajes y razones (margen bruto, rotación de inventario, días de cobro).",
     "Pasos: 1) armar una expectativa (lo que debería dar), 2) fijar cuánta diferencia se acepta, 3) comparar con lo registrado, 4) investigar las diferencias importantes.",
     "Se usan al inicio para valorar riesgos (obligatorio), durante la auditoría como pruebas sustantivas y al final para revisar que todo tenga sentido (obligatorio).",
     "Ejemplo: si las ventas suben 5 % pero el costo de ventas baja 20 %, algo no cuadra y se investiga."
    ],
    "formacion": "Cálculo guiado de la variación absoluta y porcentual de 3 cuentas en la pizarra.",
    "trabajo": {
     "tipo": "Resolución de caso con hoja de cálculo",
     "txt": "Estado de resultados comparativo 2025-2026 de Café Mercedes S.A.: calcular variaciones absolutas y porcentuales, margen bruto de ambos años, marcar partidas con variación mayor al 10 % y escribir una pregunta que le haría a la gerencia por cada una."
    },
    "cierre": [
     [
      "¿Cuándo son obligatorios los procedimientos analíticos?",
      "Al valorar riesgos al inicio y en la revisión final."
     ],
     [
      "Ventas +5 %, costo de ventas −20 %: ¿qué haría?",
      "Investigar: preguntar y revisar el inventario y el costo."
     ]
    ],
    "niveles": [
     "Calcula algunas variaciones con errores.",
     "Calcula las variaciones correctamente pero no interpreta o no formula preguntas.",
     "Calcula variaciones y margen, señala las partidas correctas y formula preguntas pertinentes."
    ],
    "fuentes": [
     "NIA 520, págs. 1, 2",
     "Manrique, Introducción a la Auditoría, pág. 74"
    ]
   },
   {
    "id": "1.16",
    "dev": true,
    "min": 40,
    "tit": "NIA 530 · Muestreo de auditoría",
    "contenidos": "Tema 530: muestreo de auditoría.",
    "ind": "Selecciona una muestra con el método sistemático según la NIA 530, a partir de una población de facturas.",
    "explica": [
     "Muestrear es aplicar las pruebas a menos del 100 % de las partidas, de modo que todas tengan oportunidad de ser elegidas, para sacar una conclusión de toda la población.",
     "Puede ser <b>estadístico</b> (con probabilidad, mide el riesgo) o <b>no estadístico</b> (con juicio).",
     "Métodos de selección: aleatoria (números al azar), <b>sistemática</b> (intervalo = población ÷ muestra, con inicio al azar), al azar sin patrón consciente. La selección en bloque normalmente no es adecuada.",
     "<b>Riesgo de muestreo:</b> que la conclusión con la muestra sea distinta a la que daría revisar todo.",
     "En pruebas de controles se buscan <b>desviaciones</b>; en pruebas sustantivas, <b>incorrecciones</b>, que se proyectan a toda la población."
    ],
    "formacion": "Ejemplo en la pizarra: 120 recibos, muestra de 12, intervalo 10, inicio al azar 7 → 7, 17, 27…",
    "trabajo": {
     "tipo": "Ejercicio práctico",
     "txt": "Lista de 200 facturas (números 1001 a 1200). Seleccionar 10 con método sistemático (mostrar intervalo, inicio y lista), revisar las 10 con el atributo «tiene firma de autorización» y calcular el porcentaje de desviación."
    },
    "cierre": [
     [
      "¿Cómo se calcula el intervalo de muestreo?",
      "Población entre tamaño de la muestra."
     ],
     [
      "¿Qué es el riesgo de muestreo?",
      "Que la conclusión con la muestra difiera de la que daría revisar toda la población."
     ]
    ],
    "niveles": [
     "Selecciona partidas sin método claro.",
     "Calcula el intervalo pero comete errores en la selección o en el porcentaje.",
     "Calcula intervalo e inicio, selecciona las 10 correctamente y calcula la desviación."
    ],
    "fuentes": [
     "NIA 530, págs. 3, 4",
     "NIA 530, pág. 14",
     "Manrique, Introducción a la Auditoría, pág. 80"
    ]
   },
   {
    "id": "1.17",
    "dev": true,
    "min": 40,
    "tit": "NIA 600 y 610 · Uso del trabajo de otro auditor y de la auditoría interna",
    "contenidos": "Tema 600: uso del trabajo de otro auditor. Tema 610: consideración del trabajo de auditoría interna.",
    "ind": "Decide si el auditor externo puede usar el trabajo de otros auditores o de la auditoría interna, según las NIA 600 y 610, al resolver casos.",
    "explica": [
     "<b>NIA 600:</b> auditoría de grupos (una empresa con sucursales o subsidiarias). Otros auditores revisan partes del grupo y el auditor del grupo usa su trabajo, pero sigue siendo responsable de la opinión. Debe evaluar su competencia e independencia y dirigir su trabajo.",
     "<b>NIA 610:</b> el auditor externo puede usar el trabajo de la auditoría interna si evalúa su <b>objetividad</b>, su <b>competencia</b> y si trabaja de forma <b>sistemática y disciplinada</b>.",
     "No lo puede usar para decisiones de juicio importante ni en áreas de alto riesgo sin revisarlo él mismo. La opinión es solo responsabilidad del auditor externo.",
     "En el sector público de Costa Rica, la auditoría interna está regulada por la Ley General de Control Interno (Ley 8292)."
    ],
    "formacion": "Pregunta abierta: «Si la auditoría interna depende del gerente al que revisa, ¿es objetiva?». Debate de 5 minutos.",
    "trabajo": {
     "tipo": "Resolución de casos",
     "txt": "Cinco situaciones: ¿puede usar el trabajo? ¿Qué debe evaluar antes? ¿Quién firma la opinión? Ejemplo: el auditor interno hizo el conteo de inventario; un auditor de otro país revisó la sucursal de Panamá; el auditor interno es esposo del contador."
    },
    "cierre": [
     [
      "Nombre 2 aspectos que evalúa el auditor externo de la auditoría interna.",
      "Objetividad y competencia (también enfoque sistemático y disciplinado)."
     ],
     [
      "Si usa el trabajo de otros, ¿quién responde por la opinión?",
      "Solo el auditor externo que firma."
     ]
    ],
    "niveles": [
     "Decide en algunos casos sin justificar.",
     "Decide en la mayoría y justifica en algunos con criterios de la NIA.",
     "Decide en los 5 casos, justifica con los criterios de la NIA y señala que la responsabilidad es del auditor externo."
    ],
    "fuentes": [
     "NIAS (compendio), págs. 7, 46",
     "Ley 8292 de Control Interno, págs. 3, 4"
    ]
   },
   {
    "id": "1.18",
    "dev": true,
    "min": 45,
    "tit": "NIA 700 · El dictamen del auditor",
    "contenidos": "Tema 700: el dictamen del auditor sobre los estados financieros.",
    "ind": "Determina el tipo de opinión que corresponde según las NIA 700, 705 y 706, al resolver casos de auditoría.",
    "explica": [
     "<b>Opinión no modificada (favorable o «limpia»):</b> los estados se presentan razonablemente en todos sus aspectos materiales.",
     "<b>Opiniones modificadas (NIA 705):</b> <b>con salvedades</b> (hay un problema material pero no generalizado); <b>desfavorable o adversa</b> (incorrecciones materiales y generalizadas); <b>denegación o abstención</b> (no obtuvo evidencia suficiente y los posibles efectos son materiales y generalizados).",
     "Regla rápida: ¿el problema es un error o falta de evidencia? ¿Es material? ¿Es generalizado? Esas tres preguntas dan el tipo de opinión.",
     "<b>NIA 706:</b> párrafo de énfasis (resalta algo ya revelado, por ejemplo un juicio pendiente) y párrafo de otras cuestiones. No cambian la opinión.",
     "Partes del informe: título, destinatario, opinión, fundamento de la opinión, empresa en funcionamiento cuando aplica, responsabilidades de la dirección y del auditor, firma, fecha y lugar."
    ],
    "formacion": "El docente arma con el grupo una tabla de 2 × 2 (error / falta de evidencia × material no generalizado / generalizado) y la llenan juntos.",
    "trabajo": {
     "tipo": "Resolución de casos",
     "txt": "Seis casos: decidir el tipo de opinión y justificar con las tres preguntas. Además, ordenar las partes de un informe desordenado."
    },
    "cierre": [
     [
      "¿Qué opinión corresponde si no le dejaron contar el inventario y el inventario es casi todo el activo?",
      "Denegación (abstención) de opinión."
     ],
     [
      "¿Un párrafo de énfasis cambia la opinión?",
      "No."
     ]
    ],
    "niveles": [
     "Acierta el tipo de opinión en 1 o 2 casos.",
     "Acierta en 3 a 5 casos con justificación parcial.",
     "Acierta los 6 casos, los justifica con materialidad y generalización y ordena bien el informe."
    ],
    "fuentes": [
     "NIA 700, págs. 3, 5",
     "Manrique, Introducción a la Auditoría, págs. 230, 232",
     "NIAS (compendio), págs. 39, 177",
     "Informes de auditoría (docx), pág. 1"
    ]
   },
   {
    "id": "1.19",
    "dev": true,
    "min": 30,
    "tit": "«Declaración 5» · Consideraciones particulares en la auditoría (entidades pequeñas)",
    "contenidos": "Declaración 5: consideraciones particulares en la auditoría.",
    "ind": "Describe las características de una entidad pequeña y cómo adaptar la auditoría a ellas, en un caso de un comercio local.",
    "explica": [
     "Una entidad pequeña suele tener: dueño que también administra, pocas fuentes de ingresos, contabilidad sencilla, pocos empleados y <b>poca segregación de funciones</b>.",
     "El auditor aplica igual todas las NIA, pero adapta: documentación más simple, más pruebas sustantivas (porque hay pocos controles) y más atención a que el dueño pueda saltarse los controles.",
     "Nota: el plan del MEP la llama «Declaración 5». En las NIA vigentes estas consideraciones vienen dentro de cada norma, en los apartados para «entidades de menor dimensión»."
    ],
    "formacion": "Comparación rápida en la pizarra: un supermercado grande y una soda del barrio. ¿Quién cobra, quién registra, quién deposita?",
    "trabajo": {
     "tipo": "Caso",
     "txt": "Caso «Soda La Esquina»: escribir 3 características de entidad pequeña que se ven en el caso, 2 riesgos que generan y 2 adaptaciones que haría el auditor."
    },
    "cierre": [
     [
      "¿Por qué en una empresa pequeña se hacen más pruebas sustantivas?",
      "Porque hay pocos controles y poca segregación de funciones."
     ]
    ],
    "niveles": [
     "Menciona características sin relacionarlas con el caso.",
     "Identifica características y riesgos, pero las adaptaciones son incompletas.",
     "Identifica las características en el caso, los riesgos y adaptaciones coherentes."
    ],
    "fuentes": [
     "NIA 230, pág. 9",
     "NIA 300, págs. 6, 7"
    ]
   },
   {
    "id": "1.20",
    "dev": true,
    "min": 45,
    "tit": "Taller integrador · Legajo con índices y análisis del control interno",
    "contenidos": "Aplicación de las NIA (evaluación de la unidad).",
    "ind": "Aplica las NIA al construir un legajo con índices y analizar el control interno de un caso, de forma individual.",
    "explica": [
     "Repaso de 5 minutos: series de las NIA, índices del legajo, componentes del riesgo, tipos de opinión."
    ],
    "formacion": "Lectura del caso integrador y aclaración de dudas antes de empezar.",
    "trabajo": {
     "tipo": "Evaluación: resolución de casos",
     "txt": "Caso «Ferretería El Roble S.A.» (ficticia): 1) armar el índice del legajo con 12 documentos; 2) matriz de riesgos para 3 cuentas con el componente del control interno afectado; 3) seleccionar una muestra; 4) decidir y justificar el tipo de opinión ante un hallazgo dado."
    },
    "cierre": [
     [
      "Autoevaluación: ¿qué parte le costó más y por qué?",
      "Respuesta personal."
     ]
    ],
    "niveles": [
     "Resuelve 1 de las 4 partes con coherencia.",
     "Resuelve 2 o 3 partes con coherencia.",
     "Resuelve las 4 partes con coherencia y justificación según las NIA."
    ],
    "fuentes": [
     "Principios generales sobre papeles de trabajo (MESICIC), pág. 9",
     "Manrique, Introducción a la Auditoría, pág. 219"
    ]
   }
  ],
  "indPlan": [
   "Aplica las NIA en la resolución de situaciones, mediante la resolución de casos.",
   "Construye un legajo con sus respectivos índices, mediante la resolución de casos y la construcción de esquemas.",
   "Utiliza las NIA para el análisis del control interno de la empresa, mediante la resolución de casos y la construcción de esquemas."
  ]
 },
 {
  "n": 2,
  "horas": 9,
  "ra": "Reconocer las especialidades, tipos de auditoría y características básicas del negocio por auditar.",
  "evaluacion": "Conocimiento: cuadro comparativo de la diferencia entre auditoría interna y externa; lluvia de ideas en donde se tipifiquen las NIA.",
  "indMEP": [
   "Ilustra el ejemplo de un legajo de Auditoría.",
   "Distingue las especialidades y tipos de auditoría.",
   "Tipifica las características del negocio por auditar.",
   "Explica el concepto de entidad en el contexto de la Auditoría."
  ],
  "lecciones": [
   {
    "id": "2.1",
    "dev": true,
    "min": 40,
    "tit": "Especialidades de la auditoría",
    "contenidos": "Especialidades: financiera, operativa, administrativa, fiscal, de sistemas y especiales.",
    "ind": "Distingue las especialidades de la auditoría según su objetivo, mediante el juego de antorcha.",
    "explica": [
     "<b>Financiera:</b> opina si los estados financieros se presentan razonablemente según el marco contable (NIIF). Es la que regulan las NIA.",
     "<b>Operativa:</b> evalúa la eficiencia, la eficacia y la economía de las operaciones (¿se hacen bien las cosas y al menor costo?).",
     "<b>Administrativa:</b> revisa la organización, los planes, las políticas y si la administración cumple sus objetivos.",
     "<b>Fiscal o tributaria:</b> comprueba que la empresa cumpla sus obligaciones con Hacienda: impuesto sobre la renta, IVA, retenciones.",
     "<b>De sistemas (informática):</b> revisa la seguridad de la información, los accesos, los respaldos y que los datos sean íntegros.",
     "<b>Especiales:</b> se hacen por un propósito concreto: forense (investigar un fraude), ambiental, de cumplimiento de una ley o contrato, de recursos humanos, gubernamental."
    ],
    "formacion": "El docente lee 6 situaciones reales (por ejemplo «el banco quiere saber si los estados son confiables antes de dar un préstamo») y el grupo dice qué especialidad aplica.",
    "trabajo": {
     "tipo": "Juego de antorcha",
     "txt": "Se pasa la «antorcha» (un objeto). Quien la recibe saca una tarjeta con una situación, dice la especialidad y una razón, y pasa la antorcha. Al final, cada estudiante completa una tabla de 6 especialidades con objetivo y un ejemplo propio."
    },
    "cierre": [
     [
      "¿Qué especialidad revisa si la empresa paga bien el IVA?",
      "La fiscal o tributaria."
     ],
     [
      "¿Qué diferencia hay entre la operativa y la financiera?",
      "La financiera opina sobre los estados; la operativa evalúa eficiencia, eficacia y economía."
     ]
    ],
    "niveles": [
     "Nombra algunas especialidades sin su objetivo.",
     "Distingue la mayoría de especialidades con objetivo, con ejemplos incompletos.",
     "Distingue las 6 especialidades con su objetivo y un ejemplo propio correcto."
    ],
    "fuentes": [
     "Puerres, Auditoría operacional, págs. 1, 2",
     "Sandoval, Introducción a la auditoría, págs. 5, 6",
     "La auditoría: concepto, clases y evolución (unidad 1, conceptos y ejercicios), págs. 1, 4",
     "Villardefrancos y Rivera, La auditoría como proceso de control, págs. 1, 2, 3"
    ]
   },
   {
    "id": "2.2",
    "dev": true,
    "min": 40,
    "tit": "Tipos de auditoría: interna y externa",
    "contenidos": "Tipos de auditoría: interna y externa.",
    "ind": "Establece las diferencias entre la auditoría interna y la externa en un cuadro comparativo.",
    "explica": [
     "<b>Auditoría interna:</b> la hacen funcionarios de la propia organización. Evalúa de forma continua el control interno, la gestión de riesgos y el cumplimiento, e informa a la junta directiva o al jerarca.",
     "En el sector público de Costa Rica la auditoría interna está regulada por la Ley General de Control Interno (Ley 8292) y debe tener independencia funcional respecto de la administración que fiscaliza.",
     "<b>Auditoría externa:</b> la hace un contador público autorizado independiente, contratado por la entidad. Da una opinión sobre los estados financieros, normalmente una vez al año, y su informe lo usan terceros (socios, bancos, inversionistas). Se rige por las NIA.",
     "Se complementan: el auditor externo puede usar parte del trabajo de la auditoría interna (NIA 610), pero no delega su opinión."
    ],
    "formacion": "El docente dibuja un cuadro con 7 criterios (quién la hace, relación con la empresa, objetivo, frecuencia, a quién informa, normativa, usuario del informe) y llena el primero con el grupo.",
    "trabajo": {
     "tipo": "Cuadro comparativo (instrumento del plan)",
     "txt": "En parejas, completar los 7 criterios del cuadro y, al final, escribir una situación en la que una empresa necesitaría las dos auditorías."
    },
    "cierre": [
     [
      "¿Quién emite una opinión sobre los estados financieros para terceros?",
      "El auditor externo."
     ],
     [
      "¿Qué ley regula la auditoría interna en el sector público?",
      "La Ley General de Control Interno, Ley 8292."
     ]
    ],
    "niveles": [
     "Completa 1 a 3 criterios del cuadro.",
     "Completa 4 a 6 criterios o los 7 con algunas imprecisiones.",
     "Completa los 7 criterios correctamente y plantea una situación coherente."
    ],
    "fuentes": [
     "Manrique, Introducción a la Auditoría, pág. 34",
     "Sandoval, Introducción a la auditoría, págs. 13, 17",
     "La auditoría: concepto, clases y evolución (unidad 1, conceptos y ejercicios), págs. 6, 8",
     "Tema 2 · Estructura del departamento de auditoría interna, pág. 1"
    ]
   },
   {
    "id": "2.3",
    "dev": true,
    "min": 35,
    "tit": "Tipos de dictamen y vocabulario técnico",
    "contenidos": "Tipos de dictámenes de auditoría y su vocabulario técnico.",
    "ind": "Identifica el vocabulario técnico de los tipos de dictamen de auditoría, mediante el juego de antorcha.",
    "explica": [
     "Cuatro dictámenes: <b>favorable o limpio</b>, <b>con salvedades</b>, <b>desfavorable o adverso</b> y <b>abstención o denegación</b> de opinión.",
     "Vocabulario: <b>razonabilidad</b> (presentación correcta en lo importante), <b>materialidad</b> (lo que cambiaría decisiones), <b>generalizado</b> (afecta muchas partes de los estados), <b>incorrección</b> (error o fraude en una cifra), <b>salvedad</b> (excepción a la opinión), <b>limitación al alcance</b> (no se pudo obtener evidencia), <b>párrafo de énfasis</b> y <b>empresa en funcionamiento</b> (que la empresa seguirá operando).",
     "Relación: incorrección material no generalizada → con salvedades; incorrección material y generalizada → desfavorable; limitación material y generalizada → abstención."
    ],
    "formacion": "El docente lee fragmentos inventados de informes y el grupo identifica el tipo de dictamen por las palabras clave.",
    "trabajo": {
     "tipo": "Juego de antorcha",
     "txt": "Con la antorcha, cada estudiante recibe un término y lo define con sus palabras en 20 segundos; si falla, la antorcha pasa. Luego, individual: emparejar 10 términos con su definición y 4 fragmentos con su tipo de dictamen."
    },
    "cierre": [
     [
      "¿Qué significa «limitación al alcance»?",
      "Que el auditor no pudo obtener la evidencia que necesitaba."
     ],
     [
      "¿Qué palabra clave distingue el dictamen adverso del de salvedades?",
      "Generalizado."
     ]
    ],
    "niveles": [
     "Define correctamente menos de la mitad de los términos.",
     "Define la mayoría de términos y relaciona algunos fragmentos con su dictamen.",
     "Define los 10 términos y relaciona los 4 fragmentos con su dictamen."
    ],
    "fuentes": [
     "Manrique, Introducción a la Auditoría, págs. 230, 232",
     "Informes de auditoría (docx), págs. 1, 2, 3"
    ]
   },
   {
    "id": "2.4",
    "dev": true,
    "min": 35,
    "tit": "El archivo permanente",
    "contenidos": "Archivo permanente: importancia y contenido.",
    "ind": "Define la importancia y el contenido del archivo permanente, mediante el juego de antorcha.",
    "explica": [
     "Es la parte del legajo con información de <b>interés continuo</b>: sirve para varias auditorías, no solo para un año.",
     "Contiene: escritura constitutiva y estatutos, cédula jurídica y datos tributarios, actas importantes de socios y junta, organigrama, manuales de políticas y procedimientos, catálogo de cuentas, contratos de largo plazo (préstamos, arrendamientos, convenios), historia de la empresa e informes de auditorías anteriores.",
     "<b>Importancia:</b> evita pedir lo mismo cada año, da contexto al equipo nuevo, permite ver cambios en el tiempo y ayuda a planear.",
     "Se revisa y actualiza en cada auditoría: lo que ya no está vigente se retira o se marca."
    ],
    "formacion": "El grupo separa en dos montones 12 documentos: ¿van al archivo permanente o al corriente?",
    "trabajo": {
     "tipo": "Juego de antorcha",
     "txt": "Con la antorcha, cada estudiante nombra un documento del archivo permanente y por qué es útil, sin repetir. Cierre individual: una ficha con definición, 6 documentos y 3 razones de su importancia."
    },
    "cierre": [
     [
      "¿Un arqueo de caja de este año va al archivo permanente?",
      "No, va al archivo corriente."
     ],
     [
      "Dé una razón de la importancia del archivo permanente.",
      "Evita pedir la misma información cada año o da contexto al equipo."
     ]
    ],
    "niveles": [
     "Menciona documentos sin explicar la importancia del archivo.",
     "Define el archivo y menciona documentos, con importancia incompleta.",
     "Define el archivo, menciona 6 documentos correctos y explica 3 razones de su importancia."
    ],
    "fuentes": [
     "Principios generales sobre papeles de trabajo (MESICIC), págs. 14, 16"
    ]
   },
   {
    "id": "2.5",
    "dev": true,
    "min": 40,
    "tit": "Conocimiento de la empresa: constitución, leyes y reglamentos",
    "contenidos": "Conocimiento de la empresa: constitución, leyes, reglamentos.",
    "ind": "Distingue los aspectos legales del conocimiento de la empresa, mediante la elaboración de un caso y un juego de preguntas.",
    "explica": [
     "<b>Constitución:</b> cómo nació la empresa: tipo de sociedad según el Código de Comercio (sociedad anónima, de responsabilidad limitada), escritura, socios, capital, inscripción en el Registro Nacional y cédula jurídica.",
     "<b>Leyes que le aplican:</b> Código de Comercio, Código de Trabajo, Ley del Impuesto sobre la Renta, Ley del Impuesto al Valor Agregado, Ley Constitutiva de la CCSS y Ley de Protección al Trabajador, más las leyes propias de su actividad.",
     "<b>Reglamentos y permisos:</b> permiso sanitario de funcionamiento del Ministerio de Salud, patente municipal, reglamentos de la actividad (por ejemplo, de transporte o de alimentos).",
     "Por qué le interesa al auditor: el tipo de sociedad define quién decide; las leyes generan obligaciones (impuestos, cargas sociales, aguinaldo) que deben estar en los estados; un permiso vencido puede detener el negocio."
    ],
    "formacion": "El docente muestra la ficha de una empresa ficticia y el grupo encuentra 3 datos de constitución y 3 obligaciones legales.",
    "trabajo": {
     "tipo": "Caso y juego de preguntas",
     "txt": "En grupos, elaborar la ficha legal de una empresa ficticia de la zona (tipo de sociedad, socios, leyes y permisos que le aplican). Después, juego de preguntas: cada grupo hace 3 preguntas a otro grupo sobre su ficha."
    },
    "cierre": [
     [
      "¿Dónde se inscribe una sociedad anónima?",
      "En el Registro Nacional."
     ],
     [
      "Nombre una ley que genere una cuenta por pagar en los estados.",
      "Ley de la CCSS (cargas sociales), Ley del IVA o del Impuesto sobre la Renta."
     ]
    ],
    "niveles": [
     "La ficha tiene datos de constitución sin leyes ni permisos.",
     "La ficha tiene constitución y algunas leyes o permisos, sin relacionarlos con los estados.",
     "La ficha es completa y relaciona las leyes con obligaciones en los estados."
    ],
    "fuentes": [
     "NIA 310, págs. 1, 2",
     "NIAS (compendio), pág. 38"
    ]
   },
   {
    "id": "2.6",
    "dev": true,
    "min": 40,
    "tit": "Factores económicos generales y la industria",
    "contenidos": "Definición de la lista de asuntos a considerar del negocio por auditar: factores económicos generales; la industria y condiciones importantes que afectan al negocio del cliente.",
    "ind": "Relaciona factores económicos y de la industria con riesgos en los estados financieros, mediante una matriz.",
    "explica": [
     "<b>Factores económicos generales:</b> tasas de interés, tipo de cambio, inflación, desempleo, nivel de consumo, impuestos nuevos.",
     "<b>La industria:</b> competencia, temporadas altas y bajas, cambios tecnológicos, regulación del sector, dependencia de pocos proveedores, precios de materias primas.",
     "Cada factor puede crear un riesgo en una cuenta: si sube el tipo de cambio, crecen las deudas en dólares; si cae el consumo, el inventario puede quedarse sin vender (valoración).",
     "Por eso el auditor arma una <b>lista de asuntos a considerar</b> antes de planear."
    ],
    "formacion": "Ejemplo resuelto en la pizarra: «Una ferretería importa en dólares y el colón se devalúa». Factor → efecto → cuenta → riesgo.",
    "trabajo": {
     "tipo": "Matriz",
     "txt": "Para una empresa asignada (un hotel, una soda, una distribuidora agrícola), completar la matriz con 5 factores: factor, efecto en el negocio, cuenta afectada y riesgo para el auditor."
    },
    "cierre": [
     [
      "¿Qué cuenta afecta un alza en el tipo de cambio en una empresa con préstamo en dólares?",
      "El préstamo por pagar y el gasto por diferencial cambiario."
     ],
     [
      "¿Por qué importa la estacionalidad?",
      "Porque cambia ventas, inventarios y efectivo según la época del año."
     ]
    ],
    "niveles": [
     "Menciona factores sin relacionarlos con cuentas.",
     "Relaciona algunos factores con cuentas, con riesgos incompletos.",
     "Completa los 5 factores con efecto, cuenta y riesgo coherentes."
    ],
    "fuentes": [
     "NIA 310, pág. 4",
     "NIA 310, págs. 1, 2"
    ]
   },
   {
    "id": "2.7",
    "dev": true,
    "min": 40,
    "tit": "La entidad: administración y propiedad",
    "contenidos": "La entidad: administración y propiedad; características importantes.",
    "ind": "Describe la administración, la propiedad y las características importantes de una entidad, mediante la elaboración de un caso.",
    "explica": [
     "<b>Propiedad:</b> quiénes son los dueños (socios, accionistas), si hay un dueño dominante y qué empresas o personas están relacionadas con ellos (partes relacionadas).",
     "<b>Gobierno y administración:</b> junta directiva, gerente general, personal clave; su experiencia, estabilidad y estilo de dirección.",
     "<b>Características importantes:</b> tamaño, número de empleados, sucursales, años de operar, estructura de la organización.",
     "Riesgos que el auditor busca aquí: el dueño que también administra y puede saltarse controles; transacciones con partes relacionadas a precios fuera de mercado; mucha rotación de gerentes o contadores."
    ],
    "formacion": "El docente presenta un organigrama y el grupo identifica quién autoriza, quién registra y quién custodia, y si hay riesgo.",
    "trabajo": {
     "tipo": "Elaboración de caso",
     "txt": "En parejas, inventar una empresa y escribir su caso: dueños, organigrama, personal clave y características. Al final, señalar 2 riesgos que vería un auditor."
    },
    "cierre": [
     [
      "¿Qué es una parte relacionada?",
      "Una persona o empresa vinculada con la entidad o sus dueños, por ejemplo una empresa del mismo dueño."
     ],
     [
      "¿Por qué es un riesgo que el contador cambie cada año?",
      "Porque se pierden controles y conocimiento, y aumentan los errores."
     ]
    ],
    "niveles": [
     "Describe la empresa de forma general sin propiedad ni administración.",
     "Describe propiedad y administración, con riesgos poco claros.",
     "Describe propiedad, administración y características, y señala 2 riesgos coherentes."
    ],
    "fuentes": [
     "NIA 310, págs. 1, 2"
    ]
   },
   {
    "id": "2.8",
    "dev": true,
    "min": 40,
    "tit": "El negocio de la entidad",
    "contenidos": "El negocio de la entidad: productos, mercados, proveedores, gastos y operaciones.",
    "ind": "Menciona las características del negocio de una entidad, mediante la elaboración de un caso.",
    "explica": [
     "<b>Productos o servicios:</b> qué vende, cuáles dejan más ganancia, si son perecederos o de moda.",
     "<b>Mercados y clientes:</b> a quién vende, si vende al contado o a crédito, si depende de pocos clientes grandes.",
     "<b>Proveedores:</b> de quién compra, si depende de uno solo, si importa.",
     "<b>Gastos y operaciones:</b> cuáles son los gastos principales (planillas, alquileres, combustible), cómo produce o presta el servicio, dónde opera y qué tecnología usa.",
     "Con esto el auditor sabe qué cuentas son las más importantes y dónde están los riesgos (por ejemplo, ventas a crédito → cuentas por cobrar dudosas)."
    ],
    "formacion": "Lluvia de ideas sobre una empresa conocida de la zona: el grupo llena un mapa con las 4 partes del negocio.",
    "trabajo": {
     "tipo": "Elaboración de caso",
     "txt": "Visitar (o investigar) un negocio del cantón y elaborar su caso de una página con las 4 partes. Cerrar con las 3 cuentas que serían más importantes para un auditor y por qué."
    },
    "cierre": [
     [
      "Si un negocio vende mucho a crédito, ¿qué cuenta revisaría con más cuidado?",
      "Cuentas por cobrar (y su estimación por incobrables)."
     ],
     [
      "¿Por qué es un riesgo depender de un solo proveedor?",
      "Si falla, se detiene la operación."
     ]
    ],
    "niveles": [
     "El caso menciona 1 o 2 partes del negocio.",
     "El caso menciona las 4 partes, sin relacionarlas con cuentas.",
     "El caso menciona las 4 partes y justifica las 3 cuentas más importantes."
    ],
    "fuentes": [
     "NIA 310, pág. 5"
    ]
   },
   {
    "dev": true,
    "min": 35,
    "tit": "La entidad, su entorno para informes y la legislación que la afecta",
    "contenidos": "Entorno para informes: influencias externas que afectan a la administración en la preparación de los estados financieros. Legislación que afecte directamente a la empresa.",
    "ind": "Explica el concepto de entidad en el contexto de la auditoría y las influencias externas que afectan sus estados financieros, mediante el análisis de un caso.",
    "explica": [
     "<b>Entidad:</b> la organización cuya información se audita (sociedad, cooperativa, asociación, institución pública o persona con actividad comercial). Se trata como una unidad separada de sus dueños.",
     "<b>Entorno para informes:</b> lo de afuera que influye en cómo la administración prepara los estados: quién los va a usar (bancos, Hacienda, inversionistas), el marco contable exigido (NIIF completas o NIIF para las PYMES), plazos y presiones por mostrar buenos resultados.",
     "<b>Legislación que afecta directamente a la empresa:</b> tributaria (renta, IVA), laboral (Código de Trabajo, CCSS), mercantil (Código de Comercio) y la propia de su sector (por ejemplo, regulación financiera o sanitaria).",
     "El auditor considera todo esto porque cambia los riesgos: un banco que exige ciertas razones financieras puede presionar a «maquillar» los estados.",
     "<b>Marco contable en Costa Rica:</b> el Colegio de Contadores Públicos adoptó las NIIF como principios de contabilidad generalmente aceptados (Circular 06-2014) y la NIIF para las PYMES (Circular 21-2018). En el sector público rigen las NICSP (Decreto Ejecutivo 34918-H), y las empresas públicas aplican NIIF (Decreto Ejecutivo 35616-H)."
    ],
    "formacion": "El grupo identifica, en la ficha de una empresa ficticia, quiénes usan sus estados y qué presión externa tiene.",
    "trabajo": {
     "tipo": "Análisis de caso",
     "txt": "Caso de una empresa que necesita un préstamo: definir la entidad, señalar 3 usuarios de sus estados, 2 influencias externas, 3 leyes que la afectan directamente y el riesgo que eso crea para el auditor."
    },
    "cierre": [
     [
      "¿Por qué la entidad se trata separada de sus dueños?",
      "Para que sus estados muestren solo las operaciones del negocio."
     ],
     [
      "Dé un ejemplo de influencia externa en los estados.",
      "Un banco que exige resultados mínimos para dar un préstamo."
     ]
    ],
    "niveles": [
     "Define entidad sin relacionarla con el caso.",
     "Define entidad e identifica usuarios o leyes, sin relacionarlos con riesgos.",
     "Define entidad, identifica usuarios, influencias, leyes y el riesgo para el auditor."
    ],
    "id": "2.9",
    "fuentes": [
     "NIA 310, págs. 2, 6",
     "NIA 310, págs. 5, 6",
     "Circular 21-2018 del Colegio de Contadores Públicos (NIIF para PYMES), págs. 1, 2, 3",
     "Circular 06-2014 del Colegio de Contadores Públicos (NIIF), pág. 3",
     "Decreto Ejecutivo 34918-H (NICSP), págs. 2, 4",
     "Decreto Ejecutivo 35616-H, págs. 1, 2, 4"
    ]
   },
   {
    "id": "2.10",
    "dev": true,
    "min": 45,
    "tit": "Desempeño financiero y capacidad de generar ingresos · caso integrador",
    "contenidos": "Desempeño financiero: factores concernientes a la condición financiera de la entidad y su capacidad de generar ingresos. Ejemplo de legajo de auditoría.",
    "ind": "Analiza la condición financiera de una entidad con razones básicas y la resume en su legajo, al resolver un caso integrador.",
    "explica": [
     "<b>Liquidez:</b> razón corriente = activo corriente ÷ pasivo corriente. Menos de 1 indica posibles problemas para pagar a corto plazo.",
     "<b>Endeudamiento:</b> pasivo total ÷ activo total. Mientras más alto, más depende de terceros.",
     "<b>Rentabilidad:</b> margen neto = utilidad neta ÷ ventas. Y la tendencia de las ventas de un año a otro.",
     "<b>Capacidad de generar ingresos y empresa en funcionamiento (NIA 570):</b> pérdidas repetidas, falta de efectivo, deudas vencidas o pérdida de un cliente clave hacen dudar de que la empresa siga operando.",
     "Todo esto se resume en una hoja del legajo: «conocimiento del negocio y análisis financiero»."
    ],
    "formacion": "Cálculo guiado de las 3 razones con un balance sencillo.",
    "trabajo": {
     "tipo": "Caso integrador (evaluación de la unidad)",
     "txt": "Caso de una empresa ficticia con estados de 2 años: calcular las 3 razones, interpretar la tendencia, señalar señales de empresa en funcionamiento y armar la hoja de legajo «Conocimiento del negocio» (constitución, entorno, propiedad, negocio y desempeño). Incluye el cuadro comparativo de auditoría interna y externa del plan."
    },
    "cierre": [
     [
      "Razón corriente de 0,8: ¿qué indica?",
      "Que el activo corriente no alcanza para cubrir el pasivo corriente."
     ],
     [
      "Nombre una señal de duda sobre la empresa en funcionamiento.",
      "Pérdidas repetidas, deudas vencidas o falta de efectivo."
     ]
    ],
    "niveles": [
     "Calcula alguna razón sin interpretar.",
     "Calcula e interpreta las razones, con la hoja de legajo incompleta.",
     "Calcula e interpreta las 3 razones, identifica señales de riesgo y completa la hoja de legajo."
    ],
    "fuentes": [
     "NIA 310, pág. 6",
     "NIA 520, págs. 1, 2"
    ]
   }
  ],
  "indPlan": [
   "Describe las diversas especialidades, tipos y dictámenes de auditoría, mediante clase magistral.",
   "Identifica el vocabulario técnico empleado en los tipos de dictámenes de auditoría, mediante juego de antorcha.",
   "Distingue las diversas especialidades, tipos y dictámenes de auditoría, mediante juego de antorcha.",
   "Define la importancia del archivo permanente, mediante juego de antorcha.",
   "Distingue los aspectos a considerar en el conocimiento del negocio, mediante la elaboración de un caso y juego de preguntas.",
   "Menciona las características del negocio, mediante la elaboración de un caso."
  ]
 },
 {
  "n": 3,
  "horas": 9,
  "ra": "Resolver casos sobre el uso adecuado de los riesgos de auditoría y el control interno.",
  "evaluacion": "Conocimiento: resolución de casos y matriz de riesgos (plan del docente).",
  "indMEP": [
   "Reconoce la importancia del Control Interno, para la empresa privada y las instituciones de Estado.",
   "Investiga en el mercado costarricense los tipos de sistemas contables y de auditoría, según las nuevas tendencias.",
   "Resuelve casos sobre el uso adecuado de los riesgos de auditoría y el control interno."
  ],
  "lecciones": [
   {
    "id": "3.1",
    "dev": true,
    "min": 40,
    "tit": "El riesgo de auditoría y sus componentes",
    "contenidos": "Riesgo y sus componentes: de auditoría, inherente, de control y de detección.",
    "ind": "Define los tipos de riesgo de auditoría y sus componentes, mediante la realización de un esquema.",
    "explica": [
     "<b>Riesgo de auditoría:</b> que el auditor dé una opinión equivocada (por ejemplo, limpia) cuando los estados tienen errores importantes.",
     "<b>Riesgo inherente:</b> la posibilidad de error en una cuenta por su naturaleza, antes de cualquier control. Ejemplos: el efectivo (fácil de robar), las estimaciones, las transacciones complejas.",
     "<b>Riesgo de control:</b> que el control interno de la empresa no prevenga ni detecte el error a tiempo.",
     "<b>Riesgo de detección:</b> que las pruebas del auditor no encuentren el error. Es el único que el auditor controla.",
     "Fórmula de referencia: riesgo de auditoría = inherente × control × detección."
    ],
    "formacion": "El docente explica con una analogía: un colador (control interno) y una lupa (las pruebas del auditor) frente a una lluvia de errores (riesgo inherente).",
    "trabajo": {
     "tipo": "Esquema",
     "txt": "Elaborar un esquema (diagrama o mapa) con los 4 riesgos: definición, quién lo controla y un ejemplo de cada uno."
    },
    "cierre": [
     [
      "¿Cuál riesgo controla el auditor?",
      "El riesgo de detección."
     ],
     [
      "¿Por qué el efectivo tiene riesgo inherente alto?",
      "Porque es fácil de sustraer y tiene mucho movimiento."
     ]
    ],
    "niveles": [
     "El esquema define 1 o 2 riesgos.",
     "El esquema define los 4 riesgos, con ejemplos incompletos o sin indicar quién lo controla.",
     "El esquema define los 4 riesgos, indica quién los controla y da un ejemplo correcto de cada uno."
    ],
    "fuentes": [
     "Manrique, Introducción a la Auditoría, págs. 66, 67",
     "NIA 400, págs. 1, 3",
     "Normas Internacionales de Auditoría Financiera, págs. 7, 8",
     "NIA 315 (revisada), págs. 10, 12, 16"
    ]
   },
   {
    "id": "3.2",
    "dev": true,
    "min": 35,
    "tit": "Discusión de los tipos de riesgo",
    "contenidos": "Tipos de riesgos y sus componentes.",
    "ind": "Discute los factores que aumentan o disminuyen cada tipo de riesgo, mediante una lluvia de ideas.",
    "explica": [
     "Suben el <b>riesgo inherente:</b> cuentas con mucho efectivo, inventario perecedero o de alto valor, estimaciones (incobrables, depreciación), transacciones poco comunes, presión por resultados.",
     "Suben el <b>riesgo de control:</b> una misma persona cobra, registra y deposita; no hay conciliaciones; no hay autorizaciones; el dueño se salta los controles.",
     "Suben el <b>riesgo de detección:</b> muestras pequeñas, poco tiempo, equipo sin experiencia, pruebas mal escogidas.",
     "<b>Relación inversa:</b> si el inherente y el de control son altos, el auditor debe aceptar un riesgo de detección bajo, es decir, más pruebas."
    ],
    "formacion": "El docente escribe los 3 riesgos en la pizarra y el grupo aporta factores en notas adhesivas, que se ubican y discuten.",
    "trabajo": {
     "tipo": "Lluvia de ideas",
     "txt": "En grupos: 4 factores que aumentan y 2 que disminuyen cada riesgo, para una empresa asignada. Cada grupo expone 1 minuto y los demás debaten si el factor está bien ubicado."
    },
    "cierre": [
     [
      "Si nadie concilia los bancos, ¿qué riesgo sube?",
      "El riesgo de control."
     ],
     [
      "Si el riesgo de control es alto, ¿qué hace el auditor?",
      "Baja el riesgo de detección: más pruebas sustantivas."
     ]
    ],
    "niveles": [
     "Aporta factores sin ubicarlos en el riesgo correcto.",
     "Ubica correctamente la mayoría de factores, sin explicar la relación inversa.",
     "Ubica correctamente los factores y explica la relación inversa con un ejemplo."
    ],
    "fuentes": [
     "Manrique, Introducción a la Auditoría, págs. 24, 62",
     "NIA 400, págs. 1, 3"
    ]
   },
   {
    "id": "3.3",
    "dev": true,
    "min": 45,
    "tit": "Pasos para evaluar los riesgos: la matriz de riesgos",
    "contenidos": "Pasos a seguir en la evaluación de los riesgos y sus componentes.",
    "ind": "Demuestra los pasos de la evaluación de riesgos al completar un caso y una matriz de riesgos.",
    "explica": [
     "Paso 1: conocer la entidad y su entorno.",
     "Paso 2: identificar los riesgos por cuenta y afirmación (existencia, integridad, valoración, corte…).",
     "Paso 3: calificar el riesgo inherente (alto, medio, bajo).",
     "Paso 4: evaluar el control interno de esa cuenta y calificar el riesgo de control.",
     "Paso 5: definir el riesgo de detección aceptable: si inherente y control son altos, detección baja.",
     "Paso 6: diseñar los procedimientos: naturaleza (qué prueba), momento (cuándo) y extensión (cuántas partidas)."
    ],
    "formacion": "Se resuelve juntos la fila de cuentas por cobrar: riesgo inherente medio, control débil (no hay antigüedad de saldos) → detección baja → confirmaciones a más clientes.",
    "trabajo": {
     "tipo": "Caso y matriz de riesgos",
     "txt": "Caso «Distribuidora Los Pinos» (ficticia): completar la matriz para efectivo, inventario, cuentas por pagar y planillas con los 6 pasos, y justificar una prueba por cuenta."
    },
    "cierre": [
     [
      "¿Qué tres aspectos tiene un procedimiento?",
      "Naturaleza, momento y extensión."
     ],
     [
      "Inherente alto y control alto: ¿qué riesgo de detección acepta?",
      "Bajo."
     ]
    ],
    "niveles": [
     "Completa algunas columnas de la matriz sin seguir los pasos.",
     "Completa la matriz siguiendo los pasos, con algunas incoherencias entre riesgo y prueba.",
     "Completa las 4 cuentas siguiendo los 6 pasos, con pruebas coherentes y justificadas."
    ],
    "fuentes": [
     "NIAS (compendio), págs. 99, 158",
     "Ley 8292 de Control Interno, págs. 1, 5"
    ]
   },
   {
    "id": "3.4",
    "dev": true,
    "min": 40,
    "tit": "Sistemas de contabilidad y auditoría disponibles en el mercado costarricense",
    "contenidos": "Sistema de contabilidad y auditoría disponibles en el mercado costarricense, según las nuevas tendencias.",
    "ind": "Compara sistemas de contabilidad y herramientas de auditoría disponibles en el mercado, mediante una investigación y un cuadro comparativo.",
    "explica": [
     "<b>Sistemas contables y ERP:</b> desde sistemas contables sencillos para pymes hasta sistemas integrados (ERP) que unen ventas, inventario, planillas y contabilidad. Muchos funcionan en la nube.",
     "En Costa Rica, los sistemas deben poder emitir <b>comprobantes electrónicos</b> según las reglas de Hacienda; eso deja un rastro digital útil para el auditor.",
     "<b>Herramientas de auditoría:</b> hojas de cálculo, programas de análisis de datos (tipo IDEA o ACL) y programas para manejar papeles de trabajo (tipo TeamMate o AuditBoard).",
     "<b>Tendencias:</b> analizar el 100 % de las transacciones en vez de muestras, auditoría continua, inteligencia artificial para detectar patrones raros, ciberseguridad y respaldo en la nube.",
     "Riesgo nuevo: si el sistema falla o alguien entra sin permiso, los datos dejan de ser confiables. Por eso importa la auditoría de sistemas."
    ],
    "formacion": "Demostración breve: el docente muestra en el Laboratorio AuditCity de la plataforma una prueba sobre todos los registros (duplicados o pagos en fin de semana).",
    "trabajo": {
     "tipo": "Investigación y cuadro comparativo",
     "txt": "En grupos, investigar 3 sistemas (uno contable para pymes, un ERP y una herramienta de auditoría): tipo, para qué sirve, ventajas, un riesgo de control y si emite comprobantes electrónicos (si aplica). Presentar en un cuadro."
    },
    "cierre": [
     [
      "¿Qué ventaja tiene analizar el 100 % de los registros?",
      "Se detectan casos raros que una muestra podría no incluir."
     ],
     [
      "¿Qué riesgo trae un sistema en la nube?",
      "Accesos no autorizados o pérdida de datos si no hay controles."
     ]
    ],
    "niveles": [
     "El cuadro describe 1 sistema o no compara.",
     "El cuadro describe los 3 sistemas, con ventajas o riesgos incompletos.",
     "El cuadro compara los 3 sistemas con tipo, uso, ventajas y un riesgo de control para cada uno."
    ],
    "fuentes": [
     "COSO 2013, págs. 21, 40"
    ]
   },
   {
    "id": "3.5",
    "dev": true,
    "min": 40,
    "tit": "El sistema de control interno: ambiente y procedimientos de control",
    "contenidos": "Sistema de control interno: ambiente de control y procedimientos de control.",
    "ind": "Reconoce la importancia del control interno para la empresa privada y las instituciones del Estado y explica sus componentes, mediante un esquema.",
    "explica": [
     "<b>Control interno:</b> el conjunto de acciones que diseña la administración para proteger los activos, tener información confiable, operar con eficiencia y cumplir las leyes.",
     "En el sector público, la Ley 8292 define 5 componentes: ambiente de control, valoración del riesgo, actividades de control, sistemas de información y seguimiento.",
     "<b>Objetivos del sistema de control interno (Ley 8292, art. 8):</b> proteger y conservar el patrimonio público, exigir confiabilidad y oportunidad de la información, garantizar eficiencia y eficacia de las operaciones y cumplir el ordenamiento jurídico y técnico. Los cinco componentes funcionales se desarrollan en los artículos 13 a 17.",
     "<b>Ambiente de control:</b> la «cultura» de control: integridad y valores éticos, compromiso con la competencia del personal, estructura organizativa, asignación de autoridad y responsabilidad, y el ejemplo de la dirección («el tono desde arriba»).",
     "<b>Procedimientos (actividades) de control:</b> autorizaciones, segregación de funciones, documentos y registros adecuados, protección física de los activos y verificaciones independientes (conciliaciones, arqueos sorpresa).",
     "<b>Importancia:</b> en la empresa privada protege el patrimonio de los dueños y da información confiable para decidir; en las instituciones del Estado protege los fondos públicos y es obligatorio por la Ley 8292. Los componentes orgánicos son la administración activa y la auditoría interna."
    ],
    "formacion": "El grupo analiza un video corto o un relato de una empresa y señala ejemplos de ambiente de control y de procedimientos.",
    "trabajo": {
     "tipo": "Esquema",
     "txt": "Esquema con los 5 componentes de la Ley 8292 y, desarrollado, el ambiente de control (5 elementos) y los procedimientos de control (5 tipos), cada uno con un ejemplo de un comercio."
    },
    "cierre": [
     [
      "¿Qué significa «el tono desde arriba»?",
      "Que la actitud de la dirección hacia el control y la ética marca la cultura de toda la organización."
     ],
     [
      "Dé un procedimiento de control para el efectivo.",
      "Arqueo sorpresa, depósito diario o conciliación bancaria."
     ]
    ],
    "niveles": [
     "El esquema nombra componentes sin desarrollar.",
     "Desarrolla ambiente o procedimientos, con ejemplos incompletos.",
     "Desarrolla ambos con ejemplos correctos y ubica los 5 componentes."
    ],
    "fuentes": [
     "Ley 8292 de Control Interno, págs. 1, 4",
     "COSO 2013, págs. 5, 11",
     "Conceptos básicos SCI, págs. 2, 16",
     "Cap. 2 Elementos de control interno, págs. 2, 6",
     "NIA 315 (revisada), págs. 4, 11, 19",
     "Larios, Control interno (presentación semana V), diap. 2, 3, 4"
    ]
   },
   {
    "id": "3.6",
    "dev": true,
    "min": 35,
    "tit": "Tipos de control interno",
    "contenidos": "Tipos de control interno: administrativo, operativo y financiero.",
    "ind": "Clasifica controles internos según su tipo, al resolver casos.",
    "explica": [
     "<b>Administrativo:</b> el plan de organización y los procedimientos ligados a las decisiones y autorizaciones de la gerencia; busca la eficiencia y que se cumplan las políticas.",
     "<b>Operativo:</b> asegura que se cumplan los procedimientos dentro de los procesos para lograr los objetivos (control de calidad, metas de atención).",
     "<b>Financiero (contable):</b> protege los activos y da confiabilidad a los registros: transacciones autorizadas, bien registradas, acceso a activos solo con autorización y comparación de lo registrado con lo que existe.",
     "Según el momento: <b>preventivos</b> (evitan el error), <b>detectivos</b> (lo encuentran) y <b>correctivos</b> (lo arreglan)."
    ],
    "formacion": "El docente dice un control y el grupo levanta tarjetas: A (administrativo), O (operativo) o F (financiero), y luego P, D o C (preventivo, detectivo, correctivo).",
    "trabajo": {
     "tipo": "Clasificación de casos",
     "txt": "Clasificar 10 controles de una empresa ficticia por tipo y por momento, y proponer un control preventivo para un problema dado."
    },
    "cierre": [
     [
      "La conciliación bancaria, ¿es preventiva o detectiva?",
      "Detectiva."
     ],
     [
      "¿Qué tipo de control es exigir dos firmas en los cheques?",
      "Contable y preventivo."
     ]
    ],
    "niveles": [
     "Clasifica correctamente menos de la mitad.",
     "Clasifica la mayoría por tipo o por momento, no por ambos.",
     "Clasifica los 10 controles por tipo y momento y propone un control preventivo adecuado."
    ],
    "fuentes": [
     "Manrique, Introducción a la Auditoría, págs. 35, 149"
    ]
   },
   {
    "id": "3.7",
    "dev": true,
    "min": 40,
    "tit": "Objetivos de control interno: cuentas reales y nominales",
    "contenidos": "Objetivos de control interno para las cuentas nominales y reales.",
    "ind": "Evoca los objetivos de control interno para las cuentas nominales y reales, mediante un cuadro comparativo.",
    "explica": [
     "<b>Cuentas reales</b> (de balance): activos, pasivos y patrimonio. No se cierran; su saldo pasa al siguiente período.",
     "Objetivos para las reales: que los activos existan y estén protegidos, que sean de la empresa (derechos) y las deudas sean reales (obligaciones), que estén bien valuados, que estén todos registrados y bien presentados.",
     "<b>Cuentas nominales</b> (de resultados): ingresos y gastos. Se cierran al final del período contra la utilidad.",
     "Objetivos para las nominales: que solo se registren transacciones reales y autorizadas, que estén todas (integridad), por el monto correcto, en el período correcto (corte) y bien clasificadas.",
     "Los objetivos del control interno se agrupan en cuatro: <b>autorización</b> (se cumplen las políticas de la administración), <b>procesamiento y clasificación</b> (las transacciones se reconocen, registran e informan bien), <b>verificación y evaluación</b> (se revisan periódicamente los saldos) y <b>salvaguarda física</b> (acceso controlado a activos y registros).",
     "Ejemplo: en inventario (real) importa que exista y su valor; en ventas (nominal) importa que no falten ventas y que estén en el mes correcto.",
     "Ejemplos por cuenta: <b>efectivo</b> (depósitos intactos, arqueos, pagos con cheque o transferencia, conciliación mensual); <b>cuentas por cobrar</b> (crédito aprobado por alguien distinto de quien factura y cobra, antigüedad de saldos); <b>inventarios</b> (conteos físicos, requisiciones); <b>ingresos</b> (que todo lo ganado esté registrado); <b>gastos</b> (solo los autorizados y del período)."
    ],
    "formacion": "El grupo clasifica 15 cuentas en reales y nominales en la pizarra.",
    "trabajo": {
     "tipo": "Cuadro comparativo",
     "txt": "Cuadro con dos columnas (reales y nominales): definición, si se cierran o no, 5 objetivos de control y un control para lograr cada objetivo, con ejemplos de cuentas."
    },
    "cierre": [
     [
      "¿La cuenta «Gasto por alquiler» es real o nominal?",
      "Nominal."
     ],
     [
      "¿Qué objetivo se refiere a registrar en el período correcto?",
      "Corte."
     ]
    ],
    "niveles": [
     "Clasifica cuentas sin objetivos de control.",
     "Presenta objetivos para ambas cuentas, con controles incompletos.",
     "Compara ambas cuentas con 5 objetivos y un control adecuado para cada uno."
    ],
    "fuentes": [
     "Conceptos básicos SCI, págs. 2, 12",
     "COSO 2013, págs. 4, 5"
    ]
   },
   {
    "id": "3.8",
    "dev": true,
    "min": 40,
    "tit": "Principios de control interno",
    "contenidos": "Principios de control interno para ambas cuentas.",
    "ind": "Describe los principios de control interno aplicados a cuentas reales y nominales, mediante una guía de trabajo.",
    "explica": [
     "<b>Segregación de funciones:</b> quien autoriza, quien custodia y quien registra deben ser personas distintas.",
     "<b>Responsabilidad fijada:</b> cada tarea tiene un responsable con nombre.",
     "<b>Autorización:</b> toda transacción la aprueba quien tiene autoridad.",
     "<b>Documentación prenumerada y archivada:</b> facturas, recibos y órdenes con número consecutivo.",
     "<b>Protección física:</b> cajas fuertes, bodegas con llave, accesos con contraseña.",
     "<b>Verificación independiente:</b> conciliaciones, arqueos sorpresa, inventarios físicos.",
     "<b>Rotación y vacaciones obligatorias:</b> ayudan a destapar irregularidades.",
     "<b>Pólizas de fidelidad</b> para quien maneja dinero, y <b>costo-beneficio</b>: el control no debe costar más que lo que protege.",
     "Otros principios del material de clase: división del procesamiento de cada transacción, selección de personal capacitado, instrucciones por escrito, cuentas de control, evitar el uso de efectivo, mínimo de cuentas bancarias y depósitos inmediatos e intactos.",
     "<b>Limitaciones del control interno:</b> costo frente a lo controlado, operaciones inusuales, colusión (varias personas de acuerdo) y abusos de confianza. Por eso da seguridad razonable, no absoluta."
    ],
    "formacion": "Clase magistral breve con ejemplos y una pregunta por principio.",
    "trabajo": {
     "tipo": "Guía de trabajo",
     "txt": "Guía: aplicar 6 principios a una cuenta real (efectivo o inventario) y a una nominal (ventas o gastos): cómo se aplica cada principio y qué riesgo evita."
    },
    "cierre": [
     [
      "¿Por qué la misma persona no debe cobrar y registrar?",
      "Porque podría quedarse con el dinero y ocultarlo en los registros."
     ],
     [
      "¿Para qué sirven las vacaciones obligatorias?",
      "Otra persona hace la tarea y puede descubrir irregularidades."
     ]
    ],
    "niveles": [
     "Describe principios sin aplicarlos a cuentas.",
     "Aplica principios a una de las dos cuentas o con riesgos incompletos.",
     "Aplica los 6 principios a ambas cuentas e indica el riesgo que evita cada uno."
    ],
    "fuentes": [
     "COSO 2013, pág. 68",
     "Manrique, Introducción a la Auditoría, pág. 179"
    ]
   },
   {
    "id": "3.9",
    "dev": true,
    "min": 45,
    "tit": "Caso integrador de riesgos y control interno",
    "contenidos": "Aplicación de los contenidos de la unidad (evaluación).",
    "ind": "Resuelve un caso sobre riesgos de auditoría y control interno de forma individual.",
    "explica": [
     "Repaso de 5 minutos: componentes del riesgo, pasos de evaluación, componentes y principios del control interno, objetivos en cuentas reales y nominales."
    ],
    "formacion": "Lectura del caso y aclaración de dudas.",
    "trabajo": {
     "tipo": "Resolución de caso (evaluación)",
     "txt": "Caso «Hotel Brisas del Norte» (ficticio): 1) identificar 4 debilidades de control y el principio que se incumple; 2) matriz de riesgos para 2 cuentas (una real y una nominal); 3) proponer un control preventivo y uno detectivo para cada debilidad."
    },
    "cierre": [
     [
      "Autoevaluación: ¿qué control propondría primero y por qué?",
      "Respuesta personal."
     ]
    ],
    "niveles": [
     "Resuelve 1 de las 3 partes con coherencia.",
     "Resuelve 2 partes con coherencia.",
     "Resuelve las 3 partes con coherencia y justificación."
    ],
    "fuentes": [
     "Manrique, Introducción a la Auditoría, pág. 162",
     "Ley 8292 de Control Interno, págs. 4, 5",
     "Material AUDI 8 (conclusión y evaluación), págs. 1, 5, 6"
    ]
   }
  ],
  "indPlan": [
   "Define los tipos de riesgo, mediante la explicación de material suministrado y la realización de esquemas.",
   "Discute los diferentes tipos de riesgos y sus componentes, mediante la realización de una lluvia de ideas.",
   "Demuestra los pasos a seguir en la evaluación de los riesgos y sus componentes, mediante la realización de un caso y matriz de riesgos.",
   "Evoca los objetivos de control interno para las cuentas nominales y reales, mediante la realización de un cuadro comparativo.",
   "Describe los principios de control interno para ambas cuentas, mediante la explicación de material suministrado en clases y la realización de una clase magistral."
  ]
 },
 {
  "n": 4,
  "horas": 7,
  "ra": "Buscar soluciones a escenarios presentes en el accionar del auditor.",
  "evaluacion": "Producto: elaboración de un proyecto en donde se explica cada uno de los componentes.",
  "indMEP": [
   "Sintetiza las generalidades de la Contraloría General de la República.",
   "Explica por qué se dice que el auditor debe ser valiente.",
   "Distingue las características del contador."
  ],
  "lecciones": [
   {
    "id": "4.1",
    "dev": true,
    "min": 40,
    "tit": "¿Por qué se dice que el auditor debe ser valiente?",
    "contenidos": "Carácter valiente del auditor: por qué se dice que el auditor debe ser valiente.",
    "ind": "Argumenta por qué el auditor debe actuar con valentía ante presiones, mediante un debate con casos.",
    "explica": [
     "El auditor muchas veces debe decir lo que nadie quiere oír: un faltante, un fraude, un error de la gerencia o de quien le paga.",
     "Ser valiente es: comunicar los hallazgos aunque sean incómodos, no cambiar una conclusión por presión, pedir evidencia aunque moleste y denunciar por los canales correctos.",
     "Valentía no es imprudencia: se basa en <b>evidencia</b>, se comunica con respeto y por los canales que indica la norma.",
     "Se relaciona con la integridad y el comportamiento profesional del código de ética, y con el escepticismo profesional."
    ],
    "formacion": "El docente narra un caso: el gerente le pide al auditor «no poner» un hallazgo porque afectará un préstamo. El grupo vota qué haría y por qué.",
    "trabajo": {
     "tipo": "Debate con casos",
     "txt": "Dos grupos defienden posturas opuestas sobre 3 dilemas (presión del cliente, amenaza de perder el contrato, hallazgo sobre un amigo). Al final, cada estudiante escribe su postura y la fundamenta con un principio de ética."
    },
    "cierre": [
     [
      "¿En qué se apoya la valentía del auditor?",
      "En la evidencia y en las normas."
     ],
     [
      "¿Qué principio de ética se relaciona con no cambiar una conclusión por presión?",
      "Integridad u objetividad."
     ]
    ],
    "niveles": [
     "Da una opinión sin argumentos.",
     "Argumenta con razones, sin relacionarlas con la ética profesional.",
     "Argumenta con razones, evidencia y un principio de ética aplicado al caso."
    ],
    "fuentes": [
     "Manrique, Introducción a la Auditoría, págs. 22, 23",
     "NIAS (compendio), págs. 20, 49"
    ]
   },
   {
    "id": "4.2",
    "dev": true,
    "min": 40,
    "tit": "El principio de independencia",
    "contenidos": "Importancia del principio de independencia.",
    "ind": "Identifica amenazas a la independencia y propone salvaguardas, al analizar situaciones.",
    "explica": [
     "<b>Independencia mental:</b> actitud que permite opinar sin influencias. <b>Independencia en apariencia:</b> que un tercero informado no dude de ella.",
     "Amenazas según el Código de Ética del IESBA: <b>interés propio</b> (tener acciones del cliente), <b>autorrevisión</b> (auditar la contabilidad que uno mismo llevó), <b>abogacía</b> (defender al cliente en un juicio), <b>familiaridad</b> (parentesco o amistad cercana) e <b>intimidación</b> (presiones o amenazas).",
     "Salvaguardas: rotar al equipo, que otra persona revise, rechazar servicios incompatibles, renunciar al encargo.",
     "Sin independencia, la opinión del auditor no vale para los usuarios."
    ],
    "formacion": "El grupo clasifica 5 situaciones en las 5 amenazas.",
    "trabajo": {
     "tipo": "Análisis de situaciones",
     "txt": "Ocho situaciones: identificar la amenaza, decir si es independencia mental o en apariencia la afectada y proponer una salvaguarda."
    },
    "cierre": [
     [
      "El auditor lleva la contabilidad del cliente y luego la audita: ¿qué amenaza es?",
      "Autorrevisión."
     ],
     [
      "¿Qué diferencia hay entre independencia mental y en apariencia?",
      "La mental es la actitud; la aparente es lo que percibe un tercero."
     ]
    ],
    "niveles": [
     "Identifica amenazas en pocas situaciones.",
     "Identifica la mayoría de amenazas, con salvaguardas incompletas.",
     "Identifica las 8 amenazas y propone salvaguardas adecuadas."
    ],
    "fuentes": [
     "NIA 220, págs. 3, 6",
     "Manrique, Introducción a la Auditoría, págs. 22, 23"
    ]
   },
   {
    "id": "4.3",
    "dev": true,
    "min": 40,
    "tit": "La Contraloría General de la República: concepto, importancia y funciones",
    "contenidos": "Generalidades de la Contraloría General de la República: concepto, importancia y funciones.",
    "ind": "Explica el concepto, la importancia y las funciones de la Contraloría General de la República, mediante un esquema.",
    "explica": [
     "<b>Concepto:</b> institución auxiliar de la Asamblea Legislativa en la vigilancia de la Hacienda Pública, con independencia funcional y administrativa (artículo 183 de la Constitución Política).",
     "La dirigen el Contralor y el Subcontralor, nombrados por la Asamblea Legislativa por 8 años.",
     "<b>Funciones principales</b> (artículo 184 de la Constitución): fiscalizar la ejecución y liquidación de los presupuestos, aprobar o improbar los presupuestos de municipalidades e instituciones autónomas, examinar las cuentas de las instituciones públicas, informar a la Asamblea con una memoria anual y las demás que le da su Ley Orgánica (Ley 7428), como el refrendo de contratos y la emisión de normas de control interno.",
     "<b>Importancia:</b> vigila que el dinero de todos se use bien, promueve la transparencia y la rendición de cuentas, y ayuda a prevenir la corrupción."
    ],
    "formacion": "El docente muestra noticias recientes de informes de la Contraloría y el grupo identifica qué función se aplicó en cada una.",
    "trabajo": {
     "tipo": "Esquema",
     "txt": "Esquema con concepto, base legal, quién la dirige, 5 funciones con un ejemplo y 3 razones de su importancia."
    },
    "cierre": [
     [
      "¿De qué poder es auxiliar la Contraloría?",
      "De la Asamblea Legislativa (Poder Legislativo)."
     ],
     [
      "Nombre una función de la Contraloría.",
      "Fiscalizar presupuestos, aprobar presupuestos municipales, examinar cuentas o refrendar contratos."
     ]
    ],
    "niveles": [
     "El esquema tiene el concepto sin funciones.",
     "El esquema tiene concepto y algunas funciones, sin importancia.",
     "El esquema tiene concepto, base legal, 5 funciones con ejemplo y su importancia."
    ],
    "fuentes": [
     "Ley 8292 de Control Interno, págs. 1, 2",
     "Conceptos básicos SCI, págs. 2, 3"
    ]
   },
   {
    "id": "4.4",
    "dev": true,
    "min": 40,
    "tit": "La Contraloría: historia, evolución e impacto en las instituciones públicas",
    "contenidos": "Historia y evolución de la Contraloría General de la República; su impacto en la realidad de las instituciones públicas.",
    "ind": "Ordena los hitos de la historia de la Contraloría y explica su impacto en las instituciones públicas, mediante una línea de tiempo.",
    "explica": [
     "<b>1922:</b> se crea la Oficina de Control (Decreto 8 del 26 de mayo de 1922), para ordenar las entradas y los gastos de la Hacienda Pública.",
     "<b>1949:</b> la Constitución Política crea la Contraloría General de la República (artículos 183 y 184).",
     "<b>1950:</b> primera Ley Orgánica de la Contraloría (Ley 1252, del 23 de diciembre de 1950). <b>1951:</b> inicia funciones con su primer Contralor, Amadeo Quirós Blanco.",
     "<b>1994:</b> nueva Ley Orgánica (Ley 7428), vigente. <b>2002:</b> Ley General de Control Interno (Ley 8292). <b>2004:</b> Ley contra la Corrupción y el Enriquecimiento Ilícito (Ley 8422). <b>2021:</b> Ley General de Contratación Pública (Ley 9986).",
     "<b>Hoy (2026):</b> la Ley 10881 reformó la Ley de Control Interno sobre las auditorías internas; la Contraloría presentó una acción de inconstitucionalidad que la Sala IV admitió. Es un tema en discusión: conviene revisar cómo está al dar la clase.",
     "<b>Impacto:</b> de un control contable de gastos pasó a una fiscalización integral: control interno, contratación, resultados de la gestión y prevención de la corrupción."
    ],
    "formacion": "El grupo ordena 8 tarjetas con hitos en una línea de tiempo en la pizarra.",
    "trabajo": {
     "tipo": "Línea de tiempo",
     "txt": "Línea de tiempo ilustrada con 8 hitos y, para 3 de ellos, un párrafo sobre cómo cambió la forma de trabajar de las instituciones públicas."
    },
    "cierre": [
     [
      "¿Qué norma creó la Contraloría?",
      "La Constitución Política de 1949."
     ],
     [
      "¿Qué ley obliga a las instituciones públicas a tener control interno?",
      "La Ley General de Control Interno, Ley 8292."
     ]
    ],
    "niveles": [
     "Ubica algunos hitos sin orden correcto.",
     "Ordena la mayoría de hitos, con explicación de impacto incompleta.",
     "Ordena los 8 hitos y explica el impacto de 3 de ellos."
    ],
    "fuentes": [
     "Ley 8292 de Control Interno, págs. 1, 2"
    ]
   },
   {
    "id": "4.5",
    "dev": true,
    "min": 40,
    "tit": "Características de un contador: código de conducta",
    "contenidos": "Características de un contador: código de conducta del contador (integridad, objetividad, independencia, responsabilidad, observación de normas, actualización).",
    "ind": "Aplica los principios del código de ética del contador al resolver dilemas éticos.",
    "explica": [
     "El programa del MEP pide seis valores del código de conducta del contador:",
     "<b>Integridad:</b> honestidad y rectitud. <b>Objetividad:</b> sin sesgos ni conflictos de interés. <b>Independencia:</b> libre de influencias que condicionen su criterio.",
     "<b>Responsabilidad:</b> responder por su trabajo y sus consecuencias. <b>Observación de normas:</b> cumplir las leyes y las normas técnicas (NIA, NIIF). <b>Actualización:</b> capacitarse siempre porque las normas cambian.",
     "Los contadores públicos de Costa Rica se rigen por el Código de Ética del Colegio de Contadores Públicos, alineado con el código internacional del IESBA (integridad, objetividad, competencia y diligencia, confidencialidad y comportamiento profesional).",
     "Ante un dilema: identificar los hechos, el principio en juego, las opciones y sus consecuencias, y escoger la que respeta el código."
    ],
    "formacion": "El docente lee un dilema y lo resuelve en voz alta con los 4 pasos.",
    "trabajo": {
     "tipo": "Dilemas éticos",
     "txt": "En grupos, resolver 4 dilemas con los 4 pasos (por ejemplo, un amigo pide datos del salario de un compañero; el jefe pide registrar un gasto personal como de la empresa). Cada grupo presenta uno."
    },
    "cierre": [
     [
      "Contar en la casa los datos de un cliente, ¿qué principio incumple?",
      "Confidencialidad."
     ],
     [
      "Aceptar un trabajo que no sabe hacer, ¿qué principio incumple?",
      "Competencia y diligencia profesionales."
     ]
    ],
    "niveles": [
     "Nombra principios sin aplicarlos a los dilemas.",
     "Aplica principios a algunos dilemas, sin seguir todos los pasos.",
     "Resuelve los 4 dilemas con los 4 pasos y el principio correcto."
    ],
    "fuentes": [
     "NIAS (compendio), págs. 20, 53",
     "Manrique, Introducción a la Auditoría, págs. 22, 23",
     "Perfil del Contador Público Autorizado (Colegio de Contadores Públicos, 2016), págs. 3, 6, 11"
    ]
   },
   {
    "dev": true,
    "min": 40,
    "tit": "Perfil del contador y habilidades blandas",
    "contenidos": "Perfil del contador (capacidad de análisis y síntesis, habilidad para negociar, capacidad de retención, agilidad de pensamiento, capacidad crítica). Habilidades blandas o soft skills del contador (creatividad, visionario, disciplina, liderazgo, trabajo en equipo).",
    "ind": "Distingue las características del perfil profesional y las habilidades blandas del contador, mediante una autoevaluación y una simulación.",
    "explica": [
     "<b>Perfil del contador:</b> capacidad de análisis y síntesis (ver las partes y resumir lo importante), habilidad para negociar, capacidad de retención (recordar normas y datos), agilidad de pensamiento y capacidad crítica (no aceptar sin evidencia).",
     "<b>Habilidades blandas:</b> creatividad, visión de futuro, disciplina, liderazgo y trabajo en equipo. Son las que hacen que el conocimiento técnico se aproveche.",
     "En el control interno el contador además es: <b>analítico</b>, <b>investigador</b>, <b>revisor</b> (detallista), <b>objetivo</b> y <b>comunicativo</b>.",
     "Las empresas contratan por lo técnico y despiden por la falta de habilidades blandas: por eso se entrenan igual que las NIA.",
     "<b>Perfil del CPA (Colegio de Contadores Públicos, 2016):</b> el contador ya no solo registra: es un socio del negocio («business partner») que asesora a los dueños y convierte la información en una herramienta para decidir."
    ],
    "formacion": "Dinámica: el docente describe a 5 contadores (uno que no escucha, uno que resume muy bien…) y el grupo dice qué habilidad muestra o le falta.",
    "trabajo": {
     "tipo": "Autoevaluación y simulación",
     "txt": "Cada estudiante se califica de 1 a 3 en las 10 características y escoge 2 para mejorar con una acción concreta. Luego, en parejas, simulan una entrevista de trabajo para auxiliar contable donde deben demostrar 3 habilidades."
    },
    "cierre": [
     [
      "Nombre dos habilidades blandas del contador.",
      "Por ejemplo, liderazgo y trabajo en equipo (también creatividad, visión, disciplina)."
     ],
     [
      "¿Qué característica del perfil es «no aceptar sin evidencia»?",
      "La capacidad crítica."
     ]
    ],
    "niveles": [
     "Menciona características sin distinguir perfil y habilidades blandas.",
     "Distingue perfil y habilidades blandas, con un plan de mejora poco concreto.",
     "Distingue ambos grupos, se autoevalúa con criterio y las demuestra en la simulación."
    ],
    "id": "4.6",
    "fuentes": [
     "NIAS (compendio), pág. 8",
     "Perfil del Contador Público Autorizado (Colegio de Contadores Públicos, 2016), págs. 2, 4, 5"
    ]
   },
   {
    "id": "4.7",
    "dev": true,
    "min": 45,
    "tit": "Proyecto: escenarios del accionar del auditor",
    "contenidos": "Producto de la unidad: elaboración de un proyecto en donde se explica cada uno de los componentes.",
    "ind": "Elabora un proyecto que explica la valentía, la independencia, la Contraloría y el código de conducta y perfil del contador, aplicados a un escenario de auditoría.",
    "explica": [
     "El proyecto es el producto de la unidad. Cada grupo recibe un escenario (por ejemplo, una municipalidad con pagos dudosos o una empresa privada que presiona a su auditor).",
     "Debe explicar cada componente: por qué el auditor debe ser valiente en ese caso, qué amenazas a la independencia hay y qué salvaguardas usaría, qué papel tendría la Contraloría (si es sector público) y qué principios de ética aplican.",
     "Cierra con una solución concreta y realista."
    ],
    "formacion": "El docente explica la rúbrica del proyecto y muestra un ejemplo de estructura (portada, escenario, análisis por componente, solución, conclusiones).",
    "trabajo": {
     "tipo": "Proyecto (evaluación)",
     "txt": "Trabajo en grupo durante la lección (con entrega en la siguiente): documento o presentación con los 4 componentes y la solución. Presentación oral de 5 minutos."
    },
    "cierre": [
     [
      "Coevaluación: ¿qué solución de otro grupo le pareció más realista y por qué?",
      "Respuesta personal."
     ]
    ],
    "niveles": [
     "El proyecto explica 1 o 2 componentes, sin solución clara.",
     "El proyecto explica 3 o 4 componentes, con una solución poco fundamentada.",
     "El proyecto explica los 4 componentes aplicados al escenario y propone una solución fundamentada."
    ],
    "fuentes": [
     "Puerres, Auditoría operacional, págs. 7, 13",
     "Puerres, Auditoría operacional, págs. 1, 7"
    ]
   }
  ]
 },
 {
  "n": 5,
  "horas": null,
  "ra": "Implementar soluciones de seguridad empresarial en materia de Salud Ocupacional.",
  "evaluacion": "Según el programa: resolución de casos de salud y seguridad laboral e investigaciones (protocolo de salud ocupacional y plan de evacuación del colegio).",
  "indMEP": [
   "Relaciona la salud con el trabajo.",
   "Explica en qué consiste la cultura de la prevención.",
   "Resuelve casos de salud y seguridad laboral, considerando la información suministrada en el sitio web oficial del Consejo de Salud Ocupacional de Costa Rica.",
   "Explica qué son y para qué se usan las normas INTECO.",
   "Investiga el protocolo de Salud Ocupacional propio de su especialidad y de su institución educativa.",
   "Investiga sobre el plan de evacuación en caso de incendio y terremoto dentro de su institución."
  ],
  "lecciones": [
   {
    "id": "5.1",
    "dev": true,
    "min": 40,
    "tit": "La salud y el trabajo",
    "contenidos": "Seguridad en el trabajo: la salud y el trabajo; cuidar la salud y la seguridad en el trabajo.",
    "ind": "Relaciona las condiciones de trabajo de una oficina contable con sus efectos en la salud, mediante un cuadro de causa y efecto.",
    "explica": [
     "<b>Salud ocupacional:</b> busca el mayor bienestar físico, mental y social de las personas trabajadoras, previniendo los daños que causan las condiciones de trabajo.",
     "La Constitución Política (artículo 66) obliga a todo patrono a adoptar medidas de higiene y seguridad en el trabajo, y el Código de Trabajo (artículo 282) le asigna la obligación de garantizar la salud ocupacional.",
     "<b>Riesgos del trabajo:</b> los accidentes y las enfermedades que sufre la persona trabajadora por causa o con ocasión de su trabajo. Los cubre el seguro obligatorio de riesgos del trabajo (Ley 6727).",
     "Una oficina también tiene riesgos: posturas, pantallas, estrés, cables sueltos, mala iluminación."
    ],
    "formacion": "Lluvia de ideas: ¿qué le puede pasar a la salud de un contador en un día de cierre contable?",
    "trabajo": {
     "tipo": "Cuadro de causa y efecto",
     "txt": "Cuadro con 6 condiciones de trabajo de una oficina contable, el efecto en la salud y una medida para evitarlo."
    },
    "cierre": [
     [
      "¿Qué artículo de la Constitución obliga al patrono a cuidar la higiene y seguridad?",
      "El artículo 66."
     ],
     [
      "¿Qué es un riesgo del trabajo?",
      "Un accidente o enfermedad que ocurre por causa o con ocasión del trabajo."
     ]
    ],
    "niveles": [
     "Menciona condiciones sin relacionarlas con la salud.",
     "Relaciona condiciones y efectos, con medidas incompletas.",
     "Relaciona las 6 condiciones con su efecto y una medida adecuada."
    ],
    "fuentes": [
     "Programa del MEP (Duodécimo, Auditoría, págs. 98-99): Consejo de Salud Ocupacional de Costa Rica, normas INTECO y guías de prevención. El material de auditoría entregado no cubre este tema."
    ]
   },
   {
    "id": "5.2",
    "dev": true,
    "min": 35,
    "tit": "La cultura de la prevención",
    "contenidos": "La cultura de la prevención: la prevención en los ambientes laborales.",
    "ind": "Explica en qué consiste la cultura de la prevención y quién participa en ella, mediante un esquema.",
    "explica": [
     "<b>Cultura de la prevención:</b> actuar antes de que ocurra el daño; que cuidar la salud sea parte de la forma normal de trabajar, no solo una reacción después de un accidente.",
     "El patrono organiza la prevención; la persona trabajadora debe cumplir las normas y usar el equipo de protección (artículo 285 del Código de Trabajo).",
     "En cada centro de trabajo con <b>10 o más personas trabajadoras</b> se forma una <b>comisión de salud ocupacional</b> (artículo 288); con <b>más de 50 permanentes</b>, la empresa debe tener una <b>oficina o departamento de salud ocupacional</b> (artículo 300).",
     "El <b>Consejo de Salud Ocupacional (CSO)</b>, del Ministerio de Trabajo, es el órgano técnico que dicta normas y guías en la materia."
    ],
    "formacion": "El docente muestra dos fotos de un mismo lugar (antes y después de ordenar) y el grupo identifica las acciones preventivas.",
    "trabajo": {
     "tipo": "Esquema",
     "txt": "Esquema de la cultura de la prevención: qué es, quién participa (patrono, trabajadores, comisión, oficina, CSO) y 3 acciones preventivas para el colegio."
    },
    "cierre": [
     [
      "¿Con cuántas personas trabajadoras se debe formar una comisión de salud ocupacional?",
      "Con 10 o más."
     ],
     [
      "¿Qué es el CSO?",
      "El Consejo de Salud Ocupacional, órgano técnico del Ministerio de Trabajo."
     ]
    ],
    "niveles": [
     "Define la prevención sin indicar quién participa.",
     "Explica la cultura de la prevención e indica algunos participantes.",
     "Explica el concepto, todos los participantes con su papel y propone 3 acciones pertinentes."
    ],
    "fuentes": [
     "Programa del MEP (Duodécimo, Auditoría, págs. 98-99): Consejo de Salud Ocupacional de Costa Rica, normas INTECO y guías de prevención. El material de auditoría entregado no cubre este tema."
    ]
   },
   {
    "id": "5.3",
    "dev": true,
    "min": 45,
    "tit": "Peligros, evaluación de riesgos y mapa de riesgos",
    "contenidos": "La identificación de peligros, la evaluación de riesgos y el mapa de riesgos en ambientes laborales.",
    "ind": "Elabora el mapa de riesgos de un espacio del colegio, identificando peligros y evaluando su nivel de riesgo.",
    "explica": [
     "<b>Peligro:</b> lo que puede causar daño (un cable suelto, un piso mojado). <b>Riesgo:</b> la combinación de la probabilidad de que el daño ocurra y su gravedad.",
     "Pasos: 1) identificar los peligros recorriendo el lugar, 2) evaluar cada riesgo (probabilidad e impacto: alto, medio o bajo), 3) proponer controles, 4) dar seguimiento.",
     "<b>Mapa de riesgos:</b> el plano del lugar con símbolos que muestran dónde está cada riesgo y su nivel. Sirve para que todos lo vean y para planear la prevención.",
     "Es la misma lógica de la matriz de riesgos de auditoría: probabilidad por impacto."
    ],
    "formacion": "Recorrido guiado de 10 minutos por el laboratorio o el aula anotando peligros.",
    "trabajo": {
     "tipo": "Mapa de riesgos",
     "txt": "En grupos: dibujar el plano del laboratorio de cómputo o del aula, ubicar al menos 6 riesgos con símbolos y colores según su nivel, y proponer un control para cada uno."
    },
    "cierre": [
     [
      "¿Qué diferencia hay entre peligro y riesgo?",
      "El peligro es la fuente de daño; el riesgo combina la probabilidad y la gravedad del daño."
     ],
     [
      "¿Para qué sirve un mapa de riesgos?",
      "Para ver dónde están los riesgos y planear la prevención."
     ]
    ],
    "niveles": [
     "El mapa ubica pocos peligros sin evaluarlos.",
     "El mapa ubica y evalúa los riesgos, con controles incompletos.",
     "El mapa ubica 6 o más riesgos evaluados correctamente y con un control para cada uno."
    ],
    "fuentes": [
     "Programa del MEP (Duodécimo, Auditoría, págs. 98-99): Consejo de Salud Ocupacional de Costa Rica, normas INTECO y guías de prevención. El material de auditoría entregado no cubre este tema."
    ]
   },
   {
    "id": "5.4",
    "dev": true,
    "min": 40,
    "tit": "Clasificación de los factores de riesgo y planificación preventiva",
    "contenidos": "Planificación preventiva. La clasificación de los factores de riesgo.",
    "ind": "Clasifica factores de riesgo y propone un plan preventivo con acciones, responsables y plazos, al resolver un caso.",
    "explica": [
     "<b>Factores de riesgo:</b> físicos (ruido, iluminación, temperatura), químicos (productos de limpieza, tóner), biológicos (virus, hongos), ergonómicos (posturas, movimientos repetitivos), psicosociales (estrés, carga de trabajo), mecánicos o de seguridad (caídas, cortes) y eléctricos.",
     "<b>Orden de los controles:</b> primero eliminar el peligro, luego sustituirlo, después controles de ingeniería (barreras, ventilación), controles administrativos (procedimientos, pausas, capacitación) y por último el equipo de protección personal.",
     "<b>Planificación preventiva:</b> qué se va a hacer, quién lo hace, cuándo y con qué recursos. Se recoge en el programa de salud ocupacional de la empresa."
    ],
    "formacion": "Clasificación rápida en la pizarra de 10 riesgos de una oficina.",
    "trabajo": {
     "tipo": "Resolución de caso",
     "txt": "Caso de una oficina contable: clasificar 8 riesgos por tipo y armar un plan preventivo (acción, control según el orden, responsable, plazo y costo aproximado)."
    },
    "cierre": [
     [
      "¿A qué tipo de factor pertenece el estrés por el cierre de mes?",
      "Psicosocial."
     ],
     [
      "¿Qué control se prefiere primero?",
      "Eliminar el peligro."
     ]
    ],
    "niveles": [
     "Clasifica algunos riesgos sin plan.",
     "Clasifica los riesgos y presenta un plan con datos incompletos.",
     "Clasifica los 8 riesgos y presenta un plan completo que respeta el orden de los controles."
    ],
    "fuentes": [
     "Programa del MEP (Duodécimo, Auditoría, págs. 98-99): Consejo de Salud Ocupacional de Costa Rica, normas INTECO y guías de prevención. El material de auditoría entregado no cubre este tema."
    ]
   },
   {
    "id": "5.5",
    "dev": true,
    "min": 40,
    "tit": "Ergonomía y teletrabajo",
    "contenidos": "Ergonomía. Guía de Salud Ocupacional y prevención de riesgos en el teletrabajo.",
    "ind": "Evalúa un puesto de trabajo con computadora según criterios de ergonomía y propone mejoras.",
    "explica": [
     "<b>Ergonomía:</b> adaptar el trabajo a la persona, no la persona al trabajo.",
     "Puesto con computadora: pantalla a la altura de los ojos y a un brazo de distancia, espalda apoyada, codos cerca de 90°, pies apoyados en el piso, buena luz sin reflejos y pausas activas.",
     "<b>Teletrabajo:</b> la Ley 9738 lo regula y el patrono debe informar las normas de salud ocupacional; el Consejo de Salud Ocupacional tiene una <b>Guía de salud ocupacional y prevención de los riesgos en el teletrabajo</b>.",
     "Los problemas más comunes por mala ergonomía son los musculoesqueléticos (espalda, cuello, muñecas) y la fatiga visual."
    ],
    "formacion": "Demostración: un estudiante se sienta en un puesto mal ajustado y el grupo lo corrige paso a paso.",
    "trabajo": {
     "tipo": "Evaluación de puesto",
     "txt": "Con una lista de cotejo de 8 criterios, evaluar su puesto de estudio en la casa o un puesto del laboratorio, tomar evidencia y proponer 3 mejoras de bajo costo."
    },
    "cierre": [
     [
      "¿A qué altura debe estar la pantalla?",
      "A la altura de los ojos, a un brazo de distancia."
     ],
     [
      "¿Qué ley regula el teletrabajo en Costa Rica?",
      "La Ley 9738."
     ]
    ],
    "niveles": [
     "Evalúa pocos criterios sin proponer mejoras.",
     "Evalúa los criterios con mejoras poco viables.",
     "Evalúa los 8 criterios con evidencia y propone 3 mejoras viables."
    ],
    "fuentes": [
     "Programa del MEP (Duodécimo, Auditoría, págs. 98-99): Consejo de Salud Ocupacional de Costa Rica, normas INTECO y guías de prevención. El material de auditoría entregado no cubre este tema."
    ]
   },
   {
    "id": "5.6",
    "dev": true,
    "min": 35,
    "tit": "Normas técnicas: INTECO y normas de prevención del CSO",
    "contenidos": "Consejo de Salud Ocupacional: lista de normas INTECO, normas técnicas de prevención, guía programa de salud ocupacional.",
    "ind": "Explica qué son y para qué se usan las normas INTECO y las normas técnicas de prevención del Consejo de Salud Ocupacional.",
    "explica": [
     "<b>INTECO</b> es el Instituto de Normas Técnicas de Costa Rica: elabora las normas nacionales (normas INTE), entre ellas muchas de seguridad y salud en el trabajo (señalización, extintores, equipo de protección, gestión de la seguridad).",
     "Nota: el programa del MEP las escribe «INTACO»; el nombre correcto del instituto es INTECO.",
     "El <b>Consejo de Salud Ocupacional</b> publica en su sitio web normas técnicas de prevención y guías, como la guía para elaborar el programa de salud ocupacional de la empresa.",
     "Para qué sirven: dan criterios técnicos claros y comunes; una empresa que las sigue reduce accidentes y demuestra que cumple."
    ],
    "formacion": "El docente muestra la señalización del colegio y el grupo deduce qué norma técnica la pide (colores, formas, salidas de emergencia).",
    "trabajo": {
     "tipo": "Investigación",
     "txt": "En grupos, investigar en los sitios oficiales del CSO e INTECO: 3 normas o guías relacionadas con seguridad laboral (nombre, de qué trata, a quién aplica) y presentarlas en una ficha."
    },
    "cierre": [
     [
      "¿Qué es INTECO?",
      "El Instituto de Normas Técnicas de Costa Rica, que elabora las normas nacionales."
     ],
     [
      "¿Dónde se encuentran las normas técnicas de prevención del CSO?",
      "En el sitio web oficial del Consejo de Salud Ocupacional."
     ]
    ],
    "niveles": [
     "La ficha nombra normas sin explicar su uso.",
     "La ficha explica 1 o 2 normas o guías.",
     "La ficha explica 3 normas o guías con fuente oficial, contenido y a quién aplican."
    ],
    "fuentes": [
     "Programa del MEP (Duodécimo, Auditoría, págs. 98-99): Consejo de Salud Ocupacional de Costa Rica, normas INTECO y guías de prevención. El material de auditoría entregado no cubre este tema."
    ]
   },
   {
    "id": "5.7",
    "dev": true,
    "min": 45,
    "tit": "Protocolo de salud ocupacional y plan de evacuación del colegio",
    "contenidos": "La salud y el trabajo en las políticas públicas. Protocolo de salud ocupacional de la especialidad y de la institución. Plan de evacuación en caso de incendio y terremoto.",
    "ind": "Investiga el protocolo de salud ocupacional y el plan de evacuación del colegio y propone mejoras, mediante un proyecto.",
    "explica": [
     "Los centros educativos tienen su <b>comisión de salud ocupacional</b> y un <b>programa de salud ocupacional</b>, según los lineamientos del MEP.",
     "<b>Plan de evacuación:</b> rutas de salida, zonas seguras, puntos de reunión, brigadas (evacuación, primeros auxilios, incendio), señalización y simulacros.",
     "<b>En un terremoto:</b> agacharse, cubrirse y sujetarse; alejarse de ventanas; salir solo cuando termine el movimiento y por la ruta indicada.",
     "<b>En un incendio:</b> dar la alarma, salir sin correr, no usar ascensores, gatear si hay humo y no regresar por objetos.",
     "En la especialidad de Contabilidad: cuidado en el laboratorio de cómputo (cables, regletas, ergonomía) y en el manejo de documentos y archivos."
    ],
    "formacion": "Revisión del croquis de evacuación del colegio en clase.",
    "trabajo": {
     "tipo": "Proyecto de investigación (evaluación de la unidad)",
     "txt": "En grupos: entrevistar a un miembro de la comisión de salud ocupacional del colegio, revisar el plan de evacuación (incendio y terremoto) y el protocolo del laboratorio, y presentar 3 fortalezas, 3 mejoras y un afiche para el aula."
    },
    "cierre": [
     [
      "¿Qué se hace primero durante un terremoto?",
      "Agacharse, cubrirse y sujetarse."
     ],
     [
      "¿Se usa el ascensor en un incendio?",
      "No."
     ]
    ],
    "niveles": [
     "Describe el plan sin investigar en el colegio.",
     "Investiga el plan y el protocolo, con propuestas poco claras.",
     "Investiga ambos con fuentes del colegio, propone mejoras viables y presenta el afiche."
    ],
    "fuentes": [
     "Programa del MEP (Duodécimo, Auditoría, págs. 98-99): Consejo de Salud Ocupacional de Costa Rica, normas INTECO y guías de prevención. El material de auditoría entregado no cubre este tema."
    ]
   }
  ]
 }
];
