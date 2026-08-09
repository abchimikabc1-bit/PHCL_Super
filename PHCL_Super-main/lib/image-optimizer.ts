/**
 * Image Optimization Utilities
 * Provides lazy loading, blur placeholders, and responsive image handling
 */

export interface OptimizedImageConfig {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  priority?: boolean;
  blurPlaceholder?: string;
  sizes?: string;
  quality?: number;
  className?: string;
}

/**
 * Generate a solid color placeholder (LQIP - Low Quality Image Placeholder)
 * @param color - Hex color code or theme color
 * @returns Data URI of 1x1 pixel colored image
 */
export function generateColorPlaceholder(color: string = '#1e293b'): string {
  const cleanColor = color.replace('#', '');
  const base64 = Buffer.from(
    `\\xff\\xd8\\xff\\xe0\\x00\\x10JFIF\\x00\\x01\\x01\\x01\\x00H\\x00H\\x00\\x00\\xff\\xdb\\x00C\\x00\\x08\\x06\\x06\\x07\\x06\\x05\\x08\\x07\\x07\\x07\\t\\t\\x08\\n\\x0c\\x14\\r\\x0c\\x0b\\x0b\\x0c\\x19\\x12\\x13\\x0f\\x14\\x1d\\x1a\\x1f\\x1e\\x1d\\x1a\\x1c\\x1c $.\\" ',\\",#\\x1c\\x1d)\\x7f\\x7f\\t\\t\\t\\x0b\\x0b\\x0b\\x0b\\x0b\\x0b\\x13\\x0e\\r\\r\\x13\\x13\\x13\\x0c\\x0c\\x0c\\x0c\\x0c\\x0c\\x0c\\x0c\\x0c\\x0c\\xff\\xc0\\x00\\x0b\\x08\\x00\\x01\\x00\\x01\\x01\\x01\\x11\\x00\\xff\\xc4\\x00\\x1f\\x00\\x00\\x01\\x05\\x01\\x01\\x01\\x01\\x01\\x01\\x00\\x00\\x00\\x00\\x00\\x00\\x00\\x00\\x01\\x02\\x03\\x04\\x05\\x06\\x07\\x08\\t\\n\\x0b\\xff\\xc4\\x00\\xb5\\x10\\x00\\x02\\x01\\x03\\x03\\x02\\x04\\x03\\x05\\x05\\x04\\x04\\x00\\x00\\x01}\\x01\\x02\\x03\\x00\\x04\\x11\\x05\\x12!1A\\x06Q aq\\\"2B\\x81\\x91\\xa1\\x08#B\\xb1Q\\xc1\\x15R\\xd1\\xf0$3br\\x82\\t\\n\\x16\\x17\\x18\\x19\\x1a%&\\'()*456789:CDEFGHIJSTUVWXYZcdefghijstuvwxyz\\x83\\x84\\x85\\x86\\x87\\x88\\x89\\x8a\\x92\\x93\\x94\\x95\\x96\\x97\\x98\\x99\\x9a\\xa2\\xa3\\xa4\\xa5\\xa6\\xa7\\xa8\\xa9\\xaa\\xb2\\xb3\\xb4\\xb5\\xb6\\xb7\\xb8\\xb9\\xba\\xc2\\xc3\\xc4\\xc5\\xc6\\xc7\\xc8\\xc9\\xca\\xd2\\xd3\\xd4\\xd5\\xd6\\xd7\\xd8\\xd9\\xda\\xe1\\xe2\\xe3\\xe4\\xe5\\xe6\\xe7\\xe8\\xe9\\xea\\xf1\\xf2\\xf3\\xf4\\xf5\\xf6\\xf7\\xf8\\xf9\\xfa\\xff\\xda\\x08\\x01\\x01\\x00\\x00?\\x00\\xfe\\x15J\\xa0\\x05\\x14\\x01P\\x14\\x01P\\x14\\xff\\xd9`
  ).toString('base64');
  return `data:image/jpeg;base64,${base64}`;
}

/**
 * Optimized image sizes for responsive images
 * Follows modern best practices for loading performance
 */
export const IMAGE_SIZES = {
  // Marketplace grid images
  PRODUCT_GRID: '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw',
  // Full-width section images
  HERO: '100vw',
  // Sidebar/card images
  CARD: '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw',
  // Thumbnail images
  THUMBNAIL: '(max-width: 640px) 80px, 120px',
};

/**
 * Quality settings for different image types
 */
export const IMAGE_QUALITY = {
  HIGH: 90,      // Hero, featured images
  MEDIUM: 75,    // Product grid
  LOW: 60,       // Thumbnails, secondary images
};

/**
 * Optimize image URL for Unsplash and similar CDNs
 * @param url - Original image URL
 * @param width - Desired width (optional)
 * @param height - Desired height (optional)
 * @param quality - Quality level (optional)
 * @returns Optimized image URL
 */
export function optimizeImageUrl(
  url: string,
  width?: number,
  height?: number,
  quality?: number
): string {
  // Already optimized (has w= and h= params)
  if (url.includes('?w=') && url.includes('&h=')) {
    return url;
  }

  // For Unsplash images, add optimization params
  if (url.includes('unsplash.com')) {
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}w=${width || 600}&h=${height || 600}&fit=crop&q=${quality || 75}`;
  }

  return url;
}

/**
 * Get blur placeholder for images
 * Uses color-based placeholder or SVG
 * @param category - Product category for themed color
 * @returns Blur placeholder data URI
 */
export function getBlurPlaceholder(category?: string): string {
  const categoryColors: Record<string, string> = {
    Vehicles: '#1e293b',
    Motorcycles: '#1f2937',
    Electronics: '#0f766e',
    Appliances: '#1d4ed8',
    Clothing: '#7c2d12',
    Industrial: '#3f3f46',
    Tools: '#365314',
    Food: '#7f1d1d',
  };

  const color = category ? categoryColors[category] : '#1e293b';
  return generateColorPlaceholder(color);
}

/**
 * Determine if image should load with priority
 * Above-the-fold images (first N items) should use priority=true
 * @param index - Product index in list
 * @param itemsPerRow - Items visible per row
 * @returns Should use priority loading
 */
export function shouldPriorityLoad(index: number, itemsPerRow: number = 4): boolean {
  // Load first two rows with priority
  return index < itemsPerRow * 2;
}

/**
 * Calculate aspect ratio for responsive images
 * @param width - Image width
 * @param height - Image height
 * @returns Padding bottom percentage for aspect ratio
 */
export function calculateAspectRatio(width: number, height: number): number {
  return (height / width) * 100;
}

/**
 * Image loader configuration for Next.js Image component
 * Can be used with loader prop in Image component
 */
export function customImageLoader({
  src,
  width,
  quality,
}: {
  src: string;
  width: number;
  quality?: number;
}): string {
  // For Unsplash CDN
  if (src.includes('unsplash.com')) {
    return `${src}${src.includes('?') ? '&' : '?'}w=${width}&q=${quality || 75}`;
  }

  // For data URIs and SVG, return as-is
  if (src.startsWith('data:') || src.startsWith('http')) {
    return src;
  }

  return src;
}

/**
 * Format loading state class names
 * Use with CSS to show loading animation
 */
export function getLoadingClasses(isLoading: boolean): string {
  if (isLoading) {
    return 'animate-pulse bg-slate-700/50';
  }
  return '';
}

/**
 * Preload images for better performance
 * Call during component mount or when you know images will be needed
 * @param urls - Array of image URLs to preload
 */
export function preloadImages(urls: string[]): void {
  if (typeof window === 'undefined') return;

  urls.forEach((url) => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = url;
    document.head.appendChild(link);
  });
}

/**
 * Create image srcset for responsive images
 * @param baseUrl - Base image URL
 * @param sizes - Array of desired widths
 * @returns Srcset string
 */
export function createSrcSet(baseUrl: string, sizes: number[] = [300, 600, 1200]): string {
  return sizes
    .map((size) => {
      const url = optimizeImageUrl(baseUrl, size);
      return `${url} ${size}w`;
    })
    .join(', ');
}
