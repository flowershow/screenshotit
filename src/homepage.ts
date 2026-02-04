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
  <title>SCREENSHOT•IT by Datopian</title>
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

    .site-header {
      margin-bottom: 48px;
    }

    .site-name {
      font-size: 18px;
      font-weight: 500;
      letter-spacing: 2px;
      text-transform: uppercase;
      color: #111;
      margin-bottom: 6px;
    }

    .site-tagline {
      font-size: 14px;
      color: #111;
      margin-bottom: 8px;
    }

    .site-credit {
      font-size: 13px;
      color: #888;
    }

    .site-credit a {
      color: #888;
      text-decoration: none;
    }

    .site-credit a:hover {
      text-decoration: underline;
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

    .footer a {
      color: #888;
      text-decoration: none;
    }

    .footer a:hover {
      text-decoration: underline;
    }

    .footer-love {
      margin-top: 32px;
      padding-top: 32px;
      border-top: 1px solid #e0e0e0;
    }

    .footer-love-title {
      font-size: 16px;
      font-weight: 500;
      color: #111;
      margin-bottom: 12px;
    }

    .footer-love-desc {
      font-size: 14px;
      color: #666;
      line-height: 1.7;
      margin-bottom: 24px;
    }

    .footer-links {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
    }

    .footer-btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 10px 16px;
      font-size: 14px;
      font-family: inherit;
      text-decoration: none;
      border-radius: 6px;
      transition: background 0.15s;
    }

    .footer-btn-primary {
      background: #111;
      color: #fff;
      border: 1px solid #111;
    }

    .footer-btn-primary:hover {
      background: #333;
      text-decoration: none;
    }

    .footer-btn-secondary {
      background: #fff;
      color: #111;
      border: 1px solid #ddd;
    }

    .footer-btn-secondary:hover {
      background: #f5f5f5;
      text-decoration: none;
    }

    .footer-btn svg {
      width: 16px;
      height: 16px;
    }

    .footer-btn .arrow {
      font-size: 12px;
    }

    .footer-bottom {
      margin-top: 48px;
      padding-top: 24px;
      border-top: 1px solid #e0e0e0;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .footer-bottom-left {
      font-size: 13px;
      color: #888;
    }

    .footer-bottom-right {
      display: flex;
      gap: 24px;
      font-size: 13px;
    }

    .footer-bottom-right a {
      color: #888;
      text-decoration: none;
    }

    .footer-bottom-right a:hover {
      color: #111;
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
    <div class="site-header">
      <div class="site-name">Screenshot•It</div>
      <div class="site-tagline">The URL is the screenshot.</div>
      <div class="site-credit">by <a href="https://datopian.com/">Datopian</a></div>
    </div>

    <div class="hero">
      <div class="hero-typing">
        <span class="typed-text"></span><span class="cursor"></span>
      </div>

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
      <div class="footer-love">
        <div class="footer-love-title">With love from <a href="https://datopian.com/">Datopian</a></div>
        <div class="footer-love-desc">Collectively, our team brings over 50 years of expertise designing, building, and scaling the world's leading data portals and infrastructure.</div>
        <div class="footer-links">
          <a href="https://discord.gg/8KvAeFV" class="footer-btn footer-btn-primary" target="_blank" rel="noopener">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>
            Join Discord
            <span class="arrow">↗</span>
          </a>
          <a href="https://github.com/flowershow/screenshotit" class="footer-btn footer-btn-secondary" target="_blank" rel="noopener">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
            View on GitHub
            <span class="arrow">↗</span>
          </a>
        </div>
      </div>

      <div class="footer-bottom">
        <div class="footer-bottom-left">Screenshot•It</div>
        <div class="footer-bottom-right">
          <a href="https://datopian.com/">Datopian</a>
          <a href="https://github.com/flowershow/screenshotit">GitHub</a>
        </div>
      </div>
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
