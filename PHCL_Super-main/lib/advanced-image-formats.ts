/**
 * Advanced Image Format Utilities
 * Supports WebP, AVIF, and modern image formats for maximum compression
 * Provides automatic format fallback based on browser support
 */

export interface FormatSupport {
  webp: boolean;
  avif: boolean;
  heic: boolean;
}

export interface FormatConfig {
  url: string;
  formats: {
    avif?: string;
    webp?: string;
    original: string;
  };
  alt: string;
  width?: number;
  height?: number;
}

/**
 * Detect browser support for modern image formats
 * Caches results for performance
 */
let formatSupportCache: FormatSupport | null = null;

export async function detectFormatSupport(): Promise<FormatSupport> {
  // Return cached result if available
  if (formatSupportCache) {
    return formatSupportCache;
  }

  if (typeof window === 'undefined') {
    // Server-side default
    return { webp: true, avif: true, heic: false };
  }

  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return { webp: false, avif: false, heic: false };
  }

  // Test WebP
  const webpData = canvas.toDataURL('image/webp');
  const supportsWebP = webpData.startsWith('data:image/webp');

  // Test AVIF
  const avifData = canvas.toDataURL('image/avif');
  const supportsAVIF = avifData.startsWith('data:image/avif');

  // Test HEIC (iOS)
  const heicData = canvas.toDataURL('image/heic');
  const supportsHEIC = heicData.startsWith('data:image/heic');

  formatSupportCache = {
    webp: supportsWebP,
    avif: supportsAVIF,
    heic: supportsHEIC,
  };

  return formatSupportCache;
}

/**
 * Convert image URL to modern format
 * Works with Unsplash and compatible CDNs
 */
export function convertToModernFormat(
  url: string,
  format: 'webp' | 'avif' | 'original' = 'original',
  options: { width?: number; height?: number; quality?: number } = {}
): string {
  // If URL already has optimization params, extract base
  let baseUrl = url.split('?')[0];

  // For Unsplash CDN
  if (url.includes('unsplash.com')) {
    const params = new URLSearchParams();

    if (options.width) params.append('w', String(options.width));
    if (options.height) params.append('h', String(options.height));
    if (options.quality) params.append('q', String(options.quality));

    // Set fit strategy
    params.append('fit', 'crop');

    // Add format conversion (Unsplash supports these)
    if (format === 'webp') {
      params.append('fm', 'webp');
    } else if (format === 'avif') {
      params.append('fm', 'avif');
    }

    return `${baseUrl}?${params.toString()}`;
  }

  // For data URIs and other formats, return as-is
  return url;
}

/**
 * Generate srcset with modern formats
 * Returns string suitable for <source srcset> elements
 */
export function generateModernSrcSet(
  baseUrl: string,
  format: 'webp' | 'avif' | 'original',
  sizes: number[] = [300, 600, 1200, 1800]
): string {
  return sizes
    .map((width) => {
      const url = convertToModernFormat(baseUrl, format, { width, quality: 75 });
      return `${url} ${width}w`;
    })
    .join(', ');
}

/**
 * Create picture element configuration
 * Provides fallback chain for maximum compatibility
 */
export interface PictureConfig {
  avif?: string;      // Best compression (30-40% smaller)
  webp?: string;      // Good compression (25-35% smaller)
  original: string;   // Fallback (PNG/JPEG)
}

export function createPictureElement(config: PictureConfig): {
  avif?: string;
  webp?: string;
  original: string;
} {
  return {
    avif: config.avif,
    webp: config.webp,
    original: config.original,
  };
}

/**
 * Calculate compression savings
 * Shows potential bandwidth savings with modern formats
 */
export function calculateCompressionSavings(
  originalSizeKb: number,
  format: 'webp' | 'avif'
): {
  format: string;
  estimatedSize: number;
  savings: number;
  savingsPercent: number;
} {
  // Conservative estimates based on real-world data
  const compressionRatios: Record<string, number> = {
    webp: 0.75, // 25% reduction
    avif: 0.60, // 40% reduction
  };

  const ratio = compressionRatios[format] || 1;
  const estimatedSize = Math.round(originalSizeKb * ratio);
  const savings = originalSizeKb - estimatedSize;
  const savingsPercent = Math.round((savings / originalSizeKb) * 100);

  return {
    format,
    estimatedSize,
    savings,
    savingsPercent,
  };
}

/**
 * Format-specific quality recommendations
 * Different formats handle quality differently
 */
export const QUALITY_RECOMMENDATIONS = {
  original: 85,  // JPEG default
  webp: 75,      // WebP can use lower quality due to efficiency
  avif: 60,      // AVIF can use much lower quality for same visual result
} as const;

/**
 * Get recommended quality for format
 */
export function getRecommendedQuality(format: 'original' | 'webp' | 'avif'): number {
  return QUALITY_RECOMMENDATIONS[format];
}

/**
 * Estimate total bandwidth savings for image list
 */
export function estimateBandwidthSavings(
  imageCount: number,
  avgImageSizeKb: number = 150,
  format: 'webp' | 'avif' = 'webp'
): {
  originalTotal: number;
  optimizedTotal: number;
  savings: number;
  savingsPercent: number;
} {
  const originalTotal = imageCount * avgImageSizeKb;
  const savings = calculateCompressionSavings(avgImageSizeKb, format).savings;
  const optimizedTotal = originalTotal - savings * imageCount;

  return {
    originalTotal,
    optimizedTotal,
    savings: savings * imageCount,
    savingsPercent: Math.round((savings * imageCount / originalTotal) * 100),
  };
}

/**
 * Browser compatibility matrix
 */
export const FORMAT_SUPPORT_MATRIX = {
  avif: {
    name: 'AVIF',
    chrome: '85+',
    firefox: '93+',
    safari: '16+',
    edge: '85+',
    mobile: 'Chrome 85+, Firefox 93+',
    compression: '40-50%',
  },
  webp: {
    name: 'WebP',
    chrome: '23+',
    firefox: '65+',
    safari: '16+',
    edge: '18+',
    mobile: 'Universal',
    compression: '25-35%',
  },
  heic: {
    name: 'HEIC',
    chrome: 'No',
    firefox: 'No',
    safari: '13+',
    edge: 'No',
    mobile: 'iOS 11+',
    compression: '35-45%',
  },
} as const;

/**
 * Get most efficient format for current browser
 * Prefers newer formats, falls back to WebP, then JPEG
 */
export async function selectOptimalFormat(): Promise<'avif' | 'webp' | 'original'> {
  const support = await detectFormatSupport();

  if (support.avif) return 'avif';  // Best compression
  if (support.webp) return 'webp';  // Good compression
  return 'original';                 // Fallback
}

/**
 * Pre-detect format support on page load
 * Call once at app initialization
 */
export function initializeFormatDetection(): void {
  if (typeof window !== 'undefined') {
    detectFormatSupport().catch(() => {
      // Silently fail, defaults will be used
    });
  }
}
