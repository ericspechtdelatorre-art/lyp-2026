// ============================================================================
// IKEALang v1.1 - Verification & Test Suite
// ============================================================================

import { Lexer } from '../src/core/lexer.ts';
import { Parser } from '../src/core/parser.ts';
import { Linter } from '../src/core/linter.ts';
import { Interpreter } from '../src/core/interpreter.ts';
import { Formatter } from '../src/core/formatter.ts';
import { SAMPLE_PROGRAMS } from '../src/core/samplePrograms.ts';

function runTests() {
  console.log('====================================================');
  console.log('   IKEALANG v1.1 AUTOMATED SYSTEM TEST SUITE        ');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`  ✓ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${testName}${detail ? ` -> ${detail}` : ''}`);
      failed++;
    }
  }

  // ----------------------------------------------------
  // TEST 1: Lexer Tokenizer
  // ----------------------------------------------------
  console.log('[1] Testing Lexer Tokenization...');
  const lexerInput = `MUEBLE Test CAJA { TORNILLO x = 4 } MONTAJE { PASO 1: "P" { x = x UNIR 2 } } TERMINADO x;`;
  const lexer = new Lexer(lexerInput);
  const tokens = lexer.tokenize();
  assert(tokens.length > 10, 'Lexer produces correct token stream');
  assert(tokens[0].type === 'MUEBLE', 'First token is MUEBLE');
  assert(tokens.some(t => t.type === 'TYPE_TORNILLO'), 'Recognizes TYPE_TORNILLO');
  assert(tokens.some(t => t.type === 'UNIR'), 'Recognizes UNIR operator');

  // ----------------------------------------------------
  // TEST 2: Parser on Official Canonical Samples
  // ----------------------------------------------------
  console.log('\n[2] Testing Parser on Official Specification Programs...');
  for (const sample of SAMPLE_PROGRAMS.slice(0, 5)) {
    const sLexer = new Lexer(sample.code);
    const sTokens = sLexer.tokenize();
    const sParser = new Parser(sTokens);
    const { ast, diagnostics } = sParser.parse();

    const syntaxErrors = diagnostics.filter(d => d.code === 'SINTAXIS');
    assert(
      syntaxErrors.length === 0 && ast !== null,
      `Parser parses canonical sample '${sample.name}'`,
      syntaxErrors.map(e => e.message).join('; ')
    );
    assert(ast?.montaje.length! > 0, `AST for '${sample.name}' contains PASO nodes`);
  }

  // ----------------------------------------------------
  // TEST 3: Linter - Zero-Leftover Principle (PIEZAS_SOBRANTES)
  // ----------------------------------------------------
  console.log('\n[3] Testing Strict Linter Rules...');
  const leftoverCode = `
MUEBLE TestSobrante
HERRAMIENTAS { TRAER IMPRESORA }
CAJA {
    TABLERO usada = "Tablero"
    TORNILLO olvidada = 4 // Not used anywhere!
}
MONTAJE {
    PASO 1: "Usar tablero" {
        IMPRESORA.ESCRIBIR(usada)
    }
}
TERMINADO usada;`;
  const p1 = new Parser(new Lexer(leftoverCode).tokenize()).parse();
  const linter1 = new Linter(p1.ast!);
  const diags1 = linter1.lint();
  const hasLeftover = diags1.some(d => d.code === 'PIEZAS_SOBRANTES' && d.message.includes('olvidada'));
  assert(hasLeftover, 'Linter flags PIEZAS_SOBRANTES for unused variable in CAJA');

  // ----------------------------------------------------
  // TEST 4: Linter - Concurrency Panic (PANICO_VUELCO)
  // ----------------------------------------------------
  const panicCode = `
MUEBLE TestVuelco
HERRAMIENTAS {
    TRAER "red/cliente_http" DEL_CATALOGO COMO Red
}
CAJA {
    TABLERO url = "https://api.ikea.org"
}
MONTAJE {
    PASO 1: "Peticion insegura" {
        // Red.GET without ENTRE_DOS -> PANICO: VUELCO
        TABLERO res = Red.GET(url)
    }
}
TERMINADO url;`;
  const p2 = new Parser(new Lexer(panicCode).tokenize()).parse();
  const linter2 = new Linter(p2.ast!);
  const diags2 = linter2.lint();
  const hasPanic = diags2.some(d => d.code === 'PANICO_VUELCO');
  assert(hasPanic, 'Linter flags PANICO_VUELCO for heavy network operation outside ENTRE_DOS');

  // ----------------------------------------------------
  // TEST 5: Linter - Missing Tool (FALTA_HERRAMIENTA)
  // ----------------------------------------------------
  const missingToolCode = `
MUEBLE TestFaltaHerramienta
HERRAMIENTAS { } // No tools imported!
CAJA { TABLERO t = "hola" }
MONTAJE {
    PASO 1: "Imprimir sin importar" {
        IMPRESORA.ESCRIBIR(t)
    }
}
TERMINADO t;`;
  const p3 = new Parser(new Lexer(missingToolCode).tokenize()).parse();
  const linter3 = new Linter(p3.ast!);
  const diags3 = linter3.lint();
  const hasMissingTool = diags3.some(d => d.code === 'FALTA_HERRAMIENTA');
  assert(hasMissingTool, 'Linter flags FALTA_HERRAMIENTA when invoking unimported tool IMPRESORA');

  // ----------------------------------------------------
  // TEST 6: Interpreter Virtual Assembly Execution
  // ----------------------------------------------------
  console.log('\n[4] Testing Virtual Assembly Interpreter...');
  const lackSample = SAMPLE_PROGRAMS[0]; // MesaAuxiliarLack
  const lackAst = new Parser(new Lexer(lackSample.code).tokenize()).parse().ast!;
  const interp = new Interpreter(lackAst);

  // Step 1
  const s1 = interp.step();
  assert(s1.currentStepIndex === 1, 'Interpreter advances to PASO 1');
  assert(s1.variables['estado'].value === 'Tablero listo boca abajo', 'PASO 1 updates variable estado');

  // Step 2
  const s2 = interp.step();
  assert(s2.currentStepIndex === 2, 'Interpreter advances to PASO 2');
  assert(s2.variables['tornillos_fijacion'].value === 0, 'PASO 2 consumes all screws (tornillos_fijacion === 0)');

  // Step 3 (Finish)
  const s3 = interp.step();
  assert(s3.status === 'completed', 'Interpreter finishes with status completed');
  assert(
    s3.returnValue === 'Mesa Lack ensamblada y estable',
    'TERMINADO returns correct assembled product string'
  );

  // ----------------------------------------------------
  // TEST 7: Bi-directional Formatter
  // ----------------------------------------------------
  console.log('\n[5] Testing AST Formatter & Round-Trip Serializer...');
  const formatted = Formatter.format(lackAst);
  const reparsed = new Parser(new Lexer(formatted).tokenize()).parse();
  assert(reparsed.ast !== null, 'Formatted code parses cleanly');
  assert(reparsed.ast?.mueble === lackAst.mueble, 'Preserves MUEBLE identifier across round-trip');
  assert(reparsed.ast?.montaje.length === lackAst.montaje.length, 'Preserves exact PASO count');

  // Final Summary
  console.log('\n====================================================');
  console.log(`   TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
