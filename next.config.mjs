/** @type {import('next').NextConfig} */
const nextConfig = {
  /**
   * Detect unsafe React behavior
   * during development.
   */
  reactStrictMode: true,

  /**
   * Production builds must fail
   * whenever TypeScript detects
   * an error.
   *
   * ESLint is executed separately
   * through the project's lint and
   * release verification scripts.
   */
  typescript: {
    ignoreBuildErrors: false,
  },

  /**
   * Global browser security headers.
   *
   * These headers apply to pages, API routes
   * and other responses served by Next.js.
   */
  async headers() {
    return [
      {
        source:
          '/:path*',

        headers: [
          {
            key:
              'X-Content-Type-Options',

            value:
              'nosniff',
          },
          {
            key:
              'X-Frame-Options',

            value:
              'DENY',
          },
          {
            key:
              'Referrer-Policy',

            value:
              'strict-origin-when-cross-origin',
          },
          {
            key:
              'Permissions-Policy',

            /*
             * WebAuthn/passkeys remain available
             * to the PHCL origin.
             *
             * Camera and geolocation remain limited
             * to the same origin for future verified
             * KYC and location-dependent workflows.
             */
            value:
              [
                'camera=(self)',
                'microphone=()',
                'geolocation=(self)',
                'payment=(self)',
                'usb=()',
                'browsing-topics=()',
                'publickey-credentials-get=(self)',
                'publickey-credentials-create=(self)',
              ].join(', '),
          },
        ],
      },
    ];
  },
};

export default nextConfig;