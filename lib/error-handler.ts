/**
 * Standardized Error Handling
 * Provides consistent error responses and logging across the application
 */

import { NextResponse } from 'next/server';

export interface ErrorResponse {
  error: string;
  code?: string;
  details?: Record<string, any>;
  status: number;
}

/**
 * Extract meaningful error message from any error type
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  if (typeof error === 'object' && error !== null) {
    const err = error as Record<string, any>;
    return err.message || err.error || JSON.stringify(error);
  }
  return 'Unknown error occurred';
}

/**
 * Extract error code from error object (e.g., Supabase error code)
 */
export function getErrorCode(error: unknown): string | undefined {
  if (typeof error === 'object' && error !== null) {
    const err = error as Record<string, any>;
    return err.code || err.errorCode || undefined;
  }
  return undefined;
}

/**
 * Create standardized API error response
 */
export function apiError(
  message: string,
  status: number = 500,
  code?: string,
  details?: Record<string, any>
): NextResponse<ErrorResponse> {
  return NextResponse.json(
    {
      error: message,
      code,
      details,
      status,
    },
    { status }
  );
}

/**
 * Handle errors from try-catch blocks
 * Logs error and returns standardized response
 */
export function handleApiError(
  error: unknown,
  context: string,
  defaultStatus: number = 500
): NextResponse<ErrorResponse> {
  const message = getErrorMessage(error);
  const code = getErrorCode(error);

  // Log the error for debugging
  console.error(`[${context}] Error:`, {
    message,
    code,
    error,
  });

  // Return standardized error response
  return apiError(message, defaultStatus, code);
}

/**
 * Validation error helper
 */
export function validationError(
  field: string,
  reason: string,
  details?: Record<string, any>
): NextResponse<ErrorResponse> {
  return apiError(
    `Invalid ${field}: ${reason}`,
    400,
    'VALIDATION_ERROR',
    { field, reason, ...details }
  );
}

/**
 * Not found error helper
 */
export function notFoundError(
  resource: string,
  id?: string
): NextResponse<ErrorResponse> {
  const message = id
    ? `${resource} with id "${id}" not found`
    : `${resource} not found`;

  return apiError(message, 404, 'NOT_FOUND', { resource, id });
}

/**
 * Unauthorized error helper
 */
export function unauthorizedError(reason?: string): NextResponse<ErrorResponse> {
  return apiError(
    reason || 'Unauthorized access',
    401,
    'UNAUTHORIZED'
  );
}

/**
 * Forbidden error helper
 */
export function forbiddenError(reason?: string): NextResponse<ErrorResponse> {
  return apiError(
    reason || 'Access forbidden',
    403,
    'FORBIDDEN'
  );
}

/**
 * Create a safe success response with data
 */
export function apiSuccess<T>(data: T, message?: string): NextResponse {
  return NextResponse.json({
    success: true,
    data,
    message,
  });
}

/**
 * Safe JSON parsing with error handling
 */
export function safeJsonParse<T>(
  jsonString: string,
  context: string
): T | null {
  try {
    return JSON.parse(jsonString) as T;
  } catch (error) {
    console.error(`[${context}] JSON parse error:`, getErrorMessage(error));
    return null;
  }
}

/**
 * Wrapper for async route handlers with automatic error handling
 */
export function withErrorHandling(
  handler: (req: Request) => Promise<NextResponse>
) {
  return async (req: Request) => {
    try {
      return await handler(req);
    } catch (error) {
      return handleApiError(error, 'API Route Handler');
    }
  };
}
