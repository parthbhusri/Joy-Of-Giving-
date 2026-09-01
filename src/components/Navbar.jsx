export default function Navbar() {
  return (
    <nav className="navbar">
      <div className="navbar-left">
        <div style={{
          background: '#1a2744',
          borderRadius: 8,
          padding: '4px 8px',
          display: 'flex',
          alignItems: 'center',
          gap: 6
        }}>
          <span style={{ fontSize: 22 }}>🧸</span>
          <div>
            <div className="navbar-logo-text">Joy of Giving</div>
            <div className="navbar-logo-sub">AI Toy Scanner</div>
          </div>
        </div>
      </div>
      <div className="navbar-badge">Scan a Toy ✨</div>
    </nav>
  )
}
