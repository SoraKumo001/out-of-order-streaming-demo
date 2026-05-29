# Out-of-Order HTML Streaming Demo

Declarative Partial Updates を使って、クライアント JavaScript なしで HTML を順次差し込むデモです。

最初にページの骨組みとスケルトン UI を返し、そのあとサーバー側で Hacker News API から取得した記事を HTML のストリームとして少しずつ送ります。対応ブラウザでは、届いた `<template for="feed-island">` が `<?start name="feed-island"?>` の位置に差し込まれ、ニュースカードが順番に追加されます。

## できること

- JavaScript なしで、読み込み中 UI から実データへ更新する
- HTML ストリーミングでニュースカードを段階的に表示する
- Hono の同じアプリ本体を、ローカル Node.js と Vercel Edge Function の両方で動かす

## 注意点

このデモは Chrome の実験的な Web Platform 機能に依存しています。

正しく動作を見るには、Chrome 系ブラウザで次の設定を有効にしてください。

1. `chrome://flags/#enable-experimental-web-platform-features` を開く
2. **Experimental Web Platform features** を **Enabled** にする
3. ブラウザを再起動する

この設定が無効な場合でも HTML ストリーミング自体は行われますが、ブラウザが Declarative Partial Updates として解釈しないため、テンプレートが期待通りに差し込まれないことがあります。

## 技術構成

- Hono
- Vercel Edge Function
- Node.js local server
- TypeScript
- Vanilla CSS
- Hacker News API

## ファイル構成

- [api/index.ts](./api/index.ts)  
  Vercel Edge Function の入口です。`src/app.ts` の Hono アプリを Vercel 用 handler として公開します。

- [src/app.ts](./src/app.ts)  
  アプリ本体です。トップページの HTML を返し、その後 Hacker News の記事を `<template for="feed-island">` としてストリーム送信します。

- [src/index.ts](./src/index.ts)  
  ローカル開発用の Node.js サーバーです。`public/` 配下の静的ファイルも配信します。

- [public/style.css](./public/style.css)  
  画面のスタイルです。

- [vercel.json](./vercel.json)  
  `/` へのアクセスを Vercel Function の `/api/index` に転送します。CSS などの静的ファイルは `public/` から配信されます。

## ローカルで動かす

依存関係をインストールします。

```bash
pnpm install
```

開発サーバーを起動します。

```bash
pnpm dev
```

起動後、[http://localhost:3000](http://localhost:3000) を開きます。

## ビルド確認

```bash
pnpm build
```

このコマンドは TypeScript の型チェックを行います。Vercel では `api/index.ts` が Function としてビルドされるため、アプリ用の `dist/` は生成しません。

## Vercel にデプロイする

Vercel にリポジトリを接続してデプロイします。Framework Preset は **Other** のままで問題ありません。

このリポジトリは `pnpm-lock.yaml` を含んでいるため、Vercel では pnpm プロジェクトとして扱われます。

基本設定:

- Install Command: `pnpm install`
- Build Command: `pnpm build`
- Output Directory: 空欄

Vercel は `api/index.ts` を Edge Function として扱い、`vercel.json` の rewrite によりトップページ `/` でアプリが表示されます。

CLI からデプロイする場合は、ログイン後に実行します。

```bash
vercel login
vercel
```

本番へ反映する場合:

```bash
vercel --prod
```
