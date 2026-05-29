import { Hono } from 'hono';
import { stream } from 'hono/streaming';

export const app = new Hono();

// ヘルパー関数: 指定ミリ秒待機する
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// メインルート: アクセスされた瞬間に直接順不同HTMLストリーミングを開始する
app.get('/', (c) => {
  c.header('Content-Type', 'text/html; charset=utf-8');
  c.header('Transfer-Encoding', 'chunked');

  return stream(c, async (streamInstance) => {
    // 1. メインのHTMLレイアウト、CSS、およびプレースホルダ（スケルトン）を即座に送信
    await streamInstance.write(`
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Declarative Partial Updates (Out-of-Order HTML Streaming)</title>
  <link rel="stylesheet" href="/style.css">
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;800&display=swap" rel="stylesheet">
</head>
<body>
  <div class="app-container">
    <header class="app-header">
      <div class="logo-area">
        <span class="logo-icon">⚡</span>
        <h1>Out-of-Order HTML Streaming</h1>
      </div>
      <p class="subtitle">JavaScript無効でも動作する、ブラウザのネイティブ順不同部分更新デモ</p>
    </header>

    <!-- コンテンツ表示エリア (プレースホルダ/スケルトン) -->
    <main class="dashboard-grid">
      <!-- ニュースフィードアイランド -->
      <section class="island-card glass">
        <h2>📰 ニュースフィード</h2>
        <div class="island-content">
          <?start name="feed-island"?>
          <div class="skeleton-loader">
            <div class="skeleton-text animate-pulse"></div>
            <div class="skeleton-text animate-pulse"></div>
            <div class="skeleton-text short animate-pulse"></div>
          </div>
          <?end?>
        </div>
      </section>
    </main>

    <footer class="app-footer">
      <p>Powered by Hono & Vercel Edge Runtime. Zero-JS Streaming Interface.</p>
    </footer>
  </div>
</body>
</html>
    `);

    // 2. ニュースフィードデータの送信 (1.5秒後)
    await sleep(1500);
    try {
      // Hacker News API からトップストーリーを取得
      const topStoriesRes = await fetch('https://hacker-news.firebaseio.com/v0/topstories.json');
      if (!topStoriesRes.ok) throw new Error(`HTTP error! status: ${topStoriesRes.status}`);
      const allIds = (await topStoriesRes.json()) as number[];
      
      // 上位3件を並行して取得
      const targetIds = allIds.slice(0, 3);
      const newsItems = await Promise.all(
        targetIds.map(async (id) => {
          try {
            const itemRes = await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`);
            if (!itemRes.ok) return null;
            return (await itemRes.json()) as { title: string; url: string; by: string; score: number };
          } catch {
            return null;
          }
        })
      );

      const itemsHtml = newsItems
        .filter((item): item is NonNullable<typeof item> => item !== null)
        .map((item) => `
          <div class="feed-item">
            <a href="${item.url || '#'}" target="_blank" rel="noopener noreferrer">
              <strong>${item.title}</strong>
            </a>
            <p>${item.score} points by ${item.by}</p>
          </div>
        `)
        .join('');

      await streamInstance.write(`
<template for="feed-island">
  <div class="feed-loaded animate-slide-up">
    ${itemsHtml}
  </div>
</template>
      `);
    } catch (e) {
      await streamInstance.write(`
<template for="feed-island">
  <div class="feed-loaded animate-slide-up">
    <div class="feed-item text-red-500">
      <strong>ニュースの取得に失敗しました</strong>
      <p>${(e as Error).message}</p>
    </div>
  </div>
</template>
      `);
    }


  });
});
