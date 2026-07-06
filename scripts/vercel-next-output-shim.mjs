import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Vercel project settings may still expect the legacy Vite output path
 * `react-stream-ai-assistant/dist`. After `next build`, link that path to `.next`
 * so deployments succeed until dashboard Output Directory is cleared.
 */
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const nextDir = path.join(root, ".next");
const legacyDir = path.join(root, "react-stream-ai-assistant", "dist");

if (!fs.existsSync(nextDir)) {
  console.error("vercel-next-output-shim: .next not found after build");
  process.exit(1);
}

fs.mkdirSync(path.join(root, "react-stream-ai-assistant"), { recursive: true });

if (fs.existsSync(legacyDir)) {
  const stat = fs.lstatSync(legacyDir);
  if (stat.isSymbolicLink() || stat.isDirectory()) {
    fs.rmSync(legacyDir, { recursive: true, force: true });
  }
}

const relativeNext = path.relative(path.dirname(legacyDir), nextDir);
fs.symlinkSync(relativeNext, legacyDir, "dir");
console.log(`vercel-next-output-shim: ${legacyDir} -> ${relativeNext}`);
