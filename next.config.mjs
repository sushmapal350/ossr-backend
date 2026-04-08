/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb"
    }
  },
  async rewrites() {
    return [
      {
        source: "/admin/locations",
        destination: "/api/admin/locations"
      }
    ];
  }
};

export default nextConfig;
