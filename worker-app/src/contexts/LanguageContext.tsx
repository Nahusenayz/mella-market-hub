import React, { createContext, useContext, useState, useCallback } from 'react'

type Language = 'en' | 'am'

interface LangContext {
  lang: Language
  toggleLang: () => void
  t: (text: string, params?: Record<string, string | number>) => string
}

const LangCtx = createContext<LangContext>({
  lang: 'en',
  toggleLang: () => {},
  t: (s) => s,
})

const dict: Record<string, string> = {
  // App Header
  'Mella Responder': 'የሜላ ምላሽ ሰጭ',
  'Field Responder': 'የመስክ ምላሽ ሰጭ',
  'TERMINAL': 'ተርሚናል',
  'LOGOUT': 'ውጣ',
  'LOGIN': 'ግባ',
  'SIGN UP': 'ተመዝገብ',

  // Login Page
  'Terminal Access': 'የተርሚናል መግቢያ',
  'Authorized Emergency Personnel Only': 'ለተፈቀደላቸው የአደጋ ጊዜ ሰራተኞች ብቻ',
  'Email Address': 'ኢሜይል አድራሻ',
  'field.agent@mella.responder': 'ወኪል@ሜላ.ምላሽ',
  'Field Password': 'የመስክ የይለፍ ቃል',
  'INITIALIZE SESSION': 'ክፍለ ጊዜ ይጀምሩ',
  'NEW RESPONDER?': 'አዲስ ምላሽ ሰጭ?',
  'ENROLL IN FLEET': 'ቡድን ይቀላቀሉ',
  'Live Ops': 'የቀጥታ ስራዎች',
  'GPS Link': 'ጂፒኤስ አገናኝ',
  'Dispatch': 'መላኪያ',

  // Signup Page
  'Worker Registration': 'የሰራተኛ ምዝገባ',
  'Join our emergency response network': 'የአደጋ ጊዜ ምላሽ አውታራችንን ይቀላቀሉ',
  'Full Name': 'ሙሉ ስም',
  'John Doe': 'ሙሉ ስም',
  'Service Category': 'የአገልግሎት ምድብ',
  'Police Officer': 'ፖሊስ',
  'Paramedic': 'የአምቡላንስ ሰራተኛ',
  'Traffic Control': 'የትራፊክ ቁጥጥር',
  'Firefighter': 'የእሳት አደጋ ሰራተኛ',
  'Tow Operator': 'የጎተራ አሽከርካሪ',
  'Base Service Fee (ETB)': 'የመሠረት አገልግሎት ክፍያ (ብር)',
  'e.g. 500': 'ለምሳሌ 500',
  'Set your starting price for towing services.': 'ለመጎተት አገልግሎት የመነሻ ዋጋዎን ያስቀምጡ።',
  'Location Enabled!': 'ቦታ ነቅቷል!',
  'Enable Location': 'ቦታ ያንቁ',
  'Your location will be shared with users seeking emergency help.': 'ቦታዎ የአደጋ ጊዜ እርዳታ ለሚፈልጉ ተጠቃሚዎች ይጋራል።',
  'Allow location access so users can find you during emergencies.': 'ተጠቃሚዎች በአደጋ ጊዜ እንዲያገኙዎ የቦታ መዳረሻ ይፍቀዱ።',
  'Grant Location Access': 'የቦታ መዳረሻ ይስጡ',
  'Email': 'ኢሜይል',
  'Phone': 'ስልክ',
  'responder@example.com': 'ምላሽሰጭ@ምሳሌ.com',
  'Phone Number': 'ስልክ ቁጥር',
  '+251 911...': '+251 911...',
  'Password': 'የይለፍ ቃል',
  'Confirm Password': 'የይለፍ ቃል ያረጋግጡ',
  'Geolocation is not supported by your browser': 'ጂኦሎኬሽን በአሳሽዎ አይደገፍም',
  'Location access denied. Using default location (Addis Ababa). You can update this later in your dashboard.': 'የቦታ መዳረሻ ተከልክሏል። ነባሪ ቦታ (አዲስ አበባ) እየተጠቀመ ነው። በኋላ በዳሽቦርድዎ ማዘመን ይችላሉ።',
  'Passwords do not match': 'የይለፍ ቃላት አይዛመዱም',
  'Password must be at least 6 characters': 'የይለፍ ቃል ቢያንስ 6 ቁምፊዎች መሆን አለበት',
  'Please enter your full name': 'እባክዎ ሙሉ ስምዎን ያስገቡ',
  'Back': 'ተመለስ',
  'Continue': 'ቀጥል',
  'Creating Account...': 'መለያ እየተፈጠረ ነው...',
  'Complete Registration': 'ምዝገባ ያጠናቅቁ',
  'Already have an account?': 'አካውንት አለዎት?',
  'Sign in': 'ይግቡ',
  'Coordinates: {lat}, {lng}': 'መጋጠሚያዎች: {lat}, {lng}',

  // Dashboard - Notifications
  'New Emergency!': 'አዲስ ድንገተኛ አደጋ!',
  'New Emergencies!': 'አዲስ ድንገተኛ አደጋዎች!',
  'pending request waiting.': 'የሚጠብቅ ጥያቄ።',
  'pending requests waiting.': 'የሚጠብቁ ጥያቄዎች።',
  'Alarm ringing': 'ማንቂያ እየደወለ ነው',
  'DISMISS': 'ዘግተው',
  'New Emergency Request!': 'አዲስ የአደጋ ጊዜ ጥያቄ!',
  'You have': 'እርስዎ አለዎት',
  'new emergency request(s)': 'አዲስ የአደጋ ጊዜ ጥያቄ(ዎች)',

  // Dashboard - Cancelled Modal
  '⚠️ MISSION CANCELLED': '⚠️ ተልዕኮ ተሰርዟል',
  'Request Aborted': 'ጥያቄ ተቋርጧል',
  'The user has terminated the emergency request. No further action is required for this mission.': 'ተጠቃሚው የአደጋ ጊዜ ጥያቄውን አቋርጧል። ለዚህ ተልዕኮ ምንም ተጨማሪ እርምጃ አያስፈልግም።',
  'ACKNOWLEDGE': 'ተረድቻለሁ',

  // Dashboard - Header
  'Welcome back,': 'እንኳን ደህና መጡ',
  'Active': 'ንቁ',
  'Offline': 'ከመስመር ውጪ',
  'PROFILE': 'መገለጫ',
  'GO OFFLINE': 'ከመስመር ውጣ',
  'GO ONLINE': 'ወደ መስመር ግባ',
  'GPS Signal': 'የጂፒኤስ ምልክት',
  'Excellent': 'እጅግ በጣም ጥሩ',
  'Good': 'ጥሩ',
  'Fair': 'መካከለኛ',
  'Poor': 'ደካማ',
  'Unknown': 'ያልታወቀ',

  // Dashboard - Tabs
  'Active Jobs': 'ንቁ ስራዎች',
  'Earnings': 'ገቢ',
  'Hotspots': 'ሞቃት ቦታዎች',

  // Dashboard - Mobile Nav
  'Jobs': 'ስራዎች',
  'Cash': 'ገንዘብ',
  'Map': 'ካርታ',
  'Live': 'በቀጥታ',
  'Off': 'ጠፍቷል',

  // Dashboard - Left Sidebar
  'Dispatcher': 'ላኪ',
  'Waiting': 'በመጠበቅ ላይ',
  'Ongoing': 'በሂደት ላይ',
  'Hot Zone': 'ሞቃት ዞን',
  'System queue is prioritising response in this category.': 'የስርዓት ወረፋ በዚህ ምድብ ውስጥ ምላሽን ቅድሚያ እየሰጠ ነው።',

  // Dashboard - Pending Jobs
  'Pending Jobs': 'በመጠበቅ ላይ ያሉ ስራዎች',
  'AVAILABLE': 'ዝግጁ',
  'Quiet for now': 'አሁን ጸጥ ያለ ነው',
  'New emergency calls will pop up here instantly.': 'አዲስ የአደጋ ጊዜ ጥሪዎች ወዲያውኑ እዚህ ይታያሉ።',
  'Anonymous User': 'ስም የሌለው ተጠቃሚ',
  'Emergency assistance requested. Standby for further details upon arrival.': 'የአደጋ ጊዜ እርዳታ ተጠይቋል። ሲደርሱ ለተጨማሪ ዝርዝሮች ይጠብቁ።',
  'Critical': 'ወሳኝ',
  'High': 'ከፍተኛ',
  'Normal': 'መደበኛ',
  'ACCEPT JOB': 'ስራ ተቀበል',
  'SKIP': 'ዘልል',

  // Dashboard - Ongoing Assignments
  'Ongoing Assignments': 'በሂደት ላይ ያሉ ምደባዎች',
  'IN PROGRESS': 'በሂደት ላይ',
  'No active assignments': 'ንቁ ምደባ የለም',
  'EN ROUTE': 'በመንገድ ላይ',
  'MARK COMPLETED': 'ተጠናቋል ምልክት',
  'CANCEL': 'ሰርዝ',

  // Dashboard - Performance
  'Performance': 'አፈጻጸም',
  'Monthly Jobs': 'ወርሃዊ ስራዎች',
  'Monthly': 'ወርሃዊ',
  'Average': 'አማካይ',
  'Rating': 'ደረጃ',
  'Success': 'ስኬት',
  'Full Operations Log': 'ሙሉ የስራ ምዝግብ ማስታወሻ',
  'Mission Successful': 'ተልዕኮ ተሳክቷል',
  'No additional field logs recorded for this event.': 'ለዚህ ክስተት ምንም ተጨማሪ የመስክ ምዝግብ አልተመዘገበም።',

  // Dashboard - Recent Log
  'Recent Log': 'የቅርብ ጊዜ ምዝግብ',
  'No recent activity.': 'የቅርብ ጊዜ እንቅስቃሴ የለም።',

  // Dashboard - Response Intelligence
  'Response Intelligence': 'የምላሽ መረጃ',
  'System suggests positioning near': 'ስርዓቱ አቅራቢያ መቀመጥን ይጠቁማል',
  'hotspots for faster dispatch.': 'ለፈጣን መላኪያ ሞቃት ቦታዎች',

  // Dashboard - History Modal
  'Operations Log': 'የስራ ምዝግብ ማስታወሻ',
  'NO PREVIOUS LOGS FOUND': 'ምንም የቀድሞ ምዝግቦች አልተገኙም',

  // Time ago
  'Just now': 'አሁን ብቻ',
  'm ago': 'ደቂቃ በፊት',
  'h ago': 'ሰአት በፊት',
  'm away': 'ሜትር ርቀት',
  'km away': 'ኪሜ ርቀት',

  // EditProfile Modal
  'Edit Profile': 'መገለጫ አስተካክል',
  'Your full name': 'ሙሉ ስምዎ',
  '9XXXXXXXX': '9XXXXXXXX',
  'Users will see this number to call you during emergencies.': 'ተጠቃሚዎች በአደጋ ጊዜ እርስዎን ለመደወል ይህን ቁጥር ያያሉ።',
  'Full name is required': 'ሙሉ ስም ያስፈልጋል',
  'Failed to save profile': 'መገለጫ ማስቀመጥ አልተሳካም',
  'Profile saved successfully!': 'መገለጫ በተሳካ ሁኔታ ተቀምጧል!',
  'SAVING...': 'እያስቀመጠ ነው...',
  'SAVE': 'አስቀምጥ',

  // WorkerEarnings
  'Total Balance': 'ጠቅላላ ቀሪ ሂሳብ',
  'ETB': 'ብር',
  'Transaction History': 'የግብይት ታሪክ',
  'No transactions found yet': 'እስካሁን ምንም ግብይቶች አልተገኙም',

  // DemandHeatmap
  'Demand Heatmap': 'የፍላጎት ሙቀት ካርታ',
  'High Demand Zones': 'ከፍተኛ ፍላጎት ዞኖች',
  'Areas with high emergency frequency & service requests.': 'ከፍተኛ የአደጋ ጊዜ ድግግሞሽ እና የአገልግሎት ጥያቄ ያላቸው አካባቢዎች።',
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Language>('en')

  const toggleLang = useCallback(() => {
    setLangState(prev => (prev === 'en' ? 'am' : 'en'))
  }, [])

  const t = useCallback((text: string, params?: Record<string, string | number>): string => {
    if (lang === 'en') {
      if (!params) return text
      let result = text
      for (const [key, val] of Object.entries(params)) {
        result = result.replace(`{${key}}`, String(val))
      }
      return result
    }

    let translated = dict[text] || text
    if (params) {
      for (const [key, val] of Object.entries(params)) {
        translated = translated.replace(`{${key}}`, String(val))
      }
    }
    return translated
  }, [lang])

  return (
    <LangCtx.Provider value={{ lang, toggleLang, t }}>
      {children}
    </LangCtx.Provider>
  )
}

export function useTranslation(): LangContext {
  return useContext(LangCtx)
}

export default useTranslation
