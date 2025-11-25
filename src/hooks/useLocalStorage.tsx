
import { useState, useEffect } from 'react';

// Service interface for type safety
interface Service {
  id: string;
  title: string;
  description: string;
  price: number;
  category: string;
  provider: string;
  rating: number;
  distance: number;
  image: string;
  location: { lat: number; lng: number };
}

export function useLocalStorage<T>(key: string, initialValue: T) {
  // State to store our value
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      // If no item found, initialize with sample data for services
      if (!item && key === 'mella-services') {
        const sampleServices: Service[] = [
          {
            id: '1',
            title: 'House Cleaning Service',
            description: 'Professional house cleaning with eco-friendly products',
            price: 500,
            category: 'Cleaning',
            provider: 'Sarah Tadesse',
            rating: 4.8,
            distance: 2.3,
            image: '/placeholder.svg',
            location: { lat: 9.0257, lng: 38.7468 }
          },
          {
            id: '2',
            title: 'Food Delivery',
            description: 'Fast food delivery from local restaurants',
            price: 50,
            category: 'Delivery',
            provider: 'Ahmed Hassan',
            rating: 4.5,
            distance: 1.8,
            image: '/placeholder.svg',
            location: { lat: 9.0301, lng: 38.7514 }
          },
          {
            id: '3',
            title: 'Computer Repair',
            description: 'Laptop and desktop repair services',
            price: 800,
            category: 'Tech Support',
            provider: 'Michael Bekele',
            rating: 4.9,
            distance: 3.1,
            image: '/placeholder.svg',
            location: { lat: 9.0189, lng: 38.7423 }
          },
          {
            id: '4',
            title: 'Plumbing Service',
            description: 'Emergency plumbing and pipe repairs',
            price: 600,
            category: 'Home Repair',
            provider: 'Daniel Asfaw',
            rating: 4.6,
            distance: 4.2,
            image: '/placeholder.svg',
            location: { lat: 9.0312, lng: 38.7589 }
          },
          {
            id: '5',
            title: 'Math Tutoring',
            description: 'High school and university math tutoring',
            price: 300,
            category: 'Tutoring',
            provider: 'Hanna Wolde',
            rating: 4.7,
            distance: 2.8,
            image: '/placeholder.svg',
            location: { lat: 9.0278, lng: 38.7391 }
          }
        ];
        return sampleServices as T;
      }
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.log(error);
      return initialValue;
    }
  });

  // Return a wrapped version of useState's setter function that persists the new value to localStorage
  const setValue = (value: T | ((val: T) => T)) => {
    try {
      // Allow value to be a function so we have the same API as useState
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.log(error);
    }
  };

  return [storedValue, setValue] as const;
}
