
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Mic, Radio, Activity } from "lucide-react";
import BroadcastStatus from "@/components/BroadcastStatus";
import WalletConnect from "@/components/WalletConnect";
import AudioControls from "@/components/AudioControls";

const SHOUTCAST_CONFIG = {
  host: 'http://202.10.40.105/',
  port: 8000,
  password: 'passweb3radio',
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
  const [broadcastSocket, setBroadcastSocket] = useState<WebSocket | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    return () => {
      if (broadcastSocket) {
        broadcastSocket.close();
      }
    };
  }, [broadcastSocket]);

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
      // Test server availability first using the proxy
      const response = await fetch(`/api/admin.cgi?pass=${SHOUTCAST_CONFIG.password}&mode=viewxml`);
      
      if (!response.ok) {
        throw new Error('Server not available');
      }

      // If server is available, establish WebSocket connection through proxy
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/api${SHOUTCAST_CONFIG.mountpoint}`;
      console.log('Connecting to WebSocket URL:', wsUrl);
      
      const socket = new WebSocket(wsUrl);

      socket.onopen = () => {
        console.log('WebSocket connection established');
        // Send Shoutcast v1 authentication header
        const authHeader = btoa(`${SHOUTCAST_CONFIG.password}:`);
        const headers = 
          `SOURCE ${SHOUTCAST_CONFIG.mountpoint} HTTP/1.0\r\n` +
          `Authorization: Basic ${authHeader}\r\n` +
          'Content-Type: audio/mpeg\r\n' +
          `icy-name:Web3Radio\r\n` +
          `icy-genre:Various\r\n` +
          `icy-pub:1\r\n` +
          `icy-br:${SHOUTCAST_CONFIG.audioConfig.bitrate / 1000}\r\n\r\n`;
        
        console.log('Sending headers:', headers);
        socket.send(headers);
        
        setIsStreaming(true);
        setIsConnecting(false);
        toast({
          title: "Broadcast Started",
          description: "Successfully connected to Shoutcast server",
        });
      };

      socket.onerror = (error) => {
        console.error('WebSocket Error:', error);
        setIsStreaming(false);
        setIsConnecting(false);
        toast({
          title: "Connection Error",
          description: "Failed to connect to broadcast server. Please check server status.",
          variant: "destructive",
        });
      };

      socket.onclose = (event) => {
        console.log('WebSocket connection closed:', event.code, event.reason);
        setIsStreaming(false);
        setIsConnecting(false);
        toast({
          title: "Broadcast Ended",
          description: event.code === 1000 ? "Disconnected from broadcast server" : "Connection lost unexpectedly",
          variant: event.code === 1000 ? "default" : "destructive",
        });
      };

      setBroadcastSocket(socket);

    } catch (error) {
      console.error('Connection error:', error);
      setIsStreaming(false);
      setIsConnecting(false);
      toast({
        title: "Error",
        description: "Failed to establish connection. Please check your network connection.",
        variant: "destructive",
      });
    }
  };

  const handleStopStream = () => {
    if (broadcastSocket) {
      broadcastSocket.close(1000, "Stream ended by user");
      setBroadcastSocket(null);
      setIsStreaming(false);
      toast({
        title: "Broadcast Stopped",
        description: "Disconnected from Shoutcast server",
      });
    }
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
                disabled={!isNFTVerified}
              >
                {isStreaming ? (
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
              <div className="text-2xl font-semibold">128 kbps</div>
            </div>
            <div className="p-4 rounded-lg bg-secondary">
              <div className="text-sm text-muted-foreground">Sample Rate</div>
              <div className="text-2xl font-semibold">44.1 kHz</div>
            </div>
            <div className="p-4 rounded-lg bg-secondary">
              <div className="text-sm text-muted-foreground">Format</div>
              <div className="text-2xl font-semibold">MP3</div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Index;
