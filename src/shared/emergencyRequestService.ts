import { supabase } from '../integrations/supabase/client';
import type { Database } from '../integrations/supabase/types';

type EmergencyRow = Database['public']['Tables']['emergency_requests']['Row'];
type ProfileRow = Pick<
  Database['public']['Tables']['profiles']['Row'],
  'full_name' | 'phone_number' | 'profile_image_url'
>;

export type EmergencyStatus = EmergencyRow['status'];

export interface EmergencyRequestWithProfile extends EmergencyRow {
  estimated_price?: number | null;
  user_profile?: ProfileRow;
}

const ACTIVE_STATUSES: EmergencyStatus[] = ['pending', 'accepted', 'en_route'];

export const extractEstimatedPrice = (details: string | null | undefined) => {
  if (!details || !details.startsWith('{')) return null;
  try {
    const parsed = JSON.parse(details) as { price?: number };
    return typeof parsed.price === 'number' ? parsed.price : null;
  } catch {
    return null;
  }
};

export const attachEmergencyProfiles = async <T extends { user_id: string; details: string | null }>(
  rows: T[]
): Promise<Array<T & { estimated_price?: number | null; user_profile?: ProfileRow }>> => {
  if (rows.length === 0) return [];

  const userIds = [...new Set(rows.map((row) => row.user_id))];
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, full_name, phone_number, profile_image_url')
    .in('id', userIds);

  if (error) {
    console.error('Error loading emergency profiles:', error);
  }

  const profileMap = new Map<string, ProfileRow>();
  (profiles ?? []).forEach((profile) => {
    profileMap.set(profile.id, {
      full_name: profile.full_name,
      phone_number: profile.phone_number,
      profile_image_url: profile.profile_image_url,
    });
  });

  return rows.map((row) => ({
    ...row,
    estimated_price: extractEstimatedPrice(row.details),
    user_profile: profileMap.get(row.user_id),
  }));
};

export const updateEmergencyStatus = async (
  id: string,
  status: EmergencyStatus,
  location?: { lat: number; lng: number }
) => {
  const update: Partial<EmergencyRow> = { status };

  if (location) {
    update.responder_location_lat = location.lat;
    update.responder_location_lng = location.lng;
  }

  const { error } = await supabase
    .from('emergency_requests')
    .update(update)
    .eq('id', id);

  if (error) {
    throw error;
  }
};

export const fetchActiveEmergencyRequests = async () => {
  const { data, error } = await supabase
    .from('emergency_requests')
    .select('*')
    .in('status', ACTIVE_STATUSES)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []) as EmergencyRow[];
};

export const sendEmergencyMessage = async (senderId: string, receiverId: string, content: string) => {
  const { error } = await supabase.from('messages').insert({
    sender_id: senderId,
    receiver_id: receiverId,
    content,
    message_type: 'text',
  });

  if (error) {
    throw error;
  }
};
