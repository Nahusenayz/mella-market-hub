import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const ConnectivityWatcher: React.FC = () => {
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [showStatus, setShowStatus] = useState(false);

    useEffect(() => {
        const handleOnline = () => {
            setIsOnline(true);
            setShowStatus(true);
            // Automatically hide after 3 seconds when back online
            setTimeout(() => setShowStatus(false), 3000);
        };

        const handleOffline = () => {
            setIsOnline(false);
            setShowStatus(true);
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    return (
        <AnimatePresence>
            {(showStatus || !isOnline) && (
                <motion.div
                    initial={{ y: -50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -50, opacity: 0 }}
                    className={`fixed top-0 left-0 right-0 z-[1000] p-3 flex items-center justify-between text-white text-sm font-medium shadow-md transition-colors ${isOnline ? 'bg-green-600' : 'bg-red-600 animate-pulse'
                        }`}
                >
                    <div className="flex items-center gap-3 container mx-auto px-4">
                        {isOnline ? <Wifi size={18} /> : <WifiOff size={18} />}
                        <span>
                            {isOnline
                                ? 'Back online! Connection restored.'
                                : 'Connection lost. Emergency features may be limited.'}
                        </span>
                    </div>
                    <button onClick={() => setShowStatus(false)} className="p-1 hover:bg-white/20 rounded-full mr-4">
                        <X size={16} />
                    </button>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
