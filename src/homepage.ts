// src/homepage.ts

/**
 * Renders the homepage HTML.
 * Clean, elegant design with monospace typography and a hero screenshot.
 */
export function renderHomepage(): string {
  // Could rotate these in the future
  const heroUrl = 'https://linear.app';
  const heroAlt = 'Screenshot of linear.app';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ScreenshotIt</title>
  <meta name="description" content="Screenshot any webpage via URL. No API keys. No SDK. No dashboard.">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'IBM Plex Mono', 'SF Mono', 'Menlo', 'Consolas', monospace;
      background: #fafafa;
      color: #111;
      line-height: 1.6;
      -webkit-font-smoothing: antialiased;
    }

    .container {
      max-width: 720px;
      margin: 0 auto;
      padding: 80px 24px;
    }

    .site-name {
      font-size: 13px;
      font-weight: 500;
      letter-spacing: 2px;
      text-transform: uppercase;
      margin-bottom: 48px;
      color: #111;
    }

    .hero-url {
      font-size: 18px;
      font-weight: 400;
      margin-bottom: 32px;
      word-break: break-all;
    }

    .hero-url a {
      color: inherit;
      text-decoration: none;
    }

    .hero-url a:hover {
      text-decoration: underline;
    }

    .screenshot-frame {
      margin-bottom: 48px;
    }

    .screenshot-frame a {
      display: block;
    }

    .screenshot-frame img {
      width: 100%;
      height: auto;
      display: block;
      border: 2px solid #111;
    }

    .tagline {
      font-size: 15px;
      margin-bottom: 8px;
    }

    .subtext {
      font-size: 14px;
      color: #666;
      margin-bottom: 48px;
    }

    .section-title {
      font-size: 12px;
      font-weight: 500;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      margin-bottom: 16px;
      color: #666;
    }

    .code-block {
      background: #f0f0f0;
      border: 1px solid #ddd;
      padding: 14px 18px;
      font-size: 14px;
      margin-bottom: 48px;
      overflow-x: auto;
    }

    .modifiers {
      margin-bottom: 48px;
    }

    .modifier {
      display: flex;
      gap: 24px;
      font-size: 14px;
      padding: 8px 0;
      border-bottom: 1px solid #eee;
    }

    .modifier:last-child {
      border-bottom: none;
    }

    .modifier-name {
      font-weight: 500;
      min-width: 100px;
    }

    .modifier-desc {
      color: #666;
    }

    .example {
      font-size: 14px;
      margin-bottom: 48px;
    }

    .example-label {
      color: #666;
      margin-bottom: 8px;
    }

    hr {
      border: none;
      border-top: 1px solid #ddd;
      margin: 48px 0;
    }

    .footer {
      font-size: 13px;
      color: #888;
    }

    @media (max-width: 600px) {
      .container {
        padding: 48px 20px;
      }

      .hero-url {
        font-size: 16px;
      }

      .modifier {
        flex-direction: column;
        gap: 4px;
      }

      .modifier-name {
        min-width: auto;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="site-name">ScreenshotIt</div>

    <div class="hero-url">
      <a href="/${heroUrl}">screenshotit.app/${heroUrl.replace('https://', '')}</a>
    </div>

    <div class="screenshot-frame">
      <a href="${heroUrl}" target="_blank" rel="noopener">
        <img src="/${heroUrl}" alt="${heroAlt}" loading="lazy">
      </a>
    </div>

    <p class="tagline">The URL is the API.</p>
    <p class="subtext">No keys. No SDK. No dashboard.</p>

    <div class="section-title">Embed anywhere</div>
    <div class="code-block">![](https://screenshotit.app/${heroUrl.replace('https://', '')})</div>

    <div class="section-title">Modifiers</div>
    <div class="modifiers">
      <div class="modifier">
        <span class="modifier-name">@full</span>
        <span class="modifier-desc">Full page screenshot</span>
      </div>
      <div class="modifier">
        <span class="modifier-name">@mobile</span>
        <span class="modifier-desc">Mobile viewport (390 × 844)</span>
      </div>
      <div class="modifier">
        <span class="modifier-name">@refresh</span>
        <span class="modifier-desc">Force fresh capture</span>
      </div>
    </div>

    <div class="example">
      <div class="example-label">Combine them:</div>
      <div>screenshotit.app/example.com@full@mobile</div>
    </div>

    <hr>

    <div class="footer">
      Built on Cloudflare. Cached forever.
    </div>
  </div>
</body>
</html>`;
}
