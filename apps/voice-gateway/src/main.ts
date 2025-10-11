/**
 * Voice Gateway - Main Entry Point
 *
 * Orchestrates wake word detection, audio recording, STT, and MQTT communication.
 */

import { config } from './config.js';
import { logger } from './logger.js';

async function main() {
  logger.info('Voice Gateway starting...', {
    nodeEnv: config.nodeEnv,
    mqttBroker: config.mqtt.brokerUrl,
    micDevice: config.audio.micDevice,
    wakeWord: config.porcupine.keyword,
  });

  try {
    // TODO: Initialize components (Phase 5 tasks)
    // 1. Initialize MQTT client (Task 5.5.1)
    // 2. Initialize Porcupine wake word detector (Task 5.2.2)
    // 3. Start health check server (Task 5.7.1)
    // 4. Start wake word detection loop (Task 5.2.3)

    logger.info('✅ Voice Gateway started successfully');
    logger.info('🎤 Listening for wake word: "Computer"');

    // Keep process alive
    process.on('SIGINT', async () => {
      logger.info('Shutting down gracefully...');
      // TODO: Cleanup resources
      process.exit(0);
    });

  } catch (error) {
    logger.error('Failed to start Voice Gateway', { error });
    process.exit(1);
  }
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', { error });
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled rejection', { reason });
  process.exit(1);
});

main();
