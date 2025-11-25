
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

export const useMessages = () => {
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
            .single();

          return {
            ...conv,
            other_user: {
              id: otherUserId,
              full_name: profile?.full_name || 'Unknown User',
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
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${user.id})`)
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
      const { error } = await supabase
        .from('messages')
        .insert({
          sender_id: user.id,
          receiver_id: receiverId,
          content,
          message_type: messageType,
          reply_to_message_id: replyToId
        });

      if (error) {
        console.error('Error sending message:', error);
        return false;
      }

      // Optionally create social feed activity (if table exists)
      try {
        createActivity('sent_message', {
          receiver_id: receiverId,
          preview: content.substring(0, 50) + (content.length > 50 ? '...' : '')
        }, 'private');
      } catch (err) {
        // Silently ignore if social feed is unavailable
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
      // Set up real-time subscription for messages
      const channel = supabase
        .channel('messages-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'messages'
          },
          (payload) => {
            console.log('Real-time message update:', payload);
            fetchConversations();

            // If we're currently viewing messages, refetch them
            if (messages.length > 0) {
              const firstMessage = messages[0];
              const otherUserId = firstMessage.sender_id === user.id
                ? firstMessage.receiver_id
                : firstMessage.sender_id;
              fetchMessages(otherUserId);
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

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
