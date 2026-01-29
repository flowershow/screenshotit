import { describe, it, expect } from 'vitest';
import { getViewportConfig, ViewportConfig } from './screenshot';

describe('getViewportConfig', () => {
  it('returns desktop config by default', () => {
    const config = getViewportConfig([]);
    expect(config.width).toBe(1280);
    expect(config.height).toBe(800);
    expect(config.deviceScaleFactor).toBe(2);
    expect(config.fullPage).toBe(false);
  });

  it('returns mobile config with mobile modifier', () => {
    const config = getViewportConfig(['mobile']);
    expect(config.width).toBe(390);
    expect(config.height).toBe(844);
  });

  it('sets fullPage with full modifier', () => {
    const config = getViewportConfig(['full']);
    expect(config.fullPage).toBe(true);
    expect(config.width).toBe(1280);
  });

  it('combines mobile and full', () => {
    const config = getViewportConfig(['mobile', 'full']);
    expect(config.width).toBe(390);
    expect(config.fullPage).toBe(true);
  });
});
