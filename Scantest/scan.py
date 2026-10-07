import os
import sys
import re
import uuid
from datetime import datetime
import cv2
from dotenv import load_dotenv
from google import genai
from google.genai import types

# Cargar variables de entorno desde el archivo .env
load_dotenv()

# Reglas de sintaxis y restricciones formales de IkeaLang v1.2.0
IKEALANG_SPEC = """
Eres un compilador y generador experto en IkeaLang v1.2.0 (Universal Furniture Release).
Tu tarea es analizar un conjunto de imágenes multi-ángulo de un mueble real capturadas con la cámara y escribir el archivo `.ikea` correspondiente.

Debes seguir rigurosamente estas reglas de sintaxis y diseño:
### 1. Estructura Obligatoria del Archivo

Todo programa debe escribirse en un archivo con extensión `.ikea` y seguir estrictamente este orden de bloques principales:

```ikea
MUEBLE NombreDelMueble

CAJA {
    // Declaración de inventario y variables
}

HERRAMIENTAS {
    // Importación de herramientas y módulos
}

MONTAJE {
    PASO 1: "Descripción" {
        // Instrucciones secuenciales
    }
}

TERMINADO variable_final

```

* **No se utilizan puntos y coma (`;`):** Cada declaración o instrucción va en su propia línea.


* **`TERMINADO`:** Debe ser la última línea del archivo y devolver la variable del mueble ensamblado.



---

### 2. Bloque `CAJA` (Inventario y Tipos de Datos)

En `CAJA` se declaran todas las variables con su tipo correspondiente. No se permiten expresiones ni cálculos complejos dentro de `CAJA`, únicamente valores literales.

| Tipo | Equivalente | Sintaxis de Declaración |
| --- | --- | --- |
| **`TABLERO`** | Texto / Cadenas | `TABLERO nombre = "Valor en texto"`<br> |
| **`TORNILLO`** | Números (enteros/decimales) | `TORNILLO patas = 4.0`<br> |
| **`ENCAJE`** | Booleano | `ENCAJE estado = AJUSTA` o `SUELTO`<br> |
| **`CAJON`** | Lista / Array | `CAJON piezas = []`<br> |

* **Zero-Magic:** Toda variable que se vaya a usar en `MONTAJE` debe existir previamente en la `CAJA`.



---

### 3. Bloque `HERRAMIENTAS` (Dependencias)

* Se importan librerías o herramientas exclusivamente con la directiva **`TRAER`**:


```ikea
HERRAMIENTAS {
    TRAER LLAVE_ALLEN
}

```


* No se admiten nombres de herramientas sueltos ni declaraciones de variables. Si no se usan herramientas externas, el bloque debe quedar vacío (`HERRAMIENTAS { }`).



---

### 4. Bloque `MONTAJE` y Operadores

Las instrucciones deben agruparse de forma obligatoria en pasos numerados: `PASO <numero>: "Descripcion" { ... }`.

#### Asignación

* Se realiza con la palabra clave **`COLOCAR`** (sin punto):


```ikea
variable COLOCAR expresion

```



#### Operadores Aritméticos y de Ensamblaje (Infijos)

* **`UNIR`** (suma o concatenación): `A UNIR B`

* **`RETIRAR`** (resta o desensamble): `A RETIRAR B`

* No llevan paréntesis de llamada ni comas (`UNIR(A, B)` es sintácticamente inválido).



#### Operadores de Comparación

* **`ENCAJA`** (igualdad estricta `==`): `variable ENCAJA valor`


#### Control de Flujo

* **Condicional:**
```ikea
SI variable ENCAJA AJUSTA {
    // Bloque verdadero
} SINO {
    // Bloque falso (opcional)
}

```


*(No existe la palabra clave `ENTONCES`)*.


* **Bucle fijo:**
```ikea
REPETIR <numero_o_variable> VECES {
    // Acciones a repetir
}

```


* **Bucle condicional:**
```ikea
MIENTRAS_AJUSTE (<condicion>) {
    // Acciones mientras encaje
}

```


* **Concurrencia obligatoria:**
```ikea
ENTRE_DOS {
    // Tareas pesadas de montaje simultáneo
}

```



---

### 5. Mensajes y Manejo de Errores

* **`AVISO("mensaje")`:** Imprime información o advertencias por consola.


* **`VOLCAR("mensaje")`:** Detiene la ejecución y lanza un pánico de montaje.



---

### 6. Reglas Estrictas del Linter

1. **`ERROR 101: PIEZAS_SOBRANTES`:**
* Cualquier variable declarada en `CAJA` debe ser leída o modificada en al menos un `PASO`.


* Cualquier herramienta importada con `TRAER` debe ser utilizada en el programa.


* En IkeaLang no pueden sobrar piezas en el suelo.




2. **`PANICO: VUELCO`:**
* Operaciones críticas o que involucren estructuras pesadas fallarán si no se ejecutan dentro de un bloque `ENTRE_DOS`.
   - Solo devuelve el bloque de código `.ikea` puro, sin explicaciones ni bloques de markdown circundantes.
"""

def capturar_tomas_mueble() -> list[bytes]:
    """Abre la cámara y guía la captura de 3 perspectivas del mueble."""
    angulos = [
        "1/3: VISTA FRONTAL (Enfoca el frontal completo)",
        "2/3: VISTA LATERAL (Muestra el perfil y profundidad)",
        "3/3: VISTA TRASERA / DETALLE DE UNIONES"
    ]
    
    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        print("Error: No se pudo acceder a la cámara web.")
        sys.exit(1)

    capturas_bytes = []
    
    print("\n[INICIANDO CAPTURA MULTI-ÁNGULO 3D]")
    print("Sigue las instrucciones en la ventana de la cámara.")

    for instruccion in angulos:
        frame_actual = None
        while True:
            ret, frame = cap.read()
            if not ret:
                print("Error al leer el frame de la cámara.")
                break

            # Indicadores en pantalla
            cv2.rectangle(frame, (10, 10), (620, 70), (0, 0, 0), -1)
            cv2.putText(frame, instruccion, (20, 35),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 255), 2)
            cv2.putText(frame, "ESPACIO: Tomar foto | Q / ESC: Salir", (20, 60),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)

            cv2.imshow("Analizador IkeaLang - Camara 3D", frame)
            key = cv2.waitKey(1) & 0xFF
            
            if key == 32:  # Barra espaciadora
                frame_actual = frame
                break
            elif key in (27, ord("q")):
                cap.release()
                cv2.destroyAllWindows()
                print("Captura cancelada por el usuario.")
                sys.exit(0)

        _, buffer = cv2.imencode(".jpg", frame_actual)
        capturas_bytes.append(buffer.tobytes())

    cap.release()
    cv2.destroyAllWindows()
    return capturas_bytes

def traducir_multiangulo_a_ikealang(imagenes: list[bytes]) -> str:
    """Envía las tomas a Gemini para analizar las piezas y generar el código IkeaLang."""
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        print("Error: No se encontró la variable GEMINI_API_KEY en el archivo .env.")
        sys.exit(1)

    client = genai.Client(api_key=api_key)

    partes = [types.Part.from_bytes(data=img, mime_type="image/jpeg") for img in imagenes]
    
    prompt = (
        "Se adjuntan 3 vistas (frontal, lateral y trasera/detalle) del mismo mueble. "
        "Realiza una reconstrucción conceptual 3D: "
        "1. Identifica el mueble y su modelo paramétrico (chair, lack, kallax, alex, etc.). "
        "2. Determina con certeza el recuento de piezas evitando oclusiones o puntos ciegos. "
        "3. Escribe el programa completo en IkeaLang respetando el principio Zero-Leftovers "
        "y utilizando exclusivamente los operadores del lenguaje (UNIR, RETIRAR, etc.)."
    )
    partes.append(prompt)

    print("\nProcesando reconstrucción 3D y sintetizando código IkeaLang con Gemini...")

    response = client.chat.send_message(
        model="gemini-2.5-flash",
        contents=partes,
        config=types.GenerateContentConfig(
            system_instruction=IKEALANG_SPEC,
            temperature=0.2,
        ),
    )

    codigo = response.text.strip()
    if codigo.startswith("```"):
        lineas = codigo.split("\n")
        codigo = "\n".join(lineas[1:-1] if lineas[-1].startswith("```") else lineas[1:])
    return codigo.strip()

def guardar_codigo_ikea(codigo: str, carpeta_destino: str = "muebles_generados") -> str:
    """Guarda el archivo en una carpeta específica con el formato 'mueble-xxx.ikea'."""
    os.makedirs(carpeta_destino, exist_ok=True)

    # Buscar el identificador del mueble en la línea 'MUEBLE <Nombre>'
    match = re.search(r"^\s*MUEBLE\s+([A-Za-z0-9_]+)", codigo, re.MULTILINE)
    
    sufijo_aleatorio = uuid.uuid4().hex[:4]

    if match:
        nombre_mueble = match.group(1).lower()
        nombre_archivo = f"mueble-{nombre_mueble}-{sufijo_aleatorio}.ikea"
    else:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        nombre_archivo = f"mueble-{timestamp}.ikea"

    ruta_archivo = os.path.join(carpeta_destino, nombre_archivo)

    with open(ruta_archivo, "w", encoding="utf-8") as f:
        f.write(codigo)

    return ruta_archivo

def main():
    # 1. Capturar las vistas 3D guiadas
    fotos = capturar_tomas_mueble()
    
    # 2. Generar el código según las reglas
    codigo_ikea = traducir_multiangulo_a_ikealang(fotos)

    print("\n" + "=" * 55)
    print(" CÓDIGO IKEALANG GENERADO ")
    print("=" * 55 + "\n")
    print(codigo_ikea)
    print("\n" + "=" * 55)

    # 3. Guardar en la carpeta designada
    carpeta_salida = "muebles_ikea"
    ruta_guardada = guardar_codigo_ikea(codigo_ikea, carpeta_destino=carpeta_salida)
    
    print(f"\n[OK] Fichero guardado exitosamente en: '{ruta_guardada}'")

if __name__ == "__main__":
    main()