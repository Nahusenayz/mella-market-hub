import React, { useState } from "react";
import { Mic, MicOff } from "lucide-react";

interface AmharicVoiceInputProps {
  onResult: (text: string) => void;
  className?: string;
  children?: React.ReactNode;
}

const AmharicVoiceInput: React.FC<AmharicVoiceInputProps> = ({ onResult, className, children }) => {
  const [listening, setListening] = useState(false);

  const startRecognition = () => {
    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech Recognition not supported in this browser.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = "am-ET";
    recognition.onresult = (e: any) => {
      const text = e.results[0][0].transcript;
      onResult(text);
      setListening(false);
    };
    recognition.onerror = (err: any) => {
      console.error("Speech Recognition Error:", err);
      setListening(false);
    };
    recognition.onend = () => setListening(false);
    setListening(true);
    recognition.start();
  };

  return (
    <button 
      type="button"
      onClick={startRecognition} 
      disabled={listening} 
      className={className || "p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors flex items-center gap-2"}
    >
      {listening ? <MicOff className="h-4 w-4 animate-pulse text-red-500" /> : <Mic className="h-4 w-4 text-gray-600" />}
      {children || (listening ? "Listening..." : "")}
    </button>
  );
};

export default AmharicVoiceInput;
