
class AudioService {
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private audioWorkletNode: AudioWorkletNode | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private webSocket: WebSocket | null = null;
  private isConnected: boolean = false;
  private isProcessing: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectTimeout: number = 2000;

  constructor() {
    this.initAudioContext();
  }

  private async initAudioContext() {
    try {
      this.audioContext = new AudioContext();
      
      // Use a relative path to the processor with type="module"
      // This is crucial for the AudioWorklet to load properly
      await this.audioContext.audioWorklet.addModule('/src/audio/pcm-processor.js');
      console.log('AudioWorklet initialized successfully');
    } catch (error) {
      console.error('Failed to initialize AudioWorklet:', error);
    }
  }

  public async startMicrophone(): Promise<boolean> {
    try {
      if (!this.audioContext) {
        await this.initAudioContext();
      }
      
      if (this.audioContext?.state === 'suspended') {
        await this.audioContext.resume();
      }
      
      console.log('Requesting microphone access...');
      this.mediaStream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      console.log('Microphone access granted');
      
      this.sourceNode = this.audioContext!.createMediaStreamSource(this.mediaStream);
      this.audioWorkletNode = new AudioWorkletNode(this.audioContext!, 'pcm-processor');
      
      this.audioWorkletNode.port.onmessage = (event) => {
        if (event.data.eventType === 'data' && this.isConnected && this.isProcessing) {
          this.sendAudioData(event.data.audioData);
        }
      };
      
      this.sourceNode.connect(this.audioWorkletNode);
      // Don't connect to destination to prevent audio feedback
      // this.audioWorkletNode.connect(this.audioContext!.destination);
      
      console.log('Starting audio processor...');
      this.audioWorkletNode.port.postMessage({
        command: 'start'
      });
      
      this.isProcessing = true;
      return true;
    } catch (error) {
      console.error('Failed to start microphone:', error);
      return false;
    }
  }

  public stopMicrophone() {
    console.log('Stopping microphone...');
    
    if (this.audioWorkletNode) {
      this.audioWorkletNode.port.postMessage({
        command: 'stop'
      });
      this.audioWorkletNode.disconnect();
      this.audioWorkletNode = null;
      this.isProcessing = false;
    }
    
    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }
    
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }
    
    console.log('Microphone stopped');
  }

  public async connectToServer(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      try {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.hostname;
        const port = window.location.port === '8080' ? '3000' : window.location.port || '3000';
        
        const wsUrl = `${protocol}//${host}:${port}`;
        console.log(`Connecting to WebSocket server at ${wsUrl}`);
        
        if (this.webSocket && 
            (this.webSocket.readyState === WebSocket.OPEN || 
             this.webSocket.readyState === WebSocket.CONNECTING)) {
          this.webSocket.close();
        }
        
        this.webSocket = new WebSocket(wsUrl);
        
        this.webSocket.onopen = () => {
          console.log('WebSocket connected to server');
          this.reconnectAttempts = 0;
          this.webSocket!.send(JSON.stringify({
            type: 'connect',
            config: {
              host: 'web3radio.cloud',
              port: 8000,
              password: 'passweb3radio',
              mountpoint: '/stream'
            }
          }));
        };
        
        this.webSocket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log('WebSocket message received:', data);
            
            if (data.type === 'status') {
              if (data.status === 'connected') {
                this.isConnected = true;
                console.log('Successfully connected to broadcast server');
                resolve(true);
              } else if (data.status === 'disconnected') {
                this.isConnected = false;
                console.log('Disconnected from broadcast server');
              }
            } else if (data.type === 'error') {
              console.error('Server error:', data.message);
              this.isConnected = false;
              reject(new Error(data.message));
            }
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
            reject(error);
          }
        };
        
        this.webSocket.onerror = (error) => {
          console.error('WebSocket error:', error);
          this.isConnected = false;
          this.attemptReconnect();
          reject(error);
        };
        
        this.webSocket.onclose = (event) => {
          console.log(`WebSocket disconnected from server: ${event.code} - ${event.reason}`);
          this.isConnected = false;
          
          if (this.isProcessing) {
            this.attemptReconnect();
          }
        };
      } catch (error) {
        console.error('Failed to connect to server:', error);
        reject(error);
      }
    });
  }

  private attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
      
      setTimeout(() => {
        if (this.isProcessing) {
          this.connectToServer().catch(error => {
            console.error('Reconnection attempt failed:', error);
          });
        }
      }, this.reconnectTimeout);
    } else {
      console.error('Max reconnection attempts reached');
    }
  }

  public disconnectFromServer() {
    if (this.webSocket && (this.webSocket.readyState === WebSocket.OPEN || this.webSocket.readyState === WebSocket.CONNECTING)) {
      console.log('Disconnecting from server...');
      
      if (this.webSocket.readyState === WebSocket.OPEN) {
        this.webSocket.send(JSON.stringify({
          type: 'disconnect'
        }));
      }
      
      this.webSocket.close();
      this.webSocket = null;
      this.isConnected = false;
      
      console.log('Disconnected from server');
    }
  }

  private sendAudioData(audioData: any) {
    if (!this.webSocket || !this.isConnected || this.webSocket.readyState !== WebSocket.OPEN) {
      return;
    }
    
    try {
      // Convert Float32Array to regular array for JSON serialization
      // Only send the first channel for simplicity
      if (audioData.channelData && audioData.channelData.length > 0) {
        const serializedData = {
          type: 'audio',
          buffer: Array.from(audioData.channelData[0]),
          sampleRate: audioData.sampleRate
        };
        
        this.webSocket.send(JSON.stringify(serializedData));
      }
    } catch (error) {
      console.error('Error sending audio data:', error);
    }
  }
}

export const audioService = new AudioService();
export default audioService;
