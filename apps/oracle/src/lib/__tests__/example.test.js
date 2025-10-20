/**
 * Example test file to demonstrate Jest setup
 * This ensures the test pipeline works correctly
 */

describe('Oracle Test Suite', () => {
    it('should pass basic test', () => {
        expect(true).toBe(true);
    });

    it('should perform basic arithmetic', () => {
        expect(2 + 2).toBe(4);
    });
});

describe('Environment Setup', () => {
    it('should have Node environment', () => {
        expect(process.env.NODE_ENV).toBeDefined();
    });
});

