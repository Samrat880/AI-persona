import fs from "node:fs";
import path from "node:path";

const root = path.join(import.meta.dirname, "..");
const configPath = path.join(root, "config.ts");
const src = fs.readFileSync(configPath, "utf8");

function extractPrompt(id) {
  const marker = `${id}: {`;
  const start = src.indexOf(marker);
  if (start === -1) throw new Error(`Persona block not found: ${id}`);

  const promptStart = src.indexOf("systemPrompt: `", start);
  if (promptStart === -1) throw new Error(`systemPrompt not found: ${id}`);

  const contentStart = promptStart + "systemPrompt: `".length;
  let i = contentStart;
  while (i < src.length) {
    if (src[i] === "`" && src[i - 1] !== "\\") {
      return src.slice(contentStart, i);
    }
    i++;
  }
  throw new Error(`Unterminated prompt: ${id}`);
}

for (const id of ["hitesh", "piyush"]) {
  const prompt = extractPrompt(id);
  const outDir = path.join(root, id);
  fs.mkdirSync(outDir, { recursive: true });
  const file = `import { personaPromptSchema } from "../schema";

const prompt = ${JSON.stringify(prompt)};

export const systemPrompt = personaPromptSchema.parse({
  systemPrompt: prompt,
}).systemPrompt;
`;
  fs.writeFileSync(path.join(outDir, "prompt.ts"), file);
  console.log(`Wrote ${id}/prompt.ts (${prompt.length} chars)`);
}
