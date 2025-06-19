import { defineConfig, loadEnv } from "vite";
// ...
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd());

  return {
    server: {
      host: "::",
      port: 8080,
      proxy: {
        '/api': {
          target: `http://${env.VITE_SHOUTCAST_HOST}:${env.VITE_SHOUTCAST_PORT}`,
          changeOrigin: true,
          ws: true,
          xfwd: true,
          rewrite: (path) => path.replace(/^\/api/, ''),
          configure: (proxy, _options) => {
            proxy.on('error', (err, _req, _res) => {
              console.error('proxy error', err);
            });
            proxy.on('proxyReq', (proxyReq, req) => {
              console.log('Sending Request to Target:', req.method, req.url);
            });
            proxy.on('proxyRes', (proxyRes, req) => {
              console.log('Received Response:', proxyRes.statusCode, req.url);
            });
            proxy.on('proxyReqWs', () => {
              console.log('WebSocket upgraded');
            });
          },
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Origin, Content-Type, Authorization',
          }
        }
      }
    },
    plugins: [
      react(),
      mode === 'development' && componentTagger()
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
