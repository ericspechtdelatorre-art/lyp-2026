import sys
import random
import re

NORDIC_CHARS = set("åäöÅÄÖøØæÆ")

class IkeaInterpreter:
    def __init__(self, defect_rate=True):
        self.stack = []
        self.defect_rate = defect_rate

    def validate_syntax(self, lines):
        for line in lines:
            if line.startswith("[L]"):
                name = line.replace("[L]", "").strip()
                if not any(c in NORDIC_CHARS for c in name):
                    raise SyntaxError(
                        f"Fel i monteringen: La estructura '{name}' carece de vocales nórdicas (å, ä, ö, ø)."
                    )

    def execute(self, code: str):
        # 1. Leer de abajo hacia arriba y limpiar líneas vacías
        raw_lines = [l.strip() for l in code.strip().split("\n") if l.strip()]
        instructions = list(reversed(raw_lines))

        # 2. Validar nombres de muebles
        self.validate_syntax(instructions)

        # 3. El Fallo del Montador: perder un tornillo (una instrucción)
        if self.defect_rate and len(instructions) > 2:
            lost_idx = random.randint(1, len(instructions) - 1)
            print(f"/* AVISO: Se ha perdido la pieza en paso {lost_idx + 1} ({instructions[lost_idx]}) */")
            instructions.pop(lost_idx)

        # 4. Bucle de ejecución
        pc = 0
        while pc < len(instructions):
            inst = instructions[pc]

            if inst.startswith("[L]"):
                pass  # Declaración de estructura

            elif inst.startswith("---#"):
                val = int(inst.split()[1])
                self.stack.append(val)

            elif inst == "###>":
                if len(self.stack) >= 2:
                    b = self.stack.pop()
                    a = self.stack.pop()
                    self.stack.append(a + b)

            elif inst.startswith("<###"):
                val = int(inst.split()[1])
                if self.stack:
                    self.stack[-1] -= val

            elif inst == "[!]":
                if self.stack:
                    print(f"UDGÅNG (Output): {self.stack[-1]}")

            elif inst.startswith("[?]"):
                # Salto condicional si el tope es <= 0
                if self.stack and self.stack[-1] <= 0:
                    break

            pc += 1

# Prueba de ejecución directa
if __name__ == "__main__":
    programa = """
    [!]
    ###>
    ---# 2
    ---# 40
    [L] BÖRK_BORD
    """
    
    print("--- Ensamblando mueble (Ejecución 1: puede faltar un tornillo) ---")
    interp = IkeaInterpreter(defect_rate=True)
    try:
        interp.execute(programa)
    except Exception as e:
        print(f"Error de ensamblaje: {e}")