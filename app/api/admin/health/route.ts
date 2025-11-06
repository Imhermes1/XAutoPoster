import { NextResponse } from 'next/server';
import { getAllCircuitBreakerMetrics } from '@/lib/circuit-breaker';
import { handleApiError } from '@/lib/error-handler';

export async function GET() {
  try {
    const metrics = getAllCircuitBreakerMetrics();

    // Determine overall health status
    const isHealthy = Object.values(metrics).every(m => m.state !== 'OPEN');

    return NextResponse.json({
      success: true,
      status: isHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      circuitBreakers: metrics,
      summary: {
        totalRequests: Object.values(metrics).reduce((sum, m) => sum + m.totalRequests, 0),
        totalFailures: Object.values(metrics).reduce((sum, m) => sum + m.totalFailures, 0),
        openCircuits: Object.entries(metrics)
          .filter(([_, m]) => m.state === 'OPEN')
          .map(([name]) => name),
        halfOpenCircuits: Object.entries(metrics)
          .filter(([_, m]) => m.state === 'HALF_OPEN')
          .map(([name]) => name),
      },
    });
  } catch (error) {
    return handleApiError(error, 'GET /api/admin/health');
  }
}
