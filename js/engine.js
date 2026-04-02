/**
 * NetAsesor Edu - Motor de Generación y Corrección
 * Genera ejercicios dinámicos a partir de templates JSON
 */

const AppState = {
  asignaturaActual: null,
  unidadActual: null,
  tipoActividadActual: null,
  dificultadActual: 'facil',
  ejerciciosGenerados: [],
  datosAsignaturas: {}
};

// ─── CARGA DE DATOS ─────────────────────────────────────────────────────────

async function cargarDatos() {
  const archivos = {
    matematicas: 'data/matematicas.json',
    lengua: 'data/lengua.json',
    conocimiento_medio: 'data/conocimiento_medio.json',
    ingles: 'data/ingles.json'
  };
  for (const [key, url] of Object.entries(archivos)) {
    try {
      const r = await fetch(url);
      AppState.datosAsignaturas[key] = await r.json();
    } catch (e) {
      console.error(`Error cargando ${key}:`, e);
    }
  }
}

// ─── GENERADOR DE VARIABLES ──────────────────────────────────────────────────

function generarVariables(templateVariables, unidadData) {
  const valores = {};
  for (const [nombre, config] of Object.entries(templateVariables)) {
    valores[nombre] = generarValor(config, unidadData, valores);
  }
  return valores;
}

function generarValor(config, unidadData, valoresExistentes) {
  switch (config.tipo) {
    case 'numero': {
      let min = config.min;
      let max = config.max;
      // max puede referenciar otra variable (e.g. "a")
      if (typeof max === 'string') max = valoresExistentes[max] || 10;
      if (typeof min === 'string') min = valoresExistentes[min] || 1;
      if (config.multiplo) {
        const pasos = Math.floor((max - min) / config.multiplo);
        return min + Math.floor(Math.random() * (pasos + 1)) * config.multiplo;
      }
      return Math.floor(Math.random() * (max - min + 1)) + min;
    }
    case 'lista': {
      const opts = config.opciones;
      return opts[Math.floor(Math.random() * opts.length)];
    }
    case 'booleano':
      return Math.random() > 0.5;
    case 'vocabulario_unidad': {
      if (unidadData && unidadData.vocabulario) {
        const item = unidadData.vocabulario[Math.floor(Math.random() * unidadData.vocabulario.length)];
        return item[config.campo] || item.ingles;
      }
      return 'word';
    }
    case 'lista_de_vocabulario': {
      if (unidadData && unidadData.vocabulario) {
        const item = unidadData.vocabulario[Math.floor(Math.random() * unidadData.vocabulario.length)];
        return item[config.campo] || item.español;
      }
      return 'palabra';
    }
    default:
      return config.valor || '';
  }
}

// ─── RESOLUCIÓN DE ENUNCIADO ──────────────────────────────────────────────────

function resolverEnunciado(template, variables) {
  let enunciado = template.enunciado;
  for (const [k, v] of Object.entries(variables)) {
    enunciado = enunciado.replace(new RegExp(`\\{${k}\\}`, 'g'), v);
  }
  return enunciado;
}

// ─── CÁLCULO DE RESPUESTA CORRECTA ───────────────────────────────────────────

function calcularRespuesta(template, variables) {
  const r = template.respuesta;
  const v = variables;

  // Cálculos previos de campos derivados
  if (template.a_calculo) {
    const expr = template.a_calculo;
    v.a = evaluarExpr(expr, v);
  }
  if (template.resultado_calculo) {
    v.resultado = evaluarExpr(template.resultado_calculo, v);
  }
  if (template.dividendo_calculo) {
    v.dividendo = evaluarExpr(template.dividendo_calculo, v);
  }

  // Casos especiales
  if (r === 'a + b') return v.a + v.b;
  if (r === 'a + b + c') return v.a + v.b + v.c;
  if (r === 'a - b') return v.a - v.b;
  if (r === 'a - b + c') return v.a - v.b + v.c;
  if (r === 'a - b - c') return v.a - v.b - v.c;
  if (r === 'a * b') return v.a * v.b;
  if (r === 'n * 100') return v.n * 100;
  if (r === 'a * 1000 + b') return v.a * 1000 + v.b;
  if (r === 'a * b (resultado)') return v.a * v.b;
  if (r === 'a / b') return v.a / v.b;
  if (r === 'b') return v.b;
  if (r === 'cociente') return Math.floor(v.a / v.b);
  if (r === 'a > b') return v.a > v.b ? '>' : (v.a < v.b ? '<' : '=');
  if (r === 'comparar(a, b)') return v.a > v.b ? '>' : (v.a < v.b ? '<' : '=');
  if (r === 'a + b' && v.resultado) return v.resultado; // suma con huecos

  if (r === 'cociente=floor(a/b), resto=a%b') {
    const c = Math.floor(v.a / v.b);
    const res = v.a % v.b;
    return `Cociente: ${c}, Resto: ${res}`;
  }
  if (r === 'cociente=floor(total/personas), resto=total%personas') {
    return `${Math.floor(v.total / v.personas)} a cada uno, sobran ${v.total % v.personas}`;
  }
  if (r === 'grupos=floor(alumnos/grupo_size), sobran=alumnos%grupo_size') {
    return `${Math.floor(v.alumnos / v.grupo_size)} grupos, sobran ${v.alumnos % v.grupo_size}`;
  }
  if (r === '2 * (largo + ancho)') return 2 * (v.largo + v.ancho);
  if (r === 'lado * 4') return v.lado * 4;
  if (r === 'a + b + c' && v.c) return v.a + v.b + v.c;
  if (r === 'n * 1000 + b') return v.n * 1000 + v.b;
  if (r === 'b >= a*1000') return v.b >= v.a * 1000 ? 'Sí, hay suficiente' : 'No, no hay suficiente';
  if (r === 'presentes/total') return `${v.presentes}/${v.total}`;
  if (r === 'num/den') return `${v.num}/${v.den}`;
  if (r === 'num1 > num2 ? > : <') return v.num1 > v.num2 ? '>' : '<';
  if (r === 'operacion == doble ? n*2 : n*3') return v.operacion === 'doble' ? v.n * 2 : v.n * 3;
  if (r === 'sujeto in [I,We,They] ? have got : has got') {
    return ['I', 'We', 'They'].includes(v.sujeto) ? `${v.sujeto} have got ${v.objeto}` : `${v.sujeto} has got ${v.objeto}`;
  }
  if (r === 'sujeto+am/is/are+verbo_ing') {
    const aux = v.sujeto.includes('I') ? 'am' : (v.sujeto.endsWith('s') || ['She','He'].includes(v.sujeto)) ? 'is' : 'are';
    const ing = v.verbo_infinitivo.endsWith('e') ? v.verbo_infinitivo.slice(0,-1)+'ing' : v.verbo_infinitivo+'ing';
    return `${v.sujeto} ${aux} ${ing}.`;
  }

  // Respuestas de lista con índice
  if (template.respuesta_esperada && Array.isArray(template.respuesta_esperada)) {
    if (template.variables) {
      for (const [key, cfg] of Object.entries(template.variables)) {
        if (cfg.tipo === 'lista' && cfg.opciones) {
          const idx = cfg.opciones.indexOf(v[key]);
          if (idx !== -1 && template.respuesta_esperada[idx] !== undefined) {
            return template.respuesta_esperada[idx];
          }
        }
      }
    }
  }

  // Respuestas específicas por tipo
  if (template.tipo === 'funcion_aparato') {
    const funciones = {
      locomotor: 'Nos permite movernos: huesos y músculos trabajan juntos.',
      digestivo: 'Transforma los alimentos en nutrientes que el cuerpo puede usar.',
      respiratorio: 'Lleva el oxígeno al cuerpo y expulsa el dióxido de carbono.',
      circulatorio: 'Transporta la sangre, los nutrientes y el oxígeno por todo el cuerpo.',
      excretor: 'Elimina los residuos y sustancias que el cuerpo no necesita.'
    };
    return funciones[v.aparato] || 'Respuesta libre';
  }

  if (template.tipo === 'order_digestion' || r === '1-boca, 2-esófago, 3-estómago, 4-intestino_delgado, 5-intestino_grueso') {
    return '1-Boca, 2-Esófago, 3-Estómago, 4-Intestino delgado, 5-Intestino grueso';
  }

  if (r === 'Guadalquivir, Océano Atlántico') return 'El Guadalquivir. Desemboca en el Océano Atlántico.';
  if (r === 'Almería, Cádiz, Córdoba, Granada, Huelva, Jaén, Málaga, Sevilla') {
    return 'Almería, Cádiz, Córdoba, Granada, Huelva, Jaén, Málaga y Sevilla';
  }

  // Traducciones inglés
  if ((template.tipo === 'traduccion_es_en' || template.tipo === 'vocab_comida_en_es' || template.tipo === 'vocab_animales' || template.tipo === 'traduccion_lugar') && AppState.unidadActual) {
    const unidad = AppState.unidadActual;
    if (unidad.vocabulario) {
      const entrada = unidad.vocabulario.find(item => item.español === v.palabra_es || item.ingles === v.palabra_en || item.español === v.word_es || item.ingles === v.word_en || item.español === v.animal_es || item.español === v.lugar_es);
      if (entrada) return `${entrada.ingles} / ${entrada.español}`;
    }
  }
  if ((template.tipo === 'traduccion_en_es' || template.tipo === 'vocab_comida_es_en') && AppState.unidadActual) {
    const unidad = AppState.unidadActual;
    if (unidad.vocabulario) {
      const entrada = unidad.vocabulario.find(item => item.ingles === v.palabra_en || item.español === v.word_es || item.ingles === v.word_en);
      if (entrada) return `${entrada.español}`;
    }
  }

  // Respuestas de test
  if (template.respuesta && typeof template.respuesta === 'string' && !template.respuesta.includes('(')) {
    return template.respuesta;
  }
  if (template.opciones && template.respuesta) {
    return template.respuesta;
  }

  return 'Ver corrección manual';
}

function evaluarExpr(expr, v) {
  // Evalúa expresiones simples: "b * cociente", "a * b", etc.
  if (expr === 'b * cociente') return v.b * v.cociente;
  if (expr === 'a + b') return v.a + v.b;
  if (expr === 'a * b') return v.a * v.b;
  if (expr === 'divisor * cociente + resto') return v.divisor * v.cociente + v.resto;
  if (expr === 'a * 1000 + b') return v.a * 1000 + v.b;
  return 0;
}

// ─── GENERACIÓN PRINCIPAL ─────────────────────────────────────────────────────

function generarEjerciciosParaTipo(unidad, tipo, dificultad, cantidad = 5) {
  let pool = [];
  if (tipo === 'ejercicios') pool = unidad.ejercicios_templates || [];
  else if (tipo === 'test') pool = unidad.test_templates || [];
  else if (tipo === 'actividades') pool = unidad.actividades_templates || [];
  else if (tipo === 'fichas') pool = unidad.fichas_templates || [];

  // Filtrar por dificultad
  let filtrados = pool.filter(t => !t.dificultad || t.dificultad === dificultad);
  if (filtrados.length === 0) filtrados = pool; // fallback sin filtro

  const resultado = [];
  for (let i = 0; i < cantidad; i++) {
    if (filtrados.length === 0) break;
    const template = filtrados[i % filtrados.length];
    const variables = generarVariables(template.variables || {}, unidad);
    const enunciado = resolverEnunciado(template, variables);
    const respuestaCorrecta = calcularRespuesta(template, variables);

    resultado.push({
      id: `ej_${Date.now()}_${i}`,
      tipo: template.tipo,
      enunciado,
      respuestaCorrecta,
      respuestaAlumno: '',
      dificultad: template.dificultad || dificultad,
      corregido: false,
      esCorrecta: null,
      esLibre: (typeof respuestaCorrecta === 'string' && respuestaCorrecta.includes('libre')) || respuestaCorrecta === 'Ver corrección manual'
    });
  }
  return resultado;
}

// ─── CORRECCIÓN ───────────────────────────────────────────────────────────────

function corregirEjercicios(ejercicios) {
  let aciertos = 0;
  let fallos = 0;
  let libres = 0;

  ejercicios.forEach(ej => {
    ej.corregido = true;
    if (ej.esLibre) {
      libres++;
      ej.esCorrecta = null;
      return;
    }
    const respAlumno = String(ej.respuestaAlumno).trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const respCorrecta = String(ej.respuestaCorrecta).trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    
    // Tolerancia numérica
    const numAlumno = parseFloat(respAlumno.replace(',', '.'));
    const numCorrecta = parseFloat(respCorrecta.replace(',', '.'));
    
    if (!isNaN(numAlumno) && !isNaN(numCorrecta)) {
      ej.esCorrecta = numAlumno === numCorrecta;
    } else {
      // Comparación texto: acepta si contiene la respuesta o si son iguales
      ej.esCorrecta = respAlumno === respCorrecta ||
                      respCorrecta.split('/').some(op => op.trim() === respAlumno) ||
                      respAlumno.includes(respCorrecta.split(',')[0].trim());
    }
    ej.esCorrecta ? aciertos++ : fallos++;
  });

  const total = ejercicios.length - libres;
  const nota = total > 0 ? Math.round((aciertos / total) * 10 * 10) / 10 : 0;

  return { aciertos, fallos, libres, total, nota };
}

// Exportar funciones globales
window.AppEngine = {
  cargarDatos,
  generarEjerciciosParaTipo,
  corregirEjercicios,
  AppState
};
