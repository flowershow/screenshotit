// Secret bindings are configured with `wrangler secret put` and therefore are
// not present in the generated worker-configuration.d.ts file.
interface Env {
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
}
