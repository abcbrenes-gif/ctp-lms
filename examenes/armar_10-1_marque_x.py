# Arma el examen de la 10-1: 35 de selección única (15 teóricas + 20 prácticas)
# y 2 ejercicios de resolución de problemas (Aula de Conta y Liquidaciones).
# Todos los montos se verificaron con el motor de cálculo de la plataforma.
import json, random
random.seed(7)
PC = "Preaviso y cesantía"; VA = "Vacaciones y aguinaldo"; JO = "Jornadas laborales y horas extra"
PL = "Planilla: cargas sociales e impuesto sobre la renta"; LQ = "Liquidación laboral"
LIQ = "Liquidaciones laborales"; AC = "Aula de Conta"
c = lambda n: "₡" + f"{n:,.0f}".replace(",", " ")
R = []

def sel(tema, enun, ok, d1, d2, just, err, teo=True, app="Ninguna", acc=""):
    ops = [ok, d1, d2]; random.shuffle(ops)
    R.append({"tipo_pregunta": "seleccion_unica",
              "parte": "Parte I. Selección única: conceptos" if teo else "Parte II. Selección única: cálculos",
              "tema": tema, "puntos": 1, "herramienta_requerida": app, "accion_en_herramienta": acc,
              "enunciado": enun, "opciones_o_valor_esperado": ops, "respuesta_correcta": ok,
              "justificacion_pedagogica": just, "feedback_exito": "¡Correcto! 🎯", "feedback_error": err})

# ───────── 15 teóricas ─────────
sel(PC, "Según el artículo 28 del Código de Trabajo, a una persona trabajadora con más de un año de laborar a la que despiden sin justa causa le corresponde un preaviso de",
    "un mes de salario", "quince días de salario", "una semana de salario",
    "Art. 28: de 3 a 6 meses, una semana; de 6 meses a 1 año, 15 días; después de 1 año, un mes.", "Revise los plazos del art. 28 según el tiempo laborado.")
sel(PC, "Si la persona trabajadora tiene entre seis meses y un año de laborar, el preaviso que le corresponde es de",
    "quince días de salario", "un mes de salario", "siete días de salario",
    "Art. 28 del Código de Trabajo: de 6 meses a 1 año, 15 días.", "Ubique el tramo de 6 meses a 1 año en el art. 28.")
sel(PC, "La cesantía se paga cuando la relación laboral termina por",
    "despido con responsabilidad patronal", "renuncia de la persona trabajadora", "despido por falta grave de la persona trabajadora",
    "Art. 29: la cesantía procede cuando el patrono despide sin justa causa, es decir, con responsabilidad patronal.", "Piense en quién termina la relación y si hubo justa causa.")
sel(PC, "Para calcular la cesantía, el Código de Trabajo establece un tope máximo de",
    "ocho años laborados", "diez años laborados", "cinco años laborados",
    "Art. 29: la cesantía no puede abarcar más de los últimos 8 años de relación laboral.", "Recuerde el límite que fija el art. 29.")
sel(PC, "El preaviso y la cesantía se calculan con",
    "el promedio de los salarios de los últimos seis meses", "el último salario recibido", "el promedio de los salarios de los últimos doce meses",
    "Art. 30: se usa el promedio de los salarios devengados en los últimos 6 meses.", "No es el último salario: la ley pide un promedio.")
sel(VA, "El aguinaldo se calcula con los salarios devengados del",
    "1 de diciembre del año anterior al 30 de noviembre del año en curso", "1 de enero al 31 de diciembre", "1 de noviembre al 31 de octubre",
    "Ley 2412: el período va del 1 de diciembre al 30 de noviembre.", "El período del aguinaldo no coincide con el año calendario.")
sel(VA, "Según la Ley 2412, el aguinaldo debe pagarse",
    "dentro de los primeros veinte días de diciembre", "a más tardar el 30 de noviembre", "en la primera quincena de enero",
    "Ley 2412: se paga dentro de los primeros 20 días de diciembre.", "Piense en la fecha límite que fija la ley de aguinaldo.")
sel(VA, "Según el artículo 153 del Código de Trabajo, por cada cincuenta semanas de labores continuas la persona trabajadora tiene derecho a",
    "dos semanas de vacaciones pagadas", "una semana de vacaciones pagadas", "un mes de vacaciones pagadas",
    "Art. 153: dos semanas de vacaciones remuneradas por cada 50 semanas de trabajo continuo.", "Revise el art. 153 del Código de Trabajo.")
sel(VA, "Si la relación laboral termina antes de cumplir las cincuenta semanas, las vacaciones se pagan en forma",
    "proporcional, a razón de un día por cada mes laborado", "completa, como si hubiera laborado todo el año", "nula, porque no completó el período",
    "Arts. 153 y 156: al terminar la relación se pagan las vacaciones proporcionales, un día por mes laborado.", "Las vacaciones se acumulan mes a mes.")
sel(JO, "La jornada ordinaria diurna tiene un máximo de",
    "8 horas diarias y 48 horas semanales", "6 horas diarias y 36 horas semanales", "7 horas diarias y 42 horas semanales",
    "Art. 136: la jornada diurna (de 5 a. m. a 7 p. m.) es de máximo 8 horas diarias y 48 semanales.", "Es la más larga de las tres jornadas ordinarias.")
sel(JO, "La jornada ordinaria nocturna tiene un máximo de",
    "6 horas diarias y 36 horas semanales", "8 horas diarias y 48 horas semanales", "7 horas diarias y 42 horas semanales",
    "Art. 136: la jornada nocturna (de 7 p. m. a 5 a. m.) es de máximo 6 horas diarias y 36 semanales.", "Trabajar de noche es más pesado: es la jornada más corta.")
sel(JO, "La jornada ordinaria mixta tiene un máximo de",
    "7 horas diarias y 42 horas semanales", "6 horas diarias y 36 horas semanales", "8 horas diarias y 48 horas semanales",
    "Art. 138: la jornada mixta es de máximo 7 horas diarias y 42 semanales.", "Es la jornada intermedia entre la diurna y la nocturna.")
sel(JO, "Según el artículo 139 del Código de Trabajo, cada hora extra se paga con",
    "un 50 % más del valor de la hora ordinaria", "el mismo valor de la hora ordinaria", "el doble del valor de la hora ordinaria",
    "Art. 139: la jornada extraordinaria se paga con un 50 % más («tiempo y medio»).", "Se le conoce como «tiempo y medio».")
sel(PL, "El total de las cargas sociales que se rebajan al salario bruto de la persona trabajadora (SEM 5,50 %, IVM 4,33 % y Banco Popular 1 %) es de",
    "10,83 %", "26,83 %", "9,25 %",
    "SEM 5,50 % + IVM 4,33 % + Banco Popular 1 % = 10,83 % (cargas obreras).", "No confunda las cargas obreras con las patronales (26,83 %).")
sel(PL, "Según los tramos del impuesto sobre la renta a los salarios de 2026, un salario mensual de hasta ₡918 000",
    "está exento del impuesto", "paga 10 % sobre todo el salario", "paga 15 % sobre todo el salario",
    "Tramos 2026: hasta ₡918 000 exento; de ₡918 000 a ₡1 347 000, 10 % sobre el exceso; de ₡1 347 000 a ₡2 364 000, 15 % sobre el exceso.", "Revise el primer tramo de la tabla del impuesto al salario.")

# ───────── 20 prácticas (cálculos) ─────────
P = dict(teo=False)
sel(LQ, "Ana gana un salario mensual fijo de ₡540 000. ¿Cuál es su salario diario para calcular la liquidación?",
    c(18000), c(17000), c(20000), "Salario diario = promedio mensual ÷ 30 = ₡540 000 ÷ 30 = ₡18 000.", "Divida el salario mensual entre 30.", **P)
sel(PC, "Ana (salario de ₡540 000) trabajó 2 años y la despiden con responsabilidad patronal sin preaviso. ¿Cuánto le corresponde de preaviso?",
    c(540000), c(270000), c(126000), "Más de 1 año: 1 mes = 30 × ₡18 000 = ₡540 000.", "Con más de un año corresponde un mes de salario.", **P)
sel(PC, "Ana (salario de ₡540 000, 2 años laborados, despido con responsabilidad patronal). ¿Cuánto le corresponde de cesantía? Con 2 años corresponden 20 días por año.",
    c(720000), c(702000), c(1080000), "20 días × 2 años = 40 días × ₡18 000 = ₡720 000.", "Multiplique días por año × años × salario diario.", **P)
sel(PC, "Luis gana ₡450 000 al mes, trabajó 8 meses y lo despiden con responsabilidad patronal sin preaviso. ¿Cuánto le corresponde de preaviso?",
    c(225000), c(450000), c(105000), "De 6 meses a 1 año: 15 días × (₡450 000 ÷ 30 = ₡15 000) = ₡225 000.", "Con 8 meses corresponde el tramo de 15 días.", **P)
sel(PC, "Luis (₡450 000 al mes, 8 meses laborados, despido con responsabilidad patronal). Con más de 6 meses y menos de un año corresponden 14 días de cesantía. ¿Cuánto recibe?",
    c(210000), c(225000), c(105000), "14 días × ₡15 000 = ₡210 000.", "Use 14 días y el salario diario de ₡15 000.", **P)
sel(PC, "Sofía trabajó 4 años con un salario promedio de ₡600 000 y la despiden con responsabilidad patronal. Con 4 años corresponden 21 días por año. ¿Cuál es su cesantía?",
    c(1680000), c(1260000), c(2520000), "Salario diario ₡20 000 × 21 días × 4 años = ₡1 680 000.", "Calcule el diario (÷ 30) y multiplique por 21 × 4.", **P)
sel(PC, "Carlos trabajó 10 años con un salario promedio de ₡450 000. Con 10 años corresponden 21,5 días por año, con el tope de 8 años. ¿Cuál es su cesantía?",
    c(2580000), c(3225000), c(2475000), "21,5 días × 8 años (tope) = 172 días × ₡15 000 = ₡2 580 000.", "Recuerde que solo se pagan 8 años como máximo.", **P)
sel(VA, "María gana un salario fijo de ₡420 000 y trabajó del 1 de diciembre al 30 de noviembre completos. ¿Cuánto recibe de aguinaldo?",
    c(420000), c(35000), c(5040000), "Aguinaldo = (₡420 000 × 12) ÷ 12 = ₡420 000.", "Sume lo devengado en el período y divídalo entre 12.", **P)
sel(VA, "Pedro ganó ₡480 000 mensuales durante 5 meses desde el 1 de diciembre y luego renunció. ¿Cuánto le corresponde de aguinaldo proporcional?",
    c(200000), c(480000), c(240000), "(₡480 000 × 5) ÷ 12 = ₡2 400 000 ÷ 12 = ₡200 000.", "Sume los 5 meses y divida entre 12, no entre 5.", **P)
sel(VA, "Desde el 1 de diciembre Karla devengó en total ₡5 400 000, incluidas horas extra y comisiones. ¿Cuál es su aguinaldo?",
    c(450000), c(540000), c(5400000), "Ley 2412: total devengado ÷ 12 = ₡5 400 000 ÷ 12 = ₡450 000.", "El aguinaldo es la doceava parte de todo lo devengado.", **P)
sel(VA, "Jorge gana ₡450 000 al mes, laboró 6 meses del período de vacaciones y no las ha disfrutado. Al renunciar, ¿cuánto le pagan de vacaciones proporcionales?",
    c(90000), c(225000), c(180000), "1 día por mes: 6 días × ₡15 000 = ₡90 000.", "Cuente un día de vacaciones por cada mes laborado.", **P)
sel(JO, "Rosa trabaja jornada diurna de 8 horas con un salario de ₡480 000 al mes. Su hora ordinaria vale ₡2 000. ¿Cuánto se le paga por 10 horas extra?",
    c(30000), c(20000), c(40000), "Hora extra = ₡2 000 × 1,5 = ₡3 000; 10 horas × ₡3 000 = ₡30 000.", "Cada hora extra vale tiempo y medio.", **P)
sel(JO, "Un guarda trabaja en jornada nocturna y un día laboró 8 horas. ¿Cuántas horas extra trabajó ese día?",
    "2 horas", "1 hora", "No trabajó horas extra", "La jornada nocturna ordinaria es de 6 horas diarias: 8 − 6 = 2 horas extra.", "Compare con el máximo de la jornada nocturna.", **P)
sel(PL, "Daniela tiene un salario bruto de ₡650 000. ¿Cuánto se le rebaja por cargas obreras (10,83 %)?",
    c(70395), c(174395), c(65000), "₡650 000 × 10,83 % = ₡70 395.", "Multiplique el salario bruto por 10,83 %.", **P)
sel(PL, "¿Cuál es el salario neto de Daniela (₡650 000 brutos)? No paga impuesto sobre la renta.",
    c(579605), c(650000), c(475605), "₡650 000 − ₡70 395 = ₡579 605 (no supera ₡918 000).", "Neto = bruto − cargas obreras − renta.", **P)
sel(PL, "Andrés gana ₡1 100 000 brutos al mes, sin hijos ni cónyuge. ¿Cuánto se le retiene de impuesto sobre la renta?",
    c(18200), c(110000), c(27300), "(₡1 100 000 − ₡918 000) × 10 % = ₡18 200.", "El 10 % se aplica solo sobre el exceso de ₡918 000.", **P)
sel(PL, "Valeria gana ₡1 500 000 brutos al mes, sin hijos ni cónyuge. ¿Cuánto se le retiene de impuesto sobre la renta?",
    c(65850), c(87300), c(150000), "Tramo 10 %: (₡1 347 000 − ₡918 000) × 10 % = ₡42 900. Tramo 15 %: (₡1 500 000 − ₡1 347 000) × 15 % = ₡22 950. Total ₡65 850.", "Calcule cada tramo por separado y súmelos.", **P)
sel(PL, "Andrés (₡1 100 000 brutos, renta de ₡18 200) tiene 2 hijos. El crédito fiscal es de ₡1 710 por hijo. ¿Cuánto paga de renta?",
    c(14780), c(16490), c(18200), "₡18 200 − (2 × ₡1 710 = ₡3 420) = ₡14 780.", "Reste los créditos fiscales al impuesto calculado.", **P)
sel(PL, "¿Cuál es el salario neto de un colaborador con ₡1 200 000 brutos, sin hijos ni cónyuge?",
    c(1041840), c(1070040), c(1171800), "Cargas obreras ₡129 960; renta (₡1 200 000 − ₡918 000) × 10 % = ₡28 200. Neto = ₡1 200 000 − ₡129 960 − ₡28 200 = ₡1 041 840.", "Reste tanto las cargas obreras como la renta.", **P)
sel(PL, "¿Cuánto paga el patrono por cargas sociales (26,83 %) sobre un salario de ₡700 000?",
    c(187810), c(75810), c(263620), "₡700 000 × 26,83 % = ₡187 810.", "Use el porcentaje patronal, no el obrero.", **P)
assert len(R) == 35 and sum(1 for r in R if "conceptos" in r["parte"]) == 15

# ───────── Resolución de problemas ─────────
R.append({"tipo_pregunta": "resolucion_problemas", "parte": "Parte III. Resolución de problemas", "tema": PL, "puntos": 10,
  "herramienta_requerida": AC,
  "accion_en_herramienta": "1) Abra Aula de Conta y cree (o abra) la empresa «Ferretería El Roble S.A.». 2) En 🧾 Planilla agregue a Daniela Mora (salario bruto ₡750 000) y a Andrés Solís (salario bruto ₡1 200 000, sin hijos ni cónyuge). 3) Llene el machote: cargas obreras, renta, salario neto y cargas patronales de cada uno. 4) Registre el asiento de la planilla y verifique que cuadre. 5) Anote aquí los resultados y el asiento.",
  "enunciado": "Ferretería El Roble S.A. prepara la planilla del mes. Con los datos que se le brindan, resuelva en Aula de Conta y anote aquí:\na) Para Daniela (₡750 000) y Andrés (₡1 200 000): cargas obreras (10,83 %), impuesto sobre la renta, salario neto y cargas patronales (26,83 %).\nb) El asiento de diario de la planilla con las cuentas 6101 Salarios, 6102 Cargas sociales, 2107 CCSS por pagar, 2108 Banco Popular por pagar, 2109 FCL por pagar, 2110 Retención de renta sobre salarios por pagar y 2104 Salarios y cargas sociales por pagar.",
  "opciones_o_valor_esperado": [],
  "respuesta_correcta": "a) Daniela: cargas obreras ₡81 225; renta ₡0; neto ₡668 775; patronales ₡201 225. Andrés: cargas obreras ₡129 960; renta ₡28 200; neto ₡1 041 840; patronales ₡321 960.\nb) Debe: 6101 Salarios ₡1 950 000 · 6102 Cargas sociales ₡523 185. Haber: 2107 CCSS por pagar ₡675 870 (obrera SEM+IVM 9,83 % ₡191 685 + patronal 24,83 % ₡484 185) · 2108 Banco Popular por pagar ₡29 250 (1 % obrero ₡19 500 + 0,50 % patronal ₡9 750) · 2109 FCL por pagar ₡29 250 · 2110 Retención de renta por pagar ₡28 200 · 2104 Salarios por pagar ₡1 710 615. Totales: ₡2 473 185 = ₡2 473 185.",
  "escala_calificacion": "Calcula correctamente las cargas obreras de las dos personas (2 pts)\nCalcula correctamente el impuesto sobre la renta (2 pts)\nCalcula correctamente los salarios netos (2 pts)\nCalcula correctamente las cargas patronales (2 pts)\nRegistra el asiento de la planilla con las cuentas correctas y cuadrado (2 pts)",
  "justificacion_pedagogica": "La planilla genera gastos (salarios y cargas patronales) y pasivos laborales (CCSS, Banco Popular, FCL, renta retenida y salarios netos por pagar).",
  "feedback_exito": "¡Planilla impecable! 📒", "feedback_error": "Revise el machote en Aula de Conta: obrero 10,83 %, patronal 26,83 % y renta solo sobre el exceso de ₡918 000."})
R.append({"tipo_pregunta": "resolucion_problemas", "parte": "Parte III. Resolución de problemas", "tema": LQ, "puntos": 10,
  "herramienta_requerida": LIQ,
  "accion_en_herramienta": "1) Abra Liquidaciones laborales → ＋ Caso propio. 2) Tiempo laborado: «Años, meses y días» = 5 años, 3 meses, 0 días; meses desde el 1 de diciembre: 10. 3) Motivo: despido con responsabilidad patronal; preaviso: no se dio. 4) Salario mensual fijo: ₡570 000; vacaciones disfrutadas del período: 0. 5) Revise cada pestaña y anote aquí los resultados.",
  "enunciado": "Jorge Rojas trabajó 5 años y 3 meses en un taller con un salario mensual fijo de ₡570 000. Lo despidieron con responsabilidad patronal y sin preaviso. Tiene 3 meses de vacaciones del período actual sin disfrutar y lleva 10 meses desde el 1 de diciembre. Con 5 años corresponden 21,24 días de cesantía por año. Resuelva en Liquidaciones laborales y anote: salario diario, preaviso, cesantía, vacaciones, aguinaldo y total de la liquidación.",
  "opciones_o_valor_esperado": [],
  "respuesta_correcta": "Salario diario ₡19 000 (₡570 000 ÷ 30). Preaviso ₡570 000 (1 mes). Cesantía ₡2 017 800 (21,24 × 5 = 106,2 días × ₡19 000; la fracción de 3 meses no cuenta). Vacaciones ₡57 000 (3 días × ₡19 000). Aguinaldo ₡475 000 (₡570 000 × 10 ÷ 12). Total ₡3 119 800.",
  "escala_calificacion": "Calcula el salario diario (1 pt)\nCalcula el preaviso (2 pts)\nCalcula la cesantía (3 pts)\nCalcula las vacaciones proporcionales (2 pts)\nCalcula el aguinaldo proporcional (1 pt)\nObtiene el total de la liquidación (1 pt)",
  "justificacion_pedagogica": "Código de Trabajo arts. 28, 29, 30, 153 y 156 y Ley 2412: la liquidación suma preaviso, cesantía, vacaciones y aguinaldo.",
  "feedback_exito": "¡Liquidación completa! 🎉", "feedback_error": "Revise en la app cada pestaña: la cesantía usa 21,24 días por año y la fracción de 6 meses o menos no cuenta."})

ex = {"examen": {"titulo": "Prueba escrita: legislación laboral, planillas y liquidaciones · 10-1", "seccion": "10-1", "materia_id": 1, "peso": 20, "duracion": 120,
  "instrucciones": "• Lea con atención toda la prueba antes de comenzar; el tiempo de lectura no se cuenta.\n• Trabaje en forma individual. Sus respuestas se guardan solas y la prueba se entrega una sola vez con el botón «Entregar examen».\n• La prueba tiene 55 puntos y vale 20 % de la nota del período.\n• En la Parte III use Aula de Conta y Liquidaciones laborales con el botón «↗ Abrir» y anote aquí los resultados.\n• No salga de la pantalla salvo para usar las aplicaciones indicadas. ¡Éxitos!"},
  "reactivos": [{**r, "id_pregunta": i + 1} for i, r in enumerate(R)]}
json.dump(ex, open("examen-10-1-marque-x-y-problemas.json", "w"), ensure_ascii=False, indent=1)
print(len(R), sum(r["puntos"] for r in R))
