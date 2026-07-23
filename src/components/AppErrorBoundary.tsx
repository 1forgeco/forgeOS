import { Component, type ErrorInfo, type ReactNode } from 'react'

type AppErrorBoundaryProps = { children: ReactNode }
type AppErrorBoundaryState = { failed: boolean }

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { failed: false }

  static getDerivedStateFromError(): AppErrorBoundaryState {
    return { failed: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ForgeOS route failed to render', error, info.componentStack)
  }

  render() {
    if (this.state.failed) {
      return (
        <main className="app-error-state">
          <span>ForgeOS</span>
          <h1>This screen could not open.</h1>
          <p>Your saved agents are safe. Reload the screen, or return to the workspace and try again.</p>
          <div>
            <button type="button" onClick={() => window.location.reload()}>Reload screen</button>
            <a href="/projects">Return to agents</a>
          </div>
        </main>
      )
    }
    return this.props.children
  }
}
