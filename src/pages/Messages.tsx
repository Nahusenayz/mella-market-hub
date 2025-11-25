
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { ConversationsList } from '@/components/ConversationsList';
import { MessageThread } from '@/components/MessageThread';
import { Home } from 'lucide-react';

const Messages = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedUser, setSelectedUser] = useState<{
    id: string;
    name: string;
    image?: string;
  } | null>(null);

  if (!user) {
    navigate('/auth');
    return null;
  }

  const handleSelectConversation = (userId: string, userName: string, userImage?: string) => {
    setSelectedUser({ id: userId, name: userName, image: userImage });
  };

  const handleBack = () => {
    setSelectedUser(null);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-br from-green-50 to-emerald-50 pb-4">
      {/* Header */}
      <header className="bg-white shadow-lg border-b-4 border-green-600">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 text-green-700 hover:bg-green-50 px-3 py-2 rounded-lg transition-colors"
            >
              <Home size={20} />
              <span className="font-medium">Home</span>
            </button>
            <h1 className="text-xl font-bold text-gray-800">Messages</h1>
            <div className="w-20"></div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {selectedUser ? (
            <MessageThread
              otherUserId={selectedUser.id}
              otherUserName={selectedUser.name}
              otherUserImage={selectedUser.image}
              onBack={handleBack}
            />
          ) : (
            <ConversationsList onSelectConversation={handleSelectConversation} />
          )}
        </div>
      </div>
    </div>
  );
};

export default Messages;
