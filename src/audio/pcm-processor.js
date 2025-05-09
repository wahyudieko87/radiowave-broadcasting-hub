
// PCM Audio Processor for Web Audio API
class PCMProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.isRecording = false;
    this.port.onmessage = (event) => {
      if (event.data.command === 'start') {
        this.isRecording = true;
      } else if (event.data.command === 'stop') {
        this.isRecording = false;
      }
    };
  }

  process(inputs, outputs) {
    // If we're not recording, just pass through
    if (!this.isRecording) return true;
    
    // Get the first input channel data
    const input = inputs[0];
    if (!input || input.length === 0) return true;
    
    // Send audio data to the main thread
    const audioData = {
      channelData: [],
      numChannels: input.length,
      sampleRate: sampleRate
    };
    
    for (let channel = 0; channel < input.length; channel++) {
      // Clone the channel data
      audioData.channelData.push(new Float32Array(input[channel]));
    }
    
    this.port.postMessage({
      eventType: 'data',
      audioData: audioData
    });
    
    return true;
  }
}

registerProcessor('pcm-processor', PCMProcessor);
