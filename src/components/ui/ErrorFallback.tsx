import React from 'react';
import ErrorAlert from './ErrorAlert';

interface ErrorFallbackProps {
  error: Error;
  resetError: () => void;
  context?: string;
}

/**
 * Error fallback component for error boundaries
 * Provides user-friendly error display with recovery options
 * @param error - The error object
 * @param resetError - Function to reset the error boundary
 * @param context - Additional context about where the error occurred
 */
export default function ErrorFallback({ error, resetError, context }: ErrorFallbackProps) {
  const isDevelopment = process.env.NODE_ENV === 'development';

  // Get user-friendly error message
  const getErrorMessage = (error: Error) => {
    // Common error patterns with user-friendly messages
    if (error.message.includes('fetch')) {
      return 'Unable to load data. Please check your internet connection and try again.';
    }
    if (error.message.includes('network')) {
      return 'Network connection issue. Please check your connection and try again.';
    }
    if (error.message.includes('timeout')) {
      return 'Request timed out. Please try again.';
    }
    if (error.message.includes('auth')) {
      return 'Authentication issue. Please sign in again.';
    }

    // Generic fallback message
    return 'Something went wrong. Please try again or contact support if the problem persists.';
  };

  const userMessage = getErrorMessage(error);

  const handleRetry = () => {
    // Clear any cached data that might be causing issues
    if (typeof window !== 'undefined') {
      window.location.reload();
    } else {
      resetError();
    }
  };

  return (
    <div className="container" style={{ padding: '3rem 1.5rem' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <div style={{
          textAlign: 'center',
          marginBottom: '2rem'
        }}>
          <div style={{
            fontSize: '3rem',
            marginBottom: '1rem'
          }}>⚠️</div>
          <h1 style={{
            fontSize: '1.75rem',
            marginBottom: '0.5rem',
            color: 'var(--text-main)'
          }}>
            Something went wrong
          </h1>
          <p style={{ color: 'var(--text-muted)', margin: 0 }}>
            {context && `Error in: ${context}`}
          </p>
        </div>

        <ErrorAlert
          type="error"
          title="We encountered an issue"
          message={userMessage}
          actions={
            <>
              <button
                onClick={handleRetry}
                className="btn-primary"
                style={{ marginRight: '0.5rem' }}
              >
                Try Again
              </button>
              <button
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    window.location.href = '/';
                  }
                }}
                className="btn-secondary"
              >
                Go to Homepage
              </button>
            </>
          }
        />

        {isDevelopment && (
          <details style={{
            marginTop: '2rem',
            padding: '1rem',
            background: 'var(--bg-color)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)'
          }}>
            <summary style={{
              cursor: 'pointer',
              fontWeight: 600,
              color: 'var(--text-main)'
            }}>
              Technical Details (Development Mode)
            </summary>
            <div style={{
              marginTop: '1rem',
              padding: '1rem',
              background: 'white',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-sm)'
            }}>
              <p style={{
                margin: '0 0 0.5rem 0',
                fontWeight: 600,
                color: 'var(--text-main)'
              }}>
                {error.name}
              </p>
              <pre style={{
                margin: 0,
                fontSize: '0.85rem',
                color: 'var(--text-muted)',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word'
              }}>
                {error.stack}
              </pre>
            </div>
          </details>
        )}
      </div>
    </div>
  );
}