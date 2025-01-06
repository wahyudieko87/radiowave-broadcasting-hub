import { useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Mic, Radio, Activity } from "lucide-react";
import BroadcastStatus from "@/components/BroadcastStatus";
import WalletConnect from "@/components/WalletConnect";
import AudioControls from "@/components/AudioControls";

const SHOUTCAST_CONFIG = {
  host: 'web3radio.cloud',
  port: 8000,
  password: 'passweb3radio'
};

const Index = () => {
  const [isStreaming, setIsStreaming] = useState(false);
  const [isNFTVerified, setIsNFTVerified] = useState(false);
  const { toast } = useToast();
  const [broadcastSocket, setBroadcastSocket] = useState<WebSocket | null>(null);

  const handleStartStream = () => {
    if (!isNFTVerified) {
      toast({
        title: "Access Denied",
        description: "You need to connect your wallet and own the required NFT to start broadcasting",
        variant: "destructive",
      });
      return;
    }

    try {
      const wsUrl = `ws://${SHOUTCAST_CONFIG.host}:${SHOUTCAST_CONFIG.port}/stream`;
      const socket = new WebSocket(wsUrl);

      socket.onopen = () => {
        socket.send(JSON.stringify({
          type: 'auth',
          password: SHOUTCAST_CONFIG.password
        }));
        setIsStreaming(true);
        toast({
          title: "Broadcast Started",
          description: "Successfully connected to Shoutcast server",
        });
      };

      socket.onerror = (error) => {
        console.error('WebSocket Error:', error);
        toast({
          title: "Connection Error",
          description: "Failed to connect to broadcast server",
          variant: "destructive",
        });
      };

      socket.onclose = () => {
        setIsStreaming(false);
        toast({
          title: "Broadcast Ended",
          description: "Disconnected from broadcast server",
        });
      };

      setBroadcastSocket(socket);
    } catch (error) {
      console.error('Connection error:', error);
      toast({
        title: "Error",
        description: "Failed to establish connection",
        variant: "destructive",
      });
    }
  };

  const handleStopStream = () => {
    if (broadcastSocket) {
      broadcastSocket.close();
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
          <p className="text-muted-foreground">Professional Broadcasting Interface</p>
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