import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Bot, User, AlertTriangle, Loader2, Camera, Mic, MicOff, Image, Globe, Phone } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import AmharicVoiceInput from './AmharicVoiceInput';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  type?: 'text' | 'image' | 'audio' | 'station';
  imageUrl?: string;
  audioUrl?: string;
  // For station-type messages
  stationName?: string;
  stationPhone?: string;
  stationDistanceKm?: number;
  stationType?: 'hospital' | 'police' | 'fire' | 'ambulance';
}

interface FirstAidChatbotProps {
  isOpen: boolean;
  onClose: () => void;
}

// Helper: Get user's current location (returns Promise<{lat, lng} | null>)
async function getUserLocation() {
  return new Promise<{ lat: number; lng: number } | null>((resolve) => {
    if (!navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });
}

// Helper: Query OpenRouter API for specialized first-aid advice using DeepSeek R1 via OpenRouter
async function getAIAdvice(query: string, lang: string, imageUrl?: string) {
  const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY;
  if (!apiKey) {
    console.warn("OpenRouter API key (VITE_OPENROUTER_API_KEY) is missing. Falling back to local knowledge.");
    return null;
  }

  const systemPrompt = "You are a professional emergency first-aid assistant for the Mella app in Ethiopia. \n" +
    "You can analyze both text and images of injuries.\n" +
    "Provide clear, step-by-step instructions in ${lang === 'am' ? 'Amharic (with English translation below)' : 'English'}. \n" +
    "ALWAYS prioritize safety. If the condition sounds/looks life-threatening (e.g., heavy bleeding, deep wounds, potential fractures, signs of stroke or heart attack), \n" +
    "your FIRST sentence must be to tell the user to CALL 991 IMMEDIATELY.\n" +
    "If an image is provided, describe what you see (e.g., \"I see a deep cut on the palm\") and provide specific first-aid steps.\n" +
    "Give concise, actionable steps using bullet points. Do not provide risky or unverified medical advice.\n" +
    "Always include a short Amharic summary if the output is in English.";

  try {
    const contentPayload: any[] = [{ type: "text", text: query || "What should I do for this injury?" }];

    if (imageUrl) {
      contentPayload.push({
        type: "image_url",
        image_url: {
          url: imageUrl // imageUrl is already base64 from FileReader
        }
      });
    }

    console.log("Calling OpenRouter with model: google/gemini-2.0-flash-exp:free");

    // Prepare content: use simple string for text-only, or array for multimodal
    const payloadContent = imageUrl
      ? contentPayload
      : (query || "What should I do for this injury?");

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "HTTP-Referer": "http://localhost:8080",
        "X-Title": "Mella First Aid Assistant",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        "model": "google/gemini-2.0-flash-exp:free",
        "messages": [
          { "role": "system", "content": systemPrompt },
          {
            "role": "user",
            "content": payloadContent
          }
        ],
        "temperature": 0.3,
        "max_tokens": 1500
      })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      console.error("OpenRouter API Error:", response.status, JSON.stringify(errData, null, 2));

      // If error, try a stable fallback like Gemini Flash 1.5
      console.warn("Retrying with fallback model: meta-llama/llama-3-8b-instruct:free");
      const fallbackResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "HTTP-Referer": "http://localhost:8080",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          "model": "meta-llama/llama-3-8b-instruct:free",
          "messages": [
            { "role": "system", "content": systemPrompt },
            { "role": "user", "content": payloadContent }
          ]
        })
      });

      if (fallbackResponse.ok) {
        const fallbackData = await fallbackResponse.json();
        return (fallbackData.choices?.[0]?.message?.content || null);
      }
      return null;
    }

    const data = await response.json();
    let content = data.choices?.[0]?.message?.content;

    if (content) {
      // Remove any <think> tags if present in the response
      content = content.replace(/<think>[\s\S]*?<\/think>/g, '').trim();

      const disclaimer = lang === 'am'
        ? '\n\n⚠️ ማስታወሻ: ይህ AI የመነጨ መረጃ ነው አጠቃላይ መመሪያ ብቻ ነው፣ ለከባድ አደጋ 991 ይደውሉ።'
        : '\n\n⚠️ Disclaimer: This is AI-generated guidance only; for serious emergencies call 991 immediately.';
      return content + disclaimer;
    }
    return null;
  } catch (error) {
    console.error("Fetch error calling OpenRouter:", error);
    return null;
  }
}

// Helper: Find closest emergency station using OpenStreetMap Nominatim API
async function getClosestEmergencyStation(lat: number, lng: number, lang: string) {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=emergency%20hospital%20near%20${lat},${lng}&accept-language=${lang}`
    );
    const data = await response.json();
    if (data && data.length > 0) {
      const station = data[0];
      return `Closest emergency station: ${station.display_name}`;
    }
    return null;
  } catch {
    return null;
  }
}

// Helper: Haversine distance in km
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Helper: Use the same mock stations as Emergency page and pick nearest
function findNearestMockStation(userLat: number, userLng: number, lang: string) {
  const stations = [
    {
      id: '1',
      name: lang === 'am' ? 'ጠቅላላ ሆስፒታል' : 'General Hospital',
      type: 'hospital' as const,
      location: { lat: userLat + 0.02, lng: userLng + 0.01 },
      phone: '+251-11-123-4567',
    },
    {
      id: '2',
      name: lang === 'am' ? 'ማዕከላዊ ፖሊስ ጣቢያ' : 'Central Police Station',
      type: 'police' as const,
      location: { lat: userLat - 0.015, lng: userLng + 0.025 },
      phone: '+251-11-765-4321',
    },
    {
      id: '3',
      name: lang === 'am' ? 'የእሳት አደጋ መከላከያ ጣቢያ' : 'Fire Department Station',
      type: 'fire' as const,
      location: { lat: userLat + 0.01, lng: userLng - 0.02 },
      phone: '+251-11-987-6543',
    },
    {
      id: '4',
      name: lang === 'am' ? 'የአደጋ ጊዜ ህክምና ማዕከል' : 'Emergency Medical Center',
      type: 'ambulance' as const,
      location: { lat: userLat - 0.008, lng: userLng - 0.015 },
      phone: '+251-11-456-7890',
    },
    {
      id: '5',
      name: lang === 'am' ? 'የልብ ህክምና ሆስፒታል' : 'Cardiac Emergency Hospital',
      type: 'hospital' as const,
      location: { lat: userLat + 0.025, lng: userLng - 0.008 },
      phone: '+251-11-234-5678',
    },
  ];

  let best = null as null | {
    name: string;
    type: 'hospital' | 'police' | 'fire' | 'ambulance';
    phone: string;
    distanceKm: number;
  };
  for (const s of stations) {
    const d = haversineKm(userLat, userLng, s.location.lat, s.location.lng);
    if (!best || d < best.distanceKm) {
      best = { name: s.name, type: s.type, phone: s.phone, distanceKm: d };
    }
  }
  return best;
}

const EMERGENCY_KEYWORDS = ['emergency', 'hospital', 'ambulance', 'bleeding', 'unconscious', 'not breathing', 'heart attack', 'stroke', 'overdose', 'poisoning', 'severe pain'];

// Helper: detect if a response string is the fallback guidance
function isFallbackResponseText(response: string, lang: string) {
  if (lang === 'en') {
    return response.includes("I couldn't match your request precisely.");
  }
  // amharic snippet start
  return response.includes('ጥያቄዎን በትክክል ማስማት አልቻልኩም');
}

export const FirstAidChatbot: React.FC<FirstAidChatbotProps> = ({ isOpen, onClose }) => {
  const { t, language, setLanguage } = useLanguage();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize welcome message based on language
  useEffect(() => {
    const welcomeMessage = language === 'en'
      ? `🚨 IMPORTANT DISCLAIMER: ${t('disclaimer')} In case of serious emergencies, please call 991 or your local emergency services IMMEDIATELY.\n\nFor minor issues, I can offer general first aid tips. ${t('howCanIHelp')}`
      : `🚨 አስፈላጊ ማስታወሻ: ${t('disclaimer')} በከባድ የአደጋ ጊዜ፣ እባክዎ 991 ወይም የአካባቢዎን የአደጋ ጊዜ አገልግሎቶችን ወዲያውኑ ይደውሉ።\n\nለአነስተኛ ችግሮች፣ መሠረታዊ የመጀመሪያ እርዳታ ምክሮች ሰጥት ይችላል። ${t('howCanIHelp')}`;

    setMessages([{
      id: '1',
      text: welcomeMessage,
      sender: 'bot',
      timestamp: new Date(),
      type: 'text'
    }]);
  }, [language, t]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Comprehensive first aid knowledge base for instant responses
  const getFirstAidResponse = (message: string): string | null => {
    const lowerMessage = message.toLowerCase();

    const responses: { [key: string]: { en: string; am: string } } = {
      'cut': {
        en: "🩸 For minor cuts:\n1. Clean your hands first\n2. Stop bleeding with direct pressure using clean cloth\n3. Clean wound gently with water\n4. Apply antibiotic ointment if available\n5. Cover with sterile bandage\n\n⚠️ Seek immediate medical attention for:\n- Deep cuts (you can see fat/muscle)\n- Cuts that won't stop bleeding\n- Signs of infection",
        am: "🩸 ለአነስተኛ መቁረጫዎች:\n1. መጀመሪያ እጆችዎን ይሰሩ\n2. ንጹህ ጨርቅ በመጠቀም ቀጥተኛ ግፊት በማድረግ ደም መፍሰስን ያስቁሙ\n3. ቁስሉን በውሃ ቀስ ብለው ያጽዱ\n4. የጸረ-ባክቴሪያ ቅባት ካለ ይተግብሩ\n5. በንጹህ ማሰሪያ ይሸፍኑ\n\n⚠️ ቶሎ የሕክምና እርዳታ ይፈልጉ:\n- ጥልቅ መቁረጫዎች\n- የማይቆም ደም መፍሰስ\n- የኢንፌክሽን ምልክቶች"
      },

      'burn': {
        en: "🔥 For minor burns:\n1. Cool immediately with cold running water (10-20 minutes)\n2. Remove jewelry/tight clothing before swelling\n3. Do NOT use ice, butter, or oils\n4. Apply aloe vera or burn gel\n5. Cover loosely with sterile gauze\n\n🚨 Call 991 for:\n- Burns larger than palm of hand\n- Burns on face, hands, feet, genitals\n- Chemical or electrical burns",
        am: "🔥 ለአነስተኛ ቃጠሎዎች:\n1. ወዲያውኑ በቀዝቃዛ ውሃ ያቀዝቅዙ (10-20 ደቂቃ)\n2. ከማበጥ በፊት ጌጦች/ጠባብ ልብሶች ያስወግዱ\n3. በረዶ፣ ቅቤ ወይም ዘይት አይጠቀሙ\n4. አሎቬራ ወይም የቃጠሎ ጄል ይተግብሩ\n5. በንጹህ ጋዝ ቀላል ይሸፍኑ\n\n🚨 911 ይደውሉ:\n- ከእጅ መዳፍ የሚበልጥ ቃጠሎ\n- በፊት፣ እጅ፣ እግር፣ ወሲብ አካሎች ላይ\n- የኬሚካል ወይም የኤሌክትሪክ ቃጠሎ"
      },

      'choking': {
        en: "🫁 For choking adult:\n1. If they can cough/speak - encourage coughing\n2. If they CANNOT breathe:\n   - Stand behind them\n   - 5 sharp back blows between shoulder blades\n   - 5 abdominal thrusts (Heimlich maneuver)\n   - Repeat until object comes out\n\n📞 Call 991 immediately if unsuccessful\n⚠️ Different technique needed for babies/infants",
        am: "🫁 ለተመነፈሰ ጎልማሳ:\n1. ማሳልና/መናገር ካለቻለ - ማሳል እንዲቀጥል ማበረታታት\n2. መተንፈስ ካልቻለ:\n   - ከኋላቸው ይቁሙ\n   - በትከሻ ምላሾች መካከል 5 ፈጣን የጀርባ ምት\n   - 5 የሆድ ግፊቶች (ሃይምሊክ ዘዴ)\n   - እቃው እስከወጣ ድረስ ይደግሙ\n\n📞 ካልተሳካ ወዲያውኑ 911 ይደውሉ\n⚠️ ለሕፃናት/ለጨቅላ ሕፃናት የተለየ ዘዴ ያስፈልጋል"
      },

      'bleeding': {
        en: "🩸 For serious bleeding:\n1. Apply direct pressure with clean cloth/bandage\n2. Do NOT remove if cloth soaks through - add more layers\n3. Elevate injured area above heart if possible\n4. Apply pressure to pressure points if needed\n5. Do NOT remove embedded objects\n\n🚨 Call 991 for:\n- Spurting blood (arterial)\n- Bleeding that won't stop\n- Signs of shock (pale, weak, dizzy)",
        am: "🩸 ለከባድ ደም መፍሰስ:\n1. በንጹህ ጨርቅ/ማሰሪያ ቀጥተኛ ግፊት ይተግብሩ\n2. ጨርቁ ከተሞላ አያስወግዱት - ተጨማሪ ሽፋኖች ይጨምሩ\n3. የተጎዳውን ክፍል ከልብ በላይ ካሽሽ ያሳድሩ\n4. በግፊት ነጥቦች ላይ ግፊት ይተግብሩ\n5. የገቡ ነገሮችን አያስወግዱ\n\n🚨 911 ይደውሉ:\n- የሚዘንብ ደም (የደም ሥር)\n- የማይቆም ደም መፍሰስ\n- የድንጋጤ ምልክቶች (ሸካራማ፣ ደካማ፣ ማዞር)"
      },

      'sprain': {
        en: "🦵 For sprains (R.I.C.E. method):\n1. REST - Stop activity, don't walk on it\n2. ICE - 15-20 minutes every 2-3 hours (first 48 hours)\n3. COMPRESSION - Wrap with elastic bandage (not too tight)\n4. ELEVATION - Raise above heart level when possible\n\n🏥 See doctor if:\n- Severe pain or can't bear weight\n- Numbness or tingling\n- No improvement after 2-3 days",
        am: "🦵 ለመወዘዝ (R.I.C.E. ዘዴ):\n1. እረፍት - እንቅስቃሴ ያቁሙ፣ አንርሱብት\n2. በረዶ - በየ2-3 ሰዓት 15-20 ደቂቃ (የመጀመሪያዎቹ 48 ሰዓቶች)\n3. ጫና - በላስቲክ ማሰሪያ ይጠቁ (በጣም አይጥ)\n4. ከፍ ማድረግ - በተቻለ መጠን ከልብ ደረጃ በላይ ያሳድሩ\n\n🏥 ዶክተር ይመልከቱ:\n- ከባድ ህመም ወይም ክብደት መሸከም ካልቻሉ\n- መደንዘዝ ወይም መተነተን\n- ከ2-3 ቀናት በኋላ መሻሻል ካልታየ"
      },

      'fever': {
        en: "🌡️ For fever:\n1. Rest and drink plenty of fluids\n2. Take fever-reducing medication (follow dosage)\n3. Use cool, damp cloths on forehead\n4. Wear light, breathable clothing\n5. Monitor temperature regularly\n\n🚨 Seek immediate care for:\n- Fever over 103°F (39.4°C)\n- Fever with stiff neck, severe headache\n- Difficulty breathing",
        am: "🌡️ ለትኩሳት:\n1. ይዝናኑ እና ብዙ ፈሳሽ ይጠጡ\n2. የትኩሳት ቀንሻ መድሐኒት ይውሰዱ (መጠኑን ይከተሉ)\n3. በግንባር ላይ ቀዝቃዛ፣ እርጥብ ጨርቅ ይጠቀሙ\n4. ቀላል፣ አየር የሚያስተላልፍ ልብስ ይልበሱ\n5. ሙቀትዎን በመደበኛነት ይቆጣጠሩ\n\n🚨 ወዲያውኑ እንክብካቤ ይፈልጉ:\n- ከ103°F (39.4°C) በላይ ትኩሳት\n- ከአንገት ጥሪ፣ ከባድ ራስ ምታት ጋር ትኩሳት\n- የመተንፈስ ችግር"
      },

      'allergic': {
        en: "⚠️ For allergic reactions:\nMILD (skin rash, itching):\n1. Remove/avoid trigger if known\n2. Take antihistamine (Benadryl)\n3. Apply cool compress to affected area\n\n🚨 SEVERE (trouble breathing, swelling of face/throat):\n1. Call 991 IMMEDIATELY\n2. Use EpiPen if available\n3. Help person sit upright\n4. Be ready to perform CPR",
        am: "⚠️ ለአለርጂ ምላሾች:\nመለስተኛ (የቆዳ ሽፍታ፣ መቀሳቀስ):\n1. ይታወቅ ከሆነ መንስኤውን ያስወግዱ/ያስቁሙ\n2. አንቲሂስታሚን (ቤናድሪል) ይውሰዱ\n3. በተጎዳው ቦታ ላይ ቀዝቃዛ ጫና ይተግብሩ\n\n🚨 ከባድ (የመተንፈስ ችግር፣ የፊት/የጉሮሮ ማበጥ):\n1. ወዲያውኑ 911 ይደውሉ\n2. ኢፒፔን ካለ ይጠቀሙ\n3. ሰውየው በኩልኩል እንዲቀመጥ ያግዙ\n4. ሲፒአር ለመስጠት ዝግጁ ይሁኑ"
      },

      'seizure': {
        en: "🧠 For seizures:\n1. Keep person safe - move sharp objects away\n2. Time the seizure\n3. Turn person on side if possible\n4. Do NOT put anything in their mouth\n5. Stay with them until they're fully conscious\n\n📞 Call 991 if:\n- Seizure lasts over 5 minutes\n- Person has trouble breathing after\n- Another seizure happens soon after",
        am: "🧠 ለንዕስ በሽታ:\n1. ሰውየውን ደህንነት ያሁኑ - ስለታም ነገሮችን ያስወግዱ\n2. የንዕስ በሽታውን ጊዜ ይቆጥሩ\n3. ሰውየውን በጎን ያሽክርክሩ ከቻሉ\n4. በአፋቸው ውስጥ ምንም ነገር አያድርጉ\n5. ሙሉ በሙሉ እስኪጠግ ድረስ ከእነሱ ጋር ይቆዩ\n\n📞 911 ይደውሉ:\n- ንዕስ በሽታው ከ5 ደቂቃ በላይ ከዘለቀ\n- ሰውየው ከዚህ በኋላ የመተንፈስ ችግር ከነበረው\n- ሌላ ንዕስ በሽታ ብዙም ሳይቆይ ከተከሰተ"
      },
    };

    // Check for keywords in the message
    for (const [keyword, response] of Object.entries(responses)) {
      if (lowerMessage.includes(keyword)) {
        const reminder = language === 'en'
          ? "\n\n⚠️ REMINDER: I'm not a doctor. This is basic first aid guidance only."
          : "\n\n⚠️ ማስታወሻ: እኔ ዶክተር አይደለሁም። ይህ መሠረታዊ የመጀመሪያ እርዳታ መመሪያ ብቻ ነው።";
        return response[language] + reminder;
      }
    }

    // Check for emergency keywords that require immediate 911 call
    const emergencyKeywords = ['unconscious', 'not breathing', 'chest pain', 'heart attack', 'stroke', 'overdose', 'poisoning', 'severe bleeding'];
    for (const keyword of emergencyKeywords) {
      if (lowerMessage.includes(keyword)) {
        const emergencyResponse = language === 'en'
          ? `🚨 EMERGENCY SITUATION DETECTED 🚨\n\nCall 991 IMMEDIATELY for: ${keyword.toUpperCase()}\n\nWhile waiting for help:\n- Stay with the person\n- Follow dispatcher instructions\n- Be ready to provide CPR if trained\n- Keep person calm and comfortable\n\n⚠️ Do not delay - professional medical help is urgently needed!`
          : `🚨 የአደጋ ጊዜ ሁኔታ ተገኝቷል 🚨\n\nወዲያውኑ 991 ይደውሉ: ${keyword.toUpperCase()}\n\nእርዳታ እስክትመጣ ድረስ:\n- ከሰውየው ጋር ይቆዩ\n- የላኪ መመሪያዎችን ይከተሉ\n- ሲፒአር ለመስጠት ዝግጁ ይሁኑ\n- ሰውየውን ረጋ ያድርጉት\n\n⚠️ አይዘገዩ - የባለሙያ የሕክምና እርዳታ አስፈላጊ ነው!`;
        return emergencyResponse;
      }
    }

    return null;
  };

  const generateResponse = async (userMessage: string, imageUrl?: string): Promise<string> => {
    // 1. Try to get specialized medical advice from OpenRouter AI (Gemini Flash Multimodal)
    let finalAdvice = await getAIAdvice(userMessage, language, imageUrl);

    // 2. Fallback to local knowledge base if AI is unavailable
    if (!finalAdvice && !imageUrl) {
      finalAdvice = getFirstAidResponse(userMessage);
    }

    if (!finalAdvice && imageUrl) {
      return language === 'en'
        ? "I have analyzed your image. Please call 991 if this is an emergency, or describe the symptoms to help me provide better advice."
        : "የላኩትን ምስል አይቻለሁ። አደጋ ከሆነ 991 ይደውሉ፣ ወይም ሁኔታዎን በዝርዝር ይግለጹ።";
    }

    let emergencyInfo = '';
    // 3. If user input or image indicates an emergency, detect location
    const lowerMsg = userMessage.toLowerCase();
    const isEmergency = EMERGENCY_KEYWORDS.some(k => lowerMsg.includes(k)) || imageUrl;

    if (isEmergency) {
      const loc = await getUserLocation();
      if (loc) {
        const stationInfo = await getClosestEmergencyStation(loc.lat, loc.lng, language);
        if (stationInfo) emergencyInfo = `\n\n📍 ${stationInfo}`;
      } else {
        emergencyInfo = language === 'en'
          ? '\n\n(Location not available. Please enable location for local emergency info.)'
          : '\n\n(አካባቢ መረጃ አልተገኘም። ለአካባቢያዊ የአደጋ መረጃ እባክዎ አካባቢ ፍቃድ ይስጡ።)';
      }
    }

    if (finalAdvice) {
      return finalAdvice + emergencyInfo;
    }

    // 4. Fallback to general guidance if everything else fails
    const generalResponses = {
      en: [
        "I couldn't match your request precisely. Try asking about: cuts, burns, choking, bleeding, sprains, fever, or allergic reactions.\n\nI'll also show the nearest emergency service below so you can call right away.\n\n⚠️ Remember: For serious emergencies, always call 991 first!",
      ],
      am: [
        "ጥያቄዎን በትክክል ማስማት አልቻልኩም። ይህን ይሞክሩ: መቁረጫ፣ ቃጠል፣ መታፈን፣ ደም መፍሰስ፣ መወዘዝ፣ ትኩሳት ወይም የአለርጂ ምላሽ።\n\nበታች በቅርብ የሚገኝ የአደጋ አገልግሎትን አሳይላችሁ በቀጥታ እንዲደውሉ።\n\n⚠️ ከባድ አደጋ ሲኖር አስቀድሞ 991 ይደውሉ!",
      ]
    };
    const fallbackResponse = generalResponses[language][0];
    return fallbackResponse + emergencyInfo;
  };

  const handleVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];

      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(blob);

        const audioMessage: Message = {
          id: Date.now().toString(),
          text: language === 'en' ? 'Voice message' : 'የድምጽ መልእክት',
          sender: 'user',
          timestamp: new Date(),
          type: 'audio',
          audioUrl
        };

        setMessages(prev => [...prev, audioMessage]);

        // Simulate processing voice message
        setTimeout(() => {
          const response = language === 'en'
            ? "I received your voice message. Please describe your situation in text for better assistance."
            : "የድምጽ መልእክትዎን ተቀብያለሁ። ለተሻለ እርዳታ ሁኔታዎን በጽሁፍ ይግለጹ።";

          const botMessage: Message = {
            id: (Date.now() + 1).toString(),
            text: response,
            sender: 'bot',
            timestamp: new Date(),
            type: 'text'
          };
          setMessages(prev => [...prev, botMessage]);
        }, 1000);
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
    } catch (error) {
      console.error('Error accessing microphone:', error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder) {
      mediaRecorder.stop();
      mediaRecorder.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
      setMediaRecorder(null);
    }
  };

  // Handle image upload with AI analysis
  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const imageUrl = e.target?.result as string;

        const imageMessage: Message = {
          id: Date.now().toString(),
          text: language === 'en' ? 'Injury photo uploaded' : 'የጉዳት ምስል ተሰቅሏል',
          sender: 'user',
          timestamp: new Date(),
          type: 'image',
          imageUrl
        };

        setMessages(prev => [...prev, imageMessage]);
        setIsLoading(true);

        try {
          const botResponse = await generateResponse("Analyze this injury and suggest first aid", imageUrl);

          const botMessage: Message = {
            id: (Date.now() + 1).toString(),
            text: botResponse,
            sender: 'bot',
            timestamp: new Date(),
            type: 'text'
          };
          setMessages(prev => [...prev, botMessage]);
        } catch (error) {
          console.error('Error analyzing image:', error);
        } finally {
          setIsLoading(false);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputMessage,
      sender: 'user',
      timestamp: new Date(),
      type: 'text'
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = inputMessage;
    setInputMessage('');
    setIsLoading(true);

    try {
      const botResponse = await generateResponse(currentInput);

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: botResponse,
        sender: 'bot',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, botMessage]);

      // After sending main response, append nearest station card if emergency intent detected
      const lowerMsg = currentInput.toLowerCase();
      const shouldAppendStation = EMERGENCY_KEYWORDS.some(k => lowerMsg.includes(k)) || isFallbackResponseText(botResponse, language);
      if (shouldAppendStation) {
        const loc = await getUserLocation();
        const fallbackLoc = { lat: 9.0320, lng: 38.7469 };
        const coords = loc ?? fallbackLoc;
        const nearest = findNearestMockStation(coords.lat, coords.lng, language);
        if (nearest) {
          const stationMessage: Message = {
            id: (Date.now() + 2).toString(),
            text: language === 'en'
              ? `Nearest emergency service: ${nearest.name} (~${nearest.distanceKm.toFixed(1)} km). Tap to call.`
              : `በቅርብ የሚገኝ የአደጋ አገልግሎት፡ ${nearest.name} (~${nearest.distanceKm.toFixed(1)} ኪሜ)። ለመደወል ንካ።`,
            sender: 'bot',
            timestamp: new Date(),
            type: 'station',
            stationName: nearest.name,
            stationPhone: nearest.phone,
            stationDistanceKm: nearest.distanceKm,
            stationType: nearest.type,
          };
          setMessages(prev => [...prev, stationMessage]);
        }
      }
    } catch (error) {
      console.error('Error generating response:', error);
      const errorText = language === 'en'
        ? "🚨 I'm having trouble right now. For any medical emergency, please call 991 immediately or contact your local emergency services."
        : "🚨 አሁን ችግር እያጋጠመኝ ነው። ለማንኛውም የሕክምና አደጋ፣ እባክዎ 991 ወይም የአካባቢዎን የአደጋ ጊዜ አገልግሎቶችን ወዲያውኑ ይደውሉ።";

      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: errorText,
        sender: 'bot',
        timestamp: new Date(),
        type: 'text'
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-2 sm:p-4 bg-black/50 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <Card
        className="w-full max-w-md max-h-[90vh] sm:max-h-[85vh] flex flex-col bg-white shadow-2xl rounded-lg"
        style={{
          height: '100%',
          maxHeight: '90vh',
          width: '100%',
          maxWidth: '420px',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 border-b bg-red-50">
          <div className="flex items-center gap-2">
            <CardTitle className="flex items-center gap-2 text-lg text-red-700">
              <Bot className="h-5 w-5" />
              🚨 {t('firstAidTitle')}
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLanguage(language === 'en' ? 'am' : 'en')}
              className="text-red-600 hover:text-red-800"
              title={language === 'en' ? 'Switch to Amharic' : 'Switch to English'}
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
            {language === 'en'
              ? '⚠️ NOT MEDICAL ADVICE - For emergencies, call 991 immediately!'
              : '⚠️ የሕክምና ምክር አይደለም - ለአደጋ ጊዜ፣ ወዲያውኑ 991 ይደውሉ!'
            }
          </AlertDescription>
        </Alert>

        <CardContent className="flex-1 p-0 flex flex-col min-h-0">
          <ScrollArea className="flex-1 p-4 min-h-0 max-h-[50vh] sm:max-h-[60vh] overflow-y-auto">
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${message.sender === 'user' ? 'justify-end' : 'justify-start'
                    }`}
                >
                  {message.sender === 'bot' && (
                    <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                      <Bot className="h-4 w-4 text-red-600" />
                    </div>
                  )}
                  <div
                    className={`max-w-[85%] rounded-lg p-3 text-sm ${message.sender === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-900 border border-gray-200'
                      }`}
                  >
                    {message.type === 'image' && message.imageUrl && (
                      <div className="mb-2">
                        <img
                          src={message.imageUrl}
                          alt="Uploaded"
                          className="max-w-full h-32 object-cover rounded border"
                        />
                      </div>
                    )}
                    {message.type === 'audio' && message.audioUrl && (
                      <div className="mb-2">
                        <audio controls className="w-full max-w-48">
                          <source src={message.audioUrl} type="audio/webm" />
                        </audio>
                      </div>
                    )}
                    {/* Station card rendering */}
                    {message.type === 'station' ? (
                      <div>
                        <div className="font-medium mb-1">
                          {language === 'en' ? 'Nearest emergency service' : 'በቅርብ የሚገኝ የአደጋ አገልግሎት'}
                        </div>
                        <div className="text-sm mb-2">
                          {message.stationName} {message.stationDistanceKm !== undefined && (
                            <span className="text-gray-600">(~{message.stationDistanceKm.toFixed(1)} km)</span>
                          )}
                        </div>
                        {message.stationPhone && (
                          <div className="flex items-center gap-2">
                            <a
                              href={`tel:${message.stationPhone}`}
                              className="text-blue-600 underline"
                            >
                              {message.stationPhone}
                            </a>
                            <Button
                              size="sm"
                              className="bg-red-600 hover:bg-red-700 text-white h-7 px-2"
                              onClick={() => window.open(`tel:${message.stationPhone}`)}
                            >
                              <Phone className="h-3 w-3 mr-1" />
                              {language === 'en' ? 'Call' : 'ይደውሉ'}
                            </Button>
                          </div>
                        )}
                        <div className="text-xs text-gray-600 mt-2">
                          {language === 'en'
                            ? 'This is a simulated station from the Emergency page.'
                            : 'ይህ ከአስቸኳይ ገፅ የተለመደ ጣቢያ ማሳያ ነው።'}
                        </div>
                      </div>
                    ) : (
                      <div className="whitespace-pre-wrap">{message.text}</div>
                    )}
                    <div
                      className={`text-xs mt-1 ${message.sender === 'user' ? 'text-blue-100' : 'text-gray-500'
                        }`}
                    >
                      {message.timestamp.toLocaleTimeString()}
                    </div>
                  </div>
                  {message.sender === 'user' && (
                    <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                      <User className="h-4 w-4 text-white" />
                    </div>
                  )}
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                    <Loader2 className="h-4 w-4 text-red-600 animate-spin" />
                  </div>
                  <div className="bg-gray-100 rounded-lg p-3 text-sm">
                    <div className="text-gray-600">Thinking...</div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>
          <div className="border-t p-4 bg-gray-50 sticky bottom-0 left-0 w-full z-10">
            <div className="text-xs text-gray-600 mb-2 text-center">
              {language === 'en'
                ? '\ud83d\udca1 Try: "cut on finger", "burn from stove", "sprained ankle"'
                : '\ud83d\udca1 \u12ed\u121e\u12ad\u1229: "\u1260\u1323\u1275 \u120b\u12ed \u1218\u1241\u1228\u1325"\u1363 "\u12a8\u121d\u12f5\u1303 \u1243\u1320\u120e"\u1363 "\u12e8\u1270\u12c8\u12d8\u12d8 \u1241\u122d\u132d\u121d\u132d\u121a\u1275"'
              }
            </div>
            <div className="flex gap-2 mb-2">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                ref={fileInputRef}
                className="hidden"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading}
                className="text-red-600 border-red-200 hover:bg-red-50"
              >
                <Image className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={isRecording ? stopRecording : handleVoiceRecording}
                disabled={isLoading}
                className={`text-red-600 border-red-200 hover:bg-red-50 ${isRecording ? 'bg-red-100' : ''}`}
              >
                {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </Button>
              {/* Amharic Voice Input Button */}
              <AmharicVoiceInput
                onResult={async (text) => {
                  // Add the recognized text as a user message and trigger response
                  const userMessage: Message = {
                    id: Date.now().toString(),
                    text,
                    sender: 'user',
                    timestamp: new Date(),
                    type: 'text',
                  };
                  setMessages((prev) => [...prev, userMessage as Message]);
                  setIsLoading(true);
                  try {
                    const botResponse = await generateResponse(text);
                    const botMessage: Message = {
                      id: (Date.now() + 1).toString(),
                      text: botResponse,
                      sender: 'bot',
                      timestamp: new Date(),
                      type: 'text',
                    };
                    setMessages((prev) => [...prev, botMessage as Message]);

                    // Append nearest station card if emergency intent detected or fallback response used
                    const lowerMsg = text.toLowerCase();
                    const shouldAppendStation = EMERGENCY_KEYWORDS.some(k => lowerMsg.includes(k)) || isFallbackResponseText(botResponse, language);
                    if (shouldAppendStation) {
                      const loc = await getUserLocation();
                      const fallbackLoc = { lat: 9.0320, lng: 38.7469 };
                      const coords = loc ?? fallbackLoc;
                      const nearest = findNearestMockStation(coords.lat, coords.lng, language);
                      if (nearest) {
                        const stationMessage: Message = {
                          id: (Date.now() + 2).toString(),
                          text: language === 'en'
                            ? `Nearest emergency service: ${nearest.name} (~${nearest.distanceKm.toFixed(1)} km). Tap to call.`
                            : `በቅርብ የሚገኝ የአደጋ አገልግሎት፡ ${nearest.name} (~${nearest.distanceKm.toFixed(1)} ኪሜ)። ለመደወል ንካ።`,
                          sender: 'bot',
                          timestamp: new Date(),
                          type: 'station',
                          stationName: nearest.name,
                          stationPhone: nearest.phone,
                          stationDistanceKm: nearest.distanceKm,
                          stationType: nearest.type,
                        };
                        setMessages((prev) => [...prev, stationMessage as Message]);
                      }
                    }
                  } catch (error) {
                    const errorText = language === 'en'
                      ? "\uD83D\uDEA8 I'm having trouble right now. For any medical emergency, please call 911 immediately or contact your local emergency services."
                      : "\uD83D\uDEA8 \u12A0\u1201\u1295 \u127D\u130D\u122D \u12A5\u12EB\u130B\u1320\u1218\u129D \u1290\u12CD\u1362 \u1208\u121B\u1295\u129B\u12CD\u121D \u12E8\u1215\u12AD\u121D\u1293 \u12A0\u12F0\u130B\u1363 \u12A5\u1263\u12AD\u12CE 911 \u12C8\u12ED\u121D \u12E8\u12A0\u12AB\u1263\u1262\u12CE\u1295 \u12E8\u12A0\u12F0\u130B \u130A\u12DC \u12A0\u1308\u120D\u130D\u120E\u1276\u127D\u1295 \u12C8\u12F2\u12EB\u12CD\u1291 \u12ED\u12F0\u12CD\u1209\u1362";
                    const errorMessage: Message = {
                      id: (Date.now() + 1).toString(),
                      text: errorText,
                      sender: 'bot',
                      timestamp: new Date(),
                      type: 'text',
                    };
                    setMessages((prev) => [...prev, errorMessage as Message]);
                  } finally {
                    setIsLoading(false);
                  }
                }}
              />
            </div>

            <div className="flex gap-2">
              <Input
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={language === 'en'
                  ? "Describe your first aid situation..."
                  : "\u12e8\u1218\u1300\u1218\u122a\u12eb \u12a5\u122d\u12f3\u1273 \u1201\u1294\u1273\u12ce\u1295 \u12ed\u130d\u1208\u1339..."
                }
                className="flex-1"
                disabled={isLoading}
                style={{ minWidth: 0 }}
              />
              <Button
                onClick={handleSendMessage}
                disabled={isLoading || !inputMessage.trim()}
                size="sm"
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};