/**
 * Calculator Tool
 *
 * Simple math expression evaluator exposed as a LangChain DynamicTool.
 * NOTE: This is intentionally minimal and sandboxed to basic arithmetic.
 */

import {DynamicTool} from '@langchain/core/tools';

export function createCalculatorTool() {
    return new DynamicTool({
        name: 'calculator',
        description: `Evaluates a basic arithmetic expression. Allowed tokens: digits, + - * / ( ) . % and ^ for exponent.

Example inputs:
- 2+2*3
- (4+6)/2
- 2^8

Returns a plain text result or an error message if the input is invalid.`,
        func: async (input: string) => {
            try {
                let expr: string;

                // Handle both direct string input and nested object input
                if (input.startsWith('{')) {
                    try {
                        const parsed = JSON.parse(input);
                        if (parsed.input && typeof parsed.input === 'string') {
                            // Handle nested format: {"input": "2+2*3"}
                            expr = parsed.input;
                        } else if (typeof parsed === 'string') {
                            // Handle JSON string format: "2+2*3"
                            expr = parsed;
                        } else {
                            // Handle direct object with expression field
                            expr = parsed.expression || parsed.input || String(parsed);
                        }
                    } catch {
                        // If JSON parsing fails, treat as direct string
                        expr = input;
                    }
                } else {
                    // Direct string input
                    expr = input;
                }

                expr = String(expr ?? '').trim();
                if (!expr) return 'Error: empty expression';

                // Convert ^ to ** for JS exponentiation
                const cleaned = expr.replace(/\^/g, '**');

                // Very small whitelist: only allow digits, whitespace, parentheses, decimal point and arithmetic operators
                const allowedChars = '0123456789+-*/().% ';
                for (const ch of cleaned) {
                    if (ch === '*') continue; // allow * (and **)
                    if (!allowedChars.includes(ch)) {
                        return 'Error: invalid characters in expression';
                    }
                }

                // Evaluate in a safe function scope
                const result = Function(`"use strict"; return (${cleaned});`)();

                if (typeof result === 'number' && Number.isFinite(result)) {
                    return String(result);
                }

                return `Result: ${String(result)}`;
            } catch (err) {
                // Narrow error type safely for linting
                const message = err instanceof Error ? err.message : String(err);
                return `Error evaluating expression: ${message}`;
            }
        },
    });
}
