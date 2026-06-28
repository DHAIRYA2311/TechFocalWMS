import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', backgroundColor: '#fee2e2', border: '1px solid #ef4444', borderRadius: '8px', margin: '20px', fontFamily: 'sans-serif' }}>
          <h2 style={{ color: '#991b1b', marginTop: 0 }}>Component Render Error</h2>
          <p style={{ color: '#7f1d1d', fontWeight: 'bold' }}>{this.state.error && this.state.error.toString()}</p>
          <details style={{ whiteSpace: 'pre-wrap', color: '#7f1d1d', fontSize: '12px', marginTop: '10px' }}>
            {this.state.errorInfo && this.state.errorInfo.componentStack}
          </details>
        </div>
      );
    }

    return this.props.children;
  }
}
