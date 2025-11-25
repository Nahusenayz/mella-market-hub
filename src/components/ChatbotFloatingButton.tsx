import React, { useState } from 'react';
import { MessageCircle, Heart, AlertTriangle } from 'lucide-react';
import { FirstAidChatbot } from './FirstAidChatbot';
import { EmergencyAssistant } from './EmergencyAssistant';

interface ChatbotFloatingButtonProps {
  showEmergencyAssistant?: boolean;
  userLocation?: { lat: number; lng: number };
}

export const ChatbotFloatingButton: React.FC<ChatbotFloatingButtonProps> = ({ 
  showEmergencyAssistant = false,
  userLocation 
}) => {
  const [isFirstAidOpen, setIsFirstAidOpen] = useState(false);
  const [isEmergencyOpen, setIsEmergencyOpen] = useState(showEmergencyAssistant);

  // Auto-open emergency assistant if prop is true
  React.useEffect(() => {
    if (showEmergencyAssistant) {
      setIsEmergencyOpen(true);
    }
  }, [showEmergencyAssistant]);

  return (
    <>
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
          className="fixed bottom-36 right-4 bg-orange-600 hover:bg-orange-700 text-white rounded-full p-4 shadow-lg z-[150] transition-all duration-300 hover:scale-110 animate-pulse"
          aria-label="Open Emergency Assistant"
          title="Emergency Report Assistant"
        >
          <AlertTriangle className="h-6 w-6" />
        </button>
      )}
      
      <FirstAidChatbot isOpen={isFirstAidOpen} onClose={() => setIsFirstAidOpen(false)} />
      <EmergencyAssistant 
        isOpen={isEmergencyOpen} 
        onClose={() => setIsEmergencyOpen(false)}
        userLocation={userLocation}
      />
    </>
  );
};