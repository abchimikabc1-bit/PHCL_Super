import type { Metadata } from 'next';
import FeedbackClient from '@/components/feedback/feedback-client';

export const metadata: Metadata = {
  title: 'Share Feedback | PHCL Super',
  description: 'Leave live feedback, ratings, and testimonials for PHCL Super.',
  alternates: {
    canonical: '/feedback',
  },
};

export default function FeedbackPage() {
  return <FeedbackClient />;
}