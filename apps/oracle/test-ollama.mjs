/**
 * Test script to verify Ollama + LangChain integration
 * Run with: node test-ollama.mjs
 */

import { ChatOllama } from '@langchain/ollama';

const model = new ChatOllama({
  baseUrl: 'http://localhost:11434',
  model: 'qwen2.5:3b',
  temperature: 0.1,
});

console.log('Testing Ollama connection...\n');

try {
  const response = await model.invoke([
    {
      role: 'user',
      content: 'Hello! Can you respond with just "working" if you receive this?',
    },
  ]);

  console.log('✅ Ollama is working!');
  console.log('Response:', response.content);
} catch (error) {
  console.error('❌ Error:', error.message);
}
