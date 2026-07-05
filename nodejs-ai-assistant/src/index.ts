import "dotenv/config";
import app, { scheduleYouTubeWarmup } from "./app";
import { warmupYouTubeChannels } from "./services/youtubeSearch";

const port = process.env.PORT || 3000;

app.listen(port, async () => {
  console.log(`Server is running on http://localhost:${port}`);
  await warmupYouTubeChannels();
});
