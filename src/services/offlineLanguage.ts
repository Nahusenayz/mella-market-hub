const EN_TO_AM_PHRASES: Array<[string, string]> = [
  ['what number should i call', 'የትኛውን ቁጥር እደውላለሁ'],
  ['how long will help take', 'እርዳታ ስንት ጊዜ ይወስዳል'],
  ['what should i do while waiting', 'እየጠበቅኩ ምን ማድረግ አለብኝ'],
  ['where is the nearest hospital', 'ቅርብ ሆስፒታል የት ነው'],
  ['should i move the injured person', 'የተጎዳውን ሰው ማንቀሳቀስ አለብኝ'],
  ['how do i stop bleeding', 'ደም መፍሰስን እንዴት አቁም'],
  ['is this an emergency', 'ይህ የአስቸኳይ ጊዜ ነው'],
  ['how do i report a fire', 'እሳትን እንዴት አሳውቃለሁ'],
  ['search results', 'የፍለጋ ውጤቶች'],
  ['clear search', 'ፍለጋን አጽዳ'],
  ['share post', 'ልጥፍ አጋራ'],
  ['location enabled', 'አካባቢ ተፈቅዷል'],
  ['location access denied', 'የአካባቢ ፍቃድ ተከልክሏል'],
  ['service', 'አገልግሎት'],
  ['product', 'ምርት'],
  ['price', 'ዋጋ'],
  ['description', 'መግለጫ'],
  ['category', 'ምድብ'],
  ['update', 'አዘምን'],
  ['cancel', 'ሰርዝ'],
  ['submit', 'ላክ'],
  ['loading', 'በመጫን ላይ'],
  ['online', 'በመስመር ላይ'],
  ['offline', 'ከመስመር ውጪ'],
  ['emergency', 'አስቸኳይ'],
  ['hospital', 'ሆስፒታል'],
  ['police', 'ፖሊስ'],
  ['fire', 'እሳት'],
  ['ambulance', 'አምቡላንስ'],
  ['tow truck', 'ታክሲ መጎተቻ'],
];

const EN_TO_AM_WORDS: Record<string, string> = {
  a: 'አንድ',
  and: 'እና',
  available: 'ይገኛል',
  back: 'ተመለስ',
  call: 'ደውል',
  completed: 'ተጠናቋል',
  continue: 'ቀጥል',
  description: 'መግለጫ',
  email: 'ኢሜይል',
  emergency: 'አስቸኳይ',
  help: 'እርዳታ',
  location: 'አካባቢ',
  message: 'መልእክት',
  nearby: 'ቅርብ',
  phone: 'ስልክ',
  price: 'ዋጋ',
  search: 'ፈልግ',
  service: 'አገልግሎት',
  submit: 'ላክ',
  update: 'አዘምን',
  user: 'ተጠቃሚ',
  worker: 'ሰራተኛ',
};

const AM_TO_EN_PHRASE_ENTRIES = EN_TO_AM_PHRASES.map(([en, am]) => [am, en] as const);

const AM_TO_EN_WORDS: Record<string, string> = Object.fromEntries(
  Object.entries(EN_TO_AM_WORDS).map(([en, am]) => [am, en])
);

const normalize = (text: string) =>
  text
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[“”"]/g, '')
    .trim();

const replacePhrases = (text: string, phrasePairs: Array<[string, string]>) => {
  let result = text;
  for (const [source, target] of [...phrasePairs].sort((a, b) => b[0].length - a[0].length)) {
    const pattern = new RegExp(`\\b${source.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
    result = result.replace(pattern, target);
  }
  return result;
};

const replaceWords = (text: string, wordMap: Record<string, string>) =>
  text
    .split(/(\s+|[.,!?;:(){}\[\]\/\\-])/)
    .map((token) => {
      const lookup = token.toLowerCase();
      const translated = wordMap[lookup];
      if (!translated) return token;
      if (token.toUpperCase() === token) return translated.toUpperCase();
      if (token[0] && token[0] === token[0].toUpperCase()) {
        return translated.charAt(0).toUpperCase() + translated.slice(1);
      }
      return translated;
    })
    .join('');

export const translateOfflineText = (text: string, targetLanguage: 'en' | 'am') => {
  const original = text.trim();
  if (!original) return '';

  if (targetLanguage === 'am') {
    const phraseTranslated = replacePhrases(normalize(original), EN_TO_AM_PHRASES);
    return replaceWords(phraseTranslated, EN_TO_AM_WORDS);
  }

  const phraseTranslated = replacePhrases(normalize(original), AM_TO_EN_PHRASE_ENTRIES as Array<[string, string]>);
  return replaceWords(phraseTranslated, AM_TO_EN_WORDS);
};

type EmergencyCategory = 'police' | 'ambulance' | 'fire_truck' | 'traffic_police' | 'tow_truck';

const CATEGORY_KEYWORDS: Record<EmergencyCategory, string[]> = {
  police: [
    'police',
    'theft',
    'robbery',
    'assault',
    'attack',
    'crime',
    'threat',
    'stolen',
    'burglary',
    'suspicious',
  ],
  ambulance: [
    'ambulance',
    'medical',
    'injury',
    'injured',
    'bleeding',
    'bleed',
    'unconscious',
    'breathing',
    'heart',
    'pain',
    'poisoning',
    'seizure',
    'pregnant',
  ],
  fire_truck: ['fire', 'smoke', 'burning', 'flames', 'gas leak', 'burn', 'explosion'],
  traffic_police: ['traffic', 'road block', 'blockage', 'accident', 'collision', 'crash', 'signal', 'road'],
  tow_truck: ['tow', 'towing', 'stuck', 'breakdown', 'flat tire', 'battery', 'car won’t start', 'broken down'],
};

const URGENCY_KEYWORDS = {
  critical: ['unconscious', 'not breathing', 'severe bleeding', 'fire', 'smoke', 'chest pain', 'explosion', 'burning', 'gas leak', 'heart attack'],
  high: ['injury', 'bleeding', 'accident', 'crash', 'assault', 'stuck', 'breakdown', 'urgent', 'severe pain'],
};

export const classifyEmergencyLocally = (details: string) => {
  const normalized = normalize(details);

  const categoryScores = new Map<EmergencyCategory, number>();
  (Object.keys(CATEGORY_KEYWORDS) as EmergencyCategory[]).forEach((category) => {
    const score = CATEGORY_KEYWORDS[category].reduce((total, keyword) => {
      return total + (normalized.includes(keyword) ? keyword.length : 0);
    }, 0);
    categoryScores.set(category, score);
  });

  const bestCategory = [...categoryScores.entries()].sort((a, b) => b[1] - a[1])[0];
  const category = bestCategory && bestCategory[1] > 0 ? bestCategory[0] : null;

  const isCritical = URGENCY_KEYWORDS.critical.some((keyword) => normalized.includes(keyword));
  const isHigh = URGENCY_KEYWORDS.high.some((keyword) => normalized.includes(keyword));

  return {
    category,
    urgency: isCritical ? 'Critical' : isHigh ? 'High' : 'Normal',
    confidence: category ? Math.min(1, bestCategory[1] / 50) : 0,
  };
};
