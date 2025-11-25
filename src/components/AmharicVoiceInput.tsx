import React, { useState } from "react";

interface AmharicVoiceInputProps {
  onResult: (text: string) => void;
}

const AmharicVoiceInput: React.FC<AmharicVoiceInputProps> = ({ onResult }) => {
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
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);
    setListening(true);
    recognition.start();
  };

  return (
    <button onClick={startRecognition} disabled={listening} style={{padding: '8px 16px', borderRadius: '6px', background: '#f3f4f6', border: '1px solid #ccc', cursor: listening ? 'not-allowed' : 'pointer'}}>
      {listening ? "Listening..." : "🎤 Speak Amharic"}
    </button>
  );
};

export default AmharicVoiceInput;
