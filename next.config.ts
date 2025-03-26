/** @type {import('next').NextConfig} */
const nextConfig = {
    // Remove output: "export" if present
    images: {
        unoptimized: true, // Optional: Keep this if you don’t need image optimization
    },
};

module.exports = nextConfig;