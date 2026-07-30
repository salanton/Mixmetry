import { Component, type ErrorInfo, type PropsWithChildren } from 'react'

type State = {
  hasError: boolean
}

class AppErrorBoundary extends Component<PropsWithChildren, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Mixmetry render error', error, info.componentStack)
  }

  private reload = () => window.location.reload()

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <main className="app-error" role="alert">
        <div className="app-error__panel">
          <p className="app-error__eyebrow">Mixmetry</p>
          <h1>Не удалось открыть приложение</h1>
          <p>Перезапустите экран. Сохранённые параметры останутся в браузере.</p>
          <button type="button" onClick={this.reload}>Перезапустить</button>
        </div>
      </main>
    )
  }
}

export default AppErrorBoundary
