import { Hono } from 'hono';
import { stream } from 'hono/streaming';

export const app = new Hono();

const indexHtml = `<!DOCTYPE html>
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
      <p class="subtitle">JavaScript無効でも動作する、ブラウザのネイティブ順不在部分更新デモ</p>

      <div class="warning-banner">
        ⚠️ 本デモ（順不同ストリーミング）の動作には、Chrome等のブラウザで <code>chrome://flags/#enable-experimental-web-platform-features</code> を有効化する必要があります。
      </div>
    </header>

    <main class="dashboard-grid">
      <?start name="feed-island"?>
      <section class="island-card glass">
        <div class="skeleton-loader">
          <div class="skeleton-text animate-pulse"></div>
          <div class="skeleton-text short animate-pulse"></div>
        </div>
      </section>
      <?end?>
    </main>

    <footer class="app-footer">
      <p>Powered by Hono & Vercel Edge Runtime. Zero-JS Streaming Interface.</p>
    </footer>
  </div>
</body>
</html>`;

// ヘルパー関数: 指定ミリ秒待機する
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type HackerNewsItem = {
  title?: string;
  url?: string;
  by?: string;
  score?: number;
  descendants?: number;
  time?: number;
};

const escapeHtml = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

const getSafeUrl = (url?: string) => {
  if (!url) return '#';

  try {
    const parsedUrl = new URL(url);
    return parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:' ? parsedUrl.href : '#';
  } catch {
    return '#';
  }
};

const getHostname = (url?: string) => {
  try {
    return url ? new URL(url).hostname.replace(/^www\./, '') : 'news.ycombinator.com';
  } catch {
    return 'news.ycombinator.com';
  }
};

const formatRelativeTime = (unixTime?: number) => {
  if (!unixTime) return 'unknown time';

  const diffSeconds = Math.max(0, Math.floor(Date.now() / 1000 - unixTime));
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) return `${diffDays}d ago`;
  if (diffHours > 0) return `${diffHours}h ago`;
  if (diffMinutes > 0) return `${diffMinutes}m ago`;
  return 'just now';
};

// メインルート: アクセスされた瞬間に直接順不同HTMLストリーミングを開始する
app.get('/', (c) => {
  c.header('Content-Type', 'text/html; charset=utf-8');

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
          const item = (await itemRes.json()) as HackerNewsItem;

          const isLast = i === targetIds.length - 1;
          // 最後のニュースでなければ、次のカードをアタッチするためのプレースホルダ（マーカー）を配置
          const nextMarker = isLast ? '' : '<?marker name="feed-island">';
          const safeUrl = getSafeUrl(item.url);
          const hostname = getHostname(item.url);
          const title = item.title || 'Untitled story';
          const author = item.by || 'unknown';
          const score = item.score ?? 0;
          const comments = item.descendants ?? 0;
          const postedAt = formatRelativeTime(item.time);

          // 届いたニュースを section.island-card.glass (新規カード) としてストリーム出力
          await streamInstance.write(`
<template for="feed-island">
  <section class="island-card glass animate-slide-up">
    <div class="feed-item">
      <a class="feed-title" href="${escapeHtml(safeUrl)}" target="_blank" rel="noopener noreferrer">
        <strong>${escapeHtml(title)}</strong>
      </a>
      <div class="feed-domain">${escapeHtml(hostname)}</div>
      <dl class="feed-meta">
        <div>
          <dt>Score</dt>
          <dd>${score}</dd>
        </div>
        <div>
          <dt>Comments</dt>
          <dd>${comments}</dd>
        </div>
        <div>
          <dt>Author</dt>
          <dd>${escapeHtml(author)}</dd>
        </div>
        <div>
          <dt>Posted</dt>
          <dd>${postedAt}</dd>
        </div>
      </dl>
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
