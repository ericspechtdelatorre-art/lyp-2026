// ============================================================================
// IKEALang v1.1 IDE - VS Code Architecture, Hierarchical FS & Separate Windows
// ============================================================================

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Lexer } from './core/lexer.ts';
import { Parser } from './core/parser.ts';
import { Linter } from './core/linter.ts';
import { Interpreter } from './core/interpreter.ts';
import { Formatter } from './core/formatter.ts';
import {
  FSItem,
  loadFileSystem,
  saveFileSystem,
  createInitialFileSystem,
} from './core/fileSystem.ts';
import { ProgramNode, Diagnostic, ExecutionState, detectFurnitureModel } from './core/types.ts';

// VS Code Components
import { ActivityBar } from './vscode/ActivityBar.tsx';
import { SidebarExplorer } from './vscode/SidebarExplorer.tsx';
import { EditorTabs } from './vscode/EditorTabs.tsx';
import { StatusBar } from './vscode/StatusBar.tsx';
import { ProblemsPanel } from './vscode/ProblemsPanel.tsx';
import { VSCodeEditor } from './editor/VSCodeEditor.tsx';

// Workspaces & Interpreter Window
import { WorkspaceMode } from './components/Header.tsx';
import { BlockCanvas } from './visual/BlockCanvas.tsx';
import { FurnitureScanner } from './scanner/FurnitureScanner.tsx';
import { InterpreterWindow } from './interpreterWindow/InterpreterWindow.tsx';
import { MascotAdvisor } from './components/MascotAdvisor.tsx';
import { DocsModal } from './components/DocsModal.tsx';
import { soundEffects } from './components/AudioEffects.ts';

export const App: React.FC = () => {
  // 1. Hierarchical Virtual File System (Files & Directories)
  const [fsItems, setFsItems] = useState<FSItem[]>(() => loadFileSystem());

  // Save to localStorage whenever fsItems change
  useEffect(() => {
    saveFileSystem(fsItems);
  }, [fsItems]);

  // Find initial active file (default to 'main.ikea' or first file found)
  const [activeFileId, setActiveFileId] = useState<string>(() => {
    const mainFile = fsItems.find(i => i.type === 'file' && i.name === 'main.ikea');
    if (mainFile) return mainFile.id;
    const firstFile = fsItems.find(i => i.type === 'file');
    return firstFile ? firstFile.id : 'default-file';
  });

  const activeFile = useMemo(() => {
    return (
      fsItems.find(i => i.id === activeFileId && i.type === 'file') ||
      fsItems.find(i => i.type === 'file') || {
        id: 'fallback-file',
        name: 'sin_titulo.ikea',
        type: 'file' as const,
        parentId: null,
        content: '',
      }
    );
  }, [fsItems, activeFileId]);

  const [code, setCode] = useState<string>(activeFile.content);

  // Synchronize editor buffer when active file changes
  useEffect(() => {
    setCode(activeFile.content);
  }, [activeFile.id]);

  // Update file content when user types
  const handleCodeChange = (newCode: string) => {
    setCode(newCode);
    setFsItems(prev =>
      prev.map(item => (item.id === activeFile.id ? { ...item, content: newCode } : item))
    );
  };

  // Create new File or Directory
  const handleCreateItem = (name: string, type: 'file' | 'directory', parentId: string | null) => {
    soundEffects.playWoodenSnap();
    const newId = `${type}-${Date.now()}`;
    const newItem: FSItem = {
      id: newId,
      name,
      type,
      parentId,
      content: '', // Creates completely empty file!
      isOpen: true,
    };

    setFsItems(prev => [...prev, newItem]);

    if (type === 'file') {
      setActiveFileId(newId);
      setCode('');
    }
  };

  // Delete item (and its recursive children if directory)
  const handleDeleteItem = (id: string) => {
    soundEffects.playWoodenSnap();

    // Collect all recursive child IDs if it's a directory
    const idsToDelete = new Set<string>([id]);
    let added = true;
    while (added) {
      added = false;
      fsItems.forEach(item => {
        if (item.parentId && idsToDelete.has(item.parentId) && !idsToDelete.has(item.id)) {
          idsToDelete.add(item.id);
          added = true;
        }
      });
    }

    setFsItems(prev => prev.filter(item => !idsToDelete.has(item.id)));

    // If active file was deleted, switch to another file
    if (idsToDelete.has(activeFile.id)) {
      const remainingFiles = fsItems.filter(i => i.type === 'file' && !idsToDelete.has(i.id));
      if (remainingFiles.length > 0) {
        setActiveFileId(remainingFiles[0].id);
        setCode(remainingFiles[0].content);
      } else {
        // Create a blank main.ikea
        handleCreateItem('main.ikea', 'file', null);
      }
    }
  };

  // Toggle directory open/closed
  const handleToggleDirectory = (id: string) => {
    setFsItems(prev =>
      prev.map(item => (item.id === id ? { ...item, isOpen: !item.isOpen } : item))
    );
  };

  // Reset File System to initial clean state with examples folder
  const handleResetFileSystem = () => {
    soundEffects.playWoodenSnap();
    const initial = createInitialFileSystem();
    setFsItems(initial);
    const mainFile = initial.find(i => i.name === 'main.ikea');
    if (mainFile) {
      setActiveFileId(mainFile.id);
      setCode(mainFile.content);
    }
  };

  // 2. UI & Workspace State
  const [mode, setMode] = useState<WorkspaceMode>('editor');
  const [splitView, setSplitView] = useState<boolean>(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);
  const [isInterpreterOpen, setIsInterpreterOpen] = useState<boolean>(false);
  const [isProblemsOpen, setIsProblemsOpen] = useState<boolean>(false);
  const [isDocsOpen, setIsDocsOpen] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [breakpoints, setBreakpoints] = useState<number[]>([]);
  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 });

  // 3. Debounced Parse & Lint Pipeline -> Unified AST
  const [debouncedCode, setDebouncedCode] = useState<string>(code);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedCode(code);
    }, 70);
    return () => clearTimeout(timer);
  }, [code]);

  const { ast, diagnostics } = useMemo(() => {
    try {
      const lexer = new Lexer(debouncedCode);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const { ast: parsedAst, diagnostics: parseDiags } = parser.parse();

      if (parsedAst) {
        const linter = new Linter(parsedAst);
        const lintDiags = linter.lint();
        return {
          ast: parsedAst,
          diagnostics: [...parseDiags, ...lintDiags],
        };
      }

      return { ast: null, diagnostics: parseDiags };
    } catch (err: any) {
      return {
        ast: null,
        diagnostics: [
          {
            id: 'err-fatal',
            code: 'SINTAXIS' as const,
            message: err.message || 'Error de parseo',
            severity: 'error' as const,
            line: 1,
            column: 1,
          },
        ],
      };
    }
  }, [debouncedCode]);

  // 4. Execution & Debugging Engine
  const [executionState, setExecutionState] = useState<ExecutionState>(() => {
    if (ast) {
      const interp = new Interpreter(ast);
      return interp.getState();
    }
    return {
      status: 'idle',
      currentStepIndex: 0,
      totalSteps: 0,
      variables: {},
      logs: [],
      activeWorkerLanes: 0,
    };
  });

  const interpreterRef = useRef<Interpreter | null>(null);

  useEffect(() => {
    if (ast) {
      const interp = new Interpreter(ast, (newState) => {
        setExecutionState({ ...newState });
      });
      interpreterRef.current = interp;
      setExecutionState(interp.getState());
    }
  }, [ast?.mueble, ast?.montaje.length]);

  const hasFatalErrors = diagnostics.some(d => d.severity === 'error');

  // Execution Handlers
  const handleRunAll = () => {
    if (!ast || hasFatalErrors) return;
    const interp = new Interpreter(ast, (s) => setExecutionState({ ...s }));
    interpreterRef.current = interp;
    interp.executeAll();
  };

  const handleStep = () => {
    if (!ast || hasFatalErrors) return;
    if (!interpreterRef.current) {
      interpreterRef.current = new Interpreter(ast, (s) => setExecutionState({ ...s }));
    }
    interpreterRef.current.step();
  };

  const handleReset = () => {
    if (!ast) return;
    const interp = new Interpreter(ast, (s) => setExecutionState({ ...s }));
    interpreterRef.current = interp;
    interp.reset();
  };

  const handleFormat = () => {
    if (!ast) return;
    soundEffects.playRatchet();
    const formatted = Formatter.format(ast);
    handleCodeChange(formatted);
  };

  // Quick Fix Action
  const handleApplyQuickFix = (fixSuggestion: string) => {
    soundEffects.playCelebration();
    if (fixSuggestion.startsWith('MUEBLE')) {
      handleCodeChange(fixSuggestion);
    } else if (fixSuggestion.includes('TRAER')) {
      const toolMatch = fixSuggestion.match(/TRAER\s+(\w+)/);
      if (toolMatch && ast) {
        const nextAst: ProgramNode = {
          ...ast,
          herramientas: [
            ...ast.herramientas,
            {
              type: 'Import',
              target: toolMatch[1],
              importType: 'NATIVE',
              loc: { line: 1, column: 1 },
            },
          ],
        };
        handleCodeChange(Formatter.format(nextAst));
      }
    }
  };

  // Bi-directional Visual Block Sync -> Code
  const handleASTChangeFromBlocks = (newAst: ProgramNode) => {
    const formattedCode = Formatter.format(newAst);
    handleCodeChange(formattedCode);
  };

  // Breakpoint toggle
  const handleBreakpointToggle = (line: number) => {
    soundEffects.playWoodenSnap();
    setBreakpoints(prev =>
      prev.includes(line) ? prev.filter(l => l !== line) : [...prev, line]
    );
  };

  // Transfer code from Mode 3 (Scanner) to Editor
  const handleTransferFromScanner = (scannedCode: string) => {
    handleCodeChange(scannedCode);
    setMode('editor');
    soundEffects.playCelebration();
  };

  // Compute file path breadcrumb
  const currentFilePath = useMemo(() => {
    if (!activeFile.parentId) return 'raíz';
    const parentFolder = fsItems.find(i => i.id === activeFile.parentId);
    return parentFolder ? parentFolder.name : 'workspace';
  }, [activeFile, fsItems]);

  return (
    <div className="w-screen h-screen flex flex-col bg-[#1e1e1e] text-[#cccccc] font-sans overflow-hidden select-none">
      {/* Main VS Code Shell Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* 1. Activity Bar (Leftmost icon strip) */}
        <ActivityBar
          currentMode={mode}
          onModeChange={setMode}
          isSidebarOpen={isSidebarOpen}
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          onOpenInterpreter={() => setIsInterpreterOpen(true)}
          onOpenDocs={() => setIsDocsOpen(true)}
          soundEnabled={soundEnabled}
          onToggleSound={() => {
            soundEffects.enabled = !soundEnabled;
            setSoundEnabled(!soundEnabled);
          }}
          splitView={splitView}
          onToggleSplitView={() => setSplitView(!splitView)}
          interpreterActive={executionState.status === 'running'}
        />

        {/* 2. Collapsible Sidebar (Hierarchical Files & Folders) */}
        {isSidebarOpen && (
          <SidebarExplorer
            items={fsItems}
            activeFileId={activeFile.id}
            onSelectFile={(f) => {
              soundEffects.playWoodenSnap();
              setActiveFileId(f.id);
            }}
            onCreateItem={handleCreateItem}
            onDeleteItem={handleDeleteItem}
            onToggleDirectory={handleToggleDirectory}
            onResetFileSystem={handleResetFileSystem}
            ast={ast}
          />
        )}

        {/* 3. Editor & Workspace Area */}
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#1e1e1e]">
          {/* Editor Tabs & Breadcrumbs Bar */}
          <EditorTabs
            activeFileName={activeFile.name}
            filePath={currentFilePath}
            onOpenInterpreter={() => setIsInterpreterOpen(true)}
            onFormat={handleFormat}
            splitView={splitView}
            onToggleSplitView={() => setSplitView(!splitView)}
            muebleName={ast?.mueble}
          />

          {/* Main Content Pane */}
          <div className="flex-1 relative overflow-hidden flex flex-col">
            <div className="flex-1 relative overflow-hidden">
              {/* MODE 1: Mesa de Taller (Code Editor) */}
              {mode === 'editor' && !splitView && (
                <div className="w-full h-full">
                  <VSCodeEditor
                    code={code}
                    onChange={handleCodeChange}
                    diagnostics={diagnostics}
                    breakpoints={breakpoints}
                    onBreakpointToggle={handleBreakpointToggle}
                    onCursorChange={(line, col) => setCursorPos({ line, col })}
                    onApplyQuickFix={handleApplyQuickFix}
                    theme="dark"
                  />
                </div>
              )}

              {/* MODE 2: Caja de Montaje (Visual Blocks) */}
              {mode === 'visual' && !splitView && (
                <div className="w-full h-full">
                  <BlockCanvas
                    ast={ast}
                    onProgramChange={handleASTChangeFromBlocks}
                    activeStepIndex={executionState.currentStepIndex - 1}
                    onExecutePaso={() => handleStep()}
                  />
                </div>
              )}

              {/* SPLIT VIEW (Code on Left, Visual Blocks on Right) */}
              {splitView && mode !== 'scanner' && (
                <div className="w-full h-full flex">
                  <div className="w-1/2 h-full border-r border-[#2d2d2d]">
                    <VSCodeEditor
                      code={code}
                      onChange={handleCodeChange}
                      diagnostics={diagnostics}
                      breakpoints={breakpoints}
                      onBreakpointToggle={handleBreakpointToggle}
                      onCursorChange={(line, col) => setCursorPos({ line, col })}
                      onApplyQuickFix={handleApplyQuickFix}
                      theme="dark"
                    />
                  </div>
                  <div className="w-1/2 h-full">
                    <BlockCanvas
                      ast={ast}
                      onProgramChange={handleASTChangeFromBlocks}
                      activeStepIndex={executionState.currentStepIndex - 1}
                    />
                  </div>
                </div>
              )}

              {/* MODE 3: Escáner de Despiece (CV & AR) */}
              {mode === 'scanner' && (
                <FurnitureScanner onTransferCode={handleTransferFromScanner} />
              )}
            </div>

            {/* Bottom Problems Panel (Collapsible) */}
            {mode === 'editor' && (
              <ProblemsPanel
                diagnostics={diagnostics}
                logs={executionState.logs}
                isOpen={isProblemsOpen}
                onToggleOpen={() => setIsProblemsOpen(!isProblemsOpen)}
                onSelectLine={(line) => setCursorPos(prev => ({ ...prev, line }))}
                onClearLogs={() => {
                  if (interpreterRef.current) {
                    const s = interpreterRef.current.getState();
                    s.logs = [];
                    setExecutionState({ ...s });
                  }
                }}
                fileName={activeFile.name}
              />
            )}
          </div>
        </div>
      </div>

      {/* 4. VS Code Status Bar */}
      <StatusBar
        diagnostics={diagnostics}
        executionState={executionState}
        onOpenInterpreter={() => setIsInterpreterOpen(true)}
        currentMode={mode}
        cursorLine={cursorPos.line}
        cursorCol={cursorPos.col}
      />

      {/* 5. Standalone / Pop-out Interpreter Window */}
      <InterpreterWindow
        isOpen={isInterpreterOpen}
        onClose={() => setIsInterpreterOpen(false)}
        executionState={executionState}
        onRunAll={handleRunAll}
        onStep={handleStep}
        onReset={handleReset}
        onFormat={handleFormat}
        hasErrors={hasFatalErrors}
        modelId={detectFurnitureModel(ast?.mueble, code)}
        ast={ast}
        onClearLogs={() => {
          if (interpreterRef.current) {
            const s = interpreterRef.current.getState();
            s.logs = [];
            setExecutionState({ ...s });
          }
        }}
      />

      {/* 6. Mascot Advisor (Gubbe) */}
      <MascotAdvisor
        diagnostics={diagnostics}
        executionState={executionState}
      />

      {/* 7. Documentation Modal */}
      <DocsModal
        isOpen={isDocsOpen}
        onClose={() => setIsDocsOpen(false)}
      />
    </div>
  );
};
