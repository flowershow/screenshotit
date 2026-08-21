const USERNAME_PATTERN = /^(?!-)(?!.*--)[a-z0-9-]{1,39}(?<!-)$/;
const RESERVED_USERNAMES = new Set(['api', 'auth', 'dashboard']);

export interface AccountRoute {
  username: string;
  screenshotPath: string;
}

export function normalizeUsername(value: string): string {
  const username = value.toLowerCase();
  if (!USERNAME_PATTERN.test(username)) {
    throw new Error('Invalid username');
  }
  if (RESERVED_USERNAMES.has(username)) {
    throw new Error('Username is reserved');
  }
  return username;
}

export function parseAccountRoute(pathname: string): AccountRoute | null {
  const match = pathname.match(/^\/@([^/]+)(\/.*)?$/);
  if (!match) {
    return null;
  }

  const username = normalizeUsername(match[1]);
  const screenshotPath = match[2];
  if (!screenshotPath || screenshotPath === '/') {
    throw new Error('No URL provided');
  }

  return { username, screenshotPath };
}
