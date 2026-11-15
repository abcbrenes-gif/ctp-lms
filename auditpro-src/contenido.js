// Contenido de «La Brújula» y del laboratorio. Textos pensados para estudiantes de 17 años.
// Los títulos de los artículos son los de la Ley General de Control Interno N.° 8292.

export const COSO = [
  { id: "entorno", ico: "🧭", nombre: "Entorno de control", art: "13", ley: "Ambiente de control", color: "from-indigo-500 to-violet-500",
    idea: "Es el ejemplo que dan los jefes: valores, reglas claras y quién manda en qué.",
    pregunta: "¿Aquí la gente sabe qué está bien, qué está mal y quién responde?",
    colegio: "La cooperativa estudiantil tiene un reglamento, y el tesorero no puede gastar sin el visto bueno del comité.",
    empresa: "El dueño de una ferretería en Heredia exige factura electrónica en toda venta, aunque el cliente no la pida.",
    alerta: "«Aquí siempre se ha hecho así» y nadie firma nada." },
  { id: "riesgos", ico: "⚠️", nombre: "Evaluación de riesgos", art: "14", ley: "Valoración del riesgo", color: "from-amber-500 to-orange-500",
    idea: "Pensar antes qué puede salir mal, qué tan probable es y cuánto dolería.",
    pregunta: "¿Qué es lo peor que podría pasar con la plata y qué tan fácil es que pase?",
    colegio: "Antes de la feria científica, el comité anota: «se puede perder el efectivo de las entradas», y decide usar SINPE Móvil.",
    empresa: "Una municipalidad lista sus riesgos cada año en el SEVRI: fraude en compras, caída del sistema de cobros, etc.",
    alerta: "Nadie ha hecho la lista de riesgos o tiene años sin actualizarse." },
  { id: "actividades", ico: "🛡️", nombre: "Actividades de control", art: "15", ley: "Actividades de control", color: "from-emerald-500 to-teal-500",
    idea: "Los candados del día a día: autorizar, separar funciones, conciliar, guardar comprobantes.",
    pregunta: "¿Qué impide que una sola persona haga todo y nadie se dé cuenta?",
    colegio: "En la soda, una persona cobra y otra cuenta la caja al cierre; las dos firman el arqueo.",
    empresa: "En una pyme, quien registra la compra no es quien la aprueba ni quien hace la transferencia.",
    alerta: "La misma persona pide, aprueba y paga." },
  { id: "informacion", ico: "📡", nombre: "Información y comunicación", art: "16", ley: "Sistemas de información", color: "from-sky-500 to-blue-500",
    idea: "Datos confiables, a tiempo y en manos de quien los necesita para decidir.",
    pregunta: "¿Los registros están completos y llegan a quien toma decisiones?",
    colegio: "La junta recibe cada mes el informe de ingresos y gastos, con los comprobantes ordenados.",
    empresa: "Recursos Humanos avisa el mismo día cuando alguien renuncia, para sacarlo de la planilla.",
    alerta: "Faltan números de consecutivo o hay pagos sin referencia." },
  { id: "supervision", ico: "🔭", nombre: "Supervisión", art: "17", ley: "Seguimiento del sistema de control interno", color: "from-rose-500 to-pink-500",
    idea: "Revisar que los controles sí funcionan y corregir lo que falla.",
    pregunta: "¿Alguien revisa que lo anterior se cumpla y le da seguimiento?",
    colegio: "El profesor asesor revisa cada trimestre los libros de la cooperativa y deja anotadas las mejoras.",
    empresa: "La institución hace su autoevaluación anual y atiende las recomendaciones de la auditoría interna.",
    alerta: "Las recomendaciones de la auditoría llevan años pendientes." },
];

export const FASES = [
  { n: 1, ico: "🗺️", nombre: "Planificación", que: "Conocer la entidad, identificar riesgos y decidir qué se va a revisar.", producto: "Programa de auditoría", ejemplo: "Decidimos revisar planilla y compras del I semestre porque ahí se mueve más plata." },
  { n: 2, ico: "🔬", nombre: "Ejecución", que: "Aplicar las pruebas, reunir evidencia y dejarla en papeles de trabajo.", producto: "Cédulas con marcas y referencias", ejemplo: "Buscamos pagos duplicados y compras partidas en pedacitos." },
  { n: 3, ico: "📣", nombre: "Comunicación de resultados", que: "Redactar los hallazgos y discutirlos con la administración.", producto: "Informe de auditoría", ejemplo: "Cada hallazgo lleva condición, criterio, causa, efecto y recomendación." },
  { n: 4, ico: "🔁", nombre: "Seguimiento", que: "Verificar que las recomendaciones se cumplieron.", producto: "Informe de seguimiento", ejemplo: "A los 60 días revisamos si ya separaron quién registra y quién aprueba." },
];

export const LEY = [
  { art: "7", titulo: "Obligatoriedad de disponer de un sistema de control interno", claro: "Toda institución pública debe tener control interno: no es opcional." },
  { art: "8", titulo: "Concepto de sistema de control interno", claro: "Son las acciones de la administración para cuidar el patrimonio, tener información confiable, ser eficiente y cumplir la ley." },
  { art: "10", titulo: "Responsabilidad por el sistema de control interno", claro: "El jerarca y los titulares subordinados deben establecerlo, mantenerlo, perfeccionarlo y evaluarlo." },
  { art: "12", titulo: "Deberes del jerarca y de los titulares subordinados", claro: "Actuar de inmediato ante irregularidades y atender las recomendaciones de la auditoría." },
  { art: "13 a 17", titulo: "Los cinco componentes", claro: "Ambiente de control, valoración del riesgo, actividades de control, sistemas de información y seguimiento: los mismos de COSO." },
  { art: "18", titulo: "Sistema específico de valoración del riesgo institucional", claro: "El SEVRI: la herramienta para identificar los riesgos y decidir qué hacer con ellos." },
  { art: "20", titulo: "Obligación de contar con auditoría interna", claro: "Las instituciones sujetas a la ley deben tener auditoría interna." },
  { art: "39", titulo: "Causales de responsabilidad administrativa", claro: "Quien incumpla sus deberes de control sin justificación, o debilite el sistema, puede ser sancionado." },
];

export const RETO = [
  { s: "En la soda del colegio, la misma persona cobra, cuenta la caja y deposita.", r: "actividades" },
  { s: "La gerente dice: «las reglas son para los demás, yo no ocupo facturas».", r: "entorno" },
  { s: "Nadie ha pensado qué pasaría si se cae el sistema de cobros en diciembre.", r: "riesgos" },
  { s: "Un funcionario renunció en febrero y en abril todavía aparece en la planilla.", r: "informacion" },
  { s: "La auditoría recomendó hace dos años separar funciones y nadie revisó si se hizo.", r: "supervision" },
  { s: "Las órdenes de compra saltan de la 1040 a la 1042 y nadie sabe qué pasó con la 1041.", r: "informacion" },
  { s: "Antes de la feria, el comité decide que el efectivo se cuenta entre dos personas y se firma.", r: "actividades" },
  { s: "La institución tiene tres años sin hacer su autoevaluación anual.", r: "supervision" },
];

export const NIVELES = [
  { min: 0, nombre: "Aprendiz", ico: "🌱" }, { min: 60, nombre: "Asistente de auditoría", ico: "📎" },
  { min: 160, nombre: "Auditor júnior", ico: "🔎" }, { min: 280, nombre: "Auditor sénior", ico: "🧠" }, { min: 400, nombre: "Socio de auditoría", ico: "🏆" },
];

const CRIT = {
  a15: "Ley 8292, artículo 15: actividades de control (autorización, registros y conciliaciones).",
  a16: "Ley 8292, artículo 16: sistemas de información confiables y oportunos.",
  a13: "Ley 8292, artículo 13: ambiente de control (integridad y valores éticos).",
  a17: "Ley 8292, artículo 17: seguimiento del sistema de control interno.",
  f33: "Ley 9986, artículo 33: prohibición de fragmentar las contrataciones.",
};

// Cada prueba: qué busca, cómo se explica y qué diría un auditor con experiencia.
export const PRUEBAS = {
  planilla: [
    { id: "pl-dup", ico: "👯", nombre: "Pagos duplicados", busca: "Mismo funcionario pagado dos veces en el mismo período.",
      criterios: [CRIT.a15, CRIT.a13, CRIT.f33], ok: 0, experto: { p: 4, i: 3 },
      causa: "El sistema no bloquea un segundo pago al mismo funcionario en el mismo período.", efecto: "Dinero pagado de más que hay que recuperar.", reco: "Agregar una validación que impida dos pagos por funcionario y período, y cobrar los pagos repetidos." },
    { id: "pl-ex", ico: "👻", nombre: "Pagos a exfuncionarios", busca: "Pagos en meses posteriores a la fecha de salida.",
      criterios: [CRIT.f33, CRIT.a16, CRIT.a17], ok: 1, experto: { p: 4, i: 3 },
      causa: "Recursos Humanos no informa a tiempo las salidas y el maestro de empleados queda desactualizado.", efecto: "Se paga salario a personas que ya no trabajan en la institución.", reco: "Bloquear en el sistema al funcionario con fecha de salida y conciliar el maestro antes de cada planilla." },
    { id: "pl-ext", ico: "⏱️", nombre: "Horas extra atípicas", busca: "Horas extra del mes por encima del límite que usted fije.", param: { nombre: "Límite de horas", min: 10, max: 120, def: 40 },
      criterios: [CRIT.a15, CRIT.a17, CRIT.f33], ok: 0, experto: { p: 3, i: 2 },
      causa: "Las horas extra se digitan sin boleta aprobada por la jefatura y sin tope en el sistema.", efecto: "Gasto no justificado y posible pago por tiempo no laborado.", reco: "Exigir boleta firmada y fijar un límite mensual en el sistema." },
    { id: "pl-hor", ico: "🌙", nombre: "Registros fuera de horario", busca: "Registros hechos de noche (19:00 a 6:00) o en fin de semana.",
      criterios: [CRIT.a13, CRIT.f33, CRIT.a15], ok: 2, experto: { p: 3, i: 3 },
      causa: "El sistema no restringe el horario de acceso ni se revisan las bitácoras.", efecto: "Operaciones sin supervisión, difíciles de justificar.", reco: "Limitar el acceso al horario hábil y revisar cada mes la bitácora de usuarios." },
  ],
  compras: [
    { id: "co-dup", ico: "🧾", nombre: "Facturas duplicadas", busca: "Mismo proveedor, misma factura y mismo monto en dos órdenes.",
      criterios: [CRIT.a17, CRIT.a15, CRIT.a13], ok: 1, experto: { p: 4, i: 3 },
      causa: "El sistema no valida que la factura de un proveedor sea única.", efecto: "Riesgo de pagar dos veces la misma factura.", reco: "Validar proveedor + número de factura y detener los pagos repetidos." },
    { id: "co-fra", ico: "✂️", nombre: "Fraccionamiento", busca: "Mismo proveedor y departamento, órdenes bajo el tope en 7 días o menos que juntas pasan el tope.",
      criterios: [CRIT.a16, CRIT.a17, CRIT.f33], ok: 2, experto: { p: 5, i: 4 },
      causa: "No hay plan anual de compras y el sistema no acumula montos por proveedor.", efecto: "Se evita el concurso y la aprobación de la Alcaldía; se pierde economía de escala.", reco: "Consolidar las compras en un plan anual y crear una alerta de acumulado por proveedor." },
    { id: "co-top", ico: "📏", nombre: "Justo bajo el tope", busca: "Órdenes entre 95 % y 100 % del tope de ₡3 000 000.",
      criterios: [CRIT.f33, CRIT.a13, CRIT.a16], ok: 0, experto: { p: 4, i: 3 },
      causa: "Los montos se ajustan para no pasar al procedimiento que exige más aprobaciones.", efecto: "Compras que esquivan el control superior.", reco: "Revisar los expedientes de estas órdenes y vigilar la concentración bajo el tope." },
    { id: "co-seg", ico: "🎭", nombre: "Registra y aprueba la misma persona", busca: "Órdenes donde el usuario que registra es el mismo que aprueba.",
      criterios: [CRIT.a15, CRIT.a16, CRIT.f33], ok: 0, experto: { p: 3, i: 3 },
      causa: "Los perfiles de usuario acumulan permisos de registro y aprobación.", efecto: "Una sola persona puede crear y aprobar una compra sin que nadie la revise.", reco: "Separar los perfiles de registro y aprobación en el sistema." },
    { id: "co-hor", ico: "🌙", nombre: "Órdenes fuera de horario", busca: "Órdenes registradas de noche (19:00 a 6:00) o en fin de semana.",
      criterios: [CRIT.f33, CRIT.a15, CRIT.a17], ok: 1, experto: { p: 3, i: 3 },
      causa: "El sistema no restringe el horario de acceso ni se revisan las bitácoras.", efecto: "Compras registradas sin supervisión.", reco: "Limitar el acceso al horario hábil y revisar cada mes la bitácora de usuarios." },
  ],
};
