
import React from 'react';
import { MessageCircle } from 'lucide-react';
import { useMessages } from '@/hooks/useMessages';
import { VerificationBadge } from './VerificationBadge';

interface ConversationsListProps {
  onSelectConversation: (userId: string, userName: string, userImage?: string) => void;
}

export const ConversationsList: React.FC<ConversationsListProps> = ({
  onSelectConversation
}) => {
  const { conversations, loading } = useMessages();

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="animate-pulse space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg">
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <MessageCircle size={24} className="text-orange-500" />
          Messages
        </h2>
      </div>

      <div className="max-h-96 overflow-y-auto">
        {conversations.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            <MessageCircle size={48} className="mx-auto mb-3 text-gray-300" />
            <p>No conversations yet</p>
            <p className="text-sm">Start messaging other users!</p>
          </div>
        ) : (
          conversations.map((conversation) => (
            <div
              key={`${conversation.user1_id}-${conversation.user2_id}`}
              onClick={() => onSelectConversation(
                conversation.other_user.id,
                conversation.other_user.full_name,
                conversation.other_user.profile_image_url
              )}
              className="p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
            >
              <div className="flex items-center space-x-3">
                {conversation.other_user.profile_image_url ? (
                  <img
                    src={conversation.other_user.profile_image_url}
                    alt={conversation.other_user.full_name}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
                    <span className="text-orange-600 font-medium">
                      {conversation.other_user.full_name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-800 truncate">
                      {conversation.other_user.full_name}
                    </h3>
                    <VerificationBadge
                      isVerified={conversation.other_user.is_verified}
                      badges={conversation.other_user.badges}
                      size="sm"
                    />
                  </div>
                  <p className="text-sm text-gray-500 truncate">
                    {conversation.last_message}
                  </p>
                  <p className="text-xs text-gray-400">
                    {new Date(conversation.last_message_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
