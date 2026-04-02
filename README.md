# 📚 Gestor Educativo 4º Primaria · Andalucía

Aplicación web local para practicar contenidos de 4º de Primaria
basados en los libros de **Anaya / Edudynamic** para Andalucía.

---

## 🚀 Cómo ejecutar en local

### Opción A – VS Code (recomendada)
1. Abre la carpeta `/project` en VS Code
2. Instala la extensión **Live Server** (de Ritwick Dey)
3. Haz clic derecho en `index.html` → **Open with Live Server**
4. Se abrirá en el navegador en `http://127.0.0.1:5500`

### Opción B – Python (sin instalar nada extra)
```bash
cd project
python -m http.server 8000
# Abre http://localhost:8000 en el navegador
```

### Opción C – Node.js
```bash
cd project
npx serve .
# Abre la URL que aparece en consola
```

> ⚠️ **No abras `index.html` directamente** con doble clic
> (los archivos JSON no se cargarán por restricciones de seguridad del navegador).
> Siempre usa un servidor local.

---

## 📁 Estructura del proyecto

```
project/
├── index.html              ← Aplicación principal
├── js/
│   └── engine.js           ← Motor de generación y corrección
└── data/
    ├── matematicas.json    ← Matemáticas (7 unidades)
    ├── lengua.json         ← Lengua (6 unidades)
    ├── conocimiento_medio.json  ← C. del Medio (6 unidades)
    └── ingles.json         ← Inglés (5 unidades)
```

---

## 🎓 Asignaturas y unidades incluidas

### 🔢 Matemáticas (7 unidades)
1. Números hasta el millón
2. Suma y resta de números grandes
3. Multiplicación
4. División
5. Fracciones
6. Medida: longitud, masa y capacidad
7. Geometría: figuras planas

### 📖 Lengua (6 unidades)
1. El texto y sus tipos
2. La narración: el cuento
3. Gramática: el sustantivo y el adjetivo
4. Gramática: el verbo
5. Ortografía: reglas fundamentales
6. Comprensión lectora y vocabulario

### 🌍 Conocimiento del Medio (6 unidades)
1. El cuerpo humano: aparatos y sistemas
2. Los seres vivos: clasificación
3. La materia y sus estados
4. El relieve de España y Andalucía
5. La organización política de España
6. La energía y sus fuentes

### 🇬🇧 Inglés - Rise & Shine (5 unidades)
1. Family and Friends (have got)
2. Places in the City (there is/are)
3. Food and Healthy Living (like/don't like)
4. Animals and Nature (present continuous)
5. The Past (past simple)

---

## 🛠️ Cómo añadir contenido nuevo

### Añadir una unidad a una asignatura
Añade un nuevo objeto al array `unidades` en el JSON correspondiente,
siguiendo exactamente la misma estructura. Ejemplo mínimo:

```json
{
  "id_unidad": "mat_08",
  "numero": 8,
  "titulo": "Nueva unidad",
  "resumen": "Descripción para adultos...",
  "resumen_simple": "Descripción para el niño...",
  "conceptos_clave": ["concepto1", "concepto2"],
  "habilidades": ["habilidad1"],
  "repaso_clave": ["punto 1", "punto 2"],
  "ejercicios_templates": [...],
  "test_templates": [...],
  "actividades_templates": [...],
  "fichas_templates": []
}
```

### Añadir una asignatura nueva
1. Crea `data/nueva_asignatura.json` con la misma estructura
2. En `engine.js`, añade la clave al objeto `archivos` en `cargarDatos()`
3. En `index.html`, añade la tarjeta en el grid de asignaturas

---

## ⚙️ Tipos de templates soportados

| Campo `tipo` en template | Descripción |
|---|---|
| `numero` | Genera número aleatorio en rango |
| `lista` | Selecciona aleatoriamente de una lista de opciones |
| `booleano` | Verdadero/Falso aleatorio |
| `vocabulario_unidad` | Selecciona del vocabulario de la unidad (inglés) |

---

## 🔧 Variables especiales en templates

- `"max": "a"` → el máximo se toma del valor de la variable `a`
- `"multiplo": 10` → genera múltiplos de 10
- `"respuesta_esperada"` → array paralelo a `opciones`, para lookup automático

---

## 📝 Notas de uso

- **Para la madre:** Selecciona asignatura → unidad → tipo de actividad → dificultad → genera.
  Al pulsar "Corregir" se evalúan todas las respuestas automáticamente.
- **Para el alumno:** El niño resuelve en papel y escribe solo la respuesta final.
- **Regenerar:** Pulsa "Nuevos ejercicios" para obtener variantes diferentes de los mismos templates.
- **Vocabulario inglés:** Tarjetas interactivas que se voltean al pulsar.
- **Corrección manual:** Los ejercicios de texto libre se marcan en morado y muestran una respuesta de referencia.

---

## 🎨 Personalización

Los colores por asignatura se pueden cambiar en las variables CSS en `index.html`:
```css
--col-mat: #FF6B35;   /* Matemáticas */
--col-len: #4ECDC4;   /* Lengua */
--col-cono: #45B7D1;  /* Conocimiento del Medio */
--col-ing: #96CEB4;   /* Inglés */
```
