#!/usr/bin/env node
/**
 * Test script to verify all tools are working correctly
 * Run this on both Mac and Pi to diagnose issues
 */

import {executeDateTimeTool} from './src/tools/datetime-tool.js';
import {executeSearchTool} from './src/tools/search-tool.js';

console.log('=== Tool Testing Script ===\n');

// Test 1: DateTime Tool
console.log('1. Testing DateTime Tool...');
try {
    const result = executeDateTimeTool();
    console.log('✅ DateTime Tool Result:', result);
} catch (error) {
    console.error('❌ DateTime Tool Error:', error.message);
    console.error('Stack:', error.stack);
}

console.log('\n');

// Test 2: Search Tool
console.log('2. Testing Search Tool...');
try {
    const result = await executeSearchTool({query: 'test'});
    console.log('✅ Search Tool Result:', result.substring(0, 100) + '...');
} catch (error) {
    console.error('❌ Search Tool Error:', error.message);
    console.error('Stack:', error.stack);
}

console.log('\n');

// Test 3: Pattern Matching
console.log('3. Testing Pattern Matching...');

const testCases = [
    'What time is it?',
    'What date is it?',
    'Can you tell me the current date?',
    'Who is the president?',
    'Turn off switch one',
    'What do you know about love?'
];

for (const transcription of testCases) {
    // DateTime patterns
    const dateTimePatterns = [
        /what (time|date) is it/i,
        /what'?s the (time|date)/i,
        /what day is (it|today)/i,
        /what'?s today'?s date/i,
        /tell me the (time|date)/i,
        /current (time|date)/i,
        /what year is (it|this)/i,
        /can you tell me (what|the) (time|date)/i,
    ];

    const isDateTimeQuery = dateTimePatterns.some(pattern =>
        pattern.test(transcription)
    );

    // Search patterns
    const searchPatterns = [
        /search (for|google|the web)/i,
        /google (for|search)/i,
        /look up/i,
        /find (information|out) (about|on)/i,
        /who is/i,
        /what is/i,
        /where is/i,
        /when (did|was|is)/i,
        /how (many|much|does)/i,
    ];

    const isSearchQuery = searchPatterns.some(pattern =>
        pattern.test(transcription)
    );

    // Device control patterns
    const deviceControlPatterns = [
        /turn (on|off)/i,
        /switch (on|off)/i,
        /dim/i,
        /brighten/i,
        /set .+ to \d+/i,
    ];

    const isDeviceControlQuery = deviceControlPatterns.some(pattern =>
        pattern.test(transcription)
    );

    const detected = [];
    if (isDateTimeQuery) detected.push('DateTime');
    if (isSearchQuery) detected.push('Search');
    if (isDeviceControlQuery) detected.push('DeviceControl');
    if (detected.length === 0) detected.push('None (AI)');

    console.log(`"${transcription}" → ${detected.join(', ')}`);
}

console.log('\n=== Test Complete ===');
