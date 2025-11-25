
import React from 'react';
import { Shield, CheckCircle, Star, Award } from 'lucide-react';

interface VerificationBadgeProps {
  isVerified: boolean;
  verificationType?: string;
  badges?: string[];
  size?: 'sm' | 'md' | 'lg';
}

export const VerificationBadge: React.FC<VerificationBadgeProps> = ({
  isVerified,
  verificationType,
  badges = [],
  size = 'md'
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };

  const getBadgeIcon = (badge: string) => {
    switch (badge) {
      case 'background_check': return <Shield className={sizeClasses[size]} />;
      case 'top_rated': return <Star className={sizeClasses[size]} />;
      case 'certified': return <Award className={sizeClasses[size]} />;
      default: return <CheckCircle className={sizeClasses[size]} />;
    }
  };

  const getBadgeColor = (badge: string) => {
    switch (badge) {
      case 'background_check': return 'text-green-500';
      case 'top_rated': return 'text-yellow-500';
      case 'certified': return 'text-blue-500';
      default: return 'text-orange-500';
    }
  };

  if (!isVerified && badges.length === 0) return null;

  return (
    <div className="flex items-center gap-1">
      {isVerified && (
        <div className={`${getBadgeColor('verified')} relative`} title={`Verified ${verificationType || 'user'}`}>
          <CheckCircle className={sizeClasses[size]} fill="currentColor" />
        </div>
      )}
      {badges.map((badge, index) => (
        <div key={index} className={getBadgeColor(badge)} title={badge.replace('_', ' ')}>
          {getBadgeIcon(badge)}
        </div>
      ))}
    </div>
  );
};
