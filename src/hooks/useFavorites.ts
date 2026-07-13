import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'mella_favorites';

export const useFavorites = () => {
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
  }, [favorites]);

  const toggleFavorite = useCallback((adId: string) => {
    setFavorites(prev =>
      prev.includes(adId) ? prev.filter(id => id !== adId) : [...prev, adId]
    );
    if (navigator.vibrate) navigator.vibrate(10);
  }, []);

  const isFavorite = useCallback((adId: string) => favorites.includes(adId), [favorites]);
  const favoriteCount = favorites.length;

  return { favorites, toggleFavorite, isFavorite, favoriteCount };
};
