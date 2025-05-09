
class AudioService {
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private audioWorkletNode: AudioWorkletNode | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private webSocket: WebSocket | null = null;
  private isConnected: boolean = false;
  private isProcessing: boolean = false;

  constructor() {
    this.initAudioContext();
  }

  private async initAudioContext() {
    try {
      this.audioContext = new AudioContext();
      // Use an absolute path to the processor to ensure it loads properly
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
      this.audioWorkletNode.connect(this.audioContext!.destination);
      
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
        const port = process.env.NODE_ENV === 'development' ? '3000' : '3000'; // Always use 3000 for the Node.js server
        
        const wsUrl = `${protocol}//${host}:${port}`;
        console.log(`Connecting to WebSocket server at ${wsUrl}`);
        
        this.webSocket = new WebSocket(wsUrl);
        
        this.webSocket.onopen = () => {
          console.log('WebSocket connected to server');
          this.webSocket!.send(JSON.stringify({
            type: 'connect'
          }));
        };
        
        this.webSocket.onmessage = (event) => {
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
            reject(new Error(data.message));
          }
        };
        
        this.webSocket.onerror = (error) => {
          console.error('WebSocket error:', error);
          this.isConnected = false;
          reject(error);
        };
        
        this.webSocket.onclose = () => {
          console.log('WebSocket disconnected from server');
          this.isConnected = false;
        };
      } catch (error) {
        console.error('Failed to connect to server:', error);
        reject(error);
      }
    });
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
    if (this.webSocket && this.isConnected && this.webSocket.readyState === WebSocket.OPEN) {
      // Convert Float32Array to regular array for JSON serialization
      const serializedData = {
        type: 'audio',
        buffer: Array.from(audioData.channelData[0])
      };
      
      this.webSocket.send(JSON.stringify(serializedData));
    }
  }
}

export const audioService = new AudioService();
export default audioService;
