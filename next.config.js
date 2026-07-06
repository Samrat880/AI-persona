import "./src/env.js";

const isVercel = process.env.VERCEL === "1";

/** @type {import("next").NextConfig} */
const config = {
  // Match stale Vercel "Output Directory" = react-stream-ai-assistant/dist
  ...(isVercel ? { distDir: "react-stream-ai-assistant/dist" } : {}),
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    // distDir on Vercel must not typecheck emitted build artifacts under that folder
    tsconfigPath: isVercel ? "tsconfig.build.json" : "tsconfig.json",
  },
};

export default config;
