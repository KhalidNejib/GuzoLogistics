import React, { createContext, useContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';

// 🇪🇹 AMHARIC DICTIONARY (Comprehensive Addis Ababa Dialect)
const translations: Record<string, Record<string, string>> = {
  en: {
    // Dashboard & Status
    'home.online': 'Online',
    'home.standby': 'Standby',
    'home.mission_ready': 'Mission Ready',
    'home.go_online': 'Go Online',
    'home.go_offline': 'Go Offline',
    'home.daily_goal': 'Daily Goal',
    'home.missions': 'Missions',
    'home.total_missions': 'Total Missions',
    'home.left': 'Left',
    'home.collecting_intel': 'Collecting Intel...',
    'home.acquiring_signal': 'Acquiring Signal...',
    'home.live': 'LIVE',
    'home.details': 'DETAILS',
    'home.goal': 'GOAL',
    'home.searching_signal': 'Searching for Signal...',
    'home.establishing_uplink': 'Establishing Uplink...',
    
    // Tabs
    'tabs.active': 'Active',
    'tabs.pending': 'Nearby',
    'tabs.history': 'History',
    'tabs.notifications': 'Alerts',
    'tabs.profile': 'Vanguard',

    // Order Actions & Status
    'order.accept': 'Accept Mission',
    'order.decline': 'Decline',
    'order.start': 'Start Pickup',
    'order.picked_up': 'Item Collected',
    'order.transit': 'In Transit',
    'order.arrived': 'Arrived',
    'order.delivered': 'Delivered',
    'order.verify': 'Verify OTP',
    'order.collect_cash': 'Collect Cash',
    'order.pickup': 'Pickup Origin',
    'order.delivery': 'Final Destination',
    'order.customer': 'Customer',
    'order.merchant': 'Merchant',
    'order.payment': 'Payment',
    'order.distance': 'Distance',
    'order.eta': 'Estimated Arrival',
    'order.price': 'Total Amount',
    'order.rider_earning': 'Your Earnings',
    'order.verification_code': 'Verification Code',
    'order.pod_photo': 'Take Proof of Delivery',
    'order.submit_delivery': 'Confirm Completion',
    'order.new_order': 'New Mission Available!',
    'order.claim_now': 'Claim Now',
    'order.item_details': 'Shipment Intel',

    // Safety & SOS
    'safety.emergency_sos': 'Emergency SOS',
    'safety.confirm_sos': 'Confirm Emergency',
    'safety.sos_desc': 'Broadcast live location & alert Mission Control?',
    'safety.sos_dispatched': 'SOS Dispatched',
    'safety.help_on_way': 'Help is on the way. Stay calm.',
    'safety.warning': 'Tactical Warning',

    // Profile & Settings
    'profile.title': 'Pilot Profile',
    'profile.fleet': 'Fleet Assignment',
    'profile.rating': 'Service Rating',
    'profile.logout': 'Sign Out',
    'profile.dark_mode': 'Night Ops Mode',
    'profile.auto_accept': 'Auto-Claim Missions',

    // Global UI
    'ui.cancel': 'Cancel',
    'ui.confirm': 'Confirm',
    'ui.done': 'Done',
    'ui.loading': 'Loading...',
    'ui.retry': 'Retry',
    'ui.success': 'Success',
    'ui.error': 'Error Detcted',
  },
  am: {
    // Dashboard & Status
    'home.online': 'ኦንላይን',
    'home.standby': 'ዝግጁ',
    'home.mission_ready': 'ለስራ ዝግጁ',
    'home.go_online': 'ስራ ጀምር',
    'home.go_offline': 'ስራ አቁም',
    'home.daily_goal': 'የቀን ግብ',
    'home.missions': 'ትዕዛዞች',
    'home.total_missions': 'ጠቅላላ ትዕዛዞች',
    'home.left': 'ቀሪ',
    'home.collecting_intel': 'መረጃ በመሰብሰብ ላይ...',
    'home.acquiring_signal': 'ሲግናል በመፈለግ ላይ...',
    'home.live': 'ቀጥታ',
    'home.details': 'ዝርዝር',
    'home.goal': 'ግብ',
    'home.searching_signal': 'ሲግናል በመፈለግ ላይ...',
    'home.establishing_uplink': 'ግንኙነት በመፍጠር ላይ...',

    // Tabs
    'tabs.active': 'ሂደት ላይ',
    'tabs.pending': 'አቅራቢያ',
    'tabs.history': 'ታሪክ',
    'tabs.notifications': 'መልዕክቶች',
    'tabs.profile': 'መገለጫ',

    // Order Actions & Status
    'order.accept': 'ትዕዛዝ ተቀበል',
    'order.decline': 'ሰርዝ',
    'order.start': 'ወደ መነሻ ሂድ',
    'order.picked_up': 'ዕቃ ተረክቤያለሁ',
    'order.transit': 'መንገድ ላይ',
    'order.arrived': 'ደርሻለሁ',
    'order.delivered': 'ተረክቧል',
    'order.verify': 'ኮድ አረጋግጥ',
    'order.collect_cash': 'ብር ተቀበል',
    'order.pickup': 'መነሻ ቦታ',
    'order.delivery': 'መድረሻ ቦታ',
    'order.customer': 'ደንበኛ',
    'order.merchant': 'ነጋዴ',
    'order.payment': 'ክፍያ',
    'order.distance': 'ርቀት',
    'order.eta': 'የመድረሻ ጊዜ',
    'order.price': 'ጠቅላላ ዋጋ',
    'order.rider_earning': 'የእርስዎ ድርሻ',
    'order.verification_code': 'የማረጋገጫ ኮድ',
    'order.pod_photo': 'ፎቶ አንሳ',
    'order.submit_delivery': 'ጨርስ',
    'order.new_order': 'አዲስ ትዕዛዝ አለ!',
    'order.claim_now': 'አሁን ተቀበል',
    'order.item_details': 'ስለ ዕቃው መረጃ',

    // Safety & SOS
    'safety.emergency_sos': 'የአደጋ ጊዜ ጥሪ',
    'safety.confirm_sos': 'አደጋ መኖሩን አረጋግጥ',
    'safety.sos_desc': 'አድራሻዎን ለቁጥጥር ማዕከል መላክ ይፈልጋሉ?',
    'safety.sos_dispatched': 'ጥሪው ተልኳል',
    'safety.help_on_way': 'እርዳታ እየመጣ ነው:: ረጋ ይበሉ::',
    'safety.warning': 'ጥንቃቄ',

    // Profile & Settings
    'profile.title': 'የሾፌር መገለጫ',
    'profile.fleet': 'የተመደቡበት ድርጅት',
    'profile.rating': 'ደረጃ',
    'profile.logout': 'ውጣ',
    'profile.dark_mode': 'ጥቁር ገጽታ',
    'profile.auto_accept': 'ትዕዛዝ በራስ-ሰር ተቀበል',

    // Global UI
    'ui.cancel': 'ሰርዝ',
    'ui.confirm': 'አረጋግጥ',
    'ui.done': 'ተፈጸመ',
    'ui.loading': 'በመጫን ላይ...',
    'ui.retry': 'እንደገና ሞክር',
    'ui.success': 'ተሳክቷል',
    'ui.error': 'ስህተት ተከስቷል',
  }
};

type Language = 'en' | 'am';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLangState] = useState<Language>('en');

  useEffect(() => {
    // Load persisted language
    SecureStore.getItemAsync('app_language').then((saved) => {
      if (saved === 'en' || saved === 'am') setLangState(saved);
    });
  }, []);

  const setLanguage = (lang: Language) => {
    setLangState(lang);
    SecureStore.setItemAsync('app_language', lang);
  };

  const t = (key: string) => {
    return translations[language][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within LanguageProvider');
  return context;
};
