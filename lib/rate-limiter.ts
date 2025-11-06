/**
 * Token bucket rate limiter for controlling API call rates
 * Useful for preventing API overuse and unexpected costs
 */

export interface RateLimiterConfig {
  maxTokens: number; // Maximum tokens in bucket
  tokensPerSecond: number; // Refill rate
  name?: string; // Identifier for logging
}

export class RateLimiter {
  private tokens: number;
  private lastRefillTime: number;
  private maxTokens: number;
  private tokensPerSecond: number;
  private name: string;

  constructor(config: RateLimiterConfig) {
    this.maxTokens = config.maxTokens;
    this.tokensPerSecond = config.tokensPerSecond;
    this.tokens = config.maxTokens; // Start with full bucket
    this.lastRefillTime = Date.now();
    this.name = config.name || 'RateLimiter';
  }

  /**
   * Try to consume tokens. Returns true if successful, false if rate limited.
   */
  async tryConsume(tokens: number = 1): Promise<boolean> {
    this.refill();

    if (this.tokens >= tokens) {
      this.tokens -= tokens;
      return true;
    }

    return false;
  }

  /**
   * Wait until tokens are available and consume them.
   * Useful for non-critical operations that can wait.
   */
  async consume(tokens: number = 1): Promise<void> {
    while (!(await this.tryConsume(tokens))) {
      const waitTime = this.getWaitTime(tokens);
      console.log(`[${this.name}] Rate limited. Waiting ${waitTime}ms...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      this.refill();
    }
  }

  /**
   * Get current tokens available
   */
  getAvailableTokens(): number {
    this.refill();
    return Math.floor(this.tokens);
  }

  /**
   * Get estimated wait time to consume tokens
   */
  getWaitTime(tokens: number = 1): number {
    this.refill();
    if (this.tokens >= tokens) return 0;

    const tokensNeeded = tokens - this.tokens;
    const secondsNeeded = tokensNeeded / this.tokensPerSecond;
    return Math.ceil(secondsNeeded * 1000);
  }

  /**
   * Reset rate limiter
   */
  reset(): void {
    this.tokens = this.maxTokens;
    this.lastRefillTime = Date.now();
  }

  /**
   * Refill tokens based on elapsed time
   */
  private refill(): void {
    const now = Date.now();
    const elapsedSeconds = (now - this.lastRefillTime) / 1000;
    const tokensToAdd = elapsedSeconds * this.tokensPerSecond;

    this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd);
    this.lastRefillTime = now;
  }
}

/**
 * Factory for creating common rate limiters
 */
export const RateLimiters = {
  /**
   * LLM API rate limiter - allows controlled burst with steady rate
   * Example: 10 calls/minute with burst capacity of 3
   */
  llm: (callsPerMinute: number = 10, burstSize: number = 3) => {
    return new RateLimiter({
      name: 'LLM-API',
      maxTokens: burstSize,
      tokensPerSecond: callsPerMinute / 60,
    });
  },

  /**
   * X API rate limiter - conservative to avoid account issues
   * Example: 15 posts/hour with burst capacity of 2
   */
  xApi: (postsPerHour: number = 15, burstSize: number = 2) => {
    return new RateLimiter({
      name: 'X-API',
      maxTokens: burstSize,
      tokensPerSecond: postsPerHour / 3600,
    });
  },

  /**
   * RSS feed fetcher - slow to avoid overloading sources
   * Example: 6 feeds/minute with burst capacity of 1
   */
  rssFetcher: (feedsPerMinute: number = 6, burstSize: number = 1) => {
    return new RateLimiter({
      name: 'RSS-Fetcher',
      maxTokens: burstSize,
      tokensPerSecond: feedsPerMinute / 60,
    });
  },
};

/**
 * Global LLM rate limiter instance
 * Shared across the application
 */
let globalLLMRateLimiter: RateLimiter | null = null;

export function getLLMRateLimiter(): RateLimiter {
  if (!globalLLMRateLimiter) {
    // Default: 10 calls per minute with burst of 2
    // Can be customized via environment variables
    const callsPerMinute = Number(process.env.LLM_RATE_LIMIT || '10');
    const burstSize = Number(process.env.LLM_BURST_SIZE || '2');
    globalLLMRateLimiter = RateLimiters.llm(callsPerMinute, burstSize);
  }
  return globalLLMRateLimiter;
}

export function resetLLMRateLimiter(): void {
  if (globalLLMRateLimiter) {
    globalLLMRateLimiter.reset();
  }
}
