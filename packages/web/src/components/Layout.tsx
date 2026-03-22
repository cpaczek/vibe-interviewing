import type { ReactNode } from 'react'

interface LayoutProps {
  children: ReactNode
}

export function Layout({ children }: LayoutProps): React.JSX.Element {
  return (
    <>
      <div className="nav-wrap">
        <nav className="nav">
          <div className="nav-left">
            <span className="nav-name">vibe-interviewing</span>
            <span className="nav-tag">open source</span>
          </div>
          <div className="nav-right">
            <a
              className="nav-link"
              href="https://www.npmjs.com/package/vibe-interviewing"
              target="_blank"
              rel="noopener noreferrer"
            >
              npm
            </a>
            <a
              className="nav-link"
              href="https://github.com/cpaczek/vibe-interviewing"
              target="_blank"
              rel="noopener noreferrer"
            >
              github
            </a>
          </div>
        </nav>
      </div>

      <div className="page">
        <section className="hero">
          <div className="hero-eyebrow">Technical interviews for the AI era</div>
          <h1>Evaluate how engineers work with AI, not what they memorize.</h1>
          <p>
            Real repos. Real bugs. Real AI tools. Candidates work the way they actually work — and
            you see exactly how they think.
          </p>
        </section>

        <section className="terminal-section">
          <div className="terminal-section-label">Interactive demo</div>
          {children}
        </section>
      </div>

      <div className="footer-wrap">
        <footer className="footer">
          <div className="footer-left">MIT License</div>
          <div className="footer-right">
            <a
              href="https://github.com/cpaczek/vibe-interviewing"
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub
            </a>
            <a
              href="https://www.npmjs.com/package/vibe-interviewing"
              target="_blank"
              rel="noopener noreferrer"
            >
              npm
            </a>
          </div>
        </footer>
      </div>
    </>
  )
}
