/** @type {import('next').NextConfig} */
const nextConfig = {
    output: "export", // Enables static export
    images: {
        unoptimized: true, // Disables image optimization (not supported in static exports)
    },
};

module.exports = nextConfig;