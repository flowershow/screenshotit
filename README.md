Screenshots as URLs.

Want a screenshot of a page for any reason? Just drop a link. Get a clean, browser-faithful screenshot. Instantly embeddable. Cached forever.

One-sentence value proposition
This is the simplest way to clip the web: turn any page into a stable image just using the URL.

Most screenshot tools are dashboards, APIs, or workflows you have to integrate. This is different. Here, the screenshot *is the URL*.

You paste a link like:

`screenshot.app/https://example.com`

and you get a real-browser screenshot you can embed anywhere—Markdown, blogs, wikis, notes, docs, or posts—without setup, SDKs, or UI.

It’s designed for writers, researchers, publishers, and builders who want web clippings that just work: no copy-paste, no manual uploads, no broken embeds when pages change.

What makes it different
• URL-native: screenshots are addressable resources, not files you manage
• Embed-first: made for Markdown, static sites, wikis, and notes
• Stable by default: cached, immutable, and safe to reference long-term
• Opinionated defaults: clean, above-the-fold captures without tweaking
• Zero workflow: paste once, done forever

What it’s for
• Clipping references into essays, research notes, or white papers
• Capturing homepage or hero states for documentation
• Creating visual previews in Markdown-based sites
• Preserving how a page looked *at the moment you cited it*

What it's not
It's not a screenshot editor, a dashboard, or a testing suite.
It's a primitive: **the web → image, via URL**.

## Modifiers

Append modifiers with `@` to customize screenshots:

```
screenshot.app/https://example.com@full      # Full page
screenshot.app/https://example.com@mobile    # Mobile viewport
screenshot.app/https://example.com@refresh   # Force fresh capture
screenshot.app/https://example.com@full@mobile  # Combine them
```

## Development

**Prerequisites:**
- Node.js 18+
- Cloudflare account (free tier works for development)

**Setup:**

```bash
npm install
```

**Run locally:**

```bash
npm run dev
```

Note: Browser Rendering API doesn't work in local mode. Use `wrangler dev --remote` to test against Cloudflare's infrastructure (requires authentication).

**Run tests:**

```bash
npm test
```

## Deployment

### One-time Setup

1. **Login to Cloudflare:**
   ```bash
   npx wrangler login
   ```

2. **Create R2 bucket:**
   ```bash
   npx wrangler r2 bucket create screenshots
   ```

3. **Enable Browser Rendering API:**
   - Go to Cloudflare Dashboard → Workers & Pages → your account
   - Browser Rendering requires a paid Workers plan ($5/month)

### Deploy

```bash
npm run deploy
```

This deploys to `screenshot-worker.<your-subdomain>.workers.dev`.

### Custom Domain

To use a custom domain like `screenshot.app`:

1. Add domain to Cloudflare (DNS must be on Cloudflare)
2. Go to Workers & Pages → screenshot-worker → Settings → Triggers
3. Add custom domain

## Auto-Deploy with GitHub

Cloudflare can deploy automatically when you push to GitHub:

1. Go to Cloudflare Dashboard → Workers & Pages → Create
2. Select "Connect to Git" and authorize GitHub
3. Select your repository
4. Configure build settings:
   - Build command: `npm install`
   - Deploy command: `npx wrangler deploy`
5. Deploy

Now every push to `main` automatically deploys.

## Architecture

Built on Cloudflare's edge infrastructure:

- **Worker** - Request handling, URL parsing, caching logic
- **Browser Rendering API** - Headless Chromium for screenshots
- **R2** - Object storage for cached screenshots

