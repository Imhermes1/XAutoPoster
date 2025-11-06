/**
 * Circuit Breaker Pattern Implementation
 * Prevents cascading failures by stopping requests to failing services
 *
 * States:
 * - CLOSED: Normal operation, requests pass through
 * - OPEN: Service is failing, requests are rejected immediately
 * - HALF_OPEN: Testing if service recovered, limited requests allowed
 */

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerConfig {
  failureThreshold?: number;      // Number of failures before opening (default: 5)
  successThreshold?: number;      // Number of successes before closing from half-open (default: 2)
  timeout?: number;               // Timeout in ms before trying half-open (default: 60000)
  name?: string;                  // Circuit breaker name for logging
}

export interface CircuitBreakerMetrics {
  state: CircuitState;
  failureCount: number;
  successCount: number;
  lastFailureTime?: number;
  lastSuccessTime?: number;
  totalRequests: number;
  totalFailures: number;
}

export class CircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime?: number;
  private lastSuccessTime?: number;
  private totalRequests = 0;
  private totalFailures = 0;

  private readonly failureThreshold: number;
  private readonly successThreshold: number;
  private readonly timeout: number;
  private readonly name: string;

  constructor(config: CircuitBreakerConfig = {}) {
    this.failureThreshold = config.failureThreshold ?? 5;
    this.successThreshold = config.successThreshold ?? 2;
    this.timeout = config.timeout ?? 60000; // 1 minute default
    this.name = config.name ?? 'CircuitBreaker';
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    this.totalRequests++;

    // OPEN state: reject immediately
    if (this.state === 'OPEN') {
      if (this.shouldAttemptReset()) {
        this.transitionToHalfOpen();
      } else {
        throw new Error(
          `[${this.name}] Circuit breaker is OPEN. Service unavailable. ` +
          `Retry after ${Math.ceil((this.timeout - (Date.now() - (this.lastFailureTime || 0))) / 1000)}s`
        );
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  /**
   * Check if enough time has passed to attempt recovery
   */
  private shouldAttemptReset(): boolean {
    if (!this.lastFailureTime) return true;
    return Date.now() - this.lastFailureTime >= this.timeout;
  }

  /**
   * Handle successful request
   */
  private onSuccess(): void {
    this.lastSuccessTime = Date.now();

    if (this.state === 'HALF_OPEN') {
      this.successCount++;
      console.log(
        `[${this.name}] Half-open success: ${this.successCount}/${this.successThreshold}`
      );

      if (this.successCount >= this.successThreshold) {
        this.transitionToClosed();
      }
    } else if (this.state === 'CLOSED') {
      // Reset failure count on success in closed state
      this.failureCount = 0;
    }
  }

  /**
   * Handle failed request
   */
  private onFailure(): void {
    this.totalFailures++;
    this.lastFailureTime = Date.now();

    if (this.state === 'CLOSED') {
      this.failureCount++;
      console.warn(
        `[${this.name}] Failure detected: ${this.failureCount}/${this.failureThreshold}`
      );

      if (this.failureCount >= this.failureThreshold) {
        this.transitionToOpen();
      }
    } else if (this.state === 'HALF_OPEN') {
      // Any failure in half-open state goes back to open
      console.error(`[${this.name}] Half-open failed, reopening circuit`);
      this.transitionToOpen();
    }
  }

  /**
   * Transition to OPEN state
   */
  private transitionToOpen(): void {
    this.state = 'OPEN';
    this.successCount = 0;
    console.error(
      `[${this.name}] Circuit breaker OPENED. ` +
      `${this.failureCount} failures exceeded threshold of ${this.failureThreshold}`
    );
  }

  /**
   * Transition to HALF_OPEN state
   */
  private transitionToHalfOpen(): void {
    this.state = 'HALF_OPEN';
    this.failureCount = 0;
    this.successCount = 0;
    console.warn(
      `[${this.name}] Circuit breaker HALF_OPEN. Testing recovery...`
    );
  }

  /**
   * Transition to CLOSED state
   */
  private transitionToClosed(): void {
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.successCount = 0;
    console.info(`[${this.name}] Circuit breaker CLOSED. Service recovered.`);
  }

  /**
   * Manually reset the circuit breaker
   */
  reset(): void {
    console.info(`[${this.name}] Circuit breaker manually reset`);
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = undefined;
    this.lastSuccessTime = undefined;
  }

  /**
   * Get current metrics
   */
  getMetrics(): CircuitBreakerMetrics {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
      totalRequests: this.totalRequests,
      totalFailures: this.totalFailures,
    };
  }

  /**
   * Check if circuit breaker is healthy (not open)
   */
  isHealthy(): boolean {
    return this.state !== 'OPEN';
  }

  /**
   * Get current state
   */
  getState(): CircuitState {
    return this.state;
  }
}

/**
 * Global circuit breakers for external services
 */
export const circuitBreakers = {
  xApi: new CircuitBreaker({
    name: 'X API',
    failureThreshold: 5,
    successThreshold: 3,
    timeout: 120000, // 2 minutes
  }),

  rssFeeds: new CircuitBreaker({
    name: 'RSS Feeds',
    failureThreshold: 3,
    successThreshold: 2,
    timeout: 60000, // 1 minute
  }),

  openRouter: new CircuitBreaker({
    name: 'OpenRouter LLM',
    failureThreshold: 4,
    successThreshold: 2,
    timeout: 90000, // 1.5 minutes
  }),

  supabase: new CircuitBreaker({
    name: 'Supabase',
    failureThreshold: 10,
    successThreshold: 5,
    timeout: 180000, // 3 minutes
  }),
};

/**
 * Helper to get circuit breaker for a service
 */
export function getCircuitBreaker(service: 'xApi' | 'rssFeeds' | 'openRouter' | 'supabase'): CircuitBreaker {
  return circuitBreakers[service];
}

/**
 * Check health of all circuit breakers
 */
export function getAllCircuitBreakerMetrics(): Record<string, CircuitBreakerMetrics> {
  return {
    xApi: circuitBreakers.xApi.getMetrics(),
    rssFeeds: circuitBreakers.rssFeeds.getMetrics(),
    openRouter: circuitBreakers.openRouter.getMetrics(),
    supabase: circuitBreakers.supabase.getMetrics(),
  };
}
