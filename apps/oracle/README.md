This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Oracle - AI Home Automation Assistant

Oracle is a conversational AI interface for controlling Z-Wave devices and home automation through natural language.

## Getting Started

### Development Mode

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

### Environment Variables

Create a `.env.local` file for development:

```bash
NODE_ENV=development
LOG_LEVEL=debug
PORT=3000
DATABASE_URL=file:./dev.db
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2:3b
MQTT_BROKER_URL=mqtt://127.0.0.1:1883
```

**Important Environment Variables:**

- `NODE_ENV`: Set to `development` for dev mode or `production` for production
- `LOG_LEVEL`: Controls logging verbosity
  - `info` (production default): Only errors and important events
  - `debug` (development default): Verbose logging including MQTT operations
- `MQTT_BROKER_URL`: URL to your MQTT broker (e.g., Mosquitto)
- `OLLAMA_BASE_URL`: URL to your Ollama instance for LLM inference

### Debugging MQTT Issues

If you're troubleshooting MQTT device control:

```bash
# Enable verbose MQTT logging
LOG_LEVEL=debug npm run dev

# You'll see detailed logs like:
# [MQTT] publish() called { topic: 'zwave/...' }
# [MQTT] About to publish: {...}
# [MQTT] ✅ Publish SUCCESS
```

### Production Deployment

For production deployment on Raspberry Pi or other servers, see:
- [Systemd Service Setup](../../docs/oracle-systemd-setup.md)
- [Getting Started Guide](../../docs/GETTING-STARTED.md)

```bash
# Build for production
npm run build

# Start production server
npm start
```

## Project Structure

- `src/app/` - Next.js app router pages and layouts
- `src/lib/mqtt/` - MQTT client for device communication
- `src/lib/langchain/` - LangChain integration with Ollama
- `src/lib/langchain/tools/` - Device control and listing tools
- `prisma/` - Database schema and migrations

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!
