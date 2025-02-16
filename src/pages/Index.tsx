
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Mic, Radio, Activity, Download, ChevronRight } from "lucide-react";
import BroadcastStatus from "@/components/BroadcastStatus";
import WalletConnect from "@/components/WalletConnect";
import AudioControls from "@/components/AudioControls";

const SHOUTCAST_CONFIG = {
  host: 'web3radio.cloud',
  port: 8000,
  password: 'passweb3radio',
  mountpoint: '/stream',
  audioConfig: {
    bitrate: 128000, // 128 kb/s
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

  const handleStartStream = () => {
    if (!isNFTVerified) {
      toast({
        title: "Access Denied",
        description: "You need to connect your wallet and be authorized to start broadcasting",
        variant: "destructive",
      });
      return;
    }

    try {
      // Test server availability first
      fetch(`http://${SHOUTCAST_CONFIG.host}:${SHOUTCAST_CONFIG.port}/admin.cgi?pass=${SHOUTCAST_CONFIG.password}&mode=viewxml`)
        .then(response => {
          if (!response.ok) throw new Error('Server not available');
          
          // If server is available, establish WebSocket connection
          const wsUrl = `ws://${SHOUTCAST_CONFIG.host}:${SHOUTCAST_CONFIG.port}${SHOUTCAST_CONFIG.mountpoint}`;
          const socket = new WebSocket(wsUrl);

          socket.onopen = () => {
            console.log('WebSocket connection established');
            // Send Shoutcast v1 authentication header
            const authHeader = btoa(`${SHOUTCAST_CONFIG.password}:`);
            socket.send(`SOURCE ${SHOUTCAST_CONFIG.password} HTTP/1.0\r\n` +
                       `Authorization: Basic ${authHeader}\r\n` +
                       'Content-Type: audio/mpeg\r\n' +
                       `icy-name:Web3Radio\r\n` +
                       `icy-genre:Various\r\n` +
                       `icy-pub:1\r\n` +
                       `icy-br:${SHOUTCAST_CONFIG.audioConfig.bitrate / 1000}\r\n\r\n`);
            
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
              description: "Failed to connect to broadcast server. Please check server status.",
              variant: "destructive",
            });
            setIsStreaming(false);
          };

          socket.onclose = (event) => {
            console.log('WebSocket connection closed:', event.code, event.reason);
            setIsStreaming(false);
            toast({
              title: "Broadcast Ended",
              description: event.code === 1000 ? "Disconnected from broadcast server" : "Connection lost unexpectedly",
              variant: event.code === 1000 ? "default" : "destructive",
            });
          };

          setBroadcastSocket(socket);
        })
        .catch(error => {
          console.error('Server check failed:', error);
          toast({
            title: "Server Error",
            description: "Could not connect to broadcast server. Please try again later.",
            variant: "destructive",
          });
        });
    } catch (error) {
      console.error('Connection error:', error);
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
          <p className="text-muted-foreground">Professional Broadcasting Interface</p>
        </div>

        <Card className="p-6 glass-panel">
          <h2 className="text-xl font-semibold mb-4">Installation Guide</h2>
          <div className="space-y-4">
            <div className="bg-secondary/50 p-4 rounded-lg">
              <h3 className="font-medium mb-2 flex items-center">
                <Download className="h-5 w-5 mr-2" />
                Required Software
              </h3>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li>BUTT (Broadcast Using This Tool) - <a href="https://danielnoethen.de/butt/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Download</a></li>
                <li>Mixxx (Optional for DJ mixing) - <a href="https://mixxx.org/download/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Download</a></li>
              </ul>
            </div>

            <div className="space-y-3">
              <h3 className="font-medium">Server Configuration</h3>
              <div className="grid grid-cols-2 gap-4 bg-secondary/50 p-4 rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">Server</p>
                  <p className="font-mono">{SHOUTCAST_CONFIG.host}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Port</p>
                  <p className="font-mono">{SHOUTCAST_CONFIG.port}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Password</p>
                  <p className="font-mono">{SHOUTCAST_CONFIG.password}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Type</p>
                  <p className="font-mono">Shoutcast v1</p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="font-medium">Setup Steps</h3>
              <ol className="space-y-2 text-muted-foreground">
                <li className="flex items-start">
                  <ChevronRight className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
                  Install BUTT (Broadcast Using This Tool)
                </li>
                <li className="flex items-start">
                  <ChevronRight className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
                  Open BUTT and go to Settings
                </li>
                <li className="flex items-start">
                  <ChevronRight className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
                  Add new server with the configuration details above
                </li>
                <li className="flex items-start">
                  <ChevronRight className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
                  Set audio format to MP3, bitrate to 128 kbps
                </li>
                <li className="flex items-start">
                  <ChevronRight className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
                  Configure your audio input device
                </li>
              </ol>
            </div>
          </div>
        </Card>

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
