export interface EmergencyProfileData {
  bloodType: string;
  allergies: string;
  chronicConditions: string;
  preferredLanguage: string;
  homeAddress: string;
  notes: string;
}

export interface TrustedContact {
  name: string;
  phone: string;
  relation: string;
}

export const DEFAULT_EMERGENCY_PROFILE: EmergencyProfileData = {
  bloodType: '',
  allergies: '',
  chronicConditions: '',
  preferredLanguage: 'en',
  homeAddress: '',
  notes: ''
};

export const DEFAULT_TRUSTED_CONTACTS: TrustedContact[] = [
  { name: '', phone: '', relation: '' },
  { name: '', phone: '', relation: '' },
  { name: '', phone: '', relation: '' }
];

export const EMERGENCY_PROFILE_KEY = 'mella-emergency-profile';
export const EMERGENCY_CONTACTS_KEY = 'mella-emergency-contacts';
export const EMERGENCY_NOTIFY_KEY = 'mella-emergency-notify-contacts';

export const normalizePhoneNumber = (phone: string) =>
  phone.replace(/[^\d+]/g, '').replace(/^00/, '+');

export const buildEmergencyAlertMessage = (args: {
  category: string;
  status?: string;
  location?: { lat: number; lng: number };
  profile?: EmergencyProfileData | null;
}) => {
  const locationText = args.location
    ? `Location: https://maps.google.com/?q=${args.location.lat},${args.location.lng}`
    : 'Location shared in-app';

  const pieces = [
    `Emergency alert: ${args.category}`,
    args.status ? `Status: ${args.status}` : 'Status: dispatched',
    locationText
  ];

  if (args.profile?.bloodType) pieces.push(`Blood type: ${args.profile.bloodType}`);
  if (args.profile?.allergies) pieces.push(`Allergies: ${args.profile.allergies}`);
  if (args.profile?.chronicConditions) pieces.push(`Conditions: ${args.profile.chronicConditions}`);
  if (args.profile?.homeAddress) pieces.push(`Home: ${args.profile.homeAddress}`);

  return pieces.join('\n');
};

export const sendTrustedContactAlerts = (
  contacts: TrustedContact[],
  message: string
) => {
  contacts
    .filter(contact => contact.phone.trim())
    .slice(0, 3)
    .forEach((contact, index) => {
      const phone = normalizePhoneNumber(contact.phone);
      const encoded = encodeURIComponent(message);
      const smsUrl = `sms:${phone}?body=${encoded}`;
      const waUrl = `https://wa.me/${phone.replace(/^\+/, '')}?text=${encoded}`;

      window.setTimeout(() => {
        const targetUrl = navigator.userAgent.includes('Android') || navigator.userAgent.includes('iPhone')
          ? smsUrl
          : waUrl;
        window.open(targetUrl, '_blank', 'noopener,noreferrer');
      }, index * 250);
    });
};
