// ============================================================================
// IKEALang v1.2 - Universal Furniture Catalog
// Programs for chairs, tables, wardrobes, drawers, shelves, beds, modular units
// ============================================================================

import { FurnitureModelId } from './types.ts';

export interface SampleProject {
  id: string;
  name: string;
  description: string;
  code: string;
  category: 'sillas' | 'mesas' | 'armarios' | 'cajones' | 'estanterías' | 'camas' | 'diagnósticos';
  modelId: FurnitureModelId;
}

export const SAMPLE_PROGRAMS: SampleProject[] = [
  // 1. SILLA
  {
    id: 'silla-ingolf',
    name: 'Silla de Comedor INGOLF',
    description: 'Montaje de silla resistente con 4 patas, travesaños de refuerzo, asiento macizo y respaldo ergonómico.',
    modelId: 'chair',
    category: 'sillas',
    code: `MUEBLE SillaComedorIngolf

HERRAMIENTAS {
    TRAER IMPRESORA
    TRAER LLAVE_ALLEN
}

CAJA {
    TABLERO asiento_madera = "Asiento de Pino Macizo 40x40cm"
    TORNILLO patas_delanteras = 2
    TORNILLO patas_traseras = 2
    TORNILLO travesanos_respaldo = 3
    TORNILLO tornillos_ensamble = 12
    TABLERO estado_silla = "Piezas listas en taller"
}

MONTAJE {
    PASO 1: "Ensamblar patas y refuerzos inferiores" {
        TORNILLO total_patas = patas_delanteras UNIR patas_traseras
        tornillos_ensamble = tornillos_ensamble RETIRAR 8
        IMPRESORA.ESCRIBIR("Patas alineadas y aseguradas: " UNIR total_patas)
    }

    PASO 2: "Fijar asiento de madera maciza" {
        asiento_madera = asiento_madera UNIR " + Estructura Inferior Firme"
        IMPRESORA.ESCRIBIR("Asiento atornillado con maxima estabilidad.")
    }

    PASO 3: "Acoplar travesaños del respaldo" {
        tornillos_ensamble = tornillos_ensamble RETIRAR 4
        SI travesanos_respaldo ENCAJA 3 {
            estado_silla = "Silla INGOLF ensamblada con total firmeza y confort"
            IMPRESORA.ESCRIBIR(estado_silla)
        } SINO {
            AVISO("Verificar alineacion de travesanos")
        }
    }
}

TERMINADO estado_silla;`
  },

  // 2. CAMA
  {
    id: 'cama-malm',
    name: 'Cama Matrimonial MALM',
    description: 'Montaje de cama de 160x200cm con cabecero alto, largueros reforzados, viga central y somier de láminas.',
    modelId: 'bed',
    category: 'camas',
    code: `MUEBLE CamaMatrimonialMalm

HERRAMIENTAS {
    TRAER IMPRESORA
    TRAER LLAVE_ALLEN
    TRAER NIVEL_BURBUJA
}

CAJA {
    TABLERO cabecero_alto = "Cabecero MALM 160cm"
    TABLERO piecero = "Piecero Bajo 160cm"
    TORNILLO largueros_laterales = 2
    TORNILLO laminas_somier = 16
    TORNILLO pernos_acero = 8
    TABLERO cama_terminada = "Estructura iniciada"
}

MONTAJE {
    PASO 1: "Unir cabecero y piecero con los largueros" {
        pernos_acero = pernos_acero RETIRAR 8
        cama_terminada = cabecero_alto UNIR " + " UNIR piecero UNIR " (" UNIR largueros_laterales UNIR " largueros)"
        IMPRESORA.ESCRIBIR("Marco exterior ensamblado a escuadra: " UNIR cama_terminada)
    }

    PASO 2: "Instalar viga central de acero y fijar láminas" {
        ENTRE_DOS {
            IMPRESORA.ESCRIBIR("Desplegando las 16 laminas del somier...")
            laminas_somier = laminas_somier RETIRAR 16
        }
    }

    PASO 3: "Comprobacion de firmeza y nivelación" {
        SI NIVEL_BURBUJA.ESTA_NIVELADO() {
            cama_terminada = "Cama MALM 160x200 ensamblada con solidez inquebrantable"
            IMPRESORA.ESCRIBIR(cama_terminada)
        } SINO {
            AVISO("Ajustar niveladores de patas")
        }
    }
}

TERMINADO cama_terminada;`
  },

  // 3. ARMARIO
  {
    id: 'armario-pax',
    name: 'Armario Ropero PAX',
    description: 'Estructura vertical de gran capacidad con baldas intermedias, barra de colgar y 2 puertas batientes.',
    modelId: 'wardrobe',
    category: 'armarios',
    code: `MUEBLE ArmarioRoperoPax

HERRAMIENTAS {
    TRAER IMPRESORA
    TRAER LLAVE_ALLEN
}

CAJA {
    TABLERO cuerpo_armario = "Bastidor PAX 100x236cm"
    TORNILLO baldas_interiores = 4
    TORNILLO bisagras_puertas = 6
    CAJON modulos_montados = []
    TABLERO resultado = "Desembalado"
}

MONTAJE {
    PASO 1: "Montar laterales, suelo, techo y panel trasero" {
        cuerpo_armario = cuerpo_armario UNIR " + Fondo Clavado"
        IMPRESORA.ESCRIBIR("Bastidor principal erguido con total estabilidad.")
    }

    PASO 2: "Distribuir baldas y barra de colgar" {
        REPETIR baldas_interiores VECES {
            modulos_montados.UNIR("Balda_Regulable")
        }
        IMPRESORA.ESCRIBIR("Baldas instaladas: " UNIR modulos_montados.LONGITUD())
    }

    PASO 3: "Colocar bisagras y colgar puertas batientes" {
        bisagras_puertas = bisagras_puertas RETIRAR 6
        resultado = "Armario PAX montado con puertas alineadas y cierre suave"
        IMPRESORA.ESCRIBIR(resultado)
    }
}

TERMINADO resultado;`
  },

  // 4. CAJONERA
  {
    id: 'cajonera-alex',
    name: 'Cajonera ALEX (5 Cajones)',
    description: 'Cajonera de oficina con guías correderas de rodamientos de bolas y 5 gavetas apiladas.',
    modelId: 'alex',
    category: 'cajones',
    code: `MUEBLE CajoneraAlex

HERRAMIENTAS {
    TRAER IMPRESORA
    TRAER MATEMATICAS COMO Calc
}

CAJA {
    TORNILLO total_cajones = 5
    CAJON cajones_listos = []
    TABLERO chasis = "Chasis Alex Lacado Blanco"
    TORNILLO tornillos_guias = 20
}

MONTAJE {
    PASO 1: "Atornillar guías metálicas al chasis" {
        TORNILLO guias_por_cajon = 4
        tornillos_guias = tornillos_guias RETIRAR (total_cajones DUPLICAR guias_por_cajon)
        IMPRESORA.ESCRIBIR("Todas las guías metalicas han quedado aseguradas.")
    }

    PASO 2: "Montar e insertar cajones individuales" {
        REPETIR total_cajones VECES {
            cajones_listos.UNIR("Cajon_Deslizante")
        }
        IMPRESORA.ESCRIBIR("Cajones insertados: " UNIR cajones_listos.LONGITUD())
    }

    PASO 3: "Ajuste final del frente" {
        chasis = chasis UNIR " con 5 cajones funcionales y estables"
        IMPRESORA.ESCRIBIR("Cajonera lista para su uso.")
    }
}

TERMINADO chasis;`
  },

  // 5. ESTANTERÍA
  {
    id: 'estanteria-kallax',
    name: 'Estantería KALLAX (2x2)',
    description: 'Estructura cúbica modular con paneles perimetrales gruesos, separadores en cruz y espigas de madera.',
    modelId: 'kallax',
    category: 'estanterías',
    code: `MUEBLE EstanteriaKallax2x2

HERRAMIENTAS {
    TRAER IMPRESORA
    TRAER LLAVE_ALLEN
    TRAER NIVEL_BURBUJA
}

CAJA {
    TABLERO bastidor_exterior = "Estructura Perimetral 77x77cm"
    TORNILLO clavijas_madera = 8
    TORNILLO divisiones_internas = 2
    CAJON cubos_ensamblados = []
    TABLERO resultado_inspeccion = "Pendiente"
}

MONTAJE {
    PASO 1: "Insertar clavijas en baldas divisorias" {
        IMPRESORA.ESCRIBIR("Preparando divisiones cruzadas...")
        REPETIR divisiones_internas VECES {
            clavijas_madera = clavijas_madera RETIRAR 4
            cubos_ensamblados.UNIR("Modulo_Cruce_Cruceta")
        }
    }

    PASO 2: "Cerrar con los paneles exteriores superior e inferior" {
        IMPRESORA.ESCRIBIR("Encajando bastidor exterior...")
        bastidor_exterior = bastidor_exterior UNIR " + Baldas Encajadas"
    }

    PASO 3: "Comprobar nivelación final" {
        SI NIVEL_BURBUJA.ESTA_NIVELADO() {
            resultado_inspeccion = "KALLAX Perfectamente nivelada y estable"
            IMPRESORA.ESCRIBIR(resultado_inspeccion)
        } SINO {
            AVISO("La estanteria requiere ajuste menor")
        }
    }
}

TERMINADO bastidor_exterior;`
  },

  // 6. MESA
  {
    id: 'mesa-lack',
    name: 'Mesa Auxiliar LACK',
    description: 'Montaje de mesa baja con tablero ligero de nido de abeja y 4 patas atornillables.',
    modelId: 'lack',
    category: 'mesas',
    code: `MUEBLE MesaAuxiliarLack

HERRAMIENTAS {
    TRAER IMPRESORA
    TRAER LLAVE_ALLEN
}

CAJA {
    TABLERO tablero_superior = "Tablero Lack 55x55cm"
    TORNILLO patas_totales = 4
    TORNILLO tornillos_fijacion = 4
    CAJON patas_montadas = []
    TABLERO estado = "Desembalado"
}

MONTAJE {
    PASO 1: "Desempaquetar tablero y preparar patas" {
        IMPRESORA.ESCRIBIR("Iniciando montaje de: " UNIR tablero_superior)
        estado = "Tablero listo boca abajo"
    }

    PASO 2: "Enroscar las cuatro patas cilíndricas" {
        REPETIR patas_totales VECES {
            patas_montadas.UNIR("Pata_Fijada")
        }
        tornillos_fijacion = tornillos_fijacion RETIRAR patas_totales
        IMPRESORA.ESCRIBIR("Patas atornilladas firmemente.")
    }

    PASO 3: "Dar la vuelta y verificar estabilidad firme" {
        SI patas_montadas.LONGITUD() ENCAJA 4 {
            estado = "Mesa Lack ensamblada y 100% estable"
            IMPRESORA.ESCRIBIR("¡Exito! " UNIR estado)
        } SINO {
            AVISO("Faltan patas por colocar")
        }
    }
}

TERMINADO estado;`
  },

  // 7. DIAGNÓSTICO
  {
    id: 'diagnostico-piezas-sobrantes',
    name: 'Demo: ERROR PIEZAS_SOBRANTES',
    description: 'Demuestra el principio Zero-Leftovers: una pieza olvidada en la caja activa el muñeco de IKEA en el gutter.',
    modelId: 'generic',
    category: 'diagnósticos',
    code: `MUEBLE TestPiezasSobrantes

HERRAMIENTAS {
    TRAER IMPRESORA
}

CAJA {
    TABLERO mueble_base = "Estructura Principal"
    // Esta pieza nunca se usa en ningún PASO -> activará ERROR: PIEZAS_SOBRANTES
    TORNILLO tornillo_olvidado_en_suelo = 1
}

MONTAJE {
    PASO 1: "Comenzar montaje" {
        IMPRESORA.ESCRIBIR("Montando " UNIR mueble_base)
    }
}

TERMINADO mueble_base;`
  }
];
