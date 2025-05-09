import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Mic, Radio, Activity } from "lucide-react";
import BroadcastStatus from "@/components/BroadcastStatus";
import WalletConnect from "@/components/WalletConnect";
import AudioControls from "@/components/AudioControls";
import audioService from "@/services/AudioService";

const SHOUTCAST_CONFIG = {
  host: 'web3radio.cloud',
  port: 8000,
  password: 'web3radio',
  mountpoint: '/stream',
  audioConfig: {
    bitrate: 128000,
    sampleRate: 44100,
    channels: 2,
    encoder: 'mp3'
  }
};

const Index = () => {
  const [isStreaming, setIsStreaming] = useState(false);
  const [isNFTVerified, setIsNFTVerified] = useState(false);
  const { toast } = useToast();
  const [isConnecting, setIsConnecting] = useState(false);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (isStreaming) {
        handleStopStream();
      }
    };
  }, []);

  const handleStartStream = async () => {
    if (!isNFTVerified) {
      toast({
        title: "Access Denied",
        description: "You need to connect your wallet and be authorized to start broadcasting",
        variant: "destructive",
      });
      return;
    }

    if (isConnecting) return;
    setIsConnecting(true);

    try {
      toast({
        title: "Connecting",
        description: "Attempting to connect to broadcast server...",
      });

      // Start microphone and connect to server
      console.log("Starting microphone...");
      const micStarted = await audioService.startMicrophone();
      if (!micStarted) {
        throw new Error('Failed to access microphone');
      }
      
      console.log("Connecting to server...");
      const connected = await audioService.connectToServer();
      if (!connected) {
        throw new Error('Failed to connect to server');
      }
      
      setIsStreaming(true);
      setIsConnecting(false);
      toast({
        title: "Broadcast Started",
        description: "Successfully connected to broadcast server",
      });
    } catch (error) {
      console.error('Connection error:', error);
      audioService.stopMicrophone();
      audioService.disconnectFromServer();
      setIsStreaming(false);
      setIsConnecting(false);
      toast({
        title: "Error",
        description: `Failed to establish connection: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    }
  };

  const handleStopStream = () => {
    audioService.stopMicrophone();
    audioService.disconnectFromServer();
    setIsStreaming(false);
    toast({
      title: "Broadcast Stopped",
      description: "Disconnected from broadcast server",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">Web3 Radio Studio</h1>
          <p className="text-muted-foreground">Broadcasting Dashboard</p>
        </div>

        <WalletConnect onOwnershipVerified={setIsNFTVerified} />

        <Card className="p-6 glass-panel">
          <div className="space-y-4">
            <BroadcastStatus isStreaming={isStreaming} />
            <div className="space-y-2">
              <Button
                size="lg"
                className="w-full transition-all duration-300 hover:scale-105"
                onClick={isStreaming ? handleStopStream : handleStartStream}
                disabled={!isNFTVerified || isConnecting}
              >
                {isConnecting ? (
                  <>
                    <Activity className="mr-2 h-5 w-5 animate-pulse" /> Connecting...
                  </>
                ) : isStreaming ? (
                  <>
                    <Radio className="mr-2 h-5 w-5" /> Stop Broadcasting
                  </>
                ) : (
                  <>
                    <Mic className="mr-2 h-5 w-5" /> Start Broadcasting
                  </>
                )}
              </Button>
            </div>
          </div>
        </Card>

        <AudioControls isNFTVerified={isNFTVerified} />

        <Card className="p-6 glass-panel">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Activity className="h-5 w-5" />
              <h2 className="text-xl font-semibold">Stream Metrics</h2>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-secondary">
              <div className="text-sm text-muted-foreground">Bitrate</div>
              <div className="text-2xl font-semibold">{SHOUTCAST_CONFIG.audioConfig.bitrate / 1000} kbps</div>
            </div>
            <div className="p-4 rounded-lg bg-secondary">
              <div className="text-sm text-muted-foreground">Sample Rate</div>
              <div className="text-2xl font-semibold">{SHOUTCAST_CONFIG.audioConfig.sampleRate / 1000} kHz</div>
            </div>
            <div className="p-4 rounded-lg bg-secondary">
              <div className="text-sm text-muted-foreground">Format</div>
              <div className="text-2xl font-semibold">{SHOUTCAST_CONFIG.audioConfig.encoder.toUpperCase()}</div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Index;
