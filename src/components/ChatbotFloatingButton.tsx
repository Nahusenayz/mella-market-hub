import React, { Suspense, useState } from 'react';
import { Sparkles } from 'lucide-react';

const MellaAssistant = React.lazy(() =>
  import('./MellaAssistant').then((module) => ({ default: module.MellaAssistant }))
);

export const ChatbotFloatingButton: React.FC = () => {
  const [isMellaAiOpen, setIsMellaAiOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsMellaAiOpen(true)}
        className="fixed bottom-20 md:bottom-4 right-4 bg-blue-600 hover:bg-blue-700 text-white rounded-full p-4 shadow-lg z-[150] transition-all duration-300 hover:scale-110 group"
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

      <Suspense fallback={null}>
        <MellaAssistant isOpen={isMellaAiOpen} onClose={() => setIsMellaAiOpen(false)} />
      </Suspense>
    </>
  );
};
