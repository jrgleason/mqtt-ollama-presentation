#!/usr/bin/env node
/**
 * Ollama Performance Benchmark Script
 *
 * Measures Ollama inference latency for the optimize-ollama-performance proposal.
 * Run this script with Ollama running to verify performance optimizations.
 *
 * Usage:
 *   cd apps/voice-gateway-oww
 *   node scripts/benchmark-ollama.js
 *
 * Prerequisites:
 *   - Ollama running: ollama serve
 *   - Model downloaded: ollama pull qwen3:0.6b (or your configured model)
 *
 * Expected Results:
 *   - Tool-call query: <2s (target)
 *   - Non-tool query: <1s (target)
 *   - First query may be slower due to model loading
 */

import { config } from '../src/config.js';

// Performance targets from the proposal
const TARGETS = {
    toolCallQuery: 2000,    // <2s for queries requiring tool calls
    nonToolQuery: 1000,     // <1s for simple queries
    warmupQuery: 30000,     // 30s timeout for warmup (cold start)
};

// Test prompts
const PROMPTS = {
    warmup: 'Hello',
    simple: 'What is 2 plus 2?',
    deviceQuery: 'List all the lights in my house',
    timeQuery: 'What time is it?',
};

async function sendQuery(prompt, options = {}) {
    const startTime = Date.now();
    const body = {
        model: options.model || config.ollama.model,
        prompt: prompt,
        stream: false,
        options: {
            num_predict: options.numPredict || 50,
            num_ctx: config.ollama.numCtx || 2048,
            temperature: config.ollama.temperature || 0.5,
        },
        keep_alive: config.ollama.keepAlive !== undefined ? config.ollama.keepAlive : -1,
    };

    try {
        const response = await fetch(`${config.ollama.baseUrl}/api/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
            signal: AbortSignal.timeout(options.timeout || 30000),
        });

        const duration = Date.now() - startTime;

        if (!response.ok) {
            return { success: false, duration, error: `HTTP ${response.status}` };
        }

        const data = await response.json();
        return {
            success: true,
            duration,
            response: data.response,
            tokensPerSecond: data.eval_count / (data.eval_duration / 1e9) || 0,
        };
    } catch (error) {
        return {
            success: false,
            duration: Date.now() - startTime,
            error: error.message,
        };
    }
}

function formatDuration(ms) {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
}

function checkTarget(duration, target, label) {
    const passed = duration < target;
    const icon = passed ? '\x1b[32m[PASS]\x1b[0m' : '\x1b[31m[FAIL]\x1b[0m';
    const comparison = passed ? '<' : '>=';
    console.log(`  ${icon} ${label}: ${formatDuration(duration)} ${comparison} ${formatDuration(target)} target`);
    return passed;
}

async function runBenchmark() {
    console.log('='.repeat(60));
    console.log('Ollama Performance Benchmark');
    console.log('='.repeat(60));
    console.log();

    // Display configuration
    console.log('Configuration:');
    console.log(`  Base URL: ${config.ollama.baseUrl}`);
    console.log(`  Model: ${config.ollama.model}`);
    console.log(`  num_ctx: ${config.ollama.numCtx || 2048}`);
    console.log(`  temperature: ${config.ollama.temperature || 0.5}`);
    console.log(`  keep_alive: ${config.ollama.keepAlive !== undefined ? config.ollama.keepAlive : -1}`);
    console.log();

    const results = {
        passed: 0,
        failed: 0,
        tests: [],
    };

    // Test 1: Warmup query (cold start)
    console.log('Test 1: Warmup Query (Cold Start)');
    console.log(`  Prompt: "${PROMPTS.warmup}"`);
    const warmup = await sendQuery(PROMPTS.warmup, { numPredict: 1, timeout: TARGETS.warmupQuery });
    if (warmup.success) {
        console.log(`  Duration: ${formatDuration(warmup.duration)}`);
        console.log(`  Response: "${warmup.response?.substring(0, 50)}..."`);
        console.log('  Note: Cold start - model loading from disk');
    } else {
        console.log(`  \x1b[31mError: ${warmup.error}\x1b[0m`);
        console.log('  Make sure Ollama is running: ollama serve');
        process.exit(1);
    }
    console.log();

    // Wait a moment for model to settle in memory
    await new Promise(resolve => setTimeout(resolve, 500));

    // Test 2: Simple query (non-tool, model now warm)
    console.log('Test 2: Simple Query (Non-Tool, Target: <1s)');
    console.log(`  Prompt: "${PROMPTS.simple}"`);
    const simple = await sendQuery(PROMPTS.simple, { numPredict: 30 });
    if (simple.success) {
        console.log(`  Duration: ${formatDuration(simple.duration)}`);
        console.log(`  Response: "${simple.response?.substring(0, 50)}..."`);
        const passed = checkTarget(simple.duration, TARGETS.nonToolQuery, 'Non-tool query');
        if (passed) results.passed++; else results.failed++;
        results.tests.push({ name: 'Simple Query', duration: simple.duration, target: TARGETS.nonToolQuery, passed });
    } else {
        console.log(`  \x1b[31mError: ${simple.error}\x1b[0m`);
        results.failed++;
    }
    console.log();

    // Test 3: Device query (simulating tool-call scenario)
    console.log('Test 3: Device Query (Tool-Call Scenario, Target: <2s)');
    console.log(`  Prompt: "${PROMPTS.deviceQuery}"`);
    const device = await sendQuery(PROMPTS.deviceQuery, { numPredict: 100 });
    if (device.success) {
        console.log(`  Duration: ${formatDuration(device.duration)}`);
        console.log(`  Response: "${device.response?.substring(0, 50)}..."`);
        const passed = checkTarget(device.duration, TARGETS.toolCallQuery, 'Tool-call query');
        if (passed) results.passed++; else results.failed++;
        results.tests.push({ name: 'Device Query', duration: device.duration, target: TARGETS.toolCallQuery, passed });
    } else {
        console.log(`  \x1b[31mError: ${device.error}\x1b[0m`);
        results.failed++;
    }
    console.log();

    // Test 4: Time query (another tool-call scenario)
    console.log('Test 4: Time Query (Tool-Call Scenario, Target: <2s)');
    console.log(`  Prompt: "${PROMPTS.timeQuery}"`);
    const time = await sendQuery(PROMPTS.timeQuery, { numPredict: 50 });
    if (time.success) {
        console.log(`  Duration: ${formatDuration(time.duration)}`);
        console.log(`  Response: "${time.response?.substring(0, 50)}..."`);
        const passed = checkTarget(time.duration, TARGETS.toolCallQuery, 'Tool-call query');
        if (passed) results.passed++; else results.failed++;
        results.tests.push({ name: 'Time Query', duration: time.duration, target: TARGETS.toolCallQuery, passed });
    } else {
        console.log(`  \x1b[31mError: ${time.error}\x1b[0m`);
        results.failed++;
    }
    console.log();

    // Test 5: Repeated queries (verify model stays in memory with keep_alive=-1)
    console.log('Test 5: Repeated Queries (Verify Model Stays Loaded)');
    const repeatedResults = [];
    for (let i = 0; i < 3; i++) {
        const result = await sendQuery(PROMPTS.simple, { numPredict: 10 });
        if (result.success) {
            repeatedResults.push(result.duration);
            console.log(`  Query ${i + 1}: ${formatDuration(result.duration)}`);
        }
    }
    if (repeatedResults.length === 3) {
        const avgDuration = repeatedResults.reduce((a, b) => a + b, 0) / 3;
        console.log(`  Average: ${formatDuration(avgDuration)}`);
        const consistent = Math.max(...repeatedResults) - Math.min(...repeatedResults) < 500;
        console.log(`  Consistency: ${consistent ? '\x1b[32m[GOOD]\x1b[0m' : '\x1b[33m[VARIABLE]\x1b[0m'} (variance: ${Math.max(...repeatedResults) - Math.min(...repeatedResults)}ms)`);
    }
    console.log();

    // Summary
    console.log('='.repeat(60));
    console.log('Summary');
    console.log('='.repeat(60));
    console.log(`  Passed: ${results.passed}/${results.passed + results.failed}`);
    if (results.failed > 0) {
        console.log(`  \x1b[31mFailed: ${results.failed}\x1b[0m`);
    }
    console.log();

    // Recommendations if tests failed
    if (results.failed > 0) {
        console.log('Recommendations:');
        console.log('  1. Reduce OLLAMA_NUM_CTX to 1024 or 512');
        console.log('  2. Use a smaller model (qwen2.5:0.5b)');
        console.log('  3. Ensure no other processes are using GPU/CPU');
        console.log('  4. On Raspberry Pi, expect 2-3x slower times');
        console.log();
    }

    // Exit code
    process.exit(results.failed > 0 ? 1 : 0);
}

// Check if Ollama is configured
if (!config.ollama.baseUrl) {
    console.error('Error: OLLAMA_BASE_URL not configured');
    process.exit(1);
}

runBenchmark().catch(error => {
    console.error('Benchmark failed:', error.message);
    process.exit(1);
});
