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

    // Fix "import.meta cannot be used outside of module code" from Terser.
    // ONNX Runtime (shipped inside @huggingface/transformers) uses .mjs bundles
    // that contain import.meta. Webpack defaults to javascript/auto for bundled
    // files, which forbids import.meta. Marking .mjs files as javascript/esm
    // tells Terser to use module mode and allows import.meta through.
    config.module.rules.push({
      test: /\.mjs$/,
      type: "javascript/esm",
      resolve: { fullySpecified: false },
    });

    // Exclude the server-side ONNX Runtime — it's not available in the browser.
    config.resolve.alias = {
      ...config.resolve.alias,
      "onnxruntime-node$": false,
    };

    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      topLevelAwait: true,
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
