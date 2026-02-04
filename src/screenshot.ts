// src/screenshot.ts
import puppeteer from '@cloudflare/puppeteer';

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
  browserBinding: Fetcher,
  options: CaptureOptions
): Promise<Uint8Array> {
  // Launch browser using Cloudflare's Browser Rendering API
  const browser = await puppeteer.launch(browserBinding);

  try {
    const page = await browser.newPage();

    // Set viewport
    await page.setViewport({
      width: options.viewport.width,
      height: options.viewport.height,
      deviceScaleFactor: options.viewport.deviceScaleFactor,
    });

    // Navigate to URL and wait for network to settle
    await page.goto(options.url, {
      waitUntil: 'networkidle2',
      timeout: 30000,
    });

    // Small delay for fonts/animations to settle
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Take screenshot
    const screenshot = await page.screenshot({
      type: 'png',
      fullPage: options.viewport.fullPage,
    });

    return new Uint8Array(screenshot);
  } finally {
    await browser.close();
  }
}
