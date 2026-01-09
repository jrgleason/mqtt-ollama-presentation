/**
 * Metals Price Tool for AI
 *
 * Provides real-time precious metals spot prices using free APIs.
 * Supports: gold, silver, platinum, palladium
 *
 * Primary API: metals.live (no API key required)
 * Fallback: goldapi.io (requires GOLDAPI_KEY env var)
 */

import {logger} from '../util/Logger.js';

/**
 * Supported metals and their identifiers
 */
const SUPPORTED_METALS = {
    gold: { symbol: 'XAU', name: 'Gold' },
    silver: { symbol: 'XAG', name: 'Silver' },
    platinum: { symbol: 'XPT', name: 'Platinum' },
    palladium: { symbol: 'XPD', name: 'Palladium' }
};

/**
 * Get spot price from metals.live API (free, no key required)
 * @param {string} metal - Metal name (gold, silver, platinum, palladium)
 * @returns {Promise<{price: number, currency: string, unit: string}|null>}
 */
async function getMetalsLivePrice(metal) {
    try {
        logger.debug('🔍 Fetching from metals.live API...');
        // metals.live returns all prices in a single call
        // Add User-Agent to avoid SSL/connection issues
        const response = await fetch('https://api.metals.live/v1/spot', {
            signal: AbortSignal.timeout(5000),
            headers: {
                'User-Agent': 'VoiceGateway/1.0',
                'Accept': 'application/json'
            }
        });

        logger.debug('🔍 metals.live response', { status: response.status, ok: response.ok });

        if (!response.ok) {
            const errorText = await response.text().catch(() => 'unknown');
            logger.warn('metals.live API error', { status: response.status, error: errorText });
            return null;
        }

        const data = await response.json();
        logger.debug('🔍 metals.live raw data', {
            isArray: Array.isArray(data),
            dataType: typeof data,
            preview: JSON.stringify(data).substring(0, 200)
        });

        // Response format: [{ gold: 2650.50, silver: 31.25, ... }]
        const prices = Array.isArray(data) ? data[0] : data;

        logger.debug('🔍 metals.live parsed prices', {
            hasPrices: !!prices,
            metalValue: prices?.[metal],
            availableKeys: prices ? Object.keys(prices) : []
        });

        if (prices && prices[metal] !== undefined) {
            return {
                price: prices[metal],
                currency: 'USD',
                unit: 'oz'
            };
        }

        return null;
    } catch (error) {
        logger.warn('metals.live API failed', {
            error: error.message,
            cause: error.cause?.message,
            code: error.cause?.code
        });
        return null;
    }
}


/**
 * Get spot price from goldapi.io (requires API key)
 * @param {string} metal - Metal name
 * @returns {Promise<{price: number, currency: string, unit: string}|null>}
 */
async function getGoldApiPrice(metal) {
    const apiKey = process.env.GOLDAPI_KEY;
    if (!apiKey) {
        return null;
    }

    const metalInfo = SUPPORTED_METALS[metal];
    if (!metalInfo) {
        return null;
    }

    try {
        const response = await fetch(`https://www.goldapi.io/api/${metalInfo.symbol}/USD`, {
            headers: {
                'x-access-token': apiKey
            },
            signal: AbortSignal.timeout(5000)
        });

        if (!response.ok) {
            logger.warn('goldapi.io API error', { status: response.status });
            return null;
        }

        const data = await response.json();

        if (data && data.price) {
            return {
                price: data.price,
                currency: 'USD',
                unit: 'oz'
            };
        }

        return null;
    } catch (error) {
        logger.warn('goldapi.io API failed', { error: error.message });
        return null;
    }
}

/**
 * Get tool definition for AI
 * @returns {Object} Tool definition object
 */
export function getMetalsPriceTool() {
    return {
        type: 'function',
        function: {
            name: 'get_metal_price',
            description: 'Get the current spot price of precious metals (gold, silver, platinum, palladium). Use this for any question about metal prices, spot prices, or commodity prices.',
            parameters: {
                type: 'object',
                properties: {
                    metal: {
                        type: 'string',
                        enum: ['gold', 'silver', 'platinum', 'palladium'],
                        description: 'The precious metal to get the price for'
                    }
                },
                required: ['metal'],
                additionalProperties: false
            }
        }
    };
}

/**
 * Execute the metals price tool
 * @param {Object} args - Tool arguments
 * @param {string} args.metal - Metal name (gold, silver, platinum, palladium)
 * @returns {Promise<string>} Price information
 */
export async function executeMetalsPriceTool(args) {
    const metal = args.metal?.toLowerCase();

    if (!metal || !SUPPORTED_METALS[metal]) {
        return `Error: Invalid metal. Supported metals: ${Object.keys(SUPPORTED_METALS).join(', ')}`;
    }

    logger.info(`Fetching ${metal} spot price...`);

    // Try metals.live first (free, no key)
    let result = await getMetalsLivePrice(metal);

    // Fallback to goldapi.io if GOLDAPI_KEY is set
    if (!result) {
        logger.debug('Trying goldapi.io fallback...');
        result = await getGoldApiPrice(metal);
    }

    if (!result) {
        logger.warn(`All metal price APIs failed for ${metal}`);
        return `Unable to fetch ${metal} price. Price APIs are temporarily unavailable.`;
    }

    const formattedPrice = result.price.toLocaleString('en-US', {
        style: 'currency',
        currency: result.currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });

    logger.info(`${metal} spot price: ${formattedPrice}/oz`);

    return `The current spot price of ${SUPPORTED_METALS[metal].name} is ${formattedPrice} per troy ounce.`;
}
