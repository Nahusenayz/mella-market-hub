
import React from 'react';
import { ChevronDown } from 'lucide-react';

interface CategoryFilterProps {
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
}

const categories = [
  { value: 'all', label: 'All Categories', emoji: '🏪' },
  { value: 'Cleaning', label: 'Cleaning', emoji: '🧽' },
  { value: 'Delivery', label: 'Delivery', emoji: '🚚' },
  { value: 'Tech Support', label: 'Tech Support', emoji: '💻' },
  { value: 'Home Repair', label: 'Home Repair', emoji: '🔧' },
  { value: 'Tutoring', label: 'Tutoring', emoji: '📚' },
  { value: 'Photography', label: 'Photography', emoji: '📸' },
  { value: 'Catering', label: 'Catering', emoji: '🍽️' },
  { value: 'Transportation', label: 'Transportation', emoji: '🚗' },
  { value: 'Beauty', label: 'Beauty', emoji: '💄' },
  { value: 'Fitness', label: 'Fitness', emoji: '💪' },
  { value: 'Community Help', label: 'Community Help', emoji: '🤝' },
  { value: 'Properties', label: 'Properties', emoji: '🏠' },
  { value: 'Safety Alert', label: 'Safety Alert', emoji: '⚠️' },
  { value: 'Electronics', label: 'Electronics', emoji: '📱' },
  { value: 'Furniture', label: 'Furniture', emoji: '🛋️' },
  { value: 'Clothing', label: 'Clothing', emoji: '👕' },
  { value: 'Books', label: 'Books', emoji: '📖' },
  { value: 'Sports Equipment', label: 'Sports Equipment', emoji: '⚽' },
  { value: 'Musical Instruments', label: 'Musical Instruments', emoji: '🎸' },
  { value: 'Home Appliances', label: 'Home Appliances', emoji: '🔌' },
  { value: 'Vehicles', label: 'Vehicles', emoji: '🚙' },
  { value: 'Tools', label: 'Tools', emoji: '🛠️' },
  { value: 'Other', label: 'Other', emoji: '📦' }
];

export const CategoryFilter: React.FC<CategoryFilterProps> = ({
  selectedCategory,
  onCategoryChange
}) => {
  const selectedCategoryData = categories.find(cat => cat.value === selectedCategory) || categories[0];

  return (
    <div className="relative">
      <select
        id="category-filter"
        name="categoryFilter"
        value={selectedCategory}
        onChange={(e) => onCategoryChange(e.target.value)}
        className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-3 pr-10 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 font-medium text-gray-700 min-w-[200px]"
      >
        {categories.map((category) => (
          <option key={category.value} value={category.value}>
            {category.emoji} {category.label}
          </option>
        ))}
      </select>
      <ChevronDown
        size={20}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
      />
    </div>
  );
};
