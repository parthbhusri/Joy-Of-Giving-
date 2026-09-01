import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar.jsx'
import RatingCard from '../components/RatingCard.jsx'

export default function Result() {
  const [result, setResult] = useState(null)
  const [copied, setCopied] = useState(false)
  const [toast, setToast] = useState(false)

  useEffect(() => {
    const data = sessionStorage.getItem('toyResult')
    if (data) setResult(JSON.parse(data))
  }, [])

  function copyLink() {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true); setToast(true)
      setTimeout(() => { setCopied(false); setToast(false) }, 2500)
    })
  }

  function getOverall(r) {
    return ((r.cleanliness.rating + r.reusability.rating + r.reliability.rating) / 3).toFixed(1)
  }

  function getStars(score) {
    const filled = Math.round(score)
    return Array.from({ length: 5 }, (_, i) => i < filled ? '★' : '☆').join('')
  }

  function getVerdict(score) {
    if (score >= 4.5) return '🏆 Excellent Condition'
    if (score >= 3.5) return '✅ Good Condition'
    if (score >= 2.5) return '⚠️ Fair Condition'
    return '🔧 Needs Attention'
  }

  if (!result) return (
    <>
      <Navbar />
      <div className="page" style={{ textAlign: 'center', paddingTop: 60 }}>
        <p style={{ fontSize: '3rem', marginBottom: 16 }}>🤔</p>
        <h2 style={{ fontFamily: 'Nunito', color: '#1a2744', marginBottom: 10 }}>No Result Found</h2>
        <p style={{ color: '#6B7280', marginBottom: 24 }}>Please scan a toy first.</p>
        <Link to="/" style={{ display: 'inline-block', padding: '12px 28px', background: '#F16B7B', color: 'white', borderRadius: 12, fontFamily: 'Nunito', fontWeight: 800, textDecoration: 'none' }}>
          ← Scan a Toy
        </Link>
      </div>
    </>
  )

  const overall = parseFloat(getOverall(result))

  return (
    <>
      <Navbar />
      <div className="page">

        <div className="result-hero">
          <span className="result-emoji">🎉</span>
          <h1>Assessment Complete!</h1>
          <p>Here is what our AI found about this toy</p>
        </div>

        {result.imageURL && (
          <div className="toy-image-card">
            <img src={result.imageURL} alt="Scanned toy" />
          </div>
        )}

        <div className="overall-badge">
          <div className="badge-label">Overall Score</div>
          <div className="badge-score">{overall} / 5</div>
          <div className="badge-stars">{getStars(overall)}</div>
          <div className="badge-verdict">{getVerdict(overall)}</div>
        </div>

        <div className="rating-cards">
          <RatingCard type="cleanliness" icon="🧼" label="Cleanliness"
            rating={result.cleanliness.rating} description={result.cleanliness.description} />
          <RatingCard type="reusability" icon="♻️" label="Reusability"
            rating={result.reusability.rating} description={result.reusability.description} />
          <RatingCard type="reliability" icon="🔧" label="Reliability"
            rating={result.reliability.rating} description={result.reliability.description} />
        </div>

        {result.battery_operated && (
          <div className="battery-note">
            <span className="battery-icon">🔋</span>
            <div className="battery-text">
              <strong>Battery Operated Toy</strong>
              {result.battery_note}
            </div>
          </div>
        )}

        <div className="fun-fact">
          <span className="fun-fact-icon">💡</span>
          <div className="fun-fact-text">
            <strong>Did You Know?</strong>
            {result.fun_fact}
          </div>
        </div>

        <div className="share-card">
          <h3>🔗 Save or Share This Report</h3>
          <div className="share-url">{window.location.href}</div>
          <div className="share-buttons">
            <button className={`btn-copy ${copied ? 'copied' : ''}`} onClick={copyLink}>
              {copied ? '✅ Copied!' : '📋 Copy Link'}
            </button>
            <Link to="/" className="btn-scan-again">🔄 Scan Again</Link>
          </div>
        </div>

      </div>
      <div className={`toast ${toast ? 'show' : ''}`}>✅ Link copied!</div>
    </>
  )
}
