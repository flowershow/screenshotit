const VALID_MODIFIERS = ['full', 'mobile', 'refresh', 'social'] as const;
export type Modifier = (typeof VALID_MODIFIERS)[number];

export interface ParsedRequest {
  targetUrl: string;
  modifiers: Modifier[];
}

export function parseRequest(path: string): ParsedRequest {
  // Remove leading slash
  let urlPart = path.startsWith('/') ? path.slice(1) : path;

  if (!urlPart) {
    throw new Error('No URL provided');
  }

  // Extract modifiers from the end
  const modifiers: Modifier[] = [];
  const parts = urlPart.split('@');
  urlPart = parts[0];

  for (let i = 1; i < parts.length; i++) {
    const mod = parts[i].toLowerCase();
    if (!VALID_MODIFIERS.includes(mod as Modifier)) {
      throw new Error(`Unknown modifier: @${parts[i]}`);
    }
    modifiers.push(mod as Modifier);
  }

  return {
    targetUrl: urlPart,
    modifiers,
  };
}

export function normalizeUrl(url: string): string {
  // Add protocol if missing
  let fullUrl = url;
  if (!fullUrl.startsWith('http://') && !fullUrl.startsWith('https://')) {
    fullUrl = 'https://' + fullUrl;
  }

  // Parse the URL
  const parsed = new URL(fullUrl);

  // Reconstruct without query/fragment, lowercase everything
  const protocol = parsed.protocol;
  const hostname = parsed.hostname.toLowerCase();
  const port = parsed.port ? `:${parsed.port}` : '';
  let pathname = decodeURIComponent(parsed.pathname).toLowerCase();

  // Remove trailing slash if it's just the root path
  if (pathname === '/') {
    pathname = '';
  }

  return `${protocol}//${hostname}${port}${pathname}`;
}

export function buildR2Key(
  normalizedUrl: string,
  modifiers: Modifier[],
  date?: string
): string {
  // Filter out refresh (it's not part of the storage key)
  const storageModifiers = modifiers.filter((m) => m !== 'refresh');

  // Sort modifiers alphabetically for consistent keys
  const modifierPart =
    storageModifiers.length > 0
      ? storageModifiers.sort().join('-')
      : 'default';

  const filename = date ? `${date}.png` : 'latest.png';

  return `screenshots/${normalizedUrl}/${modifierPart}/${filename}`;
}
