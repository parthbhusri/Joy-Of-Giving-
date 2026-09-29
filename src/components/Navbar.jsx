import logo from '../assets/logo.png'

export default function Navbar() {
  return (
    <nav className="navbar">
      <div className="navbar-left">
        <img src={logo} alt="Joy of Giving" className="navbar-logo-img" />
      </div>
      <div className="navbar-badge">Scan a Toy ✨</div>
    </nav>
  )
}
