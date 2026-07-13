import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

export const Footer: React.FC = () => {
  const { t } = useLanguage();

  return (
    <footer className="bg-gray-800 dark:bg-slate-950 text-white py-8 mt-16">
      <div className="container mx-auto px-4 text-center">
        <p className="text-lg font-medium">
          {t('footerMadeBy')}{' '}
          <a
            href="https://techspace-et.web.app/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-blue-400"
          >
            Tech Space ET
          </a>
        </p>
        <p className="text-gray-400 text-sm mt-2">
          {t('footerCopyright')}
        </p>
      </div>
    </footer>
  );
};
