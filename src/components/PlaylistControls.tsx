import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Music, Play, Trash2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface PlaylistTrack {
  id: string;
  name: string;
  file: File;
}

interface PlaylistControlsProps {
  isNFTVerified: boolean;
  onTrackSelect: (file: File) => void;
}

const PlaylistControls = ({ isNFTVerified, onTrackSelect }: PlaylistControlsProps) => {
  const { toast } = useToast();
  const [playlist, setPlaylist] = useState<PlaylistTrack[]>([]);
  const [currentTrack, setCurrentTrack] = useState<string | null>(null);

  const handleFileAdd = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (playlist.length >= 5) {
      toast({
        title: "Playlist Full",
        description: "Maximum 5 tracks allowed. Remove some tracks first.",
        variant: "destructive",
      });
      return;
    }

    if (file.type !== "audio/mpeg") {
      toast({
        title: "Invalid File",
        description: "Please select an MP3 file",
        variant: "destructive",
      });
      return;
    }

    const newTrack: PlaylistTrack = {
      id: Math.random().toString(36).substr(2, 9),
      name: file.name,
      file: file,
    };

    setPlaylist([...playlist, newTrack]);
    toast({
      title: "Track Added",
      description: `${file.name} added to playlist`,
    });
  };

  const handleTrackPlay = (track: PlaylistTrack) => {
    setCurrentTrack(track.id);
    onTrackSelect(track.file);
    toast({
      title: "Now Playing",
      description: track.name,
    });
  };

  const handleTrackRemove = (trackId: string) => {
    setPlaylist(playlist.filter((track) => track.id !== trackId));
    if (currentTrack === trackId) {
      setCurrentTrack(null);
    }
    toast({
      title: "Track Removed",
      description: "Track removed from playlist",
    });
  };

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Music className="h-5 w-5" />
          <h3 className="font-semibold">Playlist ({playlist.length}/5)</h3>
        </div>
        <input
          type="file"
          accept=".mp3,audio/mpeg"
          onChange={handleFileAdd}
          disabled={!isNFTVerified || playlist.length >= 5}
          className="text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
        />
      </div>

      <div className="space-y-2">
        {playlist.map((track) => (
          <div
            key={track.id}
            className="flex items-center justify-between p-2 rounded-lg bg-secondary"
          >
            <span className="truncate max-w-[200px]">{track.name}</span>
            <div className="flex gap-2">
              <Button
                size="icon"
                variant={currentTrack === track.id ? "secondary" : "outline"}
                onClick={() => handleTrackPlay(track)}
                disabled={!isNFTVerified}
              >
                <Play className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="destructive"
                onClick={() => handleTrackRemove(track.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
        {playlist.length === 0 && (
          <div className="text-center text-muted-foreground p-4">
            No tracks in playlist
          </div>
        )}
      </div>
    </Card>
  );
};

export default PlaylistControls;