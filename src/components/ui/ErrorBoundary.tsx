import { Component, type ErrorInfo, type ReactNode } from 'react';

/**
 * Contains rendering errors to one part of the page. Used around scenario
 * playgrounds, which may receive unexpected data shapes from a real server.
 */
export class ErrorBoundary extends Component<{ fallback: ReactNode; resetKey?: unknown; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidUpdate(previous: { resetKey?: unknown }) {
    if (previous.resetKey !== this.props.resetKey && this.state.failed) this.setState({ failed: false });
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.warn('Contained render error:', error.message, info.componentStack);
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
