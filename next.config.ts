/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'export',
    images: {
        unoptimized: true, // Required for images to work
    },
    basePath: "/nextjs-chat-app", // Use your GitHub repo name
};

module.exports = nextConfig;
