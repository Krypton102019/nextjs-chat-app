/** @type {import('next').NextConfig} */
const nextConfig = {
    // Remove output: "export" since Vercel supports dynamic apps
    images: {
        unoptimized: true, // Optional: Keep this if you don’t need image optimization
    },
};

module.exports = nextConfig;