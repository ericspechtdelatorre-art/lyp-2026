# ESPECIFICACIÓN OFICIAL DE REGLAS: IKEA_LANG (v2.0 Visual)

**IKEA_LANG** es un lenguaje de programación esotérico y educativo basado en la analogía de ensamblaje de mobiliario. El código fuente simula el seguimiento de un manual de montaje físico donde las variables son componentes de ferretería, las operaciones representan el ensamblado y la salida principal es la renderización gráfica del mueble resultante en arte ASCII.

---

## 1. Reglas Generales de Sintaxis y Gramática

1. **Estructura unilineal:** Cada orden ocupa una única línea de texto (`\n`). No se permite encadenar varias sentencias en una sola línea.
2. **Mayúsculas estrictas en palabras clave:** Todas las instrucciones del lenguaje (`ABRIR_CAJA`, `PIEZA`, `ENCAJAR`, `MOSTRAR`, `DIBUJAR_MUEBLE`, `CERRAR_CAJA`) deben escribirse en **MAYÚSCULAS**.
3. **Flujo de delimitación obligatorio:**
   * La primera instrucción ejecutable de cualquier manual debe ser `ABRIR_CAJA`.
   * La última instrucción debe ser `CERRAR_CAJA`.
   * Cualquier manipulación de piezas fuera de este bloque resultará en un fallo fatal de montaje (`Error de caja cerrada`).
4. **Nomenclatura de identificadores:** Los nombres de las piezas (`<nombre>`) deben ser palabras contiguas, sin espacios ni caracteres especiales reservados (ejemplos válidos: `patas`, `baldas`, `tabla_superior`).
5. **Tipos de datos soportados:**
   * **Números enteros (`Integer`):** Dígitos directos sin punto decimal (`4`, `12`, `-2`).
   * **Cadenas de texto (`String`):** Secuencias delimitadas estrictamente por comillas dobles (`"Mesa LACK"`, `"Estanteria BILLY"`).
6. **Existencia previa obligatoria:** No se puede consultar (`MOSTRAR`), operar (`ENCAJAR`) ni utilizar como parámetro paramétrico ninguna pieza que no haya sido creada previamente mediante la instrucción `PIEZA`.
7. **Restricciones aritméticas:** La instrucción `ENCAJAR` opera exclusivamente con valores enteros y mediante el operador suma (`+`). Está prohibido sumar texto o concatenar mediante esta instrucción.
8. **Comentarios y espaciado:**
   * Toda línea que empiece por `//` se considera una nota técnica del manual y es completamente ignorada por el intérprete.
   * Las líneas en blanco no interrumpen el flujo y se omiten automáticamente.

---

## 2. Catálogo de Instrucciones

| Instrucción | Formato sintáctico | Parámetros | Comportamiento en tiempo de ejecución |
| :--- | :--- | :--- | :--- |
| `ABRIR_CAJA` | `ABRIR_CAJA` | Ninguno | Inicializa el entorno de ejecución y la memoria de piezas. |
| `PIEZA` | `PIEZA <nombre> = <valor>` | Identificador y valor (`Int` o `String`) | Reserva espacio en memoria y asigna un valor a una pieza. Si la pieza ya existía, sobreescribe su valor. |
| `ENCAJAR` | `ENCAJAR <nombre> + <entero>` | Identificador existente y entero positivo/negativo | Suma el incremento numérico directamente a la variable indicada. Lanza error si la variable almacena un texto. |
| `MOSTRAR` | `MOSTRAR <nombre_o_texto>` | Identificador de pieza o `"texto"` literal | Envía a la consola de texto el valor actual de la pieza o la cadena literal pasada entre comillas. |
| `DIBUJAR_MUEBLE` | `DIBUJAR_MUEBLE <tipo_mueble>` | Cadena con el modelo: `"mesa"`, `"estanteria"`, `"silla"` | Lee el estado de la memoria actual y genera dinámicamente la estructura del mueble en arte ASCII en el visor gráfico. |
| `CERRAR_CAJA` | `CERRAR_CAJA` | Ninguno | Concluye la ejecución del programa y bloquea cualquier instrucción subsiguiente. |
| `//` | `// <comentario>` | Texto libre | Nota de montaje ignorada por el analizador sintáctico. |

---

## 3. Semántica de la Renderización ASCII (`DIBUJAR_MUEBLE`)

A diferencia de los lenguajes tradicionales de consola, `DIBUJAR_MUEBLE` conecta la memoria interna del programa con el motor gráfico del IDE:

* **Mueble `"mesa"`:**
  * Lee el valor de la variable `patas`.
  * Si `patas <= 2`, renderiza una mesa inestable de 2 soportes laterales.
  * Si `patas == 3`, añade un soporte central.
  * Si `patas >= 4`, renderiza una estructura completa de cuatro soportes simétricos.
* **Mueble `"estanteria"`:**
  * Lee el valor de la variable `baldas`.
  * Genera un bucle procedural de renderizado que apila tantas repisas interiores con libros como indique el valor entero de `baldas`.
* **Mueble `"silla"`:**
  * Renderiza la estructura clásica ergonómica con respaldo y patas de diseño fijo.

---

## 4. Ejemplos de Programas Válidos

### Ejemplo A: Ensamblado de Mesa Paramétrica (`mesa.ikea`)

```text
ABRIR_CAJA

// Paso 1: Identificación del producto
PIEZA modelo = "Mesa LACK"

// Paso 2: Conteo y ensamblado de patas
PIEZA patas = 2
ENCAJAR patas + 2

// Paso 3: Verificación técnica por consola
MOSTRAR "Modelo:"
MOSTRAR modelo
MOSTRAR "Total de patas instaladas:"
MOSTRAR patas

// Paso 4: Visualización del mueble final
DIBUJAR_MUEBLE "mesa"

CERRAR_CAJA

```

### Ejemplo B: Estantería Expandible con Baldas (`estanteria.ikea`)

```text
ABRIR_CAJA

// Definición de estantería BILLY
PIEZA producto = "BILLY Bookcase"
PIEZA baldas = 1

// Agregamos tres baldas adicionales
ENCAJAR baldas + 3

MOSTRAR producto
MOSTRAR "Baldas colocadas:"
MOSTRAR baldas

// El visor dibujará una estantería de 4 pisos
DIBUJAR_MUEBLE "estanteria"

CERRAR_CAJA

```

---

## 5. Tabla de Errores Comunes de Montaje

| Código / Mensaje de Error | Causa | Corrección |
| --- | --- | --- |
| `Error: Debes ABRIR_CAJA antes de manipular piezas` | Se escribió una instrucción operativa antes del inicio de bloque. | Mover `ABRIR_CAJA` a la línea 1. |
| `Error: La pieza '<nombre>' no existe en la caja` | Se intentó hacer `ENCAJAR` o `MOSTRAR` sobre una pieza no declarada. | Declarar primero la variable con `PIEZA <nombre> = ...`. |
| `Error: Sintaxis incorrecta en PIEZA (falta '=')` | Se omitió el operador de asignación. | Corregir la sintaxis a `PIEZA <nombre> = <valor>`. |
| `Error: No se puede encajar un valor no numérico` | Se intentó aplicar `ENCAJAR` sobre una pieza que contenía un texto (`String`). | Aplicar `ENCAJAR` únicamente sobre piezas inicializadas con números. |
| `Aviso: El código finalizó sin CERRAR_CAJA` | El archivo terminó sin la instrucción de clausura. | Añadir `CERRAR_CAJA` al final del programa. |

