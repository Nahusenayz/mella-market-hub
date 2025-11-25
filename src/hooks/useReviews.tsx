
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface Review {
  id: string;
  reviewer_id: string;
  reviewee_id: string;
  rating: number;
  title?: string;
  comment?: string;
  created_at: string;
  updated_at: string;
  response?: string;
  response_date?: string;
  helpful_count: number;
  booking_id?: string;
  reviewer: {
    full_name: string;
    profile_image_url?: string;
  };
}

interface CreateReviewData {
  reviewee_id: string;
  rating: number;
  title?: string;
  comment?: string;
  booking_id?: string;
}

export const useReviews = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchReviews = async (userId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select(`
          *,
          reviewer:profiles!reviews_reviewer_id_fkey(full_name, profile_image_url)
        `)
        .eq('reviewee_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform the data to match our interface
      const transformedReviews = (data || []).map(review => ({
        ...review,
        reviewer: {
          full_name: review.reviewer?.full_name || 'Anonymous',
          profile_image_url: review.reviewer?.profile_image_url
        }
      }));

      setReviews(transformedReviews);
    } catch (error) {
      console.error('Error fetching reviews:', error);
      toast({
        title: "Error",
        description: "Failed to load reviews",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createReview = async (reviewData: CreateReviewData) => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "You must be logged in to write a review",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('reviews')
        .insert({
          ...reviewData,
          reviewer_id: user.id
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Your review has been submitted",
      });

      // Refresh reviews
      await fetchReviews(reviewData.reviewee_id);
    } catch (error) {
      console.error('Error creating review:', error);
      toast({
        title: "Error",
        description: "Failed to submit review",
        variant: "destructive",
      });
    }
  };

  const updateReview = async (reviewId: string, updates: Partial<CreateReviewData>) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('reviews')
        .update(updates)
        .eq('id', reviewId)
        .eq('reviewer_id', user.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Review updated successfully",
      });
    } catch (error) {
      console.error('Error updating review:', error);
      toast({
        title: "Error",
        description: "Failed to update review",
        variant: "destructive",
      });
    }
  };

  const markHelpful = async (reviewId: string) => {
    try {
      // First get current helpful count
      const { data: review } = await supabase
        .from('reviews')
        .select('helpful_count')
        .eq('id', reviewId)
        .single();

      if (!review) return;

      const { error } = await supabase
        .from('reviews')
        .update({ helpful_count: (review.helpful_count || 0) + 1 })
        .eq('id', reviewId);

      if (error) throw error;

      // Refresh reviews to show updated count
      const currentRevieweeId = reviews.find(r => r.id === reviewId)?.reviewee_id;
      if (currentRevieweeId) {
        await fetchReviews(currentRevieweeId);
      }
    } catch (error) {
      console.error('Error marking review as helpful:', error);
    }
  };

  const addResponse = async (reviewId: string, response: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('reviews')
        .update({
          response,
          response_date: new Date().toISOString()
        })
        .eq('id', reviewId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Response added successfully",
      });

      // Refresh reviews to show the response
      const currentRevieweeId = reviews.find(r => r.id === reviewId)?.reviewee_id;
      if (currentRevieweeId) {
        await fetchReviews(currentRevieweeId);
      }
    } catch (error) {
      console.error('Error adding response:', error);
      toast({
        title: "Error",
        description: "Failed to add response",
        variant: "destructive",
      });
    }
  };

  return {
    reviews,
    loading,
    fetchReviews,
    createReview,
    updateReview,
    markHelpful,
    addResponse
  };
};
