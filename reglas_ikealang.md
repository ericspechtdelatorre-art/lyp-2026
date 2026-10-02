# Manual de Referencia de Especificación Oficial: IkeaLang

**Versión de la especificación:** 1.2.0 (Universal Furniture Release)  
**Extensión estándar:** `.ikea`  
**Paradigma:** Imperativo, estructurado, fuertemente tipado, modular orientado a ensamblaje universal de mobiliario.

---

## 1. Filosofía y Principios de Diseño

IkeaLang se diseñó bajo las premisas de la fabricación en paquete plano (*flat-pack*), el bricolaje riguroso, la ergonomía y la creación de cualquier tipo de mueble:

1. **Estabilidad Universal Garantizada:** Cualquier mueble que imagines puede construirse en IkeaLang sin problemas de estabilidad estructural. Ya sea una **silla** ergonómica, una **cama** matrimonial de gran porte, un **armario** ropero alto, una **cajonera** de múltiples gavetas, una **estantería** modular o una **mesa** auxiliar, el sistema de ensamblaje garantiza rigidez y solidez absolutas una vez finalizado.
2. **Sin Piezas Fantasma (Zero-Leftovers):** Todo elemento declarado en la `CAJA` debe usarse activamente durante el `MONTAJE`. Si finaliza la ejecución con variables huérfanas en el suelo, el compilador emite un error de tipo `PIEZAS_SOBRANTES`.
3. **Ejecución Secuencial Obligatoria:** No existen saltos arbitrarios (`goto`). Todo programa se estructura en pasos discretos (`PASO`), emulando las viñetas del folleto físico de montaje.
4. **Inmutabilidad por Ensamblaje:** Dos componentes unidos mediante `UNIR` forman un nuevo subensamblaje atómico y no pueden desintegrarse sin una operación explícita de `DESMONTAR`.
5. **Colaboración en Equipo (`ENTRE_DOS`):** Para acelerar tareas pesadas o ensamblar partes voluminosas en paralelo, se utiliza el bloque de asistencia `ENTRE_DOS` (trabajo simultáneo entre dos personas).
6. **Ecosistema Modular:** Ninguna herramienta o subensamblaje externo puede usarse mágicamente; todo módulo debe ser importado formalmente en el inventario de herramientas.

---

## 2. Taxonomía de Muebles Soportados

El IDE y el compilador reconocen procedimentalmente cualquier familia de mobiliario para renderizado 3D en tiempo real, simulación y generación de planos:

| Tipo de Mueble | Elementos Típicos de Montaje | Identificadores Recomendados | Modelo 3D Paramétrico |
| :--- | :--- | :--- | :--- |
| **Silla** | Asiento, patas delanteras/traseras, travesaños de respaldo, tornillería | `SillaComedor`, `SillaErgonomica`, `SillaIngolf` | `chair` (asiento, 4 patas, respaldo con barrotes) |
| **Cama** | Cabecero, piecero, largueros laterales, viga central, somier de láminas | `CamaMatrimonial`, `CamaIndividual`, `CamaMalm` | `bed` (cabecero, marco perimetral, láminas de madera) |
| **Armario** | Bastidor alto, laterales, baldas regulables, barra de perchas, puertas | `ArmarioRopero`, `ArmarioPax`, `ArmarioDoble` | `wardrobe` (estructura vertical, baldas, puertas batientes) |
| **Cajonera** | Chasis exterior, guías correderas con rodamientos, gavetas individuales | `CajoneraAlex`, `CajoneraOficina`, `Cajonera3` | `alex` (mueble contenedor con gavetas extraíbles) |
| **Estantería** | Bastidor perimetral, separadores cruzados, cruceta de refuerzo, baldas | `EstanteriaKallax`, `EstanteriaBilly`, `Libreria` | `kallax` (cubos modulares con ensamblaje simétrico) |
| **Mesa** | Tablero superior, patas cilíndricas/prismáticas, pernos de doble rosca | `MesaAuxiliar`, `MesaComedor`, `MesaLack` | `lack` (tablero horizontal y apoyos simétricos) |
| **Modular / Genérico** | Paneles universales, bisagras y herrajes libres | Cualquier mueble a medida | `generic` (bloques adaptables) |

---

## 3. Estructura Canónica de un Fichero `.ikea`

Todo fichero en IkeaLang debe contener exactamente los siguientes bloques en el orden establecido:

```ikea
MUEBLE <Identificador>

HERRAMIENTAS {
    // Importaciones de librerías nativas, paquetes externos y submuebles
}

CAJA {
    // Declaraciones e inicializaciones de piezas y ferretería
}

MONTAJE {
    // Bloques PASO con la lógica del programa
}

TERMINADO <Resultado>;
```

### 3.1. Anatomía de los Bloques

* **`MUEBLE`**: Define el identificador principal del mueble o artefacto exportable.
* **`HERRAMIENTAS`**: Declaración e importación de librerías, utilidades del sistema y módulos externos. Si una función o subensamblaje requiere una herramienta no declarada aquí, se rechaza la compilación con `FALTA_HERRAMIENTA`.
* **`CAJA`**: Ámbito de desembalaje de piezas y variables. Solo se permiten declaraciones con tipo explícito y valores iniciales.
* **`MONTAJE`**: Contenedor del procedimiento de ensamblaje, dividido obligatoriamente en pasos numerados correlativos (`PASO 1: "..." { ... }`).
* **`TERMINADO`**: Declara el valor de retorno o producto final listo tras el montaje.

---

## 4. Tipos de Datos y Operadores

### 4.1. Primitivas Físicas del Lenguaje

| Tipo | Analogía Física | Equivalente Clásico | Ejemplo |
| :--- | :--- | :--- | :--- |
| **`TORNILLO`** | Pieza de ferretería con medida numérica | `number` (enteros y flotantes) | `TORNILLO patas = 4` |
| **`TABLERO`** | Panel o superficie de madera inmutable | `string` (texto UTF-8) | `TABLERO material = "Pino macizo"` |
| **`ENCAJE`** | Unión de clic machihembrado | `boolean` (`AJUSTA` / `SUELTO`) | `ENCAJE fijado = AJUSTA` |
| **`CAJON[T]`** | Módulo contenedor para apilar elementos | `array<T>` | `CAJON baldas = []` |
| **`FALTANTE`** | Pieza perdida o no incluida | `null` / `undefined` | `FALTANTE` |
| **`HUECO`** | Orificio pasante (sin retorno) | `void` | `HUECO` |

### 4.2. Operadores de Montaje

* **`UNIR`**: Suma aritmética, concatenación de cadenas o inserción al final de una colección.
* **`RETIRAR`**: Resta aritmética o extracción de elementos.
* **`DUPLICAR`**: Multiplicación.
* **`SECCIONAR`**: División.
* **`RESTO`**: Módulo/Resto de división entera.
* **`ENCAJA`**: Comparación de igualdad estricta (`==`).
* **`NO_ENCAJA`**: Desigualdad estricta (`!=`).
* **`MAS_LARGO`**: Comparación mayor que (`>`).
* **`MAS_CORTO`**: Comparación menor que (`<`).

---

## 5. Control de Flujo de Montaje

### 5.1. Iteración Fija: `REPETIR <n> VECES { ... }`
```ikea
REPETIR 4 VECES {
    patas_montadas.UNIR("Pata_Ajustada")
}
```

### 5.2. Iteración Condicional: `MIENTRAS_AJUSTE (<condicion>) { ... }`
```ikea
MIENTRAS_AJUSTE (tornillos_por_apretar MAS_LARGO 0) {
    tornillos_por_apretar = tornillos_por_apretar RETIRAR 1
}
```

### 5.3. Bifurcación Condicional: `SI (<cond>) { ... } SINO { ... }`
```ikea
SI (nivel_burbuja ENCAJA AJUSTA) {
    IMPRESORA.ESCRIBIR("Estructura perfectamente nivelada.")
} SINO {
    AVISO("Ajustar tornillos niveladores de la base")
}
```

### 5.4. Concurrencia y Trabajo en Equipo: `ENTRE_DOS { ... }`
```ikea
ENTRE_DOS {
    IMPRESORA.ESCRIBIR("Sujetando cabecero y largueros a la vez...")
    largueros_asegurados = AJUSTA
}
```

---

## 6. Diagnósticos y Errores del Compilador

* **`ERROR 101: PIEZAS_SOBRANTES`**: (Principio Zero-Leftovers). Se declara una pieza en `CAJA` o se importa una herramienta en `HERRAMIENTAS` pero nunca se usa en ningún `PASO`. El muñeco de IKEA (*Gubbe*) aparece en el margen rascándose la cabeza.
* **`ERROR 102: TORNILLO_PASADO`**: Conflicto de tipos estáticos o sobrepaso de rosca (por ejemplo, asignar texto a un `TORNILLO`).
* **`ERROR 103: FALTA_HERRAMIENTA`**: Intento de utilizar una herramienta o método sin haberla importado previamente en `HERRAMIENTAS`.
* **`ERROR 104: CATALOGO_NO_ENCONTRADO`**: Librería o submueble no encontrado en la ruta indicada.
* **`ESTABILIDAD TOTAL`**: Todo mueble compilado correctamente posee garantía de estabilidad certificada.

---

## 7. Ejemplo Canónico de una Silla

```ikea
MUEBLE SillaComedorIngolf

HERRAMIENTAS {
    TRAER IMPRESORA
    TRAER LLAVE_ALLEN
}

CAJA {
    TABLERO asiento = "Asiento de Pino Macizo 40x40cm"
    TORNILLO patas_delanteras = 2
    TORNILLO patas_traseras = 2
    TORNILLO travesanos_respaldo = 3
    TORNILLO tornillos_ensamble = 12
    TABLERO estado = "Listo para ensamble"
}

MONTAJE {
    PASO 1: "Ensamblar patas y refuerzos inferiores" {
        TORNILLO total_patas = patas_delanteras UNIR patas_traseras
        tornillos_ensamble = tornillos_ensamble RETIRAR 8
        IMPRESORA.ESCRIBIR("Patas fijadas firmemente: " UNIR total_patas)
    }

    PASO 2: "Fijar asiento de madera maciza" {
        asiento = asiento UNIR " + Estructura Inferior Firme"
        IMPRESORA.ESCRIBIR("Asiento bloqueado con máxima estabilidad.")
    }

    PASO 3: "Acoplar travesaños del respaldo" {
        tornillos_ensamble = tornillos_ensamble RETIRAR 4
        SI travesanos_respaldo ENCAJA 3 {
            estado = "Silla INGOLF montada con solidez inquebrantable"
            IMPRESORA.ESCRIBIR(estado)
        }
    }
}

TERMINADO estado;
```