export default {
  apps: [
    {
      name: 'moe-mcp',
      script: '/root/moe-mcp/dist/server-http.js',
      interpreter: 'node',
      restart_delay: 2000,
      max_restarts: 10,
      env: {
        MOE_API_BASE_URL: 'https://your-gateway/v1',
        MOE_API_KEY: 'your-api-key',
        MCP_AUTH_TOKEN: 'your-auth-token',
      },
    },
  ],
};
