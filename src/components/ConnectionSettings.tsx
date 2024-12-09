import { Card } from "@/components/ui/card";

const ConnectionSettings = () => {
  return (
    <Card className="p-4 space-y-4">
      <h3 className="text-lg font-medium">Connection Settings</h3>
      <div className="space-y-2">
        <div className="flex justify-between">
          <span className="text-sm text-muted-foreground">Hostname:</span>
          <span className="text-sm font-medium">web3radio.cloud</span>
        </div>
        <div className="flex justify-between">
          <span className="text-sm text-muted-foreground">Port:</span>
          <span className="text-sm font-medium">8000</span>
        </div>
        <div className="flex justify-between">
          <span className="text-sm text-muted-foreground">Encoder:</span>
          <span className="text-sm font-medium">MP3</span>
        </div>
        <div className="flex justify-between">
          <span className="text-sm text-muted-foreground">Bitrate:</span>
          <span className="text-sm font-medium">128 kb/s</span>
        </div>
        <div className="flex justify-between">
          <span className="text-sm text-muted-foreground">Output:</span>
          <span className="text-sm font-medium">Shoutcast</span>
        </div>
      </div>
    </Card>
  );
};

export default ConnectionSettings;