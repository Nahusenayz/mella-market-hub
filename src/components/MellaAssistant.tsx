import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Bot, User, Loader2, Sparkles, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { askMellaAssistant } from '@/services/groqService';
import AmharicVoiceInput from './AmharicVoiceInput';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

interface MellaAssistantProps {
  isOpen: boolean;
  onClose: () => void;
}

const STORAGE_KEY = 'mella_assistant_history';

const EMERGENCY_FAQ: Record<string, string> = {
  "What number should I call?": "**Police:** 991  |  **Ambulance:** 939  |  **Fire:** 912",
  "How long will help take?": "Urban areas: **8–15 minutes**. Rural areas may take longer. Stay where you are and keep your phone on.",
  "What should I do while waiting?": "1. Stay calm\n2. Keep the injured person still and warm\n3. Gather ID documents\n4. Unlock the door\n5. Have someone wait at the gate to guide responders",
  "Where is the nearest hospital?": "Major hospitals in Addis include **Black Lion**, **St. Paul's**, **Yekatit 12**, **Bethzatha**, and **Myungsung**. Check the map on the Emergency page for the closest one.",
  "Should I move the injured person?": "**No.** Unless there is immediate danger (fire, flooding, gas leak), do not move them — risk of spinal injury is high.",
  "How do I stop bleeding?": "1. Apply firm pressure with a clean cloth\n2. Elevate the wound above the heart if possible\n3. Do NOT remove blood-soaked cloth — add another layer on top\n4. Keep pressure until help arrives",
  "Is this an emergency?": "Call immediately if: unconscious, not breathing, severe bleeding, chest pain, difficulty breathing, major burn, seizure, or poisoning. **When in doubt, call — better safe than sorry.**",
  "How do I report a fire?": "1. Evacuate everyone immediately\n2. Call **912**\n3. Stay low to avoid smoke\n4. Do NOT use elevators\n5. Wait at a safe distance for firefighters"
};

const DEFAULT_SUGGESTIONS = Object.keys(EMERGENCY_FAQ);

export const MellaAssistant: React.FC<MellaAssistantProps> = ({ isOpen, onClose }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load history
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setMessages(parsed.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) })));
        setSuggestions(DEFAULT_SUGGESTIONS);
      } catch (e) {
        console.error('Failed to load Mella AI history', e);
      }
    } else {
      // Welcome message
      setMessages([{
        id: '1',
        text: "Hello! I am Mella AI. I can answer your emergency and marketplace questions. Choose a quick question below to get started.",
        sender: 'bot',
        timestamp: new Date()
      }]);
      setSuggestions(DEFAULT_SUGGESTIONS);
    }
  }, []);

  // Save history
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    }
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const fetchSuggestions = () => {
    setSuggestions(DEFAULT_SUGGESTIONS);
  };

  const handleSendMessage = async (text?: string) => {
    const messageText = text || inputMessage;
    if (!messageText.trim()) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      text: messageText,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInputMessage('');

    // Check if it's a known FAQ question
    const faqAnswer = EMERGENCY_FAQ[messageText];
    if (faqAnswer) {
      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        text: faqAnswer,
        sender: 'bot',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, botMsg]);
      setSuggestions(DEFAULT_SUGGESTIONS);
      return;
    }

    setIsLoading(true);

    try {
      const history = messages.slice(-5).map(m => ({
        role: m.sender === 'user' ? 'user' : 'assistant',
        content: m.text
      }));

      const botResponse = await askMellaAssistant(messageText, history);

      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        text: botResponse,
        sender: 'bot',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, botMsg]);
      fetchSuggestions();
    } catch (error) {
      console.error('Mella AI Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const clearHistory = () => {
    localStorage.removeItem(STORAGE_KEY);
    setMessages([{
      id: Date.now().toString(),
      text: "History cleared. How can I help you?",
      sender: 'bot',
      timestamp: new Date()
    }]);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[250] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-sm">
      <motion.div 
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        className="w-full max-w-lg h-[90vh] sm:h-[700px] bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col"
      >
        <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-4 flex flex-row items-center justify-between space-y-0">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-lg">
              <Sparkles className="h-5 w-5 text-yellow-300" />
            </div>
            <div>
              <CardTitle className="text-lg font-bold">Mella AI Assistant</CardTitle>
              <p className="text-xs text-blue-100">Powered by OpenRouter</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={clearHistory} className="text-white/80 hover:text-white hover:bg-white/10">
              <Trash2 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose} className="text-white/80 hover:text-white hover:bg-white/10">
              <X className="h-5 w-5" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="flex-1 overflow-hidden p-0 flex flex-col bg-slate-50">
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4 pb-4">
              {messages.map((m) => (
                <div key={m.id} className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`flex gap-2 max-w-[85%] ${m.sender === 'user' ? 'flex-row-reverse' : ''}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                      m.sender === 'user' ? 'bg-blue-600' : 'bg-white shadow-sm border border-slate-200'
                    }`}>
                      {m.sender === 'user' ? <User className="h-4 w-4 text-white" /> : <Bot className="h-4 w-4 text-blue-600" />}
                    </div>
                    <div className={`p-3 rounded-2xl text-sm ${
                      m.sender === 'user' 
                        ? 'bg-blue-600 text-white rounded-tr-none' 
                        : 'bg-white text-slate-800 shadow-sm border border-slate-100 rounded-tl-none'
                    }`}>
                      {m.text}
                      <div className={`text-[10px] mt-1 opacity-60 ${m.sender === 'user' ? 'text-right' : 'text-left'}`}>
                        {m.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start gap-2">
                  <div className="w-8 h-8 rounded-full bg-white shadow-sm border border-slate-200 flex items-center justify-center">
                    <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
                  </div>
                  <div className="bg-white p-3 rounded-2xl rounded-tl-none shadow-sm border border-slate-100">
                    <div className="flex gap-1">
                      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" />
                      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {suggestions.length > 0 && (
            <div className="flex flex-wrap gap-2 px-4 py-3 border-t border-slate-200 bg-white">
              <p className="w-full text-[10px] font-bold text-purple-500 uppercase tracking-wider">Quick replies</p>
              {suggestions.map((s, i) => (
                <button key={i} onClick={() => { setInputMessage(s); handleSendMessage(s); setSuggestions([]); }}
                  className="text-xs bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-full px-3 py-1.5 border border-purple-200 transition-colors font-medium">
                  {s}
                </button>
              ))}
            </div>
          )}

          <div className="p-4 bg-white border-t border-slate-100">
            <div className="flex items-center gap-2">
              <AmharicVoiceInput onResult={handleSendMessage} />
              <Input 
                placeholder="Type your message..."
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                className="flex-1 bg-slate-50 border-none focus-visible:ring-blue-500 rounded-xl"
              />
              <Button 
                onClick={() => handleSendMessage()}
                disabled={isLoading || !inputMessage.trim()}
                size="icon"
                className="bg-blue-600 hover:bg-blue-700 rounded-xl shrink-0"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </motion.div>
    </div>
  );
};
