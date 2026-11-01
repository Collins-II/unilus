import withPWAInit from "next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  register: true,
  skipWaiting: true,
  fallbacks: { document: "/offline.html", image: "", audio: "", video: "", font: "" },
  cacheStartUrl: false,
  cacheOnFrontEndNav: false,
  runtimeCaching: [
    { urlPattern: /\/api\//, handler: "NetworkOnly", method: "GET", options: {} },
    { urlPattern: ({ request }: { request: Request }) => request.mode === "navigate", handler: "NetworkOnly", options: {} },
    { urlPattern: /\.(?:png|jpg|jpeg|svg|webp|woff2?)$/i, handler: "StaleWhileRevalidate", options: { cacheName: "unilus-static-assets", expiration: { maxEntries: 100, maxAgeSeconds: 86400 } } },
  ],
  // Disable only during dev (important for Windows builds)
  disable: process.env.NODE_ENV === "development",
  buildExcludes: [/middleware-manifest.json$/], // prevents trace file lock issues
});

const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      { source: "/contact", destination: "https://www.unilus.ac.zm", permanent: false },
    ];
  },
  images: {
    remotePatterns: [
      "www.facebook.com",
      "flagcdn.com",
      "images.pexels.com",
      "cdn-images.dzcdn.net",
      "i.ytimg.com",
      "img.youtube.com",
      "images.unsplash.com",
      "lh3.googleusercontent.com",
      "www.pngall.com",
      "maps.googleapis.com",
      "res.cloudinary.com",
      "pngimg.com",
      "image-cdn-fa.spotifycdn.com",
      "mosaic.scdn.co",
      "image-cdn-ak.spotifycdn.com",
      "i.scdn.co",
    ].map((hostname) => ({ hostname, pathname: "/**" })),
  },
  turbopack: {},
};

export default withPWA(nextConfig);