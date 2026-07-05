import serverless from "serverless-http";
import app from "../nodejs-ai-assistant/src/app";

const handler = serverless(app);

export default handler;

export const config = {
  maxDuration: 300,
};
