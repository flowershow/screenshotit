// src/homepage.ts

/**
 * Renders the homepage HTML.
 * Clean, elegant design with monospace typography and animated hero.
 */
export function renderHomepage(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SCREENSHOT•IT</title>
  <meta name="description" content="Screenshot any webpage via URL. No API keys. No SDK. No dashboard.">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&display=swap" rel="stylesheet">
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
      padding: 48px 24px;
    }

    .site-name {
      font-size: 13px;
      font-weight: 500;
      letter-spacing: 2px;
      text-transform: uppercase;
      margin-bottom: 48px;
      color: #111;
    }

    /* Hero */
    .hero {
      margin-bottom: 64px;
    }

    .hero-typing {
      font-size: 18px;
      font-weight: 400;
      margin-bottom: 16px;
      min-height: 1.6em;
    }

    .hero-typing .cursor {
      display: inline-block;
      width: 2px;
      height: 1.1em;
      background: #111;
      margin-left: 2px;
      vertical-align: text-bottom;
      animation: blink 1s step-end infinite;
    }

    @keyframes blink {
      50% { opacity: 0; }
    }

    .hero-screenshot {
      opacity: 0;
      transform: translateY(8px);
      transition: opacity 0.4s ease, transform 0.4s ease;
    }

    .hero-screenshot.visible {
      opacity: 1;
      transform: translateY(0);
    }

    .hero-screenshot a {
      display: block;
    }

    .hero-screenshot img {
      width: 100%;
      height: auto;
      display: block;
      border: 1px solid #ddd;
    }

    .hero-tagline {
      font-size: 15px;
      color: #111;
      margin-bottom: 24px;
    }

    /* Sections */
    .section {
      margin-bottom: 56px;
    }

    .section-title {
      font-size: 15px;
      font-weight: 500;
      margin-bottom: 20px;
      color: #111;
    }

    .section-title .hash {
      color: #999;
      margin-right: 6px;
    }

    .section-desc {
      font-size: 14px;
      color: #666;
      margin-bottom: 16px;
    }

    /* API Examples */
    .api-pattern {
      font-size: 15px;
      margin-bottom: 24px;
      padding: 16px 20px;
      background: #f5f5f5;
      border: 1px solid #e0e0e0;
    }

    .api-pattern code {
      color: #111;
    }

    .api-examples {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .api-example {
      display: flex;
      align-items: baseline;
      gap: 16px;
      font-size: 14px;
      padding: 12px 0;
      border-bottom: 1px solid #eee;
    }

    .api-example:last-child {
      border-bottom: none;
    }

    .api-example a {
      color: #111;
      text-decoration: none;
      word-break: break-all;
    }

    .api-example a:hover {
      text-decoration: underline;
    }

    .api-example .arrow {
      color: #999;
      flex-shrink: 0;
    }

    .api-example .desc {
      color: #666;
      flex-shrink: 0;
    }

    /* Embed Section */
    .embed-tabs {
      display: flex;
      gap: 0;
      margin-bottom: 0;
    }

    .embed-tab {
      padding: 10px 20px;
      font-size: 13px;
      font-weight: 500;
      background: #f5f5f5;
      border: 1px solid #e0e0e0;
      border-bottom: none;
      cursor: pointer;
      font-family: inherit;
      color: #666;
      transition: background 0.15s, color 0.15s;
    }

    .embed-tab:first-child {
      border-radius: 4px 0 0 0;
    }

    .embed-tab:last-child {
      border-radius: 0 4px 0 0;
      border-left: none;
    }

    .embed-tab.active {
      background: #fff;
      color: #111;
      position: relative;
    }

    .embed-tab.active::after {
      content: '';
      position: absolute;
      bottom: -1px;
      left: 0;
      right: 0;
      height: 1px;
      background: #fff;
    }

    .embed-content {
      display: none;
      position: relative;
    }

    .embed-content.active {
      display: block;
    }

    .embed-code {
      background: #fff;
      border: 1px solid #e0e0e0;
      border-radius: 0 4px 4px 4px;
      padding: 16px 20px;
      padding-right: 100px;
      font-size: 13px;
      overflow-x: auto;
      white-space: pre-wrap;
      word-break: break-all;
    }

    .copy-btn {
      position: absolute;
      top: 12px;
      right: 12px;
      padding: 6px 12px;
      font-size: 12px;
      font-family: inherit;
      background: #f5f5f5;
      border: 1px solid #ddd;
      border-radius: 4px;
      cursor: pointer;
      transition: background 0.15s;
    }

    .copy-btn:hover {
      background: #eee;
    }

    .copy-btn.copied {
      background: #111;
      color: #fff;
      border-color: #111;
    }

    .embed-note {
      font-size: 13px;
      color: #666;
      margin-top: 16px;
    }

    /* Footer */
    hr {
      border: none;
      border-top: 1px solid #e0e0e0;
      margin: 48px 0;
    }

    .footer {
      font-size: 13px;
      color: #888;
    }

    @media (max-width: 600px) {
      .container {
        padding: 32px 20px;
      }

      .hero-typing {
        font-size: 16px;
      }

      .api-example {
        flex-direction: column;
        gap: 4px;
      }

      .api-example .arrow {
        display: none;
      }

      .embed-code {
        padding-right: 20px;
        padding-bottom: 50px;
      }

      .copy-btn {
        top: auto;
        bottom: 12px;
        right: 12px;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="site-name">Screenshot•It</div>

    <div class="hero">
      <div class="hero-typing">
        <span class="typed-text"></span><span class="cursor"></span>
      </div>

      <p class="hero-tagline">The URL is the screenshot.</p>

      <div class="hero-screenshot" id="hero-screenshot">
        <a href="https://linear.app" target="_blank" rel="noopener">
          <img src="/https://linear.app" alt="Screenshot of linear.app">
        </a>
      </div>
    </div>

    <div class="section">
      <div class="section-title"><span class="hash">##</span>API</div>
      <div class="api-pattern">
        <code>screenshotit.app/<strong>{url}</strong></code>
      </div>
      <div class="api-examples">
        <div class="api-example">
          <a href="/https://example.com">screenshotit.app/example.com</a>
          <span class="arrow">→</span>
          <span class="desc">Default viewport</span>
        </div>
        <div class="api-example">
          <a href="/https://example.com@full">screenshotit.app/example.com@full</a>
          <span class="arrow">→</span>
          <span class="desc">Full page</span>
        </div>
        <div class="api-example">
          <a href="/https://example.com@mobile">screenshotit.app/example.com@mobile</a>
          <span class="arrow">→</span>
          <span class="desc">Mobile (390×844)</span>
        </div>
        <div class="api-example">
          <a href="/https://example.com@full@mobile">screenshotit.app/example.com@full@mobile</a>
          <span class="arrow">→</span>
          <span class="desc">Combine modifiers</span>
        </div>
        <div class="api-example">
          <a href="/https://example.com@refresh">screenshotit.app/example.com@refresh</a>
          <span class="arrow">→</span>
          <span class="desc">Force fresh capture</span>
        </div>
      </div>
    </div>

    <div class="section">
      <div class="section-title"><span class="hash">##</span>Embed anywhere</div>
      <p class="section-desc">No need to use an app or take a screenshot. Just use the URL.</p>

      <div class="embed-tabs">
        <button class="embed-tab active" data-tab="markdown">Markdown</button>
        <button class="embed-tab" data-tab="html">HTML</button>
      </div>

      <div class="embed-content active" id="tab-markdown">
        <div class="embed-code">![](https://screenshotit.app/example.com)</div>
        <button class="copy-btn" data-copy="![](https://screenshotit.app/example.com)">Copy</button>
      </div>

      <div class="embed-content" id="tab-html">
        <div class="embed-code">&lt;img src="https://screenshotit.app/example.com" alt="Screenshot"&gt;</div>
        <button class="copy-btn" data-copy='<img src="https://screenshotit.app/example.com" alt="Screenshot">'>Copy</button>
      </div>

      <p class="embed-note">Works in GitHub READMEs, Markdown, HTML, wikis, blogs, docs—anywhere images render.</p>
    </div>

    <hr>

    <div class="footer">
      Built on Cloudflare. Cached forever.
    </div>
  </div>

  <script>
    // Typing animation
    const text = 'screenshotit.app/linear.app';
    const typedEl = document.querySelector('.typed-text');
    const screenshotEl = document.getElementById('hero-screenshot');
    let i = 0;

    function type() {
      if (i < text.length) {
        typedEl.textContent += text.charAt(i);
        i++;
        setTimeout(type, 50);
      } else {
        // Show screenshot after typing completes
        setTimeout(() => {
          screenshotEl.classList.add('visible');
        }, 300);
      }
    }

    // Start typing after a brief delay
    setTimeout(type, 500);

    // Tab switching
    document.querySelectorAll('.embed-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.embed-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.embed-content').forEach(c => c.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById('tab-' + tab.dataset.tab).classList.add('active');
      });
    });

    // Copy buttons
    document.querySelectorAll('.copy-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        await navigator.clipboard.writeText(btn.dataset.copy);
        btn.textContent = 'Copied!';
        btn.classList.add('copied');
        setTimeout(() => {
          btn.textContent = 'Copy';
          btn.classList.remove('copied');
        }, 2000);
      });
    });
  </script>
</body>
</html>`;
}
