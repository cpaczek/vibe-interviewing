import { useState, useCallback } from 'react'

interface InstallCTAProps {
  onReplay: () => void
}

export function InstallCTA({ onReplay }: InstallCTAProps): React.JSX.Element {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText('npm install -g vibe-interviewing')
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard API may not be available
    }
  }, [])

  return (
    <div className="install-cta">
      <div className="install-cta-heading">Get started</div>
      <div className="install-cta-sub">Install the CLI and run your first scenario.</div>

      <div className="install-command">
        <code>npm install -g vibe-interviewing</code>
        <button
          className="install-command-copy"
          onClick={handleCopy}
          title={copied ? 'Copied' : 'Copy'}
          type="button"
        >
          {copied ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="9" y="9" width="13" height="13" rx="1" />
              <path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1" />
            </svg>
          )}
        </button>
      </div>

      <div className="install-actions">
        <a
          className="install-btn install-btn--primary"
          href="https://github.com/cpaczek/vibe-interviewing"
          target="_blank"
          rel="noopener noreferrer"
        >
          View source
        </a>
        <button className="install-btn install-btn--ghost" onClick={onReplay} type="button">
          Replay demo
        </button>
      </div>
    </div>
  )
}
