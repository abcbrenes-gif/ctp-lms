// Cálculo de la planilla copiado de Aula de Conta (aula-contable.html), para usar
// los mismos parámetros, columnas del machote y asiento en otros módulos (Exámenes).
// Si se cambia el cálculo en Aula de Conta, actualizar también este archivo.
(function(){
const r2=n=>Math.round((+n||0)*100)/100;
const PL_DEFAULT={
  version:"Costa Rica 2026",
  obrero:[
    {id:"sem_o",nombre:"SEM · Seguro de Enfermedad y Maternidad",pct:5.50,cuenta:"2107",ley:"Reglamento del Seguro de Salud, CCSS",activa:true},
    {id:"ivm_o",nombre:"IVM · Invalidez, Vejez y Muerte",pct:4.33,cuenta:"2107",ley:"Reglamento del Seguro IVM, CCSS",activa:true},
    {id:"bp_o",nombre:"Banco Popular · aporte del trabajador",pct:1.00,cuenta:"2108",ley:"Ley Orgánica del Banco Popular 4351",activa:true}
  ],
  patronal:[
    {id:"sem_p",nombre:"SEM · Enfermedad y Maternidad (patronal)",pct:9.25,cuenta:"2107",ley:"CCSS",activa:true},
    {id:"ivm_p",nombre:"IVM · Invalidez, Vejez y Muerte (patronal)",pct:5.58,cuenta:"2107",ley:"CCSS",activa:true},
    {id:"af",nombre:"Asignaciones Familiares (FODESAF)",pct:5.00,cuenta:"2107",ley:"Ley 5662",activa:true},
    {id:"imas",nombre:"IMAS",pct:0.50,cuenta:"2107",ley:"Ley 4760",activa:true},
    {id:"ina",nombre:"INA",pct:1.50,cuenta:"2107",ley:"Ley 6868",activa:true},
    {id:"bp_p",nombre:"Banco Popular · cuota patronal",pct:0.25,cuenta:"2108",ley:"Ley 4351",activa:true},
    {id:"bp_lpt",nombre:"Aporte patrono Banco Popular (LPT)",pct:0.25,cuenta:"2108",ley:"Ley de Protección al Trabajador 7983",activa:true},
    {id:"fcl",nombre:"FCL · Fondo de Capitalización Laboral",pct:1.50,cuenta:"2109",ley:"Ley 7983, art. 3",activa:true},
    {id:"opc",nombre:"OPC · Pensión Complementaria",pct:2.00,cuenta:"2107",ley:"Ley 7983, art. 13",activa:true},
    {id:"ins_lpt",nombre:"INS (Ley de Protección al Trabajador)",pct:1.00,cuenta:"2107",ley:"Ley 7983",activa:true}
  ],
  prov:[
    {id:"aguinaldo",nombre:"Aguinaldo (1/12)",pct:8.33,gasto:"6108",pasivo:"2111",ley:"Ley 2412",activa:true},
    {id:"vacaciones",nombre:"Vacaciones (2 semanas por 50)",pct:4.17,gasto:"6109",pasivo:"2112",ley:"Código de Trabajo, art. 153",activa:true},
    {id:"cesantia",nombre:"Cesantía",pct:5.33,gasto:"6110",pasivo:"2113",ley:"Código de Trabajo, art. 29",activa:false}
  ],
  renta:{tramos:[{hasta:918000,pct:0},{hasta:1347000,pct:10},{hasta:2364000,pct:15},{hasta:4727000,pct:20},{hasta:null,pct:25}],hijo:1710,conyuge:2590},
  jornada:{dias:30,horas:8,factorExtra:1.5},
  jornadas:[
    {id:"diurna",nombre:"Diurna",horas:8,semana:48,horario:"Entre 5:00 a. m. y 7:00 p. m.",ley:"Código de Trabajo, art. 136"},
    {id:"mixta",nombre:"Mixta",horas:7,semana:42,horario:"Combina horas diurnas y nocturnas (máx. 3,5 h nocturnas)",ley:"Código de Trabajo, art. 138"},
    {id:"nocturna",nombre:"Nocturna",horas:6,semana:36,horario:"Entre 7:00 p. m. y 5:00 a. m.",ley:"Código de Trabajo, art. 138"}],
  pagos:[{id:"mensual",nombre:"Mensual",divisor:1},{id:"quincenal",nombre:"Quincenal",divisor:2}],
  rebajos:[
    {id:"asoc",nombre:"Asociación solidarista (aporte del trabajador)",modo:"pct",valor:5,cuenta:"2114",ley:"Ley de Asociaciones Solidaristas 6970",activa:true},
    {id:"ahorro",nombre:"Ahorro voluntario",modo:"monto",valor:10000,cuenta:"2115",ley:"Autorización escrita del trabajador",activa:true}]
};

const PL_ACCOUNTS=[
  ["1102","Bancos","A","C","D","NIC 7"],
  ["2104","Salarios y cargas sociales por pagar","P","C","A","NIC 19"],
  ["2107","CCSS por pagar","P","C","A","NIC 19"],["2108","Banco Popular por pagar","P","C","A","Ley 7983"],
  ["2109","FCL por pagar","P","C","A","Ley 7983"],["2110","Retención de renta sobre salarios por pagar","P","C","A","Ley 7092"],
  ["2111","Provisión para aguinaldo","P","C","A","NIC 19"],["2112","Provisión para vacaciones","P","C","A","NIC 19"],["2113","Provisión para cesantía","P","C","A","NIC 37"],
  ["2114","Asociación solidarista por pagar","P","C","A","Ley 6970"],["2115","Ahorros de colaboradores por pagar","P","C","A","NIC 19"],
  ["6101","Salarios","G","OP","D","NIC 19"],["6102","Cargas sociales","G","OP","D","NIC 19"],
  ["6108","Gasto por aguinaldo","G","OP","D","NIC 19"],["6109","Gasto por vacaciones","G","OP","D","NIC 19"],["6110","Gasto por cesantía","G","OP","D","NIC 19"]
].map(([code,name,type,cls,nature,niif])=>({code,name,type,cls,nature,niif}));
function plSampleEmployees(){return [
  {id:uid(),nombre:"Ana Lucía Vargas Mora",cedula:"1-1234-0567",puesto:"Contadora",base:1150000,horasExtra:4,comisiones:0,diasAusencia:0,horasTarde:0,hijos:1,conyuge:true,jornada:"diurna",tipoPago:"mensual",rebajos:{ahorro:{on:true,valor:25000}}},
  {id:uid(),nombre:"Carlos Andrés Solís Rojas",cedula:"2-0456-0789",puesto:"Vendedor",base:520000,horasExtra:6,comisiones:85000,diasAusencia:0,horasTarde:0,hijos:0,conyuge:false,jornada:"diurna",tipoPago:"mensual",rebajos:{asoc:{on:true,valor:5}}},
  {id:uid(),nombre:"María José Quesada Chaves",cedula:"1-1789-0234",puesto:"Encargada de bodega",base:410000,horasExtra:0,comisiones:0,diasAusencia:1,horasTarde:2,hijos:2,conyuge:false,jornada:"mixta",tipoPago:"mensual",rebajos:{asoc:{on:true,valor:5}}},
  {id:uid(),nombre:"Luis Fernando Arias Méndez",cedula:"3-0512-0876",puesto:"Oficial de seguridad",base:480000,horasExtra:3,comisiones:0,diasAusencia:0,horasTarde:0,hijos:1,conyuge:true,jornada:"nocturna",tipoPago:"quincenal",rebajos:{}}
]}
// Catálogo "de piezas" para armar prácticas completas de un clic: nombres
// y puestos se sortean y los datos numéricos de cada colaborador (salario,
// horas extra, comisiones, ausencias, tardías, hijos, rebajos...) se
// generan al azar dentro de rangos según el nivel. Así ninguna práctica
// generada queda igual a otra, aunque la cantidad de colaboradores sea
// la misma — ni entre niveles ni dentro del mismo nivel.
const NOMBRES_PRACTICA=[
  "Ana Lucía Vargas Mora","Carlos Andrés Solís Rojas","María José Quesada Chaves","Luis Fernando Arias Méndez",
  "Paola Andrea Jiménez Castro","Esteban Rojas Fallas","Gabriela Mora Alvarado","Jonathan Vindas Pérez",
  "Katherine Salas Brenes","Diego Alonso Ureña Zamora","Fiorella Campos Barboza","Marvin Gerardo Obando Chacón",
  "Melissa Fernández Ugalde","Randall Josué Chinchilla Soto","Ivannia Castro Monge","Kevin Alberto Gómez Araya",
  "Yesenia Patricia Mata León","Allan Steven Rodríguez Guzmán","Natalia Beatriz Loría Sandí","Josué David Cordero Hidalgo",
  "Grettel Mariana Vásquez Núñez","Harold Andrés Picado Zúñiga","Silvia Elena Barrantes Rivas","Kenneth Gerald Montero Bolaños"
];

const plAct=l=>(l||[]).filter(x=>x.activa!==false);
function plCalc(e,P){
  const J=P.jornada,base0=r2(+e.base||0);
  const jor=(P.jornadas||[]).find(j=>j.id===(e.jornada||"diurna"))||(P.jornadas||[])[0]||{id:"diurna",nombre:"Diurna",horas:J.horas||8};
  const pg=(P.pagos||[]).find(x=>x.id===(e.tipoPago||"mensual"))||(P.pagos||[])[0]||{id:"mensual",nombre:"Mensual",divisor:1};
  const div=+pg.divisor||1,horas=+jor.horas||8;
  const base=r2(base0/div);
  const vDia=r2(base0/J.dias),vHora=r2(base0/J.dias/horas);
  const he=+e.horasExtra||0,extra=r2(he*vHora*J.factorExtra);
  const comis=r2(+e.comisiones||0);
  const ausen=r2((+e.diasAusencia||0)*vDia),tarde=r2((+e.horasTarde||0)*vHora);
  const bruto=r2(base+extra+comis-ausen-tarde);
  const obrero=plAct(P.obrero).map(x=>({id:x.id,nombre:x.nombre,pct:+x.pct,cuenta:x.cuenta,monto:r2(bruto*x.pct/100)}));
  const totObr=r2(obrero.reduce((s,x)=>s+x.monto,0));
  let prev=0,rb=0;const tramos=[];
  for(const t of P.renta.tramos){
    const lim=(t.hasta===null||t.hasta===""||t.hasta===undefined)?Infinity:+t.hasta/div;
    const b=Math.max(0,Math.min(bruto,lim)-prev),imp=r2(b*(+t.pct)/100);
    tramos.push({desde:prev,hasta:lim,pct:+t.pct,base:r2(b),imp});rb+=imp;prev=lim;if(bruto<=lim)break;
  }
  const rentaBruta=r2(rb);
  const creditos=r2(((+e.hijos||0)*P.renta.hijo+(e.conyuge?P.renta.conyuge:0))/div);
  const credAplic=Math.min(creditos,rentaBruta);
  const renta=r2(rentaBruta-credAplic);
  const rebajos=plAct(P.rebajos).filter(r=>e.rebajos?.[r.id]?.on).map(r=>{const val=+(e.rebajos[r.id].valor??r.valor)||0;
    return {id:r.id,nombre:r.nombre,modo:r.modo,valor:val,cuenta:r.cuenta,monto:r.modo==="pct"?r2(bruto*val/100):r2(val)}});
  const totReb=r2(rebajos.reduce((s,x)=>s+x.monto,0));
  const totDed=r2(totObr+renta+totReb),neto=r2(bruto-totDed);
  const patronal=plAct(P.patronal).map(x=>({id:x.id,nombre:x.nombre,pct:+x.pct,cuenta:x.cuenta,monto:r2(bruto*x.pct/100)}));
  const totPat=r2(patronal.reduce((s,x)=>s+x.monto,0));
  const prov=plAct(P.prov).map(x=>({id:x.id,nombre:x.nombre,pct:+x.pct,gasto:x.gasto,pasivo:x.pasivo,monto:r2(bruto*x.pct/100)}));
  const totProv=r2(prov.reduce((s,x)=>s+x.monto,0));
  return {base0,base,div,jor:{id:jor.id,nombre:jor.nombre,horas},pago:{id:pg.id,nombre:pg.nombre,divisor:div},vDia,vHora,he,extra,comis,dias:+e.diasAusencia||0,ausen,ht:+e.horasTarde||0,tarde,bruto,obrero,totObr,tramos,rentaBruta,creditos,credAplic,renta,rebajos,totReb,totDed,neto,patronal,totPat,prov,totProv,costo:r2(bruto+totPat+totProv),J};
}

function plSol(k,key){if(key==="extcom")return r2((k.extra||0)+(k.comis||0));if(key==="rebaus")return r2((k.ausen||0)+(k.tarde||0));if(key.startsWith("o:"))return k.obrero.find(x=>x.id===key.slice(2))?.monto??0;if(key.startsWith("r:"))return (k.rebajos||[]).find(x=>x.id===key.slice(2))?.monto??0;if(key==="reb")return k.totReb||0;return k[key]}
function plSheetFields(k,withReb,v2){return [...(v2?[["base","Salario base"],["extcom","Extras y comisiones"],["rebaus","Rebajos (ausencias y tardías)"]]:[]),["bruto","Salario bruto"],...k.obrero.map(x=>["o:"+x.id,x.nombre.split("·")[0].trim()+" "+pct(x.pct)]),["renta","Renta"],...(withReb?[["reb","Otros rebajos"]]:[]),["neto","Salario neto"]]}
function plEntryLines(run){
  const M=new Map();const add=(code,d,c)=>{const x=M.get(code)||{code,d:0,c:0};x.d+=d;x.c+=c;M.set(code,x)};
  for(const r of run.res){const k=r.calc;
    add("6101",k.bruto,0);if(k.totPat)add("6102",k.totPat,0);
    for(const x of k.prov){add(x.gasto,x.monto,0);add(x.pasivo,0,x.monto)}
    for(const x of k.obrero)add(x.cuenta,0,x.monto);
    for(const x of k.patronal)add(x.cuenta,0,x.monto);
    if(k.renta)add("2110",0,k.renta);
    for(const x of (k.rebajos||[]))add(x.cuenta,0,x.monto);
    add(run.pago||"1102",0,k.neto);
  }
  let lines=[...M.values()].map(x=>{const n=r2(x.d-x.c);return {code:x.code,d:n>0?n:0,c:n<0?-n:0}}).filter(l=>l.d||l.c);
  lines.sort((a,b)=>(b.d>0)-(a.d>0)||a.code.localeCompare(b.code,undefined,{numeric:true}));
  const D=r2(lines.reduce((s,l)=>s+l.d,0)),C=r2(lines.reduce((s,l)=>s+l.c,0));
  if(D!==C){const n=lines.find(l=>l.code===(run.pago||"1102"));if(n)n.c=r2(n.c+D-C)}
  return lines;
}

const NFp=new Intl.NumberFormat("es-CR",{minimumFractionDigits:2,maximumFractionDigits:2});
const money=n=>"₡ "+NFp.format(+n||0);
const pct=n=>new Intl.NumberFormat("es-CR",{minimumFractionDigits:2,maximumFractionDigits:2}).format(+n).replace(/,00$/,"")+" %";
const nombreCuenta=code=>{const a=PL_ACCOUNTS.find(x=>(Array.isArray(x)?x[0]:x.code)===code);return a?(Array.isArray(a)?a[1]:a.name):"Cuenta "+code};
const datos=(e,P)=>[`Base mensual ${money(e.base)}`,`jornada ${String(((P.jornadas||[]).find(j=>j.id===(e.jornada||"diurna"))||{nombre:"diurna"}).nombre).toLowerCase()}`,`pago ${String(((P.pagos||[]).find(x=>x.id===(e.tipoPago||"mensual"))||{nombre:"mensual"}).nombre).toLowerCase()}`,
  e.horasExtra?`${e.horasExtra} h extra`:"",e.comisiones?`comisiones ${money(e.comisiones)}`:"",e.diasAusencia?`${e.diasAusencia} día(s) de ausencia`:"",e.hijos?`${e.hijos} hijo(s)`:"",e.conyuge?"con cónyuge":""].filter(Boolean).join(" · ");
// Arma el machote (columnas, solución por colaborador) y el asiento, igual que Aula de Conta.
function plArmarMachote(empleados,opc){const P=JSON.parse(JSON.stringify(PL_DEFAULT));
  const E=(empleados||[]).map((e,i)=>({id:"e"+i,jornada:"diurna",tipoPago:"mensual",...e,base:+e.base||0,horasExtra:+e.horasExtra||0,comisiones:+e.comisiones||0,diasAusencia:+e.diasAusencia||0,hijos:+e.hijos||0,conyuge:!!e.conyuge}));
  if(!E.length)return {campos:[],emps:[],asiento:[]};
  const ks=E.map(e=>plCalc(e,P)),withReb=ks.some(k=>k.totReb>0),F=plSheetFields(ks[0],withReb,true);
  const lines=plEntryLines({res:ks.map(k=>({calc:k})),pago:(opc&&opc.pago)||"1102"});
  return {campos:F,emps:E.map((e,i)=>({nombre:e.nombre||("Colaborador "+(i+1)),datos:datos(e,P),sol:Object.fromEntries(F.map(([q])=>[q,plSol(ks[i],q)]))})),
    asiento:lines.map(l=>({code:l.code,name:nombreCuenta(l.code),d:l.d,c:l.c}))};
}
window.plArmarMachote=plArmarMachote;window.PL_PARAMETROS=PL_DEFAULT;
})();
