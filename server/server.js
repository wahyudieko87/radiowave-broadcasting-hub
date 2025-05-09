
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const { spawn } = require('child_process');
const cors = require('cors');
const path = require('path');

// Server configuration
const PORT = process.env.PORT || 3000;

// Create Express app and HTTP server
const app = express();
const server = http.createServer(app);

// Enable CORS
app.use(cors());

// Create WebSocket server
const wss = new WebSocket.Server({ server });

// Serve static files from build directory
app.use(express.static(path.join(__dirname, '../dist')));

// WebSocket client connections
const clients = new Set();

// Handle WebSocket connections
wss.on('connection', (ws) => {
  clients.add(ws);
  console.log(`Client connected (Total: ${clients.size})`);
  
  let ffmpeg = null;
  let isConnected = false;
  let shoutcastConfig = {
    host: 'web3radio.cloud',
    port: 8000,
    password: 'passweb3radio',  // Updated password here
    mountpoint: '/stream'
  };
  
  // Handle messages from client
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      
      // Handle different message types
      switch (data.type) {
        case 'connect':
          // Get custom configuration if provided
          if (data.config) {
            shoutcastConfig = {
              ...shoutcastConfig,
              ...data.config
            };
          }
          
          // Connect to Shoutcast server using FFmpeg
          connectToShoutcast(ws, shoutcastConfig);
          break;
          
        case 'audio':
          // Process audio data and send to FFmpeg
          if (ffmpeg && isConnected && data.buffer) {
            try {
              // Convert array back to Float32Array
              const floatArray = new Float32Array(data.buffer);
              
              // Convert Float32Array to Int16Array for PCM output
              const int16Array = new Int16Array(floatArray.length);
              for (let i = 0; i < floatArray.length; i++) {
                // Clamp to -1.0 to 1.0 and scale to Int16 range (-32768 to 32767)
                int16Array[i] = Math.max(-1, Math.min(1, floatArray[i])) * 32767;
              }
              
              // Create buffer from Int16Array
              const buffer = Buffer.from(int16Array.buffer);
              
              // Only write if ffmpeg is still running
              if (ffmpeg.stdin.writable) {
                ffmpeg.stdin.write(buffer);
              }
            } catch (e) {
              console.error('Error processing audio data:', e);
            }
          }
          break;
          
        case 'disconnect':
          // Disconnect from Shoutcast server
          disconnectFromShoutcast();
          break;
      }
    } catch (error) {
      console.error('Error processing message:', error);
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Failed to process message'
      }));
    }
  });
  
  // Handle client disconnect
  ws.on('close', () => {
    clients.delete(ws);
    console.log(`Client disconnected (Total: ${clients.size})`);
    disconnectFromShoutcast();
  });
  
  // Connect to Shoutcast server using FFmpeg
  function connectToShoutcast(ws, config) {
    try {
      console.log('Connecting to Shoutcast server...');
      console.log(`Server: ${config.host}:${config.port}`);
      
      // Disconnect existing connection if any
      disconnectFromShoutcast();
      
      // Create FFmpeg process with the correct URL format
      // Using the format: http://source:password@host:port/mountpoint
      const streamUrl = `http://source:${config.password}@${config.host}:${config.port}${config.mountpoint || ''}`;
      console.log(`Using stream URL: ${streamUrl}`);
      
      ffmpeg = spawn('ffmpeg', [
        '-f', 's16le',            // Input format: signed 16-bit little-endian
        '-ar', '44100',           // Sample rate: 44.1kHz
        '-ac', '2',               // Channels: 2 (stereo)
        '-i', 'pipe:0',           // Input from stdin
        '-acodec', 'libmp3lame',  // MP3 codec
        '-b:a', '128k',           // Bitrate: 128kbps
        '-f', 'mp3',              // Output format: MP3
        streamUrl
      ]);
      
      // Handle FFmpeg output
      ffmpeg.stdout.on('data', (data) => {
        console.log(`FFmpeg stdout: ${data}`);
      });
      
      ffmpeg.stderr.on('data', (data) => {
        const output = data.toString();
        console.log(`FFmpeg stderr: ${output}`);
        
        // Check for successful connection
        if (output.includes('Connection established') || 
            output.includes('Server connection established') || 
            output.includes('Starting streaming') ||
            output.includes('Stream #0:')) {
          isConnected = true;
          ws.send(JSON.stringify({
            type: 'status',
            status: 'connected',
            message: 'Connected to Shoutcast server'
          }));
        }
        
        // Check for connection errors
        if (output.includes('Failed') || output.includes('Error') || output.includes('Could not')) {
          ws.send(JSON.stringify({
            type: 'error',
            message: `FFmpeg error: ${output.split('\n')[0]}`
          }));
        }
      });
      
      ffmpeg.on('close', (code) => {
        console.log(`FFmpeg process exited with code ${code}`);
        isConnected = false;
        
        // Only send message if websocket is still open
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: 'status',
            status: 'disconnected',
            code: code,
            message: `FFmpeg process exited with code ${code}`
          }));
        }
        
        ffmpeg = null;
      });
      
      ffmpeg.on('error', (error) => {
        console.error('FFmpeg error:', error);
        
        // Only send message if websocket is still open
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: 'error',
            message: `FFmpeg error: ${error.message}`
          }));
        }
        
        isConnected = false;
        ffmpeg = null;
      });
      
    } catch (error) {
      console.error('Error connecting to Shoutcast:', error);
      
      // Only send message if websocket is still open
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'error',
          message: `Connection error: ${error.message}`
        }));
      }
    }
  }
  
  // Disconnect from Shoutcast server
  function disconnectFromShoutcast() {
    if (ffmpeg) {
      try {
        // Close FFmpeg process
        ffmpeg.stdin.end();
        ffmpeg.kill('SIGTERM');
      } catch (error) {
        console.error('Error disconnecting from Shoutcast:', error);
      } finally {
        ffmpeg = null;
        isConnected = false;
      }
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
});
