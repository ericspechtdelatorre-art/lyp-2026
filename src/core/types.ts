// ============================================================================
// IKEALang v1.1 - Unified Abstract Syntax Tree (AST) & Type System Definitions
// ============================================================================

export type IkeaType = 
  | 'TORNILLO'   // Numeric type (float/int)
  | 'TABLERO'    // String / Text primitive
  | 'ENCAJE'     // Boolean type (AJUSTA = true, SUELTO = false)
  | 'CAJON'      // Array / Collection list
  | 'FALTANTE'   // Null / Empty
  | 'HUECO';     // Void

export type BinaryOperator = 
  | 'UNIR'       // + or concat
  | 'RETIRAR'    // - or remove
  | 'DUPLICAR'   // *
  | 'SECCIONAR'  // /
  | 'RESTO'      // %
  | 'ENCAJA'     // ==
  | 'NO_ENCAJA'  // !=
  | 'MAS_LARGO'  // >
  | 'MAS_CORTO'  // <
  | 'Y_TAMBIEN'  // &&
  | 'O_BIEN';    // ||

export type UnaryOperator = 'INVERTIR'; // !

// ---------------- AST Nodes ----------------

export interface SourceLocation {
  line: number;
  column: number;
  length?: number;
}

export interface ASTNode {
  type: string;
  loc: SourceLocation;
}

export interface ProgramNode extends ASTNode {
  type: 'Program';
  mueble: string;
  herramientas: ImportNode[];
  caja: VariableDeclarationNode[];
  planos: PlanoNode[];
  montaje: PasoNode[];
  terminado: ExpressionNode;
}

export interface ImportNode extends ASTNode {
  type: 'Import';
  target: string;
  importType: 'NATIVE' | 'CATALOG' | 'LOCAL';
  alias?: string;
  used?: boolean;
}

export interface VariableDeclarationNode extends ASTNode {
  type: 'VariableDeclaration';
  varType: IkeaType;
  elementType?: IkeaType; // for CAJON[T]
  name: string;
  initialValue: ExpressionNode;
  usedCount?: number;
}

export interface PlanoNode extends ASTNode {
  type: 'Plano';
  exported: boolean;
  name: string;
  params: { name: string; paramType: IkeaType }[];
  returnType: IkeaType;
  body: StatementNode[];
}

export interface PasoNode extends ASTNode {
  type: 'Paso';
  stepNumber: number;
  description: string;
  body: StatementNode[];
}

export type StatementNode = 
  | AssignmentNode
  | ExpressionStatementNode
  | SiNode
  | RepetirNode
  | MientrasAjusteNode
  | PorCadaNode
  | EntreDosNode
  | TerminadoNode;

export interface AssignmentNode extends ASTNode {
  type: 'Assignment';
  target: string;
  property?: string; // e.g. cajon.UNIR
  value: ExpressionNode;
}

export interface ExpressionStatementNode extends ASTNode {
  type: 'ExpressionStatement';
  expression: ExpressionNode;
}

export interface SiNode extends ASTNode {
  type: 'Si';
  condition: ExpressionNode;
  consequent: StatementNode[];
  alternate?: StatementNode[];
}

export interface RepetirNode extends ASTNode {
  type: 'Repetir';
  count: ExpressionNode;
  body: StatementNode[];
}

export interface MientrasAjusteNode extends ASTNode {
  type: 'MientrasAjuste';
  condition: ExpressionNode;
  body: StatementNode[];
}

export interface PorCadaNode extends ASTNode {
  type: 'PorCada';
  item: string;
  collection: ExpressionNode;
  body: StatementNode[];
}

export interface EntreDosNode extends ASTNode {
  type: 'EntreDos';
  body: StatementNode[];
}

export interface TerminadoNode extends ASTNode {
  type: 'Terminado';
  value: ExpressionNode;
}

// Expressions
export type ExpressionNode = 
  | LiteralNode
  | IdentifierNode
  | BinaryExpressionNode
  | UnaryExpressionNode
  | CallExpressionNode
  | MemberCallExpressionNode
  | ArrayLiteralNode;

export interface LiteralNode extends ASTNode {
  type: 'Literal';
  valueType: IkeaType;
  value: number | string | boolean | null | any[];
}

export interface IdentifierNode extends ASTNode {
  type: 'Identifier';
  name: string;
}

export interface BinaryExpressionNode extends ASTNode {
  type: 'BinaryExpression';
  operator: BinaryOperator;
  left: ExpressionNode;
  right: ExpressionNode;
}

export interface UnaryExpressionNode extends ASTNode {
  type: 'UnaryExpression';
  operator: UnaryOperator;
  argument: ExpressionNode;
}

export interface CallExpressionNode extends ASTNode {
  type: 'CallExpression';
  callee: string; // e.g. AVISO, VOLCAR, etc.
  args: ExpressionNode[];
}

export interface MemberCallExpressionNode extends ASTNode {
  type: 'MemberCallExpression';
  object: string; // e.g. IMPRESORA, herrajes, Red, MATEMATICAS
  method: string; // e.g. ESCRIBIR, UNIR, RAIZ
  args: ExpressionNode[];
}

export interface ArrayLiteralNode extends ASTNode {
  type: 'ArrayLiteral';
  elements: ExpressionNode[];
}

// ---------------- Diagnostics & Linting ----------------

export type DiagnosticSeverity = 'error' | 'warning' | 'info';

export interface Diagnostic {
  id: string;
  code: 'PIEZAS_SOBRANTES' | 'TORNILLO_PASADO' | 'FALTA_HERRAMIENTA' | 'CATALOGO_NO_ENCONTRADO' | 'PANICO_VUELCO' | 'SINTAXIS' | 'INFO';
  message: string;
  severity: DiagnosticSeverity;
  line: number;
  column: number;
  endLine?: number;
  endColumn?: number;
  details?: string;
  mascotHint?: string;
  quickFixSuggestion?: string;
}

// ---------------- Runtime Environment ----------------

export interface MemoryVariable {
  name: string;
  type: IkeaType;
  value: any;
  declaredInCaja: boolean;
  usedInMontaje: boolean;
}

export interface ExecutionLog {
  timestamp: string;
  stepNumber?: number;
  type: 'print' | 'warning' | 'panic' | 'step' | 'worker';
  message: string;
}

export interface ExecutionState {
  status: 'idle' | 'running' | 'paused' | 'completed' | 'error';
  currentStepIndex: number; // 0 to pasos.length - 1
  totalSteps: number;
  variables: Record<string, MemoryVariable>;
  logs: ExecutionLog[];
  returnValue?: any;
  error?: string;
  activeWorkerLanes: number;
}

// ---------------- Furniture Architecture & 3D Models ----------------

export type FurnitureModelId = 'lack' | 'kallax' | 'alex' | 'pax' | 'wardrobe' | 'chair' | 'bed' | 'generic';

export function detectFurnitureModel(muebleName?: string, code?: string): FurnitureModelId {
  const text = ((muebleName || '') + ' ' + (code || '')).toLowerCase();
  if (text.includes('silla') || text.includes('chair') || text.includes('asiento') || text.includes('ingolf')) {
    return 'chair';
  }
  if (text.includes('cama') || text.includes('bed') || text.includes('somier') || text.includes('malm')) {
    return 'bed';
  }
  if (text.includes('armario') || text.includes('wardrobe') || text.includes('pax') || text.includes('ropero') || text.includes('closet')) {
    return 'wardrobe';
  }
  if (text.includes('cajon') || text.includes('alex') || text.includes('gaveta') || text.includes('drawer')) {
    return 'alex';
  }
  if (text.includes('estanteria') || text.includes('kallax') || text.includes('billy') || text.includes('shelf') || text.includes('balda')) {
    return 'kallax';
  }
  if (text.includes('mesa') || text.includes('lack') || text.includes('table') || text.includes('escritorio')) {
    return 'lack';
  }
  return 'generic';
}
