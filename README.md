# Declarative Partial Updates (Out-of-Order HTML Streaming) デモ

本プロジェクトは、Chromeの実験的機能である **Declarative Partial Updates（順不同ストリーミング）** を利用し、クライアントサイドの JavaScript を一切使用せず（Zero-JS）に、遅延ロードとUIのインクリメンタルな動的追加を実現するデモアプリケーションです。

---

## 🚀 デモの仕組み

通常の SSR（サーバーサイドレンダリング）やストリーミングでは、HTMLは上から下へ順番に読み込まれて描画されます。

しかし、**Declarative Partial Updates** を利用すると、以下の流れで「順不同」かつ「動的」にパーツを差し込んだり、追加したりできます。

1. **スケルトンの即座描画**:
   - サーバーへのリクエスト直後に、ベースとなるHTML構造と、1件の読み込み中表示（スケルトン）を即座に返します。
2. **インクリメンタルなデータ注入**:
   - サーバー側で Hacker News API を呼び出してデータをフェッチしながら、準備ができた順（あるいは順次ループ）に HTML 内のテンプレートタグ `<template for="feed-island">` をストリームに書き込んでいきます。
3. **クライアントでの自動更新（Zero-JS）**:
   - ブラウザは受信した `<template for="feed-island">` を解釈し、対応するプレースホルダ（`<?start name="feed-island"?>`）の部分へ自動的に要素を差し替えます。
   - さらに、テンプレートの末尾に次のターゲットを示す `<?marker name="feed-island">` を含めて送信し続けることで、追加の JavaScript なしで**動的にニュースカードが次々と増殖し、自動的にレイアウトされる**再帰的な追加処理を実現しています。

---

## 🛠️ 技術スタック

- **Core Framework**: [Hono](https://hono.dev/) (ストリーミングAPIの活用)
- **Runtime**: Node.js & Vercel Edge Runtime (SSR/ストリーミング配信)
- **Styling**: Vanilla CSS (グラスモフィズムをあしらったモダンなダークテーマUI)
- **Build**: Vite (Vercel用エントリとローカル起動用エントリのマルチバンドル出力)
- **API**: Hacker News API (リアルタイムな30件の最新トピックを取得)

---

## ⚠️ 動作要件 (ブラウザの設定)

本デモ（順不同HTMLストリーミング）を正常に体験するためには、ブラウザで次のフラグを有効にする必要があります。

1. Chrome等のブラウザのアドレスバーに `chrome://flags/#enable-experimental-web-platform-features` を入力して開く。
2. **Experimental Web Platform features** を **Enabled** に変更する。
3. ブラウザを再起動する。

*(※有効化されていない場合、ストリーミング自体は行われますが、プレースホルダが順番に置換・追加されず、HTMLの末尾にテンプレートタグがそのまま解釈されずに蓄積されます。)*

---

## 📂 主要ファイル構成

- [public/index.html](file:///c:/prog/test/out-of-order-streaming/public/index.html)
  - アプリケーションのベースとなる HTML 構造。`<?start name="feed-island"?>` などの順不同テンプレートマークが記述されています。
- [src/app.ts](file:///c:/prog/test/out-of-order-streaming/src/app.ts)
  - アプリケーションのメインロジック。Hacker News API から最新ニュースを1ページ分（30件）取得し、`200ms` のディレイをかけながらインクリメンタルにテンプレートストリームを出力します。
- [src/index.ts](file:///c:/prog/test/out-of-order-streaming/src/index.ts)
  - ローカル開発サーバー起動用の Node.js エントリポイント。
- [src/vercel.ts](file:///c:/prog/test/out-of-order-streaming/src/vercel.ts)
  - Vercel Edge Runtime で動かすためのエクスポート用エントリポイント。
- [vite.config.ts](file:///c:/prog/test/out-of-order-streaming/vite.config.ts)
  - Viteのビルド設定。Vercel用の `dist/index.js` とローカル検証用の `dist/server.js` を同時にビルド・バンドルします。

---

## 🔧 開発と起動

### 1. 依存関係のインストール
```bash
pnpm install
```

### 2. 開発サーバーの起動 (HMR / ホットリロード対応)
```bash
pnpm run dev
```
起動後、 [http://localhost:3000](http://localhost:3000) にアクセスします。

### 3. 本番用ビルドの作成
```bash
pnpm run build
```
Vercel用エントリとローカルサーバー用エントリが `dist/` に書き出されます。

### 4. ビルド済みファイルの実行（本番同等検証）
```bash
pnpm run start
```
ビルドされた `dist/server.js` を使用して、プロダクション相当のローカルサーバーを起動します。
