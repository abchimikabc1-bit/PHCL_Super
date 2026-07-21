'use client';

import Image from 'next/image';
import { useState, useEffect } from 'react';
import { getBlurPlaceholder } from '@/lib/image-optimizer';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  fill?: boolean;
  priority?: boolean;
  category?: string;
  className?: string;
  containerClassName?: string;
  sizes?: string;
  onLoad?: () => void;
  showLoadingState?: boolean;
}

/**
 * Optimized Image component with lazy loading and blur placeholder
 * Wraps Next.js Image with performance enhancements
 */
export function OptimizedImage({
  src,
  alt,
  width,
  height,
  fill = false,
  priority = false,
  category,
  className = '',
  containerClassName = '',
  sizes,
  onLoad,
  showLoadingState = true,
}: OptimizedImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    // Reset loading state when src changes
    setIsLoading(true);
    setHasError(false);
  }, [src]);

  const handleLoadingComplete = () => {
    setIsLoading(false);
    onLoad?.();
  };

  const handleError = () => {
    setHasError(true);
    setIsLoading(false);
  };

  // Get blur placeholder
  const placeholder = category ? getBlurPlaceholder(category) : undefined;

  // Container for fill images
  if (fill) {
    return (
      <div className={`relative overflow-hidden ${containerClassName}`}>
        {/* Loading skeleton */}
        {showLoadingState && isLoading && (
          <div className="absolute inset-0 bg-slate-700/50 animate-pulse z-10" />
        )}

        {/* Error fallback */}
        {hasError && (
          <div className="absolute inset-0 bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center">
            <div className="text-center">
              <div className="text-4xl mb-2">🖼️</div>
              <p className="text-xs text-slate-400">Image failed to load</p>
            </div>
          </div>
        )}

        {/* Image */}
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          priority={priority}
          loading={priority ? 'eager' : 'lazy'}
          placeholder={placeholder ? 'blur' : 'empty'}
          blurDataURL={placeholder}
          className={`object-cover transition-opacity duration-300 ${isLoading ? 'opacity-0' : 'opacity-100'} ${className}`}
          onLoad={handleLoadingComplete}
          onError={handleError}
          quality={75}
        />
      </div>
    );
  }

  // Standard image with dimensions
  return (
    <div className={`relative overflow-hidden ${containerClassName}`}>
      {/* Loading skeleton */}
      {showLoadingState && isLoading && (
        <div
          className="absolute inset-0 bg-slate-700/50 animate-pulse z-10"
          style={{ width, height }}
        />
      )}

      {/* Error fallback */}
      {hasError && (
        <div
          className="absolute inset-0 bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center"
          style={{ width, height }}
        >
          <div className="text-center">
            <div className="text-2xl mb-1">🖼️</div>
            <p className="text-xs text-slate-400">Failed to load</p>
          </div>
        </div>
      )}

      {/* Image */}
      <Image
        src={src}
        alt={alt}
        width={width || 600}
        height={height || 600}
        sizes={sizes}
        priority={priority}
        loading={priority ? 'eager' : 'lazy'}
        placeholder={placeholder ? 'blur' : 'empty'}
        blurDataURL={placeholder}
        className={`transition-opacity duration-300 ${isLoading ? 'opacity-0' : 'opacity-100'} ${className}`}
        onLoad={handleLoadingComplete}
        onError={handleError}
        quality={75}
      />
    </div>
  );
}

/**
 * Batch load component - Provides loading context for multiple images
 * Shows overall loading state
 */
export function BatchImageLoader({
  children,
  onLoadComplete,
  totalImages,
}: {
  children: React.ReactNode;
  onLoadComplete?: () => void;
  totalImages: number;
}) {
  const [loadedCount, setLoadedCount] = useState(0);
  const isAllLoaded = loadedCount >= totalImages;

  const handleImageLoad = () => {
    setLoadedCount((prev) => {
      const next = prev + 1;
      if (next >= totalImages) {
        onLoadComplete?.();
      }
      return next;
    });
  };

  return (
    <div>
      {/* Optional: Show loading indicator */}
      {!isAllLoaded && (
        <div className="text-xs text-slate-500 mb-2">
          Loading images... {loadedCount}/{totalImages}
        </div>
      )}
      {children}
    </div>
  );
}
