# Manual de Referencia de Especificación Oficial: IkeaLang

**Versión de la especificación:** 1.1.0  
**Extensión estándar:** `.ikea`  
**Paradigma:** Imperativo, estructurado, fuertemente tipado, modular orientado a ensamblaje lineal.

---

## 1. Filosofía y Principios de Diseño

IkeaLang se diseñó bajo las premisas de la fabricación en paquete plano (*flat-pack*), el bricolaje riguroso y la ergonomía del montaje casero:

1. **Sin Piezas Fantasma (Zero-Leftovers):** Todo elemento declarado en la `CAJA` debe usarse activamente durante el `MONTAJE`. Si finaliza la ejecución con variables huérfanas, el compilador emite un error de tipo `PIEZAS_SOBRANTES`.
2. **Ejecución Secuencial Obligatoria:** No existen saltos arbitrarios (`goto`). Todo programa se estructura en pasos discretos (`PASO`), emulando las viñetas del folleto físico.
3. **Inmutabilidad por Ensamblaje:** Dos componentes unidos mediante `UNIR` forman un nuevo subensamblaje atómico y no pueden desintegrarse sin una operación explícita de `DESMONTAR`.
4. **Seguridad y Trabajo en Equipo:** Las operaciones pesadas o que implican riesgos de concurrencia deben marcarse explícitamente dentro de bloques de asistencia (`ENTRE_DOS`).
5. **Ecosistema Modular (Catálogo y Ferretería):** Ninguna herramienta o subensamblaje externo puede usarse mágicamente; todo módulo debe ser importado formalmente en el inventario de herramientas.

---

## 2. Estructura Canónica de un Fichero `.ikea`

Todo fichero en IkeaLang debe contener exactamente los siguientes bloques en el orden establecido:

```ikea
MUEBLE <Identificador>

HERRAMIENTAS {
    // Importaciones de librerías nativas, paquetes externos y otros muebles
}

CAJA {
    // Declaraciones e inicializaciones de memoria
}

MONTAJE {
    // Bloques PASO con la lógica del programa
}

TERMINADO <Resultado>;
```

### 2.1. Anatomía de los Bloques

* **`MUEBLE`**: Define el identificador principal del archivo o artefacto exportable.
* **`HERRAMIENTAS`**: Declaración e importación de librerías, utilidades del sistema y módulos externos. Si una función o subensamblaje requiere una herramienta o paquete no declarado aquí, se rechaza la compilación con `FALTA_HERRAMIENTA`.
* **`CAJA`**: Ámbito de inicialización de piezas y variables. Solo se permiten asignaciones y declaraciones.
* **`MONTAJE`**: Contenedor de la rutina principal, dividido obligatoriamente en pasos numerados correlativos (`PASO 1`, `PASO 2`, etc.).
* **`TERMINADO`**: Declara el valor de retorno o artefacto resultante del proceso (salida del programa).

---

## 3. Sistema de Módulos e Importación de Librerías

El bloque `HERRAMIENTAS` gestiona tres tipos de recursos externos mediante las directivas **`TRAER`**, **`DEL_CATALOGO`** y **`COMO`**:

```ikea
HERRAMIENTAS {
    // 1. Librerías nativas de ferretería
    TRAER LLAVE_ALLEN
    TRAER MATEMATICAS COMO Calcs
    
    // 2. Módulos y paquetes externos (vía gestor de paquetes 'ikea-pkg' o repositorio)
    TRAER "red/peticiones" DEL_CATALOGO COMO Http
    TRAER "seguridad/cerrojos" DEL_CATALOGO
    
    // 3. Importación de otros muebles (subensamblajes locales)
    TRAER CajoneraMalm DESDE "./dormitorio/CajoneraMalm.ikea"
}
```

### 3.1. Tipos de Importación

| Sintaxis | Propósito | Ejemplo |
| :--- | :--- | :--- |
| `TRAER <Nativa>` | Importa una utilidad del núcleo del lenguaje. | `TRAER IMPRESORA` |
| `TRAER <Modulo> COMO <Alias>` | Importa con alias para evitar colisiones de nombres. | `TRAER CRONOMETRO COMO Reloj` |
| `TRAER "<Ruta>" DEL_CATALOGO` | Importa librerías publicadas en el registro oficial de IkeaLang. | `TRAER "graficos/canvas" DEL_CATALOGO` |
| `TRAER <Mueble> DESDE "<Archivo>"` | Importa un archivo `.ikea` local como subensamblaje. | `TRAER PataReforzada DESDE "./piezas/pata.ikea"` |

### 3.2. Librerías Nativas del Sistema (*Ferretería Central*)

* **`IMPRESORA`**: Manejo de entrada y salida estándar por consola (`IMPRESORA.ESCRIBIR()`, `IMPRESORA.LEER()`).
* **`MATEMATICAS`**: Funciones trigonométricas, redondeos y mediciones (`MATEMATICAS.RAIZ()`, `MATEMATICAS.POTENCIA()`).
* **`NIVEL_BURBUJA`**: Validaciones lógicas y comprobaciones de balanceo estructural.
* **`CRONOMETRO`**: Control de temporizadores y pausas de montaje (`CRONOMETRO.ESPERAR_MILISEGUNDOS()`).
* **`FICHEROS`**: Lectura y escritura en el sistema de almacenamiento.

---

## 4. Sistema de Tipos de Datos

IkeaLang implementa un sistema de tipos estático y explícito:

| Tipo | Equivalente Primitivo | Descripción | Literales y Ejemplos |
| :--- | :--- | :--- | :--- |
| `TORNILLO` | `int`, `float` | Representación numérica (64 bits). | `4`, `16`, `3.14`, `-12` |
| `TABLERO` | `string` | Secuencia inmutable de caracteres UTF-8. | `"Mesa Auxiliar"`, `""` |
| `ENCAJE` | `bool` | Estado booleano de estabilidad. | `AJUSTA` (`true`), `SUELTO` (`false`) |
| `CAJON[T]` | `Array<T>` | Contenedor indexado (base 0) de elementos homogéneos. | `[1, 2, 3]`, `["Pata_1", "Pata_2"]` |
| `FALTANTE` | `null` | Representa la ausencia explícita de un componente o valor. | `FALTANTE` |
| `HUECO` | `void` | Utilizado en rutinas que no devuelven ningún ensamble. | `HUECO` |

---

## 5. Operadores y Palabras Reservadas

### 5.1. Operadores Aritméticos y de Ensamble
* **`UNIR` (`+`)**: Suma numérica, concatenación de `TABLERO` o adición al final de un `CAJON`.
* **`RETIRAR` (`-`)**: Resta aritmética o extracción de un elemento de un `CAJON`.
* **`DUPLICAR` (`*`)**: Multiplicación escalar o duplicación de cadenas.
* **`SECCIONAR` (`/`)**: División aritmética de coma flotante.
* **`RESTO` (`%`)**: Operación de residuo/módulo.

### 5.2. Comparación y Lógica
* **`COLOCAR` (`=`)**: Asignación.
* **`ENCAJA` (`==`)**: Igualdad de valor y tipo.
* **`NO_ENCAJA` (`!=`)**: Desigualdad.
* **`MAS_LARGO` (`>`)** / **`MAS_CORTO` (`<`)**: Mayor que / Menor que.
* **`Y_TAMBIEN` (`&&`)** / **`O_BIEN` (`||`)**: Conjunción / Disyunción.
* **`INVERTIR` (`!`)**: Negación lógica.

---

## 6. Control de Flujo

### 6.1. Condicionales: `SI` / `SINO_SI` / `SINO`
```ikea
SI ancho MAS_LARGO 120 {
    AVISO("El tablero excede el ancho estándar.")
} SINO_SI ancho ENCAJA 120 {
    IMPRESORA.ESCRIBIR("Medida milimétrica exacta.")
} SINO {
    ancho = ancho UNIR 10
}
```

### 6.2. Bucle de Repetición Fija: `REPETIR ... VECES`
```ikea
REPETIR 4 VECES {
    patas.UNIR("Pata_Estandar")
}
```

### 6.3. Bucle Condicional: `MIENTRAS_AJUSTE`
```ikea
MIENTRAS_AJUSTE vueltas MAS_CORTO 10 {
    vueltas = vueltas UNIR 1
}
```

### 6.4. Iteración de Colecciones: `POR_CADA <item> EN <cajon>`
```ikea
POR_CADA pieza EN piezas_recibidas {
    total_piezas = total_piezas UNIR 1
}
```

---

## 7. Subrutinas y Módulos Reutilizables: `PLANO`

Las funciones en IkeaLang se denominan `PLANO`. Si se antepone la directiva `EXPORTAR`, el plano puede ser consumido por otros archivos `.ikea`:

```ikea
EXPORTAR PLANO calcular_diagonal(TORNILLO ancho, TORNILLO alto) -> TORNILLO {
    TORNILLO diagonal = MATEMATICAS.RAIZ((ancho DUPLICAR ancho) UNIR (alto DUPLICAR alto))
    TERMINADO diagonal
}
```

---

## 8. Concurrencia Protegida: `ENTRE_DOS`

Para evitar desestabilización en tareas asíncronas pesadas (I/O intensivo, peticiones de red o transformaciones de grandes volúmenes de datos), el bloque debe marcarse con `ENTRE_DOS`:

```ikea
ENTRE_DOS {
    Http.DESCARGAR_CATALOGO("https://api.ikea.mock/piezas")
}
```

Omitir este bloque en llamadas pesadas provoca la interrupción del hilo con `PANICO: VUELCO`.

---

## 9. Diagnósticos y Errores del Compilador

* **`ERROR 101: PIEZAS_SOBRANTES`**: Hay variables o librerías importadas en `HERRAMIENTAS` que nunca se invocaron en ningún `PASO`.
* **`ERROR 102: TORNILLO_PASADO`**: Conflicto de tipos en tiempo de compilación.
* **`ERROR 103: FALTA_HERRAMIENTA`**: Se intentó utilizar un método de un módulo no declarado dentro de `HERRAMIENTAS`.
* **`ERROR 104: CATALOGO_NO_ENCONTRADO`**: La librería remota o archivo importado con `DESDE` no existe en la ruta indicada.
* **`PANICO: VUELCO`**: Error fatal de ejecución por desequilibrio (división por cero o concurrencia no resguardada).

---

## 10. Ejemplos de Programas Completos

### 10.1. Consumo de API Externa con Librerías

```ikea
MUEBLE ConsultorPrecios

HERRAMIENTAS {
    TRAER IMPRESORA
    TRAER "red/cliente_http" DEL_CATALOGO COMO Red
    TRAER MATEMATICAS COMO Calc
}

CAJA {
    TABLERO url_servicio = "https://tienda.ikea.org/precios/kallax"
    TORNILLO precio_base = 0
    TORNILLO iva = 1.21
    TORNILLO precio_final = 0
}

MONTAJE {
    PASO 1: "Consultar precio en la nube" {
        ENTRE_DOS {
            TABLERO respuesta = Red.GET(url_servicio)
            precio_base = respuesta.A_TORNILLO()
        }
    }

    PASO 2: "Calcular importe total con impuestos" {
        precio_final = Calc.REDONDEAR(precio_base DUPLICAR iva)
        IMPRESORA.ESCRIBIR("El precio total ensamblado es: " UNIR precio_final)
    }
}

TERMINADO precio_final;
```

### 10.2. Ensamblaje Modular con Submuebles Locales

```ikea
MUEBLE ArmarioPaxModular

HERRAMIENTAS {
    TRAER IMPRESORA
    TRAER PuertaVidrio DESDE "./componentes/puerta_vidrio.ikea"
    TRAER BisagraReforzada DESDE "./componentes/bisagra.ikea"
}

CAJA {
    TORNILLO bisagras_necesarias = 3
    CAJON herrajes = []
    TABLERO estado_armario = "Estructura Base"
}

MONTAJE {
    PASO 1: "Reunir herrajes importados" {
        REPETIR bisagras_necesarias VECES {
            herrajes.UNIR(BisagraReforzada.CREAR(110)) // Bisagra de 110 grados
        }
    }

    PASO 2: "Fijar puertas importadas" {
        ENTRE_DOS {
            PuertaVidrio.INSTALAR(estado_armario, herrajes)
        }
        IMPRESORA.ESCRIBIR("Puertas de cristal ensambladas correctamente.")
    }
}

TERMINADO estado_armario;
```