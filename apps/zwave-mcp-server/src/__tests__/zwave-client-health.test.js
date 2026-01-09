import { ZWaveUIClient } from '../zwave-client.js';

// Note: Mocking is tricky with ES modules and socket.io-client
// These tests verify the error message generation logic in checkHealth()
// Full integration tests would require a running Z-Wave JS UI instance

describe('ZWaveUIClient - Health Check', () => {
    let client;
    let config;

    beforeEach(() => {
        config = {
            url: 'http://invalid-zwave-host-that-does-not-exist:8091',
            authEnabled: false,
            socketTimeoutMs: 100  // Very short timeout for fast tests
        };
        client = new ZWaveUIClient(config);
    });

    describe('checkHealth()', () => {
        it('should return error structure when Z-Wave JS UI is unreachable', async () => {
            // With invalid host, this will timeout or get connection error
            const result = await client.checkHealth();

            // Log the actual error for debugging
            console.log('Actual error message:', result.error);

            expect(result.available).toBe(false);
            expect(result.error).toBeDefined();
            expect(typeof result.error).toBe('string');
            expect(result.error.length).toBeGreaterThan(0);
            expect(result.lastChecked).toBeInstanceOf(Date);
        });

        it('should include user-friendly error message', async () => {
            const result = await client.checkHealth();

            // Error should be speakable (no technical jargon)
            expect(result.error).not.toMatch(/ECONNREFUSED|ETIMEDOUT|ENOTFOUND|socket/i);

            // Should mention Z-Wave system or smart home
            expect(result.error.toLowerCase()).toMatch(/z-wave|smart home|unavailable/);
        });

        it('should include lastChecked timestamp', async () => {
            const beforeCheck = new Date();
            const result = await client.checkHealth();
            const afterCheck = new Date();

            expect(result.lastChecked).toBeInstanceOf(Date);
            expect(result.lastChecked.getTime()).toBeGreaterThanOrEqual(beforeCheck.getTime());
            expect(result.lastChecked.getTime()).toBeLessThanOrEqual(afterCheck.getTime());
        });

        it('error message should be suitable for TTS', async () => {
            const result = await client.checkHealth();

            // Should be reasonably short for TTS
            expect(result.error.length).toBeLessThan(300);

            // Should be complete sentence
            expect(result.error.endsWith('.')).toBe(true);
        });
    });

    describe('Error message quality', () => {
        it('should mention smart home or Z-Wave system', async () => {
            const result = await client.checkHealth();

            // Should mention the system being checked
            const mentionsSystem =
                result.error.toLowerCase().includes('z-wave') ||
                result.error.toLowerCase().includes('smart home');
            expect(mentionsSystem).toBe(true);
        });

        it('should indicate unavailability', async () => {
            const result = await client.checkHealth();

            // Should indicate something is unavailable or not working
            const indicatesUnavailability =
                result.error.toLowerCase().includes('unavailable') ||
                result.error.toLowerCase().includes('offline') ||
                result.error.toLowerCase().includes("can't reach") ||
                result.error.toLowerCase().includes("isn't running");
            expect(indicatesUnavailability).toBe(true);
        });
    });
});
