import React, { useState, useEffect, useRef } from 'react';
import { Bot, X, AlertTriangle, MapPin, Phone, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useLanguage } from '@/contexts/LanguageContext';

interface EmergencyAssistantProps {
  isOpen: boolean;
  onClose: () => void;
  userLocation?: { lat: number; lng: number };
}

interface ConversationStep {
  id: number;
  botMessage: { en: string; am: string };
  userResponse?: string;
  isCompleted: boolean;
}

export const EmergencyAssistant: React.FC<EmergencyAssistantProps> = ({
  isOpen,
  onClose,
  userLocation
}) => {
  const { t, language, setLanguage } = useLanguage();
  const [currentStep, setCurrentStep] = useState(0);
  const [userInputs, setUserInputs] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showQuickAnswers, setShowQuickAnswers] = useState(true);
  const [quickAnswerShown, setQuickAnswerShown] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const quickAnswers: { question: string; answer: string }[] = [
    { question: 'What number should I call?', answer: '📞 Emergency numbers in Ethiopia:\n• Police: 991\n• Ambulance: 939\n• Fire: 912\n\nCall these numbers immediately for direct emergency services.' },
    { question: 'How long will help take?', answer: '⏱️ Responders typically arrive within 8-15 minutes in urban areas like Addis Ababa. In rural areas it may take longer. Stay calm and wait at a safe location.' },
    { question: 'What should I do while waiting?', answer: '🆘 While waiting for help:\n• Stay calm and stay in a safe place\n• Keep the injured person still and warm\n• Do NOT give food or drink to an injured person\n• Gather ID and medical info if possible\n• Keep your phone charged and nearby' },
    { question: 'Where is the nearest hospital?', answer: '🏥 You can see nearby emergency stations listed on the Emergency page below the map. Common hospitals in Addis Ababa include Tikur Anbessa, St. Paul\'s, and Yekatit 12.' },
    { question: 'Should I move the injured person?', answer: '⚠️ Do NOT move an injured person unless they are in immediate danger (fire, flooding, collapsing structure). Moving them could worsen spinal or neck injuries. Wait for paramedics.' },
    { question: 'How do I stop bleeding?', answer: '🩹 To stop bleeding:\n1. Apply firm, direct pressure with a clean cloth\n2. Keep pressure for 10-15 minutes\n3. Do NOT remove the cloth if blood soaks through — add another on top\n4. Elevate the wound above heart level if possible\n5. Call 939 for ambulance' },
    { question: 'Is this an emergency?', answer: '✅ Call emergency services if:\n• Someone is unconscious or not breathing\n• Severe bleeding that won\'t stop\n• Chest pain or difficulty breathing\n• Fire or smoke\n• Crime in progress\n• Serious accident with injuries\n\nIf unsure, call 991 (Police) or 939 (Ambulance) — better safe than sorry.' },
    { question: 'How do I report a fire?', answer: '🔥 If you see fire or smoke:\n1. Evacuate the building immediately\n2. Call 912 (Fire Department)\n3. Do NOT use elevators\n4. Stay low to avoid smoke\n5. Meet at a safe distance from the building\n6. Wait for firefighters to arrive' },
  ];

  const conversationSteps: ConversationStep[] = [
    {
      id: 1,
      botMessage: {
        en: "🚨 Emergency Report Received\n\nHello, I'm your emergency assistant. Please stay calm. Are you injured or is someone else injured?",
        am: "🚨 የአደጋ ጊዜ ሪፖርት ተቀብሏል\n\nሰላም፣ እኔ የአደጋ ጊዜ ረዳትዎ ነኝ። እባክዎ ረጋ ይሁኑ። እርስዎ ወይም ሌላ ሰው ቆስለዋል?"
      },
      isCompleted: false
    },
    {
      id: 2,
      botMessage: {
        en: "Thank you for the information. Can you briefly describe what happened? (e.g., 'car accident', 'fall from stairs', 'medical emergency')",
        am: "ለመረጃው እናመሰግናለን። የተከሰተውን ነገር በአጭሩ ሊገልጹት ይችላሉ? (ለምሳሌ 'የመኪና አደጋ'፣ 'ከደረጃ መውደቅ'፣ 'የሕክምና አደጋ')"
      },
      isCompleted: false
    },
    {
      id: 3,
      botMessage: {
        en: "Based on your description, here's immediate guidance:\n\n• Stay calm and keep the injured person still\n• Do not move them unless in immediate danger\n• Apply direct pressure to any bleeding wounds\n• Keep the person warm and conscious\n\nYour location has been shared with emergency responders.",
        am: "በእርስዎ መግለጫ መሰረት፣ ይህ ቶሎ መመሪያ ነው:\n\n• ረጋ ይሁኑ እና የተቆሰለውን ሰው ዝም ያድርጉት\n• በቅጽበት አደጋ ውስጥ ካልሆነ በስተቀር አይወሰዱት\n• በማንኛውም የደም መፍሰስ ቁስሎች ላይ ቀጥተኛ ግፊት ይተግብሩ\n• ሰውየውን ሞቅ ያድርጉት እና ንቃተ ህሊና ያለው ያድርጉት\n\nመገኛዎ ከአደጋ ጊዜ ምላሽ ሰጪዎች ጋር ተጋርቷል።"
      },
      isCompleted: false
    },
    {
      id: 4,
      botMessage: {
        en: "🏥 Nearest Emergency Services:\n\n• Hospital: General Hospital (2.3 km)\n• Police Station: Central Police (1.8 km)\n• Fire Department: Station 12 (2.1 km)\n\nEmergency services are on their way to your location. Estimated arrival: 8-12 minutes.",
        am: "🏥 በቅርቡ የሚገኙ የአደጋ ጊዜ አገልግሎቶች:\n\n• ሆስፒታል: ጠቅላላ ሆስፒታል (2.3 ኪሜ)\n• የፖሊስ ጣቢያ: ማዕከላዊ ፖሊስ (1.8 ኪሜ)\n• የእሳት አደጋ መከላከያ: ጣቢያ 12 (2.1 ኪሜ)\n\nየአደጋ ጊዜ አገልግሎቶች ወደ መገኛዎ እየመጡ ነው። የሚገመተው መድረሻ ሰዓት: 8-12 ደቂቃ።"
      },
      isCompleted: false
    },
    {
      id: 5,
      botMessage: {
        en: "🚑 Help is on the way!\n\nPlease stay on the line with emergency dispatchers if they call. Continue to monitor the situation and follow any instructions given.\n\nYou did the right thing by reporting this emergency. Stay strong!",
        am: "🚑 እርዳታ በመንገድ ላይ ነው!\n\nየአደጋ ጊዜ ላኪዎች ቢደውሉ እባክዎ መስመሩ ላይ ይቆዩ። ሁኔታውን ማሰታወስ ይቀጥሉ እና የተሰጡ መመሪያዎችን ይከተሉ។\n\nይህንን አደጋ በመዘገብ ትክክለኛውን ነገር አድርገዋል። ጠንካራ ይሁኑ!"
      },
      isCompleted: false
    }
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [currentStep]);

  const handleUserInput = (input: string) => {
    if (!input.trim()) return;

    setIsProcessing(true);
    const newInputs = [...userInputs, input];
    setUserInputs(newInputs);

    // Mark current step as completed and move to next
    setTimeout(() => {
      if (currentStep < conversationSteps.length - 1) {
        setCurrentStep(currentStep + 1);
      }
      setIsProcessing(false);
    }, 1500);
  };

  const handleQuickResponse = (response: string) => {
    handleUserInput(response);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
      <Card className="w-full max-w-md max-h-[90vh] flex flex-col bg-white shadow-2xl">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 border-b bg-red-50">
          <div className="flex items-center gap-2">
            <CardTitle className="flex items-center gap-2 text-lg text-red-700">
              <AlertTriangle className="h-5 w-5" />
              🚨 {t('emergencyAssistant')}
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLanguage(language === 'en' ? 'am' : 'en')}
              className="text-red-600 hover:text-red-800"
            >
              <Globe className="h-4 w-4" />
            </Button>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="text-red-600 hover:text-red-800">
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>

        <Alert className="m-4 mb-2 border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-sm font-medium text-red-800">
            🚨 {t('emergencyNotified')}
          </AlertDescription>
        </Alert>

        <CardContent className="flex-1 p-0 flex flex-col">
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {/* Quick Answer shown */}
              {quickAnswerShown && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                    <Bot className="h-4 w-4 text-red-600" />
                  </div>
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm max-w-[85%]">
                    <div className="whitespace-pre-wrap text-gray-800">{quickAnswerShown}</div>
                    <div className="text-xs text-gray-500 mt-1">{new Date().toLocaleTimeString()}</div>
                  </div>
                </div>
              )}

              {/* Quick Answer Chips */}
              {showQuickAnswers && currentStep === 0 && !quickAnswerShown && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <p className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-2">📋 Quick Answers</p>
                  <div className="flex flex-wrap gap-1.5">
                    {quickAnswers.map((qa) => (
                      <button
                        key={qa.question}
                        onClick={() => {
                          setQuickAnswerShown(qa.answer);
                          setShowQuickAnswers(false);
                        }}
                        className="text-xs bg-white hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-full px-3 py-1.5 transition-colors"
                      >
                        {qa.question}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => setShowQuickAnswers(false)}
                    className="text-xs text-gray-400 hover:text-gray-600 mt-2 underline"
                  >
                    Start guided flow →
                  </button>
                </div>
              )}

              {conversationSteps.slice(0, currentStep + 1).map((step, index) => (
                <div key={step.id} className="space-y-3">
                  {/* Bot Message */}
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                      <Bot className="h-4 w-4 text-red-600" />
                    </div>
                    <div className="bg-gray-100 rounded-lg p-3 text-sm border border-gray-200 max-w-[85%]">
                      <div className="whitespace-pre-wrap">{step.botMessage[language]}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {new Date().toLocaleTimeString()}
                      </div>
                    </div>
                  </div>

                  {/* User Response */}
                  {userInputs[index] && (
                    <div className="flex gap-3 justify-end">
                      <div className="bg-blue-600 text-white rounded-lg p-3 text-sm max-w-[85%]">
                        <div>{userInputs[index]}</div>
                        <div className="text-xs text-blue-100 mt-1">
                          {new Date().toLocaleTimeString()}
                        </div>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-xs">U</span>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {isProcessing && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                    <Bot className="h-4 w-4 text-red-600 animate-pulse" />
                  </div>
                  <div className="bg-gray-100 rounded-lg p-3 text-sm">
                    <div className="text-gray-600">
                      {language === 'en' ? 'Processing...' : 'በሂደት ላይ...'}
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Quick Response Buttons */}
          {currentStep < conversationSteps.length - 1 && !isProcessing && (
            <div className="border-t p-4 bg-gray-50">
              {currentStep === 0 && (
                <div className="grid grid-cols-1 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuickResponse(language === 'en' ? 'Yes, someone is injured' : 'አዎ፣ አንድ ሰው ቆስሏል')}
                    className="text-left justify-start text-red-600 border-red-200 hover:bg-red-50"
                  >
                    {language === 'en' ? 'Yes, someone is injured' : 'አዎ፣ አንድ ሰው ቆስሏል'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuickResponse(language === 'en' ? 'No injuries, but need help' : 'ጉዳት የለም፣ ግን እርዳታ ያስፈልጋል')}
                    className="text-left justify-start text-red-600 border-red-200 hover:bg-red-50"
                  >
                    {language === 'en' ? 'No injuries, but need help' : 'ጉዳት የለም፣ ግን እርዳታ ያስፈልጋል'}
                  </Button>
                </div>
              )}

              {currentStep === 1 && (
                <div className="grid grid-cols-1 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuickResponse(language === 'en' ? 'Car accident' : 'የመኪና አደጋ')}
                    className="text-left justify-start text-red-600 border-red-200 hover:bg-red-50"
                  >
                    {language === 'en' ? 'Car accident' : 'የመኪና አደጋ'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuickResponse(language === 'en' ? 'Medical emergency' : 'የሕክምና አደጋ')}
                    className="text-left justify-start text-red-600 border-red-200 hover:bg-red-50"
                  >
                    {language === 'en' ? 'Medical emergency' : 'የሕክምና አደጋ'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuickResponse(language === 'en' ? 'Fall or injury' : 'መውደቅ ወይም ጉዳት')}
                    className="text-left justify-start text-red-600 border-red-200 hover:bg-red-50"
                  >
                    {language === 'en' ? 'Fall or injury' : 'መውደቅ ወይም ጉዳት'}
                  </Button>
                </div>
              )}

              {currentStep >= 2 && (
                <div className="text-center">
                  <Button
                    onClick={() => handleQuickResponse(language === 'en' ? 'Understood' : 'ተረድቻል')}
                    className="bg-red-600 hover:bg-red-700 text-white"
                    disabled={isProcessing}
                  >
                    {language === 'en' ? 'Continue' : 'ቀጥል'}
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Emergency Contact */}
          {currentStep >= 3 && (
            <div className="border-t p-4 bg-red-50">
              <div className="flex items-center justify-center gap-4">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2 text-red-600 border-red-200 hover:bg-red-100"
                  onClick={() => window.open('tel:991')}
                >
                  <Phone className="h-4 w-4" />
                  {language === 'en' ? 'Call 991' : '991 ይደውሉ'}
                </Button>
                {userLocation && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2 text-red-600 border-red-200 hover:bg-red-100"
                    onClick={() => window.open(`https://maps.google.com/?q=${userLocation.lat},${userLocation.lng}`)}
                  >
                    <MapPin className="h-4 w-4" />
                    {language === 'en' ? 'Share Location' : 'መገኛ ያጋሩ'}
                  </Button>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};