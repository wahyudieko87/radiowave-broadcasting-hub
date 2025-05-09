
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Server configuration
const PORT = process.env.PORT || 3000;
const SHOUTCAST_CONFIG = {
  host: process.env.SHOUTCAST_HOST || 'web3radio.cloud',
  port: process.env.SHOUTCAST_PORT || 8000,
  password: process.env.SHOUTCAST_PASSWORD || 'passweb3radio',
  mountpoint: process.env.SHOUTCAST_MOUNTPOINT || '/stream'
};

// Create Express app and HTTP server
const app = express();
const server = http.createServer(app);

// Create WebSocket server
const wss = new WebSocket.Server({ server });

// Serve static files from build directory
app.use(express.static(path.join(__dirname, '../dist')));

// Handle API requests by proxying to Shoutcast
app.use('/api', (req, res) => {
  const options = {
    hostname: SHOUTCAST_CONFIG.host,
    port: SHOUTCAST_CONFIG.port,
    path: req.url,
    method: req.method,
    headers: {
      ...req.headers,
      host: `${SHOUTCAST_CONFIG.host}:${SHOUTCAST_CONFIG.port}`
    }
  };

  const proxyReq = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res);
  });

  proxyReq.on('error', (error) => {
    console.error('Proxy request error:', error);
    res.status(500).send('Proxy error');
  });

  req.pipe(proxyReq);
});

// Handle WebSocket connections
wss.on('connection', (ws) => {
  console.log('Client connected');
  
  let ffmpeg = null;
  let isConnected = false;
  
  // Handle messages from client
  ws.on('message', (message) => {
    const data = JSON.parse(message);
    
    // Handle different message types
    switch (data.type) {
      case 'connect':
        // Connect to Shoutcast server using FFmpeg
        connectToShoutcast(ws);
        break;
        
      case 'audio':
        // Process audio data and send to FFmpeg
        if (ffmpeg && isConnected) {
          const buffer = Buffer.from(data.buffer);
          ffmpeg.stdin.write(buffer);
        }
        break;
        
      case 'disconnect':
        // Disconnect from Shoutcast server
        disconnectFromShoutcast();
        break;
    }
  });
  
  // Handle client disconnect
  ws.on('close', () => {
    console.log('Client disconnected');
    disconnectFromShoutcast();
  });
  
  // Connect to Shoutcast server using FFmpeg
  function connectToShoutcast(ws) {
    try {
      console.log('Connecting to Shoutcast server...');
      
      // Create FFmpeg process
      ffmpeg = spawn('ffmpeg', [
        '-re',                            // Real-time mode
        '-i', '-',                        // Input from stdin
        '-acodec', 'libmp3lame',          // MP3 codec
        '-ab', '128k',                    // Bitrate
        '-ac', '2',                       // Channels
        '-ar', '44100',                   // Sample rate
        '-content_type', 'audio/mpeg',    // Content type
        '-f', 'mp3',                      // Output format
        `-ice_name "Web3Radio"`,          // Icecast metadata
        `-ice_description "Web3 Radio Station"`,
        `-ice_genre "Various"`,
        `-ice_public 1`,
        `-ice_password ${SHOUTCAST_CONFIG.password}`,
        `icecast://${SHOUTCAST_CONFIG.host}:${SHOUTCAST_CONFIG.port}${SHOUTCAST_CONFIG.mountpoint}`
      ]);
      
      // Handle FFmpeg output
      ffmpeg.stdout.on('data', (data) => {
        console.log(`FFmpeg stdout: ${data}`);
      });
      
      ffmpeg.stderr.on('data', (data) => {
        console.log(`FFmpeg stderr: ${data}`);
        
        // Check for successful connection
        if (data.toString().includes('Connection established')) {
          isConnected = true;
          ws.send(JSON.stringify({
            type: 'status',
            status: 'connected'
          }));
        }
      });
      
      ffmpeg.on('close', (code) => {
        console.log(`FFmpeg process exited with code ${code}`);
        isConnected = false;
        ws.send(JSON.stringify({
          type: 'status',
          status: 'disconnected',
          code: code
        }));
      });
      
    } catch (error) {
      console.error('Error connecting to Shoutcast:', error);
      ws.send(JSON.stringify({
        type: 'error',
        message: error.message
      }));
    }
  }
  
  // Disconnect from Shoutcast server
  function disconnectFromShoutcast() {
    if (ffmpeg) {
      // Close FFmpeg process
      ffmpeg.stdin.end();
      ffmpeg.kill('SIGTERM');
      ffmpeg = null;
      isConnected = false;
    }
  }
});

// Start server
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Shoutcast server: ${SHOUTCAST_CONFIG.host}:${SHOUTCAST_CONFIG.port}`);
});
