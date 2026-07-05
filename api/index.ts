import serverless from "serverless-http";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const appModule = require("../nodejs-ai-assistant/dist/app");
const app = appModule.default;
const scheduleYouTubeWarmup = appModule.scheduleYouTubeWarmup as
  | (() => void)
  | undefined;

if (scheduleYouTubeWarmup) {
  scheduleYouTubeWarmup();
}

export default serverless(app);

export const config = {
  maxDuration: 60,
};
