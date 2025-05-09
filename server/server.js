
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

// Server configuration
const PORT = process.env.PORT || 3000;
const SHOUTCAST_CONFIG = {
  host: process.env.SHOUTCAST_HOST || 'web3radio.cloud',
  port: process.env.SHOUTCAST_PORT || 8000,
  password: process.env.SHOUTCAST_PASSWORD || 'web3radio',
  mountpoint: process.env.SHOUTCAST_MOUNTPOINT || '/stream'
};

// Create Express app and HTTP server
const app = express();
const server = http.createServer(app);

// Enable CORS
app.use(cors());

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
      host: `${SHOUTCAST_CONFIG.host}:${SHOUTCAST_CONFIG.port}`,
      'Authorization': `Basic ${Buffer.from(`source:${SHOUTCAST_CONFIG.password}`).toString('base64')}`
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
    try {
      const data = JSON.parse(message);
      
      // Handle different message types
      switch (data.type) {
        case 'connect':
          // Connect to Shoutcast server using FFmpeg
          connectToShoutcast(ws);
          break;
          
        case 'audio':
          // Process audio data and send to FFmpeg
          if (ffmpeg && isConnected && data.buffer) {
            // Convert array back to Float32Array
            const floatArray = new Float32Array(data.buffer);
            
            // Convert Float32Array to Int16Array for PCM output
            const int16Array = new Int16Array(floatArray.length);
            for (let i = 0; i < floatArray.length; i++) {
              const sample = floatArray[i];
              // Clamp to -1.0 to 1.0 and scale to Int16 range (-32768 to 32767)
              int16Array[i] = Math.max(-1, Math.min(1, sample)) * 32767;
            }
            
            // Create buffer from Int16Array
            const buffer = Buffer.from(int16Array.buffer);
            ffmpeg.stdin.write(buffer);
          }
          break;
          
        case 'disconnect':
          // Disconnect from Shoutcast server
          disconnectFromShoutcast();
          break;
      }
    } catch (error) {
      console.error('Error processing message:', error);
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
      console.log(`Server: ${SHOUTCAST_CONFIG.host}:${SHOUTCAST_CONFIG.port}`);
      
      // Create FFmpeg process
      ffmpeg = spawn('ffmpeg', [
        '-f', 's16le',            // Input format: signed 16-bit little-endian
        '-ar', '44100',           // Sample rate: 44.1kHz
        '-ac', '2',               // Channels: 2 (stereo)
        '-i', 'pipe:0',           // Input from stdin
        '-acodec', 'libmp3lame',  // MP3 codec
        '-ab', '128k',            // Bitrate: 128kbps
        '-content_type', 'audio/mpeg',
        '-f', 'mp3',              // Output format: MP3
        '-ice_name', 'Web3Radio',
        '-ice_description', 'Web3 Radio Station',
        '-ice_genre', 'Various',
        '-ice_public', '1',
        '-password', SHOUTCAST_CONFIG.password, // Use proper password flag
        `icecast://${SHOUTCAST_CONFIG.host}:${SHOUTCAST_CONFIG.port}${SHOUTCAST_CONFIG.mountpoint}`
      ]);
      
      // Handle FFmpeg output
      ffmpeg.stdout.on('data', (data) => {
        console.log(`FFmpeg stdout: ${data}`);
      });
      
      ffmpeg.stderr.on('data', (data) => {
        const output = data.toString();
        console.log(`FFmpeg stderr: ${output}`);
        
        // Check for successful connection
        if (output.includes('Connection established') || output.includes('Server connection established')) {
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
      
      ffmpeg.on('error', (error) => {
        console.error('FFmpeg error:', error);
        ws.send(JSON.stringify({
          type: 'error',
          message: error.message
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

// Handle all routes for React Router
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

// Start server
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Shoutcast server: ${SHOUTCAST_CONFIG.host}:${SHOUTCAST_CONFIG.port}`);
});
