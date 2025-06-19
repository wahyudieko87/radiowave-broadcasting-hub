class AudioService {
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private audioWorkletNode: AudioWorkletNode | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private webSocket: WebSocket | null = null;
  private isConnected = false;
  private isProcessing = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeout = 2000;

  constructor() {
    this.initAudioContext();
  }

  private async initAudioContext() {
    try {
      this.audioContext = new AudioContext();
      await this.audioContext.audioWorklet.addModule('/src/audio/pcm-processor.js');
      console.log('AudioWorklet initialized successfully');
    } catch (error) {
      console.error('Failed to initialize AudioWorklet:', error);
    }
  }

  public async startMicrophone(): Promise<boolean> {
    try {
      if (!this.audioContext) await this.initAudioContext();
      if (this.audioContext?.state === 'suspended') await this.audioContext.resume();

      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      this.sourceNode = this.audioContext!.createMediaStreamSource(this.mediaStream);
      this.audioWorkletNode = new AudioWorkletNode(this.audioContext!, 'pcm-processor');

      this.audioWorkletNode.port.onmessage = (event) => {
        if (event.data.eventType === 'data' && this.isConnected && this.isProcessing) {
          this.sendAudioData(event.data.audioData);
        }
      };

      this.sourceNode.connect(this.audioWorkletNode);
      this.audioWorkletNode.port.postMessage({ command: 'start' });
      this.isProcessing = true;
      return true;
    } catch (error) {
      console.error('Failed to start microphone:', error);
      return false;
    }
  }

  public stopMicrophone() {
    if (this.audioWorkletNode) {
      this.audioWorkletNode.port.postMessage({ command: 'stop' });
      this.audioWorkletNode.disconnect();
      this.audioWorkletNode = null;
    }
    if (this.sourceNode) this.sourceNode.disconnect();
    if (this.mediaStream) this.mediaStream.getTracks().forEach(track => track.stop());
    this.sourceNode = null;
    this.mediaStream = null;
    this.isProcessing = false;
  }

  public async connectToServer(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      try {
        const wsUrl = import.meta.env.VITE_STREAM_PROXY_WS;
        const config = {
          host: import.meta.env.VITE_SHOUTCAST_HOST,
          port: parseInt(import.meta.env.VITE_SHOUTCAST_PORT || '8000', 10),
          password: import.meta.env.VITE_SHOUTCAST_PASSWORD,
          mountpoint: import.meta.env.VITE_SHOUTCAST_MOUNTPOINT || '/stream',
        };

        if (this.webSocket && [WebSocket.OPEN, WebSocket.CONNECTING].includes(this.webSocket.readyState)) {
          this.webSocket.close();
        }

        this.webSocket = new WebSocket(wsUrl);

        this.webSocket.onopen = () => {
          this.reconnectAttempts = 0;
          this.webSocket!.send(JSON.stringify({ type: 'connect', config }));
        };

        this.webSocket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'status') {
              this.isConnected = data.status === 'connected';
              this.isConnected ? resolve(true) : reject(new Error('Disconnected'));
            } else if (data.type === 'error') {
              this.isConnected = false;
              reject(new Error(data.message));
            }
          } catch (err) {
            reject(err);
          }
        };

        this.webSocket.onerror = (err) => {
          this.isConnected = false;
          this.attemptReconnect();
          reject(err);
        };

        this.webSocket.onclose = () => {
          this.isConnected = false;
          if (this.isProcessing) this.attemptReconnect();
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  private attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      setTimeout(() => {
        if (this.isProcessing) {
          this.connectToServer().catch(console.error);
        }
      }, this.reconnectTimeout);
    } else {
      console.error('Max reconnection attempts reached');
    }
  }

  public disconnectFromServer() {
    if (this.webSocket && [WebSocket.OPEN, WebSocket.CONNECTING].includes(this.webSocket.readyState)) {
      if (this.webSocket.readyState === WebSocket.OPEN) {
        this.webSocket.send(JSON.stringify({ type: 'disconnect' }));
      }
      this.webSocket.close();
      this.webSocket = null;
      this.isConnected = false;
    }
  }

  private sendAudioData(audioData: any) {
    if (!this.webSocket || !this.isConnected || this.webSocket.readyState !== WebSocket.OPEN) return;

    try {
      if (audioData.channelData?.length) {
        const serializedData = {
          type: 'audio',
          buffer: Array.from(audioData.channelData[0]),
          sampleRate: audioData.sampleRate,
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
