
import React, { useState } from 'react';
import { Star, ThumbsUp, Reply } from 'lucide-react';
import { useReviews } from '@/hooks/useReviews';

interface ReviewSystemProps {
  userId: string;
  canReview?: boolean;
  bookingId?: string;
}

export const ReviewSystem: React.FC<ReviewSystemProps> = ({
  userId,
  canReview = false,
  bookingId
}) => {
  const { reviews, loading, fetchReviews, createReview } = useReviews();
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');

  React.useEffect(() => {
    fetchReviews(userId);
  }, [userId]);

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    await createReview({
      reviewee_id: userId,
      booking_id: bookingId,
      rating,
      title: title || undefined,
      comment: comment || undefined
    });
    setShowReviewForm(false);
    setTitle('');
    setComment('');
    setRating(5);
    fetchReviews(userId);
  };

  const renderStars = (rating: number, interactive = false, onRate?: (rating: number) => void) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            size={interactive ? 24 : 16}
            className={`${
              star <= rating
                ? 'text-yellow-400 fill-yellow-400'
                : 'text-gray-300'
            } ${interactive ? 'cursor-pointer hover:text-yellow-300' : ''}`}
            onClick={() => interactive && onRate && onRate(star)}
          />
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-gray-100 h-20 rounded-lg"></div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {canReview && (
        <div className="bg-white p-4 rounded-xl shadow-sm border">
          {!showReviewForm ? (
            <button
              onClick={() => setShowReviewForm(true)}
              className="w-full py-3 px-4 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
            >
              Write a Review
            </button>
          ) : (
            <form onSubmit={handleSubmitReview} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rating
                </label>
                {renderStars(rating, true, setRating)}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Title (optional)
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder="Brief summary of your experience"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Review (optional)
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder="Share details about your experience"
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  className="flex-1 bg-orange-500 text-white py-2 px-4 rounded-lg hover:bg-orange-600 transition-colors"
                >
                  Submit Review
                </button>
                <button
                  type="button"
                  onClick={() => setShowReviewForm(false)}
                  className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-800">
          Reviews ({reviews.length})
        </h3>
        
        {reviews.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No reviews yet</p>
        ) : (
          reviews.map((review) => (
            <div key={review.id} className="bg-white p-4 rounded-xl shadow-sm border">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  {review.reviewer.profile_image_url ? (
                    <img
                      src={review.reviewer.profile_image_url}
                      alt={review.reviewer.full_name}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                      <span className="text-orange-600 font-medium">
                        {review.reviewer.full_name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div>
                    <p className="font-medium text-gray-800">{review.reviewer.full_name}</p>
                    <div className="flex items-center gap-2">
                      {renderStars(review.rating)}
                      <span className="text-sm text-gray-500">
                        {new Date(review.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {review.title && (
                <h4 className="font-medium text-gray-800 mb-2">{review.title}</h4>
              )}
              
              {review.comment && (
                <p className="text-gray-600 mb-3">{review.comment}</p>
              )}

              <div className="flex items-center gap-4 text-sm text-gray-500">
                <button className="flex items-center gap-1 hover:text-orange-500">
                  <ThumbsUp size={16} />
                  Helpful ({review.helpful_count})
                </button>
                <button className="flex items-center gap-1 hover:text-orange-500">
                  <Reply size={16} />
                  Reply
                </button>
              </div>

              {review.response && (
                <div className="mt-4 p-3 bg-gray-50 rounded-lg border-l-4 border-orange-500">
                  <p className="text-sm font-medium text-gray-800 mb-1">Response from provider:</p>
                  <p className="text-gray-600">{review.response}</p>
                  <p className="text-xs text-gray-500 mt-2">
                    {new Date(review.response_date!).toLocaleDateString()}
                  </p>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
