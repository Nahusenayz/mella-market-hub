import React, { useEffect } from 'react';

declare global {
    interface Window {
        chatbase?: any;
    }
}

export const ChatbaseWidget: React.FC = () => {
    useEffect(() => {
        // Chatbase Config
        (window as any).chatbaseConfig = {
            chatbotId: "Z90h5iHnuzyQ6ryftvO6n",
        };

        // Embed Script
        const script = document.createElement("script");
        script.src = "https://www.chatbase.co/embed.min.js";
        script.id = "Z90h5iHnuzyQ6ryftvO6n";
        script.defer = true;
        document.body.appendChild(script);

        return () => {
            // Cleanup if necessary (though usually embed scripts persist)
            // document.body.removeChild(script);
        };
    }, []);

    return null; // The widget injects itself into the DOM
};
