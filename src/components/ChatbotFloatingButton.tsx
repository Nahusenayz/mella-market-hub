import React, { useState } from 'react';
import { MessageCircle, Heart, AlertTriangle, Sparkles } from 'lucide-react';
import { FirstAidChatbot } from './FirstAidChatbot';
import { EmergencyAssistant } from './EmergencyAssistant';
import { MellaAssistant } from './MellaAssistant';

interface ChatbotFloatingButtonProps {
  showEmergencyAssistant?: boolean;
  userLocation?: { lat: number; lng: number };
}

export const ChatbotFloatingButton: React.FC<ChatbotFloatingButtonProps> = ({
  showEmergencyAssistant = false,
  userLocation
}) => {
  const [isFirstAidOpen, setIsFirstAidOpen] = useState(false);
  const [isMellaAiOpen, setIsMellaAiOpen] = useState(false);
  const [isEmergencyOpen, setIsEmergencyOpen] = useState(showEmergencyAssistant);

  // Auto-open emergency assistant if prop is true
  React.useEffect(() => {
    if (showEmergencyAssistant) {
      setIsEmergencyOpen(true);
    }
  }, [showEmergencyAssistant]);

  return (
    <>
      {/* Mella AI Assistant Button - NEW */}
      <button
        onClick={() => setIsMellaAiOpen(true)}
        className="fixed bottom-36 right-4 bg-blue-600 hover:bg-blue-700 text-white rounded-full p-4 shadow-lg z-[150] transition-all duration-300 hover:scale-110 group"
        aria-label="Open Mella AI Assistant"
        title="Mella AI Assistant"
      >
        <div className="relative">
          <Sparkles className="h-6 w-6" />
          <span className="absolute -top-8 right-0 bg-blue-600 text-white text-[10px] px-2 py-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
            Ask Mella AI
          </span>
        </div>
      </button>

      {/* Regular First Aid Chatbot Button */}
      <button
        onClick={() => setIsFirstAidOpen(true)}
        className="fixed bottom-20 right-4 bg-red-600 hover:bg-red-700 text-white rounded-full p-4 shadow-lg z-[150] transition-all duration-300 hover:scale-110 pulse-red"
        aria-label="Open First Aid Assistant"
        title="Emergency First Aid Assistant"
      >
        <div className="relative">
          <Heart className="h-6 w-6" />
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-white rounded-full flex items-center justify-center">
            <div className="w-1.5 h-1.5 bg-red-600 rounded-full"></div>
          </div>
        </div>
      </button>

      {/* Emergency Assistant Button (only shows during emergency) */}
      {showEmergencyAssistant && !isEmergencyOpen && (
        <button
          onClick={() => setIsEmergencyOpen(true)}
          className="fixed bottom-52 right-4 bg-orange-600 hover:bg-orange-700 text-white rounded-full p-4 shadow-lg z-[150] transition-all duration-300 hover:scale-110 animate-pulse"
          aria-label="Open Emergency Assistant"
          title="Emergency Report Assistant"
        >
          <AlertTriangle className="h-6 w-6" />
        </button>
      )}

      <MellaAssistant isOpen={isMellaAiOpen} onClose={() => setIsMellaAiOpen(false)} />
      <FirstAidChatbot isOpen={isFirstAidOpen} onClose={() => setIsFirstAidOpen(false)} />
      <EmergencyAssistant
        isOpen={isEmergencyOpen}
        onClose={() => setIsEmergencyOpen(false)}
        userLocation={userLocation}
      />
    </>
  );
};