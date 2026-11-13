/* Ciudad Contable · catálogos de productos y servicios (40 por empresa).
   Formato de cada renglón: «#Categoría» o «detalle|precio|costo|tarifa».
   · precio y costo en colones; el costo solo lo tienen las comerciales (inventario perpetuo).
   · tarifa: se omite = 13 % de IVA; 0 = exento (en este caso de práctica).
   Los códigos CABYS son de práctica (no son códigos reales). */
(function () {
  const T = {
    ferre: `#Herramientas
Martillo de uña 16 oz|6500|4200
Destornillador plano 6"|2200|1300
Destornillador de estrella 6"|2200|1300
Alicate universal 8"|4800|3000
Llave ajustable 10"|7900|5100
Cinta métrica 5 m|3500|2100
Serrucho 20"|8900|5800
Nivel de burbuja 24"|6200|3900
Juego de llaves Allen|4300|2600
Taladro eléctrico 1/2"|38900|26000
#Fijación
Caja de tornillos 1" (100 u)|3200|1900
Caja de clavos 2" (1 kg)|2100|1300
Tacos plásticos 1/4" (50 u)|1500|850
Pegamento de contacto 1/4 gal|5600|3600
Cinta aislante|900|500
Silicón transparente|3400|2100
#Construcción
Saco de cemento 50 kg|7800|6100
Varilla de construcción #3|3900|2900
Block de concreto 15 cm|650|430
Arena (saco de 40 kg)|2600|1700
Piedra cuarta (saco)|2800|1800
Malla electrosoldada|18500|13200
Lámina de zinc 3 m|12900|9200
#Electricidad
Bombillo LED 9 W|1200|700
Tomacorriente doble|1900|1100
Apagador sencillo|1500|850
Cable eléctrico #12 (metro)|650|400
Extensión eléctrica 5 m|4900|3100
Breaker 20 A|5400|3600
#Fontanería
Tubo PVC 1/2" (6 m)|3900|2600
Codo PVC 1/2"|250|140
Llave de chorro 1/2"|3700|2300
Cinta teflón|450|250
Pegamento PVC 1/8 gal|3100|2000
#Pintura
Pintura látex blanca (galón)|14900|10200
Brocha 3"|1900|1100
Rodillo 9"|3600|2200
Thinner (litro)|2700|1700
#Jardín
Manguera 15 m|9800|6500
Pala de punta|8900|6000`,
    super: `#Abarrotes
Arroz 2 kg|2300|1700|0
Frijoles negros 1 kg|1650|1200|0
Azúcar 2 kg|1900|1400|0
Aceite vegetal 1 L|2400|1750
Sal 1 kg|450|300|0
Café molido 500 g|3600|2600|0
Pasta spaghetti 400 g|850|580
Atún en lata 140 g|1350|950
Harina 1 kg|950|680
Avena 400 g|1250|870
#Lácteos y huevos
Leche 1 litro|1050|800|0
Queso blanco 500 g|3200|2300
Mantequilla 250 g|1800|1250
Yogur 1 L|1900|1300
Huevos (cartón de 15)|3100|2300|0
Natilla 250 g|1150|800
#Bebidas
Refresco 2,5 litros|1800|1150
Agua embotellada 600 ml|600|350
Jugo de naranja 1 L|1700|1150
Bebida energética|1300|850
#Limpieza
Jabón en polvo 1 kg|2900|2000
Cloro 1 galón|2200|1450
Lavaplatos líquido 500 ml|1300|850
Desinfectante 1 L|1600|1050
Escoba|2800|1800
Bolsas de basura (10 u)|1200|750
#Higiene personal
Papel higiénico (4 rollos)|1900|1300
Pasta dental 100 ml|1450|950
Jabón de baño|650|400
Champú 400 ml|2900|1950
Desodorante|2400|1600
#Frutas y verduras
Banano (kg)|700|450|0
Tomate (kg)|1300|850|0
Papa (kg)|900|600|0
Cebolla (kg)|1100|700|0
Plátano maduro (unidad)|300|180|0
#Panadería y snacks
Pan cuadrado|1450|1000
Galletas surtidas|1100|720
Papas tostadas 150 g|1350|880
Chocolate en barra|900|560`,
    libre: `#Papel
Resma de papel carta|3900|2700
Resma de papel oficio|4300|3000
Block de dibujo|1600|1000
Papel construcción (10 hojas)|900|550
Cartulina|350|200
Papel periódico (pliego)|150|80
#Cuadernos y archivo
Cuaderno 100 hojas|1200|750
Cuaderno 200 hojas|1900|1250
Cuaderno de dibujo|1400|900
Libreta de apuntes|800|480
Folder manila (10 u)|1100|700
Carpeta de argollas|2900|1900
#Escritura
Caja de lapiceros (12 u)|2400|1500
Lápiz de grafito|200|110
Borrador|250|130
Tajador|300|160
Marcador permanente|700|420
Resaltador|650|380
Corrector líquido|900|550
#Arte
Caja de lápices de color (12)|1900|1200
Témperas (6 colores)|2300|1500
Pinceles (juego)|1600|1000
Plasticina|1100|700
Goma blanca 250 ml|1200|750
Silicón líquido|1400|900
#Oficina
Calculadora básica|3900|2600
Calculadora científica|11900|8200
Engrapadora|4200|2700
Grapas (caja)|700|420
Perforadora|3800|2500
Clips (caja)|500|290
Cinta adhesiva|600|350
Tijeras|1500|950
Regla 30 cm|450|260
Mochila escolar|14900|9800
#Libros
Libro de texto de Contabilidad|12000|8000|0
Diccionario escolar|8500|5800|0
Libro de lectura|7500|5000|0
Atlas escolar|9900|6800|0
Libro de matemática|11000|7500|0`,
    conta: `#Contabilidad
Servicio de contabilidad mensual|85000
Registro de libros contables (mes)|45000
Estados financieros anuales|150000
Conciliación bancaria|25000
Balanza de comprobación|20000
Toma de inventario físico (día)|60000
Cálculo de depreciación de activos|30000
Cierre contable anual|120000
#Impuestos
Declaración de IVA|30000
Declaración del impuesto sobre la renta|90000
Inscripción en Hacienda|35000
Configuración de facturación electrónica|40000
Asesoría tributaria (hora)|25000
Cálculo de retenciones|20000
Declaración informativa|30000
Rectificación de declaración|35000
#Planillas
Planilla mensual (hasta 10 personas)|40000
Cálculo de aguinaldo|20000
Cálculo de liquidación laboral|25000
Planilla de la CCSS|25000
Reporte al INS|20000
Constancia salarial|8000
Cálculo de vacaciones|10000
#Asesoría
Asesoría financiera (hora)|30000
Presupuesto anual|80000
Flujo de caja proyectado|45000
Análisis de costos|60000
Plan de negocios|150000
Estudio de factibilidad|200000
Capacitación en contabilidad (hora)|25000
#Trámites
Certificación de ingresos (CPA)|50000
Personería jurídica|15000
Trámite de patente municipal|30000
Trámite de apertura de cuenta bancaria|15000
Trámite de registro de marca|60000
Constitución de sociedad|180000
#Auditoría
Auditoría interna (día)|90000
Revisión de control interno|70000
Auditoría de inventarios|80000
Arqueo de caja|15000`,
    mante: `#Electricidad
Mantenimiento eléctrico (visita)|45000
Instalación de tomacorriente|12000
Cambio de breaker|15000
Instalación de lámparas|18000
Revisión de tablero eléctrico|30000
Instalación de abanico de techo|20000
#Fontanería
Destaqueo de tuberías|25000
Reparación de fuga|20000
Instalación de lavatorio|35000
Cambio de llave de chorro|10000
Instalación de tanque de agua|60000
Limpieza de tanque de agua|30000
#Limpieza
Limpieza profunda de local (por día)|38000
Limpieza de oficina (mensual)|120000
Limpieza de alfombras (m²)|2500
Lavado a presión de fachada|45000
Limpieza de vidrios|25000
Desinfección de local|40000
Limpieza después de obra|70000
#Pintura
Pintura de local (por día)|60000
Pintura de fachada (m²)|4500
Pintura de rejas|35000
Impermeabilización de techo (m²)|8500
#Aire acondicionado
Mantenimiento de aire acondicionado|35000
Instalación de aire acondicionado|90000
Recarga de gas refrigerante|30000
#Carpintería
Reparación de puertas|22000
Instalación de cerraduras|15000
Reparación de muebles|25000
Instalación de estantes|30000
Instalación de cielorraso (m²)|9500
#Jardinería
Corta de zacate|15000
Poda de árboles|40000
Diseño de jardín|80000
Fumigación de plagas|35000
#Seguridad y otros
Instalación de cámaras (4)|180000
Mantenimiento de alarmas|30000
Revisión de extintores|20000
Instalación de rótulos|45000
Revisión de techos y canoas|30000`,
    trans: `#Fletes urbanos
Flete de mercadería (por viaje)|25000
Flete urbano pequeño (hasta 500 kg)|15000
Flete urbano mediano (hasta 1 t)|22000
Flete urbano grande (hasta 3 t)|35000
Mudanza local|60000
Entrega express (1 hora)|12000
Entrega el mismo día|8000
Mensajería de documentos|4000
#Fletes regionales
Flete a Heredia|30000
Flete a San José|38000
Flete a Alajuela|40000
Flete a Cartago|48000
Flete a Puntarenas|85000
Flete a Limón|95000
Flete a Guanacaste|110000
Flete a la Zona Sur|120000
Flete a San Carlos|75000
Flete a Turrialba|65000
#Carga especial
Flete de materiales de construcción|45000
Flete de cemento (por tonelada)|18000
Flete de varilla|30000
Flete refrigerado|70000
Flete de mercadería frágil|50000
Flete de maquinaria|90000
Flete de muebles|40000
Flete de equipo de cómputo|35000
Flete de productos químicos|80000
Flete de abarrotes|28000
#Servicios logísticos
Carga y descarga (por hora)|8000
Bodegaje (por día)|10000
Embalaje de mercadería|12000
Seguro de carga|9000
Rastreo satelital del envío|5000
Paletizado de carga|7000
Montacargas (por hora)|15000
Distribución a varias tiendas|55000
Recolección en el proveedor|20000
Devolución de mercadería|18000
Flete de retorno|15000
Peajes y combustible extra|6000`,
    equip: `#Cómputo
Computadora de escritorio|450000
Computadora portátil|520000
Monitor 24"|120000
Impresora multifuncional|160000
Impresora de recibos|95000
Lector de código de barras|45000
Disco duro externo 1 TB|48000
Router inalámbrico|38000
Proyector|280000
Tableta|210000
#Punto de venta
Caja registradora|180000
Datáfono|65000
Balanza digital|85000
Gaveta para efectivo|55000
Etiquetadora|40000
#Mobiliario
Escritorio de oficina|120000
Silla ergonómica|85000
Archivador metálico|110000
Estante metálico|75000
Mostrador de venta|240000
Mesa de reuniones|190000
Sillas de espera (juego)|140000
Vitrina exhibidora|260000
Caja fuerte|230000
#Equipo
Aire acondicionado 12 000 BTU|360000
Refrigerador comercial|650000
Congelador horizontal|480000
Fotocopiadora|900000
Planta eléctrica|1200000
Cámaras de seguridad (kit)|260000
Teléfono IP|45000
Herramienta eléctrica (kit)|220000
Hidrolavadora|190000
Escalera de aluminio|85000
Carretilla hidráulica|260000
#Vehículos
Motocicleta de reparto|1800000
Bicicleta de carga|350000
Carro compacto|9500000
Pick-up doble cabina|18500000
Camión liviano|24000000`,
    publi: `#Redes sociales
Campaña en redes sociales (mes)|70000
Manejo de Facebook (mes)|45000
Manejo de Instagram (mes)|45000
Anuncios pagados (semana)|25000
Video corto para redes|35000
Sesión de fotos de productos|60000
Concurso en redes|30000
Transmisión en vivo|40000
#Diseño
Diseño de logotipo|80000
Manual de marca|150000
Diseño de volante|15000
Diseño de afiche|20000
Diseño de tarjeta de presentación|10000
Diseño de menú o catálogo|45000
Diseño de empaque|90000
Diseño de rótulo|35000
#Impresión
Volantes (1000 u)|38000
Tarjetas de presentación (500 u)|18000
Afiches A3 (50 u)|30000
Banner 2 × 1 m|28000
Rótulo luminoso|250000
Calcomanías (100 u)|22000
Catálogo impreso (100 u)|95000
Camisetas estampadas (10 u)|60000
#Medios
Anuncio en radio (semana)|80000
Perifoneo (día)|35000
Anuncio en periódico local|55000
Pantalla publicitaria (semana)|120000
Valla publicitaria (mes)|300000
Anuncio en el cine|90000
#Web y digital
Página web básica|250000
Tienda en línea|450000
Posicionamiento en buscadores (mes)|90000
Correo masivo (campaña)|40000
Registro en mapas digitales|15000
Código QR para la tienda|8000
#Eventos
Inflable publicitario (día)|60000
Degustación en tienda|50000
Activación en el parque|75000
Patrocinio de evento escolar|100000`
  };
  // clase contable de cada catálogo (de ella salen las cuentas del asiento)
  const CLASE = { ferre: "mercaderia", super: "mercaderia", libre: "mercaderia", conta: "servicio", mante: "servicio", trans: "flete", publi: "publicidad" };
  const PREF = { ferre: "4621", super: "2316", libre: "4649", conta: "8211", mante: "4321", trans: "4923", equip: "4651", publi: "7310" };
  function leer(id) {
    const out = []; let cat = "General", i = 0;
    T[id].split("\n").forEach(l => {
      l = l.trim(); if (!l) return;
      if (l[0] === "#") { cat = l.slice(1); return; }
      const [det, pr, co, ta] = l.split("|");
      i++;
      const p = { id: id[0] + i, det, cat, cabys: PREF[id] + String(i).padStart(9, "0"), tarifa: ta === "0" ? 0 : 13, precio: +pr, clase: CLASE[id] || "servicio" };
      if (co) { p.costo = +co; p.stock = 20 + ((i * 37) % 100); }
      if (p.tarifa === 0) p.exento = "Exento en este caso de práctica";
      if (id === "equip") p.clase = cat === "Vehículos" ? "activo_veh" : "activo_eq";
      out.push(p);
    });
    return out;
  }
  window.CIUDAD_CATALOGOS = {
    ferre: leer("ferre"), super: leer("super"), libre: leer("libre"), conta: leer("conta"), mante: leer("mante"),
    trans: leer("trans"), equip: leer("equip"), publi: leer("publi"),
    // El mayorista surte cada producto de las tres tiendas a su precio de costo
    mayo(empresas) {
      return ["ferre", "super", "libre"].flatMap(id => {
        const e = empresas.find(x => x.id === id);
        return e.prods.map(p => ({ id: "y-" + p.id, det: p.det + " (mayoreo)", cat: "Para " + e.nombre.replace(/ S\.A\.$/, ""), cabys: p.cabys, tarifa: p.tarifa, precio: p.costo, clase: "mercaderia", para: id, ref: p.id, exento: p.exento }));
      });
    }
  };
})();
