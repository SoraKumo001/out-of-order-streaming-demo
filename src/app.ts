import { Hono } from 'hono';
import { stream } from 'hono/streaming';
import fs from 'node:fs';
import path from 'node:path';

export const app = new Hono();

const htmlPath = path.join(process.cwd(), 'public', 'index.html');
const indexHtml = fs.readFileSync(htmlPath, 'utf-8');

// ヘルパー関数: 指定ミリ秒待機する
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// メインルート: アクセスされた瞬間に直接順不同HTMLストリーミングを開始する
app.get('/', (c) => {
  c.header('Content-Type', 'text/html; charset=utf-8');
  c.header('Transfer-Encoding', 'chunked');

  return stream(c, async (streamInstance) => {
    // 1. メインのHTMLレイアウト、CSS、およびプレースホルダ（スケルトン1枚のみ）を即座に送信
    await streamInstance.write(indexHtml);

    // 2. ニュースフィードデータのインクリメンタルな再帰送信 (300ms後)
    await sleep(300);
    try {
      // Hacker News API からトップストーリーを取得
      const topStoriesRes = await fetch('https://hacker-news.firebaseio.com/v0/topstories.json');
      if (!topStoriesRes.ok) throw new Error(`HTTP error! status: ${topStoriesRes.status}`);
      const allIds = (await topStoriesRes.json()) as number[];
      
      // 1ページ分 (30件) を順次フェッチして、1件ずつ追加していく
      const PAGE_SIZE = 30;
      const targetIds = allIds.slice(0, PAGE_SIZE);
      
      for (let i = 0; i < targetIds.length; i++) {
        const id = targetIds[i];
        
        try {
          const itemRes = await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`);
          if (!itemRes.ok) continue;
          const item = (await itemRes.json()) as { title: string; url: string; by: string; score: number };

          const isLast = i === targetIds.length - 1;
          // 最後のニュースでなければ、次のカードをアタッチするためのプレースホルダ（マーカー）を配置
          const nextMarker = isLast ? '' : '<?marker name="feed-island">';

          // 届いたニュースを section.island-card.glass (新規カード) としてストリーム出力
          await streamInstance.write(`
<template for="feed-island">
  <section class="island-card glass animate-slide-up">
    <div class="feed-item">
      <a href="${item.url || '#'}" target="_blank" rel="noopener noreferrer">
        <strong>${item.title}</strong>
      </a>
      <p>${item.score} points by ${item.by}</p>
    </div>
  </section>
  ${nextMarker}
</template>
          `);
        } catch (itemError) {
          console.error(`Error fetching HN item ${id}:`, itemError);
        }

        // 1件表示されるごとに、少しスリープを挟んで順次ロードされている様子を見せる
        if (i < targetIds.length - 1) {
          await sleep(200);
        }
      }

    } catch (e) {
      await streamInstance.write(`
<template for="feed-island">
  <section class="island-card glass animate-slide-up text-red-500">
    <div class="feed-item">
      <strong>ニュースの取得に失敗しました</strong>
      <p>${(e as Error).message}</p>
    </div>
  </section>
</template>
      `);
    }
  });
});
