
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { ConversationsList } from '@/components/ConversationsList';
import { MessageThread } from '@/components/MessageThread';
import { Home, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const Messages = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<{
    id: string;
    name: string;
    image?: string;
  } | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 600);
    return () => clearTimeout(timer);
  }, []);

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

  if (isLoading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 pb-4">
        <header className="bg-white dark:bg-slate-900 shadow-lg border-b-4 border-green-600">
          <div className="container mx-auto px-4 py-4">
            <Skeleton className="h-8 w-48" />
          </div>
        </header>
        <div className="container mx-auto px-4 py-8 space-y-4">
          {[1,2,3,4].map(i => (
            <div key={i} className="flex items-center gap-4 p-4 bg-white dark:bg-slate-800 rounded-xl">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 pb-4">
      {/* Header */}
      <header className="bg-white dark:bg-slate-900 shadow-lg border-b-4 border-green-600">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 px-3 py-2 rounded-lg transition-colors"
            >
              <Home size={20} />
              <span className="font-medium">Home</span>
            </button>
            <h1 className="text-xl font-bold text-gray-800 dark:text-slate-100">Messages</h1>
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
