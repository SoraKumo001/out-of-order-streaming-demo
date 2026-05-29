import { handle } from 'hono/vercel';
import { app } from './app.js';

export const config = {
  runtime: 'edge', // Edge Runtime を有効にしてストリーミングを最適化
};

export default handle(app);
