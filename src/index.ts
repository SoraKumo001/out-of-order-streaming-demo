import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { app } from './app.js';

// ローカル開発用に静的アセット（CSS）配信ミドルウェアをアタッチ
app.use('/*', serveStatic({ root: './public' }));

const port = 3000;
console.log(`Local development server is running on http://localhost:${port}`);

serve({
  fetch: app.fetch,
  port
});
