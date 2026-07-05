import serverless from "serverless-http";
// Built by `npm run build` in nodejs-ai-assistant before this function is bundled
// eslint-disable-next-line @typescript-eslint/no-require-imports
const app = require("../nodejs-ai-assistant/dist/app").default;

export default serverless(app);

export const config = {
  maxDuration: 300,
};
