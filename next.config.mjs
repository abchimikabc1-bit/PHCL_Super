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
};

export default nextConfig;