import React, { Component, ErrorInfo, ReactNode } from 'react'
import { Button } from './ui/button'
import { AlertCircle } from 'lucide-react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    }
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
    this.setState({
      error,
      errorInfo
    })
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    })
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-[#3B0A45] to-[#2B0230] flex items-center justify-center p-4">
          <div className="max-w-2xl w-full bg-white/10 backdrop-blur-md rounded-lg border border-white/20 p-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 bg-red-500/20 rounded-full">
                <AlertCircle className="h-8 w-8 text-red-400" />
              </div>
              <div>
                <h2 className="text-white text-2xl font-bold">Something went wrong</h2>
                <p className="text-white/70">The application encountered an unexpected error</p>
              </div>
            </div>

            {this.state.error && (
              <div className="bg-black/20 rounded-lg p-4 mb-6">
                <p className="text-red-400 font-mono text-sm mb-2">
                  {this.state.error.toString()}
                </p>
                {this.state.errorInfo && (
                  <details className="mt-4">
                    <summary className="text-white/70 cursor-pointer text-sm">
                      Show error details
                    </summary>
                    <pre className="text-white/60 text-xs mt-2 overflow-auto max-h-64">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </details>
                )}
              </div>
            )}

            <div className="flex gap-4">
              <Button
                onClick={this.handleReset}
                className="bg-[#D9D9D9] text-black hover:bg-[#C0C0C0] font-bold uppercase"
              >
                Reload Application
              </Button>
              <Button
                onClick={() => window.location.href = '/'}
                variant="outline"
                className="bg-transparent border-white/20 text-white hover:bg-white/10"
              >
                Go to Home
              </Button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
