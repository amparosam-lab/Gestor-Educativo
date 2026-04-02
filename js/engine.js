/**
 * Gestor Educativo 4º Primaria - Motor v2
 * Genera ejercicios dinámicos resolviendo variables y calculando respuestas reales
 */

const AppState = {
  asignaturaActual: null,
  unidadActual: null,
  tipoActividadActual: null,
  dificultadActual: 'facil',
  ejerciciosGenerados: [],
  datosAsignaturas: {}
};

// ─── CARGA DE DATOS ──────────────────────────────────────────────────────────

async function cargarDatos() {
  const archivos = {
    matematicas:        'data/matematicas.json',
    lengua:             'data/lengua.json',
    conocimiento_medio: 'data/conocimiento_medio.json',
    ingles:             'data/ingles.json'
  };
  for (const [key, url] of Object.entries(archivos)) {
    try {
      const r = await fetch(url);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      AppState.datosAsignaturas[key] = await r.json();
    } catch (e) {
      console.error(`Error cargando ${key}:`, e);
    }
  }
}

// ─── GENERAR UN VALOR SEGÚN CONFIGURACIÓN ────────────────────────────────────

function generarValor(config, unidadData, valoresYa) {
  if (!config || !config.tipo) return '';

  switch (config.tipo) {

    case 'numero': {
      let min = config.min ?? 1;
      let max = config.max ?? 10;
      if (typeof max === 'string') max = valoresYa[max] ?? 10;
      if (typeof min === 'string') min = valoresYa[min] ?? 1;
      min = Number(min); max = Number(max);
      if (max < min) max = min + 1;
      if (config.multiplo) {
        const pasos = Math.floor((max - min) / config.multiplo);
        return min + Math.floor(Math.random() * (pasos + 1)) * config.multiplo;
      }
      return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    case 'lista': {
      const opts = config.opciones || [];
      if (opts.length === 0) return '';
      return opts[Math.floor(Math.random() * opts.length)];
    }

    case 'booleano':
      return Math.random() > 0.5;

    case 'vocabulario_unidad': {
      const vocab = unidadData?.vocabulario;
      if (!vocab || vocab.length === 0) return config.campo === 'ingles' ? 'word' : 'palabra';
      const item = vocab[Math.floor(Math.random() * vocab.length)];
      return item[config.campo] ?? item.ingles ?? 'word';
    }

    case 'lista_de_vocabulario': {
      const vocab = unidadData?.vocabulario;
      if (!vocab || vocab.length === 0) return 'palabra';
      const item = vocab[Math.floor(Math.random() * vocab.length)];
      return item[config.campo] ?? item.español ?? 'palabra';
    }

    default:
      return config.valor ?? '';
  }
}

// ─── GENERAR TODAS LAS VARIABLES DE UN TEMPLATE ──────────────────────────────

function generarVariables(templateVars, unidadData) {
  const vals = {};
  if (!templateVars) return vals;
  for (const [nombre, config] of Object.entries(templateVars)) {
    vals[nombre] = generarValor(config, unidadData, vals);
  }
  return vals;
}

// ─── RESOLVER ENUNCIADO ───────────────────────────────────────────────────────

function resolverEnunciado(enunciado, variables) {
  let texto = enunciado || '';
  for (const [k, v] of Object.entries(variables)) {
    texto = texto.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
  }
  return texto;
}

// ─── EVALUAR EXPRESIÓN MATEMÁTICA CON LAS VARIABLES ──────────────────────────

function evalExpr(expr, vars) {
  try {
    const nombres = Object.keys(vars);
    const valores = Object.values(vars);
    // eslint-disable-next-line no-new-func
    const fn = new Function(...nombres, `"use strict"; return (${expr});`);
    return fn(...valores);
  } catch (e) {
    return null;
  }
}

// ─── CALCULAR RESPUESTA CORRECTA ─────────────────────────────────────────────

function calcularRespuesta(template, vars) {
  const r = template.respuesta;

  // ── Campos derivados previos ──
  if (template.a_calculo)         vars.a         = evalExpr(template.a_calculo, vars)         ?? vars.a;
  if (template.resultado_calculo) vars.resultado  = evalExpr(template.resultado_calculo, vars) ?? 0;
  if (template.dividendo_calculo) vars.dividendo  = evalExpr(template.dividendo_calculo, vars) ?? 0;

  // ── respuesta_esperada con lista ──
  if (template.respuesta_esperada && Array.isArray(template.respuesta_esperada)) {
    for (const [key, cfg] of Object.entries(template.variables || {})) {
      if (cfg.tipo === 'lista' && cfg.opciones) {
        const idx = cfg.opciones.indexOf(vars[key]);
        if (idx !== -1 && template.respuesta_esperada[idx] !== undefined) {
          return String(template.respuesta_esperada[idx]);
        }
      }
    }
  }

  // ── Casos compuestos especiales ──
  if (r === 'cociente=floor(a/b), resto=a%b') {
    const c = Math.floor(vars.a / vars.b);
    const resto = vars.a % vars.b;
    return resto === 0 ? `Cociente: ${c} (división exacta)` : `Cociente: ${c}, Resto: ${resto}`;
  }
  if (r === 'cociente=floor(total/personas), resto=total%personas') {
    const c = Math.floor(vars.total / vars.personas);
    const s = vars.total % vars.personas;
    return `${c} a cada uno${s > 0 ? `, sobran ${s}` : ' (exacto)'}`;
  }
  if (r === 'grupos=floor(alumnos/grupo_size), sobran=alumnos%grupo_size') {
    const g = Math.floor(vars.alumnos / vars.grupo_size);
    const s = vars.alumnos % vars.grupo_size;
    return `${g} grupos completos${s > 0 ? `, sobran ${s}` : ''}`;
  }
  if (r === 'antecesor=n-1, sucesor=n+1') {
    return `Antecesor: ${vars.n - 1}, Sucesor: ${vars.n + 1}`;
  }

  // ── Comparaciones ──
  if (r === 'comparar(a, b)' || r === 'a > b') {
    return vars.a > vars.b ? '>' : vars.a < vars.b ? '<' : '=';
  }
  if (r === 'num1 > num2 ? > : <') {
    return vars.num1 > vars.num2 ? '>' : '<';
  }

  // ── Condicionales texto ──
  if (r === 'b >= a*1000') {
    return vars.b >= vars.a * 1000 ? 'Sí, hay suficiente' : 'No, no hay suficiente';
  }
  if (r === 'operacion == doble ? n*2 : n*3') {
    return String(vars.operacion === 'doble' ? vars.n * 2 : vars.n * 3);
  }
  if (r === 'a*100 > b ? a metros : b cm') {
    return vars.a * 100 > vars.b ? `${vars.a} metros` : `${vars.b} centímetros`;
  }

  // ── Fracciones ──
  if (r === 'num/den')         return `${vars.num}/${vars.den}`;
  if (r === 'presentes/total') return `${vars.presentes}/${vars.total}`;

  // ── Inglés: have got ──
  if (r === 'sujeto in [I,We,They] ? have got : has got') {
    const aux = ['I','We','They'].includes(vars.sujeto) ? 'have got' : 'has got';
    return `${vars.sujeto} ${aux} ${vars.objeto}`;
  }

  // ── Inglés: present continuous ──
  if (r === 'sujeto+am/is/are+verbo_ing') {
    const s = vars.sujeto || '';
    const v = vars.verbo_infinitivo || '';
    const aux = s === 'I' ? 'am'
              : (['She','He','It'].includes(s) || (!['I','We','You','They'].includes(s))) ? 'is'
              : 'are';
    let ing;
    if (v.endsWith('ie'))                            ing = v.slice(0,-2) + 'ying';
    else if (v.endsWith('e') && v.length > 2)        ing = v.slice(0,-1) + 'ing';
    else if (/[^aeiou][aeiou][^aeiouwy]$/.test(v))  ing = v + v.slice(-1) + 'ing';
    else                                              ing = v + 'ing';
    return `${s} ${aux} ${ing}`;
  }

  // ── Vocabulario inglés: buscar traducción ──
  const tiposVocab = ['traduccion_es_en','traduccion_en_es','vocab_comida_en_es',
                      'vocab_comida_es_en','vocab_animales','traduccion_lugar',
                      'vocab_vocab_familia','test_vocab_familia'];
  if (tiposVocab.includes(template.tipo) && AppState.unidadActual?.vocabulario) {
    const vocab = AppState.unidadActual.vocabulario;
    for (const val of Object.values(vars)) {
      const v = String(val);
      const entrada = vocab.find(item => item.español === v || item.ingles === v);
      if (entrada) {
        return entrada.español === v ? entrada.ingles : entrada.español;
      }
    }
  }

  // ── Respuestas de test con opciones fijas (texto plano sin operadores) ──
  if (template.opciones && r) {
    return r;
  }

  // ── Descomposición número ──
  if (r === 'descomponer(n)') {
    const n = vars.n;
    const um = Math.floor(n / 1000) * 1000;
    const c  = Math.floor((n % 1000) / 100) * 100;
    const d  = Math.floor((n % 100) / 10) * 10;
    const u  = n % 10;
    const partes = [um,c,d,u].filter(x => x > 0);
    return partes.join(' + ');
  }

  // ── Conversiones de unidades ──
  if (r === 'convertir(valor, par_conversion)') {
    const factores = { m_a_cm: 100, cm_a_mm: 10, km_a_m: 1000 };
    const factor = factores[vars.par_conversion] || 1;
    return String(vars.valor * factor);
  }

  // ── Intentar evaluar como expresión matemática pura ──
  if (r && /^[Math\d\s\+\-\*\/\%\(\)\.\,a-zA-Z_]+$/.test(r)) {
    const resultado = evalExpr(r, vars);
    if (resultado !== null && !isNaN(Number(resultado))) {
      const num = Number(resultado);
      return Number.isInteger(num) ? String(num) : String(Math.round(num * 100) / 100);
    }
  }

  // ── Texto fijo sin variables ──
  if (r && !r.includes('{') && !r.includes('(')) {
    return r;
  }

  return 'Ver corrección manual';
}

// ─── GENERAR LISTA DE EJERCICIOS ─────────────────────────────────────────────

function generarEjerciciosParaTipo(unidad, tipo, dificultad, cantidad = 10) {
  let pool = [];
  if      (tipo === 'ejercicios')  pool = unidad.ejercicios_templates  || [];
  else if (tipo === 'test')        pool = unidad.test_templates         || [];
  else if (tipo === 'actividades') pool = unidad.actividades_templates  || [];
  else if (tipo === 'fichas')      pool = unidad.fichas_templates        || [];

  let filtrados = pool.filter(t => !t.dificultad || t.dificultad === dificultad);
  if (filtrados.length === 0) filtrados = [...pool];
  if (filtrados.length === 0) return [];

  // Mezclamos para variedad
  const mezclado = [...filtrados].sort(() => Math.random() - 0.5);
  const resultado = [];

  for (let i = 0; i < cantidad; i++) {
    const template = mezclado[i % mezclado.length];

    // Variables y respuesta con copia fresca del template para no mutar el original
    const vars             = generarVariables(template.variables || {}, unidad);
    const enunciado        = resolverEnunciado(template.enunciado, vars);
    const respuestaCorrecta = calcularRespuesta(
      JSON.parse(JSON.stringify(template)),  // copia profunda
      { ...vars }
    );

    const esLibre = typeof respuestaCorrecta === 'string' &&
      (respuestaCorrecta.toLowerCase().includes('libre') ||
       respuestaCorrecta === 'Ver corrección manual');

    resultado.push({
      id:               `ej_${Date.now()}_${i}_${Math.random().toString(36).slice(2,6)}`,
      tipo:             template.tipo,
      enunciado,
      respuestaCorrecta: String(respuestaCorrecta),
      respuestaAlumno:  '',
      dificultad:       template.dificultad || dificultad,
      corregido:        false,
      esCorrecta:       null,
      esLibre
    });
  }
  return resultado;
}

// ─── CORRECCIÓN ───────────────────────────────────────────────────────────────

function normalizar(texto) {
  return String(texto)
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

function corregirEjercicios(ejercicios) {
  let aciertos = 0, fallos = 0, libres = 0;

  ejercicios.forEach(ej => {
    ej.corregido = true;
    if (ej.esLibre) { libres++; ej.esCorrecta = null; return; }

    const alumno   = normalizar(ej.respuestaAlumno);
    const correcta = normalizar(ej.respuestaCorrecta);

    const nA = parseFloat(alumno.replace(',', '.'));
    const nC = parseFloat(correcta.replace(',', '.'));

    if (!isNaN(nA) && !isNaN(nC)) {
      ej.esCorrecta = nA === nC;
    } else {
      const alternativas = correcta.split('/').map(s => s.trim());
      ej.esCorrecta = alternativas.some(alt =>
        alumno === alt || alumno.includes(alt) || alt.includes(alumno)
      );
    }
    ej.esCorrecta ? aciertos++ : fallos++;
  });

  const total = ejercicios.length - libres;
  const nota  = total > 0 ? Math.round((aciertos / total) * 10 * 10) / 10 : 0;
  return { aciertos, fallos, libres, total, nota };
}

// ─── API PÚBLICA ─────────────────────────────────────────────────────────────

window.AppEngine = {
  cargarDatos,
  generarEjerciciosParaTipo,
  corregirEjercicios,
  AppState
};
