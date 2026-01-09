#!/bin/bash

# Test the chat API endpoint
echo "Testing /api/chat endpoint..."
echo ""

curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {
        "role": "user",
        "content": "List all available devices"
      }
    ]
  }'

echo ""
echo ""
echo "Done!"
