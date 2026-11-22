import app from './app.js';
import { env } from './config.js';
app.listen(env.port, () =>
  console.log(`MentorLagbe API running on http://localhost:${env.port}`),
);
