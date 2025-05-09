
// PCM Audio Processor for Web Audio API
class PCMProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.isRecording = false;
    this.port.onmessage = (event) => {
      if (event.data.command === 'start') {
        this.isRecording = true;
        console.log('PCM Processor: Started recording');
      } else if (event.data.command === 'stop') {
        this.isRecording = false;
        console.log('PCM Processor: Stopped recording');
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
      sampleRate: sampleRate // This is a global variable in AudioWorkletGlobalScope
    };
    
    for (let channel = 0; channel < input.length; channel++) {
      // Clone the channel data to avoid sharing the buffer
      audioData.channelData.push(Array.from(input[channel]));
    }
    
    this.port.postMessage({
      eventType: 'data',
      audioData: audioData
    });
    
    return true;
  }
}

registerProcessor('pcm-processor', PCMProcessor);
