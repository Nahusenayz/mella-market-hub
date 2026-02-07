import React, { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { EmergencyAssistant } from './EmergencyAssistant';

interface ChatbotFloatingButtonProps {
  showEmergencyAssistant?: boolean;
  userLocation?: { lat: number; lng: number };
}

export const ChatbotFloatingButton: React.FC<ChatbotFloatingButtonProps> = ({
  showEmergencyAssistant = false,
  userLocation
}) => {
  const [isEmergencyOpen, setIsEmergencyOpen] = useState(showEmergencyAssistant);

  // Auto-open emergency assistant if prop is true
  React.useEffect(() => {
    if (showEmergencyAssistant) {
      setIsEmergencyOpen(true);
    }
  }, [showEmergencyAssistant]);

  return (
    <>
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

      <EmergencyAssistant
        isOpen={isEmergencyOpen}
        onClose={() => setIsEmergencyOpen(false)}
        userLocation={userLocation}
      />
    </>
  );
};