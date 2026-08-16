import React from 'react';
import { AlertTriangle, Plus, Trash2, Phone, Share2, Shield, HeartPulse, MapPin, Languages, ClipboardList } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import type { EmergencyProfileData, TrustedContact } from '@/components/emergencyPreparedness';
import { buildEmergencyAlertMessage, sendTrustedContactAlerts } from '@/components/emergencyPreparedness';

interface EmergencyPreparednessPanelProps {
  title?: string;
  description?: string;
  compact?: boolean;
  isOffline?: boolean;
  profile: EmergencyProfileData;
  setProfile: React.Dispatch<React.SetStateAction<EmergencyProfileData>>;
  contacts: TrustedContact[];
  setContacts: React.Dispatch<React.SetStateAction<TrustedContact[]>>;
  notifyContacts: boolean;
  setNotifyContacts: React.Dispatch<React.SetStateAction<boolean>>;
  onShareSummary?: () => void;
}

export const EmergencyPreparednessPanel: React.FC<EmergencyPreparednessPanelProps> = ({
  title = 'Emergency profile & trusted contacts',
  description = 'Save medical details and emergency contacts so SOS requests carry more useful context.',
  compact = false,
  isOffline = false,
  profile,
  setProfile,
  contacts,
  setContacts,
  notifyContacts,
  setNotifyContacts,
  onShareSummary
}) => {
  const updateContact = (index: number, field: keyof TrustedContact, value: string) => {
    setContacts(prev => prev.map((contact, i) => (i === index ? { ...contact, [field]: value } : contact)));
  };

  const addContact = () => {
    setContacts(prev => prev.length >= 3 ? prev : [...prev, { name: '', phone: '', relation: '' }]);
  };

  const removeContact = (index: number) => {
    setContacts(prev => prev.filter((_, i) => i !== index));
  };

  const filledContacts = contacts.filter(contact => contact.name.trim() || contact.phone.trim() || contact.relation.trim());
  const profileScore = [
    profile.bloodType,
    profile.allergies,
    profile.chronicConditions,
    profile.preferredLanguage,
    profile.homeAddress
  ].filter(Boolean).length;

  return (
    <Card className="overflow-hidden border-orange-100 shadow-lg">
      <CardHeader className="bg-gradient-to-r from-orange-600 to-red-600 text-white">
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <HeartPulse className="h-5 w-5" />
              {title}
            </CardTitle>
            <p className="mt-1 text-sm text-white/85">{description}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="bg-white/15 text-white border-white/20">
              {profileScore}/5 profile fields
            </Badge>
            <Badge className="bg-white/15 text-white border-white/20">
              {filledContacts.length}/3 contacts
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6 p-5">
        {isOffline && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <p className="font-semibold">Offline emergency mode</p>
                <p className="text-sm text-amber-800">
                  Network is weak or unavailable. Cached help cards and station numbers stay visible, and request details can be prepared for when connection returns.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className={`grid gap-4 ${compact ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1 xl:grid-cols-2'}`}>
          <div className="space-y-4 rounded-2xl border border-orange-100 bg-orange-50/70 p-4">
            <div className="flex items-center gap-2 text-orange-700">
              <Shield className="h-4 w-4" />
              <h3 className="font-semibold">Emergency profile</h3>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label className="text-xs font-semibold text-gray-600">Blood type</Label>
                <Input
                  value={profile.bloodType}
                  onChange={(e) => setProfile(prev => ({ ...prev, bloodType: e.target.value }))}
                  placeholder="A+, O-, B+..."
                />
              </div>
              <div>
                <Label className="text-xs font-semibold text-gray-600">Preferred language</Label>
                <Input
                  value={profile.preferredLanguage}
                  onChange={(e) => setProfile(prev => ({ ...prev, preferredLanguage: e.target.value }))}
                  placeholder="en / am"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs font-semibold text-gray-600">Allergies</Label>
              <Textarea
                value={profile.allergies}
                onChange={(e) => setProfile(prev => ({ ...prev, allergies: e.target.value }))}
                placeholder="Penicillin, peanuts, latex..."
                rows={3}
              />
            </div>
            <div>
              <Label className="text-xs font-semibold text-gray-600">Chronic conditions</Label>
              <Textarea
                value={profile.chronicConditions}
                onChange={(e) => setProfile(prev => ({ ...prev, chronicConditions: e.target.value }))}
                placeholder="Asthma, diabetes, heart condition..."
                rows={3}
              />
            </div>
            <div>
              <Label className="text-xs font-semibold text-gray-600">Home address</Label>
              <Textarea
                value={profile.homeAddress}
                onChange={(e) => setProfile(prev => ({ ...prev, homeAddress: e.target.value }))}
                placeholder="Apartment, block, gate, landmark..."
                rows={3}
              />
            </div>
            <div>
              <Label className="text-xs font-semibold text-gray-600">Extra notes</Label>
              <Textarea
                value={profile.notes}
                onChange={(e) => setProfile(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Accessibility needs, medication reminders, gate code..."
                rows={3}
              />
            </div>
          </div>

          <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-slate-700">
                <Phone className="h-4 w-4" />
                <h3 className="font-semibold">Trusted contacts</h3>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addContact} disabled={contacts.length >= 3}>
                <Plus className="mr-2 h-4 w-4" />
                Add
              </Button>
            </div>

            <div className="space-y-3">
              {contacts.map((contact, index) => (
                <div key={index} className="rounded-xl border border-slate-200 bg-white p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="grid flex-1 gap-2 sm:grid-cols-3">
                      <Input
                        value={contact.name}
                        onChange={(e) => updateContact(index, 'name', e.target.value)}
                        placeholder={`Contact ${index + 1} name`}
                      />
                      <Input
                        value={contact.phone}
                        onChange={(e) => updateContact(index, 'phone', e.target.value)}
                        placeholder="Phone"
                      />
                      <Input
                        value={contact.relation}
                        onChange={(e) => updateContact(index, 'relation', e.target.value)}
                        placeholder="Relation"
                      />
                    </div>
                    {contacts.length > 1 && (
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeContact(index)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3">
              <div>
                <Label htmlFor="notify-contacts" className="font-semibold text-slate-800">
                  Notify trusted contacts on SOS
                </Label>
                <p className="text-sm text-slate-500">
                  Sends your emergency category, location, and request status to saved contacts.
                </p>
              </div>
              <Switch
                id="notify-contacts"
                checked={notifyContacts}
                onCheckedChange={setNotifyContacts}
              />
            </div>

            {onShareSummary && (
              <Button type="button" variant="outline" className="w-full" onClick={onShareSummary}>
                <Share2 className="mr-2 h-4 w-4" />
                Copy emergency card summary
              </Button>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-dashed border-amber-300 bg-amber-50/70 p-4">
          <div className="flex items-center gap-2 text-amber-800">
            <ClipboardList className="h-4 w-4" />
            <h3 className="font-semibold">What gets shared</h3>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {profile.bloodType && <Badge variant="secondary">Blood: {profile.bloodType}</Badge>}
            {profile.preferredLanguage && <Badge variant="secondary">Language: {profile.preferredLanguage}</Badge>}
            {profile.homeAddress && <Badge variant="secondary">Home saved</Badge>}
            {filledContacts.length > 0 && <Badge variant="secondary">Trusted contacts ready</Badge>}
            {profile.allergies && <Badge variant="secondary">Allergies saved</Badge>}
          </div>
          <p className="mt-3 text-sm text-amber-900/80">
            This data stays on your device and can be inserted into emergency requests to help responders act faster.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
