import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

const resources = {
  en: {
    translation: {
      // Navigation
      home: 'Home',
      emergency: 'Emergency',
      add: 'Add',
      profile: 'Profile',
      
      // Emergency Page
      emergencyTitle: 'Emergency Services',
      emergencySubtitle: 'Get immediate help in critical situations',
      emergencyStations: 'Emergency Stations Near You',
      firstAidBot: 'First Aid Assistant',
      emergencyContacts: 'Emergency Contacts',
      call911: 'Call 911',
      callPolice: 'Call Police',
      callFireDept: 'Call Fire Department',
      callAmbulance: 'Call Ambulance',
      shareLocation: 'Share My Location',
      
      // Main Page
      searchPlaceholder: 'Search for services...',
      communityPosts: 'Community Posts',
      sharePost: 'Share Post',
      listView: 'List View',
      mapView: 'Map View',
      map3D: '3D Map',
      searchResults: 'Search Results',
      clearSearch: 'Clear Search',
      postsWithinDistance: 'posts within',
      loadingPosts: 'Loading community posts...',
      
      // Categories
      all: 'All',
      plumbing: 'Plumbing',
      electrical: 'Electrical',
      cleaning: 'Cleaning',
      maintenance: 'Maintenance',
      gardening: 'Gardening',
      painting: 'Painting',
      carpentry: 'Carpentry',
      tutoring: 'Tutoring',
      cooking: 'Cooking',
      delivery: 'Delivery',
      babysitting: 'Babysitting',
      petcare: 'Pet Care',
      
      // Authentication
      authRequired: 'Authentication Required',
      signInToShare: 'Please sign in to share a post.',
      signIn: 'Sign In',
      
      // Messages
      success: 'Success!',
      postSharedSuccess: 'Your post has been shared successfully.',
      
      // Distance Filter
      maxDistance: 'Max Distance',
      kilometers: 'km',
      
      // Service Cards
      rating: 'Rating',
      distance: 'Distance',
      book: 'Book',
      message: 'Message',
      viewProfile: 'View Profile',
      
      // Emergency Assistant
      emergencyAssistant: 'Emergency Assistant',
      emergencyReceived: 'Emergency Report Received',
      stayCalm: 'Hello, I\'m your emergency assistant. Please stay calm. Are you injured or is someone else injured?',
      describeIncident: 'Thank you for the information. Can you briefly describe what happened?',
      yesInjured: 'Yes, someone is injured',
      noInjuries: 'No injuries, but need help',
      carAccident: 'Car accident',
      medicalEmergency: 'Medical emergency',
      fallInjury: 'Fall or injury',
      helpOnWay: 'Help is on the way!',
      continueBtn: 'Continue',
      understood: 'Understood',
      emergencyNotified: 'Emergency services have been notified',
      
      // First Aid Chatbot
      firstAidTitle: 'First Aid Assistant',
      disclaimer: 'I am not a doctor. This is general guidance only.',
      howCanIHelp: 'How can I help you today?',
      
      // Language
      language: 'Language',
      english: 'English',
      amharic: 'አማርኛ'
    }
  },
  am: {
    translation: {
      // Navigation
      home: 'ቤት',
      emergency: 'አደጋ',
      add: 'አክል',
      profile: 'መገለጫ',
      
      // Emergency Page
      emergencyTitle: 'የአደጋ ጊዜ አገልግሎቶች',
      emergencySubtitle: 'በወሳኝ ሁኔታዎች ላይ ቶሎ እርዳታ ያግኙ',
      emergencyStations: 'በአቅራቢያዎ ያሉ የአደጋ ጊዜ ጣቢያዎች',
      firstAidBot: 'የመጀመሪያ እርዳታ ረዳት',
      emergencyContacts: 'የአደጋ ጊዜ ዕውቅዎች',
      call911: '911 ይደውሉ',
      callPolice: 'ፖሊስ ይደውሉ',
      callFireDept: 'የእሳት አደጋ መከላከያ ይደውሉ',
      callAmbulance: 'አምቡላንስ ይደውሉ',
      shareLocation: 'መገኛዬን ያጋሩ',
      
      // Main Page
      searchPlaceholder: 'አገልግሎቶችን ይፈልጉ...',
      communityPosts: 'የማህበረሰብ ልጥፎች',
      sharePost: 'ልጥፍ ያጋሩ',
      listView: 'የዝርዝር እይታ',
      mapView: 'የካርታ እይታ',
      map3D: '3D ካርታ',
      searchResults: 'የፍለጋ ውጤቶች',
      clearSearch: 'ፍለጋ አጽዳ',
      postsWithinDistance: 'ልጥፎች በውስጥ',
      loadingPosts: 'የማህበረሰብ ልጥፎችን በመጫን ላይ...',
      
      // Categories
      all: 'ሁሉም',
      plumbing: 'የቧንቧ ስራ',
      electrical: 'የኤሌክትሪክ ስራ',
      cleaning: 'ጽዳት',
      maintenance: 'ጥገና',
      gardening: 'የአትክልት ስራ',
      painting: 'ቀለም ስራ',
      carpentry: 'የአናጺነት ስራ',
      tutoring: 'ትምህርት',
      cooking: 'ምግብ ማብሰል',
      delivery: 'ማድረስ',
      babysitting: 'ህጻን መንከባከብ',
      petcare: 'የቤት እንስሳት እንክብካቤ',
      
      // Authentication
      authRequired: 'ማረጋገጥ ያስፈልጋል',
      signInToShare: 'ልጥፍ ለማጋራት እባክዎ ይግቡ።',
      signIn: 'ግባ',
      
      // Messages
      success: 'ተሳክቷል!',
      postSharedSuccess: 'ልጥፍዎ በተሳካ ሁኔታ ተጋርቷል።',
      
      // Distance Filter
      maxDistance: 'ከፍተኛ ርቀት',
      kilometers: 'ኪሜ',
      
      // Service Cards
      rating: 'ደረጃ',
      distance: 'ርቀት',
      book: 'ይመዝግቡ',
      message: 'መልእክት',
      viewProfile: 'መገለጫ ይመልከቱ',
      
      // Emergency Assistant
      emergencyAssistant: 'የአደጋ ጊዜ ረዳት',
      emergencyReceived: 'የአደጋ ጊዜ ሪፖርት ተቀብሏል',
      stayCalm: 'ሰላም፣ እኔ የአደጋ ጊዜ ረዳትዎ ነኝ። እባክዎ ረጋ ይሁኑ። እርስዎ ወይም ሌላ ሰው ቆስለዋል?',
      describeIncident: 'ለመረጃው እናመሰግናለን። የተከሰተውን ነገር በአጭሩ ሊገልጹት ይችላሉ?',
      yesInjured: 'አዎ፣ አንድ ሰው ቆስሏል',
      noInjuries: 'ጉዳት የለም፣ ግን እርዳታ ያስፈልጋል',
      carAccident: 'የመኪና አደጋ',
      medicalEmergency: 'የሕክምና አደጋ',
      fallInjury: 'መውደቅ ወይም ጉዳት',
      helpOnWay: 'እርዳታ በመንገድ ላይ ነው!',
      continueBtn: 'ቀጥል',
      understood: 'ተረድቻል',
      emergencyNotified: 'የአደጋ ጊዜ አገልግሎቶች ማሳወቅ ተደርጓል',
      
      // First Aid Chatbot
      firstAidTitle: 'የመጀመሪያ እርዳታ ረዳት',
      disclaimer: 'እኔ ሐኪም አይደለሁም። ይህ አጠቃላይ መመሪያ ብቻ ነው።',
      howCanIHelp: 'ዛሬ እንዴት ልረዳዎት እችላለሁ?',
      
      // Language
      language: 'ቋንቋ',
      english: 'English',
      amharic: 'አማርኛ'
    }
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    debug: false,
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
    },
  });

export default i18n;