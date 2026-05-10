
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useSocialFeed } from './useSocialFeed';

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  read: boolean;
  message_type: string;
  reply_to_message_id?: string;
  created_at: string;
  updated_at: string;
}

interface Conversation {
  user1_id: string;
  user2_id: string;
  last_message: string;
  last_message_at: string;
}

interface ConversationWithProfile extends Conversation {
  other_user: {
    id: string;
    full_name: string;
    profile_image_url: string;
    is_verified: boolean;
    badges: string[];
  };
}

export const useMessages = (activeOtherUserId?: string) => {
  const { user } = useAuth();
  const { createActivity } = useSocialFeed();
  const [conversations, setConversations] = useState<ConversationWithProfile[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchConversations = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .order('last_message_at', { ascending: false });

      if (error) {
        console.error('Error fetching conversations:', error);
        return;
      }

      // Fetch profile data for other users
      const conversationsWithProfiles = await Promise.all(
        (data || []).map(async (conv) => {
          const otherUserId = conv.user1_id === user.id ? conv.user2_id : conv.user1_id;

          const { data: profile } = await supabase
            .from('profiles')
            .select('id, full_name, profile_image_url, is_verified, badges')
            .eq('id', otherUserId)
            .maybeSingle();

          return {
            ...conv,
            other_user: {
              id: otherUserId,
              full_name: profile?.full_name || 'Mella User',
              profile_image_url: profile?.profile_image_url || '',
              is_verified: profile?.is_verified || false,
              badges: Array.isArray(profile?.badges) ? profile.badges.filter((badge): badge is string => typeof badge === 'string') : []
            }
          };
        })
      );

      setConversations(conversationsWithProfiles);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (otherUserId: string) => {
    if (!user) return;

    try {
      // Use a more robust filter: both participants must be in the sender/receiver fields
      // This is equivalent to (sender=A OR receiver=A) AND (sender=B OR receiver=B)
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .filter('sender_id', 'in', `(${user.id},${otherUserId})`)
        .filter('receiver_id', 'in', `(${user.id},${otherUserId})`)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching messages:', error);
        return;
      }

      setMessages(data || []);

      // Mark received messages as read
      const unreadMessages = (data || []).filter(msg =>
        msg.receiver_id === user.id && !msg.read
      );

      if (unreadMessages.length > 0) {
        await supabase
          .from('messages')
          .update({ read: true })
          .in('id', unreadMessages.map(msg => msg.id));
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const sendMessage = async (receiverId: string, content: string, messageType = 'text', replyToId?: string) => {
    if (!user) return false;

    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          sender_id: user.id,
          receiver_id: receiverId,
          content,
          message_type: messageType,
          reply_to_message_id: replyToId
        })
        .select()
        .single();

      if (error) {
        console.error('Error sending message:', error);
        return false;
      }

      // Immediately add to local state for snappier UI
      if (activeOtherUserId === receiverId) {
        setMessages(prev => [...prev, data]);
      }

      // Update conversations list
      fetchConversations();

      // Optionally create social feed activity
      try {
        createActivity('sent_message', {
          receiver_id: receiverId,
          preview: content.substring(0, 50) + (content.length > 50 ? '...' : '')
        }, 'private');
      } catch (err) {
        console.log('Social feed activity not created');
      }

      return true;
    } catch (error) {
      console.error('Error sending message:', error);
      return false;
    }
  };

  const markAsRead = async (messageId: string) => {
    try {
      const { error } = await supabase
        .from('messages')
        .update({ read: true })
        .eq('id', messageId);

      if (error) {
        console.error('Error marking message as read:', error);
      }
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  };

  useEffect(() => {
    fetchConversations();

    if (user) {
      // Use a unique channel name per user to avoid conflicts
      const channel = supabase
        .channel(`messages-user-${user.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'messages'
          },
          (payload: any) => {
            console.log('Real-time message update:', payload);
            fetchConversations();

            // Handle INSERT, UPDATE, DELETE safely
            const msg = payload.new || payload.old;
            if (!msg) return;

            // If we're currently viewing messages for a specific user, refetch them
            if (activeOtherUserId) {
              const isRelevant = 
                (msg.sender_id === user.id && msg.receiver_id === activeOtherUserId) ||
                (msg.sender_id === activeOtherUserId && msg.receiver_id === user.id);
              
              if (isRelevant) {
                fetchMessages(activeOtherUserId);
              }
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user, activeOtherUserId]);

  return {
    conversations,
    messages,
    loading,
    fetchMessages,
    sendMessage,
    markAsRead,
    refetchConversations: fetchConversations
  };
};
