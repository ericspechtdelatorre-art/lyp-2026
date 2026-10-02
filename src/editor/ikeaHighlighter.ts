// ============================================================================
// IKEALang v1.1 - Fast Regex Syntax Highlighter (VS Code Theme Palette)
// ============================================================================

export interface HighlightToken {
  type: 'keyword' | 'type' | 'tool' | 'operator' | 'string' | 'number' | 'comment' | 'punctuation' | 'text';
  text: string;
}

export function highlightIkeaLang(code: string): string {
  // Escape HTML entities first
  const escapeHtml = (str: string) =>
    str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

  // Process line by line
  const lines = code.split('\n');

  return lines
    .map((line) => {
      // 1. Comments
      const commentIdx = line.indexOf('//');
      let codePart = line;
      let commentPart = '';
      if (commentIdx !== -1) {
        codePart = line.substring(0, commentIdx);
        commentPart = line.substring(commentIdx);
      }

      // Tokenize strings
      let formatted = escapeHtml(codePart);

      // Strings
      formatted = formatted.replace(
        /(&quot;.*?&quot;|&#39;.*?&#39;|"[^"]*"|'[^']*')/g,
        '<span class="text-[#ce9178]">$1</span>'
      );

      // Numbers
      formatted = formatted.replace(
        /\b(\d+(\.\d+)?)\b/g,
        '<span class="text-[#b5cea8] font-bold">$1</span>'
      );

      // Structural Keywords
      formatted = formatted.replace(
        /\b(MUEBLE|HERRAMIENTAS|CAJA|MONTAJE|TERMINADO|PASO|PLANO|EXPORTAR)\b/g,
        '<span class="text-[#569cd6] font-bold">$1</span>'
      );

      // Control Flow Keywords
      formatted = formatted.replace(
        /\b(REPETIR|VECES|MIENTRAS_AJUSTE|POR_CADA|EN|SI|SINO_SI|SINO|ENTRE_DOS|AVISO|VOLCAR)\b/g,
        '<span class="text-[#c586c0] font-bold">$1</span>'
      );

      // Types
      formatted = formatted.replace(
        /\b(TORNILLO|TABLERO|ENCAJE|CAJON|FALTANTE|HUECO)\b/g,
        '<span class="text-[#4ec9b0] font-bold">$1</span>'
      );

      // Native Tools / Imports
      formatted = formatted.replace(
        /\b(TRAER|DEL_CATALOGO|DESDE|COMO)\b/g,
        '<span class="text-[#569cd6]">$1</span>'
      );

      formatted = formatted.replace(
        /\b(IMPRESORA|MATEMATICAS|NIVEL_BURBUJA|CRONOMETRO|FICHEROS|LLAVE_ALLEN|Red|Calc|Http)\b/g,
        '<span class="text-[#4fc1ff] font-bold">$1</span>'
      );

      // Operators
      formatted = formatted.replace(
        /\b(UNIR|RETIRAR|DUPLICAR|SECCIONAR|RESTO|COLOCAR|ENCAJA|NO_ENCAJA|MAS_LARGO|MAS_CORTO|Y_TAMBIEN|O_BIEN|INVERTIR)\b/g,
        '<span class="text-[#d16969] font-bold">$1</span>'
      );

      // Booleans
      formatted = formatted.replace(
        /\b(AJUSTA|SUELTO)\b/g,
        '<span class="text-[#569cd6] font-bold">$1</span>'
      );

      // Re-attach comment
      if (commentPart) {
        formatted += `<span class="text-[#6a9955] italic">${escapeHtml(commentPart)}</span>`;
      }

      return formatted || ' ';
    })
    .join('\n');
}
