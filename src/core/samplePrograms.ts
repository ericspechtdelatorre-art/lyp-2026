// ============================================================================
// IKEALang v1.1 - Standard Sample Catalog
// ============================================================================

export interface SampleProject {
  id: string;
  name: string;
  description: string;
  code: string;
  category: 'básicos' | 'modular' | 'concurrencia' | 'diagnósticos';
  modelId: 'lack' | 'kallax' | 'alex' | 'pax' | 'chair' | 'generic';
}

export const SAMPLE_PROGRAMS: SampleProject[] = [
  {
    id: 'mesa-lack',
    name: 'Mesa Auxiliar LACK',
    description: 'Montaje clásico de mesa con tablero superior, 4 patas cuadradas y tornillos de rosca doble.',
    modelId: 'lack',
    category: 'básicos',
    code: `MUEBLE MesaAuxiliarLack

HERRAMIENTAS {
    TRAER IMPRESORA
    TRAER LLAVE_ALLEN
    TRAER MATEMATICAS COMO Calc
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
        IMPRESORA.ESCRIBIR("Patas atornilladas firmemente. Restan tornillos: " UNIR tornillos_fijacion)
    }

    PASO 3: "Dar la vuelta y comprobar estabilidad" {
        SI patas_montadas.LONGITUD() ENCAJA 4 {
            estado = "Mesa Lack ensamblada y estable"
            IMPRESORA.ESCRIBIR("¡Éxito! " UNIR estado)
        } SINO {
            AVISO("Faltan patas por colocar")
        }
    }
}

TERMINADO estado;`
  },

  {
    id: 'estanteria-kallax',
    name: 'Estantería KALLAX (2x2)',
    description: 'Montaje de cubos con paneles perimetrales, separadores cruzados y clavijas de madera.',
    modelId: 'kallax',
    category: 'modular',
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
        ENTRE_DOS {
            IMPRESORA.ESCRIBIR("Encajando bastidor exterior entre dos personas...")
            bastidor_exterior = bastidor_exterior UNIR " + Baldas Encajadas"
        }
    }

    PASO 3: "Comprobar nivelación con burbuja" {
        SI NIVEL_BURBUJA.ESTA_NIVELADO() {
            resultado_inspeccion = "KALLAX Perfectamente nivelada"
            IMPRESORA.ESCRIBIR(resultado_inspeccion)
        } SINO {
            AVISO("La estantería cojea levemente")
        }
    }
}

TERMINADO bastidor_exterior;`
  },

  {
    id: 'cajonera-alex',
    name: 'Cajonera ALEX (5 Cajones)',
    description: 'Estructura con guías correderas y colección indexada de cajones.',
    modelId: 'alex',
    category: 'modular',
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
        IMPRESORA.ESCRIBIR("Todas las guías metálicas han quedado aseguradas.")
    }

    PASO 2: "Montar e insertar cajones individuales" {
        REPETIR total_cajones VECES {
            cajones_listos.UNIR("Cajon_Deslizante")
        }
        IMPRESORA.ESCRIBIR("Cajones insertados: " UNIR cajones_listos.LONGITUD())
    }

    PASO 3: "Ajuste final del frente" {
        chasis = chasis UNIR " con 5 cajones funcionales"
        IMPRESORA.ESCRIBIR("Cajonera lista para su uso.")
    }
}

TERMINADO chasis;`
  },

  {
    id: 'consultor-precios',
    name: 'Consultor de Precios (Cloud API)',
    description: 'Petición asíncrona dentro de ENTRE_DOS y cálculo de IVA con la herramienta MATEMATICAS.',
    modelId: 'generic',
    category: 'concurrencia',
    code: `MUEBLE ConsultorPrecios

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

TERMINADO precio_final;`
  },

  {
    id: 'armario-pax',
    name: 'Armario PAX Modular',
    description: 'Estructura modular con importación de submuebles locales y bisagras reforzadas.',
    modelId: 'pax',
    category: 'modular',
    code: `MUEBLE ArmarioPaxModular

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
            herrajes.UNIR(BisagraReforzada.CREAR(110))
        }
    }

    PASO 2: "Fijar puertas importadas" {
        ENTRE_DOS {
            PuertaVidrio.INSTALAR(estado_armario, herrajes)
        }
        IMPRESORA.ESCRIBIR("Puertas de cristal ensambladas correctamente.")
    }
}

TERMINADO estado_armario;`
  },

  {
    id: 'diagnostico-piezas-sobrantes',
    name: 'Demo: ERROR PIEZAS_SOBRANTES',
    description: 'Demuestra el principio Zero-Leftovers: una pieza olvidada en la caja activa el muñeco de IKEA en el gutter.',
    modelId: 'lack',
    category: 'diagnósticos',
    code: `MUEBLE TestPiezasSobrantes

HERRAMIENTAS {
    TRAER IMPRESORA
}

CAJA {
    TABLERO mesa = "Tablero Superior"
    // Esta pieza nunca se usa en ningún PASO -> activará ERROR: PIEZAS_SOBRANTES
    TORNILLO tornillo_olvidado_en_suelo = 1
}

MONTAJE {
    PASO 1: "Comenzar montaje" {
        IMPRESORA.ESCRIBIR("Montando " UNIR mesa)
    }
}

TERMINADO mesa;`
  }
];
