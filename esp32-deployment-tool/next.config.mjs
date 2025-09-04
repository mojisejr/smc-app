/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable standalone output for Docker containers
  output: 'standalone',
  
  // Experimental features for better container support
  experimental: {
    // Disable output file tracing root for Docker
    outputFileTracingRoot: undefined,
  },
  
  // Environment variables for container detection
  env: {
    DOCKER_CONTAINER: process.env.DOCKER_CONTAINER || 'false',
  },
};

export default nextConfig;
