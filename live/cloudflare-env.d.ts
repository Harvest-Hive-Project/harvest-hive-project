declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
    PUBLIC_ORIGIN?: string;
    RATE_LIMIT_SECRET?: string;
    GITHUB_CLIENT_ID?: string;
  }
}
