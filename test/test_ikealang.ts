// ============================================================================
// IKEALang v1.2 - Universal Furniture Verification & Test Suite
// ============================================================================

import { Lexer } from '../src/core/lexer.ts';
import { Parser } from '../src/core/parser.ts';
import { Linter } from '../src/core/linter.ts';
import { Interpreter } from '../src/core/interpreter.ts';
import { Formatter } from '../src/core/formatter.ts';
import { SAMPLE_PROGRAMS } from '../src/core/samplePrograms.ts';
import { detectFurnitureModel } from '../src/core/types.ts';

async function runTests() {
  console.log('====================================================');
  console.log('   IKEALANG v1.2 UNIVERSAL FURNITURE TEST SUITE     ');
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
  // TEST 2: Parser on All Universal Furniture Types
  // ----------------------------------------------------
  console.log('\n[2] Testing Parser on Universal Furniture (Sillas, Camas, Armarios, etc.)...');
  for (const sample of SAMPLE_PROGRAMS) {
    const sLexer = new Lexer(sample.code);
    const sTokens = sLexer.tokenize();
    const sParser = new Parser(sTokens);
    const { ast, diagnostics } = sParser.parse();

    const syntaxErrors = diagnostics.filter(d => d.code === 'SINTAXIS');
    assert(
      syntaxErrors.length === 0 && ast !== null,
      `Parser parses furniture '${sample.name}' (${sample.modelId})`,
      syntaxErrors.map(e => e.message).join('; ')
    );
    assert(ast?.montaje.length! > 0, `AST for '${sample.name}' contains PASO nodes`);
  }

  // ----------------------------------------------------
  // TEST 3: Dynamic Model Inference for All Categories
  // ----------------------------------------------------
  console.log('\n[3] Testing Dynamic 3D Model Detection...');
  assert(detectFurnitureModel('SillaComedor') === 'chair', 'Detects chair from SillaComedor');
  assert(detectFurnitureModel('CamaMatrimonio') === 'bed', 'Detects bed from CamaMatrimonio');
  assert(detectFurnitureModel('ArmarioPaxModular') === 'wardrobe', 'Detects wardrobe from ArmarioPaxModular');
  assert(detectFurnitureModel('CajoneraAlex5Cajones') === 'alex', 'Detects alex/drawers from CajoneraAlex');
  assert(detectFurnitureModel('EstanteriaKallax2x2') === 'kallax', 'Detects kallax from EstanteriaKallax');
  assert(detectFurnitureModel('MesaAuxiliarLack') === 'lack', 'Detects lack from MesaAuxiliarLack');

  // ----------------------------------------------------
  // TEST 4: Linter - Zero-Leftover Principle (PIEZAS_SOBRANTES)
  // ----------------------------------------------------
  console.log('\n[4] Testing Strict Linter Rules & Zero-Leftovers...');
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
  // TEST 5: Universal Stability - Zero False Stability Panics
  // ----------------------------------------------------
  console.log('\n[5] Testing Universal Stability (No False Stability Panics)...');
  for (const sample of SAMPLE_PROGRAMS.filter(s => s.id !== 'diagnostico-piezas-sobrantes')) {
    const ast = new Parser(new Lexer(sample.code).tokenize()).parse().ast!;
    const linter = new Linter(ast);
    const diags = linter.lint();
    const errors = diags.filter(d => d.severity === 'error');
    assert(
      errors.length === 0,
      `Furniture '${sample.name}' passes linter cleanly with 0 stability errors`,
      errors.map(e => e.message).join('; ')
    );
  }

  // ----------------------------------------------------
  // TEST 6: Execution of Silla, Cama & Mesa in Virtual Interpreter
  // ----------------------------------------------------
  console.log('\n[6] Testing Virtual Assembly Execution for Chairs, Beds & Tables...');

  // 6.1 Silla INGOLF
  const chairSample = SAMPLE_PROGRAMS.find(s => s.id === 'silla-ingolf')!;
  const chairAst = new Parser(new Lexer(chairSample.code).tokenize()).parse().ast!;
  const chairInterp = new Interpreter(chairAst);
  chairInterp.executeAll();
  const chairState = chairInterp.getState();
  assert(chairState.status === 'completed', 'Chair INGOLF finishes assembly completely');
  assert(chairState.variables['tornillos_ensamble'].value === 0, 'All chair screws consumed without leftovers');

  // 6.2 Cama MALM
  const bedSample = SAMPLE_PROGRAMS.find(s => s.id === 'cama-malm')!;
  const bedAst = new Parser(new Lexer(bedSample.code).tokenize()).parse().ast!;
  const bedInterp = new Interpreter(bedAst);
  bedInterp.executeAll();
  const bedState = bedInterp.getState();
  assert(bedState.status === 'completed', 'Bed MALM finishes assembly completely');
  assert(bedState.variables['pernos_acero'].value === 0, 'All bed steel bolts consumed');

  // 6.3 Mesa LACK
  const lackSample = SAMPLE_PROGRAMS.find(s => s.id === 'mesa-lack')!;
  const lackAst = new Parser(new Lexer(lackSample.code).tokenize()).parse().ast!;
  const lackInterp = new Interpreter(lackAst);
  lackInterp.executeAll();
  const lackState = lackInterp.getState();
  assert(lackState.status === 'completed', 'Table LACK finishes assembly completely');

  // ----------------------------------------------------
  // TEST 7: Bi-directional Formatter Round-Trip
  // ----------------------------------------------------
  console.log('\n[7] Testing AST Formatter & Round-Trip Serializer...');
  const formatted = Formatter.format(chairAst);
  const reparsed = new Parser(new Lexer(formatted).tokenize()).parse();
  assert(reparsed.ast !== null, 'Formatted code parses cleanly');
  assert(reparsed.ast?.mueble === chairAst.mueble, 'Preserves MUEBLE identifier across round-trip');
  assert(reparsed.ast?.montaje.length === chairAst.montaje.length, 'Preserves exact PASO count');

  // ----------------------------------------------------
  // TEST 8: Scanner JSON Contract & Code Synthesizer Bridge
  // ----------------------------------------------------
  console.log('\n[8] Testing Scanner JSON Contract & Code Synthesizer Bridge...');
  const { ScannerApiClient } = await import('../src/scanner/scannerApi.ts');
  const { synthesizeFromScanDTO } = await import('../src/scanner/modoA/codeSynthesizer.ts');

  const testClient = new ScannerApiClient();
  const testModels = ['Mesa', 'Silla', 'Estanteria', 'Cajonera'];

  for (const model of testModels) {
    const dto = await testClient.fetchSample(model);
    assert(dto.primitives.length > 0, `DTO for ${model} contains geometric primitives`);
    assert(dto.assembly_hierarchy.length > 0, `DTO for ${model} contains assembly steps`);

    const synth = synthesizeFromScanDTO(dto);
    assert(synth.sourceCode.includes('MUEBLE'), `Synthesized code for ${model} starts with MUEBLE`);

    // Parse synthesized IkeaLang code
    const synthLexer = new Lexer(synth.sourceCode);
    const synthTokens = synthLexer.tokenize();
    const synthParser = new Parser(synthTokens);
    const parseResult = synthParser.parse();
    assert(parseResult.ast !== null, `Synthesized code for ${model} parses cleanly`);

    // Lint synthesized code for zero-leftovers and stability
    if (parseResult.ast) {
      const linter = new Linter(parseResult.ast);
      const diagnostics = linter.lint();
      const errors = diagnostics.filter(d => d.severity === 'error');
      assert(
        errors.length === 0,
        `Synthesized code for ${model} has 0 linter errors`,
        errors.map(e => `${e.code}: ${e.message}`).join('; ')
      );

      // Verify execution in interpreter
      const interp = new Interpreter(parseResult.ast);
      interp.executeAll();
      const state = interp.getState();
      assert(state.status === 'completed', `Synthesized code for ${model} executes completely in interpreter`);
    }
  }

  // Final Summary
  console.log('\n====================================================');
  console.log(`   TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
