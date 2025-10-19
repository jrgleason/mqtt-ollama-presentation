import { DynamicTool } from '@langchain/core/tools';

export function createCalculatorTool() {
  return new DynamicTool({
    name: 'calculator',
    description: `
        Evaluates a basic arithmetic expression. Allowed tokens: digits, + - * / ( ) . % and ^ for exponent.
        Example inputs:
        - 2+2*3
        - (4+6)/2
        - 2^8
        Returns a plain text result or an error message if the input is invalid.`,
    func: async (input) => {
      try {
        let expr;

        if (typeof input === 'string' && input.startsWith('{')) {
          try {
            const parsed = JSON.parse(input);
            if (parsed && typeof parsed === 'object') {
              if (typeof parsed.input === 'string') {
                expr = parsed.input;
              } else if (typeof parsed.expression === 'string') {
                expr = parsed.expression;
              } else if (typeof parsed === 'string') {
                expr = parsed;
              } else {
                expr = String(parsed);
              }
            }
          } catch {
            expr = input;
          }
        } else {
          expr = input;
        }

        expr = String(expr ?? '').trim();
        if (!expr) return 'Error: empty expression';

        const cleaned = expr.replace(/\^/g, '**');

        const allowedChars = '0123456789+-*/().% ';
        for (const ch of cleaned) {
          if (ch === '*') continue;
          if (!allowedChars.includes(ch)) {
            return 'Error: invalid characters in expression';
          }
        }

        // eslint-disable-next-line no-new-func
        const result = Function('"use strict"; return (' + cleaned + ');')();

        if (typeof result === 'number' && Number.isFinite(result)) {
          return String(result);
        }

        return `Result: ${String(result)}`;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return `Error evaluating expression: ${message}`;
      }
    },
  });
}
