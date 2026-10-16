// ==========================================
// DGCRM — APP ERROR BOUNDARY
// ==========================================
// V_25.0 — a JavaScript error while drawing a page used to leave a blank
// white screen with no way out. This catches it and shows a short message
// with Reload / Go to Home instead. A common case right after a deploy is
// a page file that no longer exists on the server ("Failed to fetch
// dynamically imported module"); a reload fixes that.
import React from 'react';

interface State { error: Error | null }

export class AppErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error('[AppErrorBoundary]', error, info.componentStack);
  }

  render(): React.ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;
    const newVersion = /dynamically imported module|Loading chunk|Importing a module script failed/i.test(error.message);
    return (
      <div role="alert" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: '#f8fafc', fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ maxWidth: 420, width: '100%', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: 24, textAlign: 'center' }}>
          <div style={{ fontSize: 17, fontWeight: 800, color: '#0f172a' }}>
            {newVersion ? 'A new version of DGCRM is available' : 'Something went wrong on this page'}
          </div>
          <div style={{ fontSize: 13, color: '#475569', marginTop: 8 }}>
            {newVersion
              ? 'Please reload to continue.'
              : 'Please reload the page. Nothing you already saved is lost. If it keeps happening, tell support what you were doing.'}
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 18 }}>
            <button type="button" onClick={() => window.location.reload()}
              style={{ padding: '8px 18px', borderRadius: 10, border: 'none', background: '#0f766e', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
              Reload
            </button>
            <button type="button" onClick={() => { window.location.href = '/'; }}
              style={{ padding: '8px 18px', borderRadius: 10, border: '1px solid #cbd5e1', background: '#fff', color: '#0f172a', fontWeight: 700, cursor: 'pointer' }}>
              Go to Home
            </button>
          </div>
        </div>
      </div>
    );
  }
}

export default AppErrorBoundary;
