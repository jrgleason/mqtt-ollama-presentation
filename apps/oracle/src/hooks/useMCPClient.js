/**
 * MCP Client Hook for Frontend
 *
 * Provides a React hook for connecting to the MCP server via SSE transport.
 * This hook is optional - the chat interface uses backend MCP integration.
 *
 * Use this hook when you need direct frontend access to MCP tools,
 * such as for a device control dashboard or admin panel.
 *
 * @example
 * ```jsx
 * import { useMCPClient } from '@/hooks/useMCPClient';
 *
 * function DevicePanel() {
 *   const { tools, isConnected, error, callTool } = useMCPClient();
 *
 *   const handleListDevices = async () => {
 *     const result = await callTool('list_zwave_devices', {});
 *     console.log('Devices:', result);
 *   };
 *
 *   return (
 *     <div>
 *       {isConnected ? 'Connected' : 'Disconnected'}
 *       <button onClick={handleListDevices}>List Devices</button>
 *     </div>
 *   );
 * }
 * ```
 */

'use client';

import { useState, useEffect, useCallback } from 'react';

/**
 * Hook for connecting to MCP server from browser
 *
 * @param {Object} options - Configuration options
 * @param {string} options.url - MCP endpoint URL (default: '/api/mcp')
 * @param {boolean} options.autoConnect - Auto-connect on mount (default: true)
 * @returns {Object} MCP client state and methods
 */
export function useMCPClient(options = {}) {
    const { url = '/api/mcp', autoConnect = true } = options;

    const [isConnected, setIsConnected] = useState(false);
    const [tools, setTools] = useState([]);
    const [error, setError] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    /**
     * Connect to MCP server via SSE
     */
    const connect = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            // In a full implementation, this would establish an SSE connection
            // and parse the MCP protocol messages.
            // For now, this is a placeholder for future frontend MCP integration.

            // Example: Fetch available tools from backend
            const response = await fetch('/api/mcp/tools');
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            setTools(data.tools || []);
            setIsConnected(true);
        } catch (err) {
            console.error('[useMCPClient] Connection error:', err);
            setError(err instanceof Error ? err.message : 'Connection failed');
            setIsConnected(false);
        } finally {
            setIsLoading(false);
        }
    }, [url]);

    /**
     * Disconnect from MCP server
     */
    const disconnect = useCallback(() => {
        setIsConnected(false);
        setTools([]);
    }, []);

    /**
     * Call an MCP tool
     *
     * @param {string} toolName - Name of the tool to call
     * @param {Object} params - Tool parameters
     * @returns {Promise<any>} Tool result
     */
    const callTool = useCallback(async (toolName, params = {}) => {
        if (!isConnected) {
            throw new Error('Not connected to MCP server');
        }

        try {
            // In a full implementation, this would send an MCP tool call message
            // For now, this is a placeholder
            const response = await fetch('/api/mcp/call', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tool: toolName, params }),
            });

            if (!response.ok) {
                throw new Error(`Tool call failed: ${response.statusText}`);
            }

            return await response.json();
        } catch (err) {
            console.error('[useMCPClient] Tool call error:', err);
            throw err;
        }
    }, [isConnected]);

    // Auto-connect on mount
    useEffect(() => {
        if (autoConnect) {
            connect();
        }

        return () => {
            disconnect();
        };
    }, [autoConnect, connect, disconnect]);

    return {
        isConnected,
        tools,
        error,
        isLoading,
        connect,
        disconnect,
        callTool,
    };
}
