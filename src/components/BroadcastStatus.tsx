import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

interface BroadcastStatusProps {
  isStreaming: boolean;
}

const BroadcastStatus = ({ isStreaming }: BroadcastStatusProps) => {
  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Broadcast Status</h3>
        <Badge variant={isStreaming ? "default" : "secondary"}>
          {isStreaming ? "LIVE" : "OFFLINE"}
        </Badge>
      </div>
      <div className="flex items-center space-x-2">
        <div className={`status-indicator ${isStreaming ? "connected" : "disconnected"}`} />
        <span className="text-sm text-muted-foreground">
          {isStreaming ? "Connected to server" : "Not connected"}
        </span>
      </div>
    </Card>
  );
};

export default BroadcastStatus;