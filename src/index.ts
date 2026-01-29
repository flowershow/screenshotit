export interface Env {
  SCREENSHOTS: R2Bucket;
  BROWSER: Fetcher;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    return new Response('Screenshot service running');
  },
};
