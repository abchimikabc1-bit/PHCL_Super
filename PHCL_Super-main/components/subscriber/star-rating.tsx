'use client';

import { useState } from 'react';
import { Star } from 'lucide-react';

interface StarRatingProps {
  darkMode: boolean;
  isSubscriber: boolean;
}

export function StarRating({ darkMode, isSubscriber }: StarRatingProps) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [ratings, setRatings] = useState<Array<{ stars: number; date: string }>>([
    { stars: 5, date: '2 days ago' },
    { stars: 4, date: '1 week ago' },
    { stars: 5, date: '2 weeks ago' },
  ]);

  const handleRate = (stars: number) => {
    if (isSubscriber) {
      setRating(stars);
      setRatings(prev => [
        { stars, date: 'just now' },
        ...prev
      ]);
    }
  };

  const averageRating = ratings.length > 0 
    ? (ratings.reduce((sum, r) => sum + r.stars, 0) / ratings.length).toFixed(1)
    : 0;

  return (
    <div className={`rounded-lg p-6 border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-amber-50 border-amber-200'}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-amber-900'}`}>PHCL Super Rating</h3>
        {isSubscriber && (
          <span className="px-3 py-1 bg-gradient-to-r from-yellow-400 to-amber-500 text-white text-xs font-bold rounded-full">
            ★ SUBSCRIBER
          </span>
        )}
      </div>

      {isSubscriber ? (
        <div className="mb-6">
          <p className={`text-sm mb-3 ${darkMode ? 'text-gray-400' : 'text-amber-800'}`}>Rate your experience with PHCL Super</p>
          <div className="flex gap-2 mb-4">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                onClick={() => handleRate(star)}
                className="transition-all transform hover:scale-110"
              >
                <Star
                  size={32}
                  className={`${
                    star <= (hoverRating || rating)
                      ? 'fill-yellow-400 text-yellow-400'
                      : darkMode
                      ? 'text-gray-600'
                      : 'text-amber-200'
                  }`}
                />
              </button>
            ))}
          </div>
          {rating > 0 && (
            <p className="text-sm font-semibold text-yellow-500">You rated: {rating} stars</p>
          )}
        </div>
      ) : (
        <div className={`p-4 rounded-lg border-2 border-dashed ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-amber-300'}`}>
          <p className={`text-sm font-semibold ${darkMode ? 'text-gray-300' : 'text-amber-900'}`}>
            Subscribe to rate PHCL Super and earn exclusive rewards!
          </p>
        </div>
      )}

      <div className="mt-6 pt-6 border-t border-gray-400">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                size={18}
                className={star <= Math.round(parseFloat(averageRating as string))
                  ? 'fill-yellow-400 text-yellow-400'
                  : darkMode
                  ? 'text-gray-600'
                  : 'text-amber-200'
                }
              />
            ))}
          </div>
          <p className={`font-bold text-lg ${darkMode ? 'text-white' : 'text-amber-900'}`}>
            {averageRating}
          </p>
          <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-amber-700'}`}>
            ({ratings.length} ratings)
          </p>
        </div>

        <h4 className={`text-sm font-bold mb-3 ${darkMode ? 'text-gray-300' : 'text-amber-900'}`}>Recent Ratings</h4>
        <div className="space-y-2 max-h-40 overflow-y-auto">
          {ratings.map((r, i) => (
            <div key={i} className={`flex items-center justify-between p-2 rounded ${darkMode ? 'bg-gray-700' : 'bg-white'}`}>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    size={14}
                    className={star <= r.stars
                      ? 'fill-yellow-400 text-yellow-400'
                      : darkMode
                      ? 'text-gray-600'
                      : 'text-amber-200'
                    }
                  />
                ))}
              </div>
              <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-amber-700'}`}>{r.date}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
