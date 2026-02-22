/** @type {import('next').NextConfig} */
const isProd = process.env.NODE_ENV === "production";
const repoName = "Beri-AboutHabs-2";

const base = isProd ? `/${repoName}` : "";

const nextConfig = {
  output: "export",
  // GitHub Pages serves from /<repo-name>/ — set basePath so all links and assets resolve correctly
  basePath: base,
  assetPrefix: isProd ? `/${repoName}/` : "",
  env: {
    // Expose basePath to client code (e.g. Web Worker fetch calls)
    NEXT_PUBLIC_BASE_PATH: base,
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
      };
    }
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      topLevelAwait: true,
      layers: true,
    };
    return config;
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Cross-Origin-Embedder-Policy", value: "require-corp" },
        ],
      },
    ];
  },
};

export default nextConfig;
