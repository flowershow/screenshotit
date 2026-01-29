// src/screenshot.ts
export interface ViewportConfig {
  width: number;
  height: number;
  deviceScaleFactor: number;
  fullPage: boolean;
}

type Modifier = 'full' | 'mobile' | 'refresh';

export function getViewportConfig(modifiers: Modifier[]): ViewportConfig {
  const isMobile = modifiers.includes('mobile');
  const isFullPage = modifiers.includes('full');

  return {
    width: isMobile ? 390 : 1280,
    height: isMobile ? 844 : 800,
    deviceScaleFactor: 2,
    fullPage: isFullPage,
  };
}

export interface CaptureOptions {
  url: string;
  viewport: ViewportConfig;
}

export async function captureScreenshot(
  browser: Fetcher,
  options: CaptureOptions
): Promise<Uint8Array> {
  // Cloudflare Browser Rendering API endpoint
  const browserEndpoint = 'https://browser.cloudflare.com';

  const response = await browser.fetch(browserEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url: options.url,
      viewport: {
        width: options.viewport.width,
        height: options.viewport.height,
        deviceScaleFactor: options.viewport.deviceScaleFactor,
      },
      screenshotOptions: {
        type: 'png',
        fullPage: options.viewport.fullPage,
      },
      waitUntil: 'networkidle0',
      timeout: 30000,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Screenshot failed: ${error}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return new Uint8Array(arrayBuffer);
}
