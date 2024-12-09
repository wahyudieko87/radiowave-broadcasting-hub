import { useState, useRef } from "react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Mic, Music, Volume2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface AudioControlsProps {
  isNFTVerified: boolean;
}

const AudioControls = ({ isNFTVerified }: AudioControlsProps) => {
  const { toast } = useToast();
  const [micVolume, setMicVolume] = useState(0.5);
  const [fileVolume, setFileVolume] = useState(0.5);
  const [isRecording, setIsRecording] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  const startMicStream = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      setIsRecording(true);
      
      toast({
        title: "Microphone Access",
        description: "Successfully connected to microphone",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Could not access microphone",
        variant: "destructive",
      });
    }
  };

  const stopMicStream = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === "audio/mpeg") {
      setSelectedFile(file);
      if (audioRef.current) {
        audioRef.current.src = URL.createObjectURL(file);
        audioRef.current.volume = fileVolume;
      }
      toast({
        title: "File Loaded",
        description: `${file.name} loaded successfully`,
      });
    } else {
      toast({
        title: "Invalid File",
        description: "Please select an MP3 file",
        variant: "destructive",
      });
    }
  };

  const handleMicVolumeChange = (value: number[]) => {
    const newVolume = value[0];
    setMicVolume(newVolume);
    // Here you would implement the actual mic volume control
  };

  const handleFileVolumeChange = (value: number[]) => {
    const newVolume = value[0];
    setFileVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
  };

  return (
    <Card className="p-6 space-y-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mic className="h-5 w-5" />
            <h3 className="font-semibold">Microphone Input</h3>
          </div>
          <Button
            onClick={isRecording ? stopMicStream : startMicStream}
            disabled={!isNFTVerified}
            variant={isRecording ? "destructive" : "default"}
          >
            {isRecording ? "Stop Mic" : "Start Mic"}
          </Button>
        </div>
        <div className="flex items-center gap-4">
          <Volume2 className="h-5 w-5" />
          <Slider
            value={[micVolume]}
            onValueChange={handleMicVolumeChange}
            max={1}
            step={0.01}
            disabled={!isRecording || !isNFTVerified}
          />
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Music className="h-5 w-5" />
            <h3 className="font-semibold">MP3 File Input</h3>
          </div>
          <input
            type="file"
            accept=".mp3,audio/mpeg"
            onChange={handleFileChange}
            disabled={!isNFTVerified}
            className="text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>
        <div className="flex items-center gap-4">
          <Volume2 className="h-5 w-5" />
          <Slider
            value={[fileVolume]}
            onValueChange={handleFileVolumeChange}
            max={1}
            step={0.01}
            disabled={!selectedFile || !isNFTVerified}
          />
        </div>
      </div>
      <audio ref={audioRef} className="hidden" controls />
    </Card>
  );
};

export default AudioControls;