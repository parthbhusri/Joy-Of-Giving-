import { useState, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import Navbar from '../components/Navbar.jsx'
import RatingCard from '../components/RatingCard.jsx'
import { API_BASE_URL } from '../config/api.js'

export default function Result() {
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  const { id } = useParams()

  useEffect(() => {
    async function fetchResult() {
      try {
        setLoading(true)
        setError('')

        const response = await fetch(
          `${API_BASE_URL}/api/results/${encodeURIComponent(id)}`
        )

        const data = await response.json()

        if (!response.ok || !data.success) {
          throw new Error(
            data.message || 'Failed to load toy assessment.'
          )
        }

        setResult(data.result)
      } catch (error) {
        console.error(
          'Failed to retrieve toy result:',
          error
        )

        setError(
          error.message || 'Failed to load toy assessment.'
        )
      } finally {
        setLoading(false)
      }
    }

    if (id) {
      fetchResult()
    } else {
      setError('No result ID was provided.')
      setLoading(false)
    }
  }, [id])

  function getOverall(r) {
    return (
      (
        r.cleanliness.rating +
        r.reusability.rating +
        r.reliability.rating
      ) / 3
    ).toFixed(1)
  }

  function getStars(score) {
    const filled = Math.round(score)

    return Array.from(
      { length: 5 },
      (_, i) => (i < filled ? '★' : '☆')
    ).join('')
  }

  function getVerdict(score) {
    if (score >= 4.5) return '🏆 Excellent Condition'
    if (score >= 3.5) return '✅ Good Condition'
    if (score >= 2.5) return '⚠️ Fair Condition'

    return '🔧 Needs Attention'
  }

  async function handleShare() {
    const shareData = {
      title: 'Toy Assessment Report',
      text: 'View this toy assessment report:',
      url: window.location.href
    }

    try {
      if (navigator.share) {
        await navigator.share(shareData)
        return
      }

      await navigator.clipboard.writeText(
        window.location.href
      )

      setCopied(true)

      setTimeout(() => {
        setCopied(false)
      }, 2000)
    } catch (error) {
      // AbortError simply means the user closed the native share sheet.
      if (error.name === 'AbortError') {
        return
      }

      console.error(
        'Failed to share result:',
        error
      )

      try {
        await navigator.clipboard.writeText(
          window.location.href
        )

        setCopied(true)

        setTimeout(() => {
          setCopied(false)
        }, 2000)
      } catch (clipboardError) {
        console.error(
          'Failed to copy result link:',
          clipboardError
        )
      }
    }
  }

  if (loading) {
    return (
      <>
        <Navbar />

        <div
          className="page"
          style={{
            textAlign: 'center',
            paddingTop: 60
          }}
        >
          <p
            style={{
              fontSize: '3rem',
              marginBottom: 16
            }}
          >
            🔍
          </p>

          <h2
            style={{
              fontFamily: 'Nunito',
              color: '#1A1A1A',
              marginBottom: 10
            }}
          >
            Loading Assessment...
          </h2>

          <p
            style={{
              color: '#6B7280'
            }}
          >
            Retrieving the saved toy report.
          </p>
        </div>
      </>
    )
  }

  if (error || !result) {
    return (
      <>
        <Navbar />

        <div
          className="page"
          style={{
            textAlign: 'center',
            paddingTop: 60
          }}
        >
          <p
            style={{
              fontSize: '3rem',
              marginBottom: 16
            }}
          >
            🤔
          </p>

          <h2
            style={{
              fontFamily: 'Nunito',
              color: '#1A1A1A',
              marginBottom: 10
            }}
          >
            Result Not Found
          </h2>

          <p
            style={{
              color: '#6B7280',
              marginBottom: 24
            }}
          >
            {error ||
              'This toy assessment could not be found.'}
          </p>

          <Link
            to="/"
            style={{
              display: 'inline-block',
              padding: '12px 28px',
              background: '#B8505C',
              color: 'white',
              borderRadius: 12,
              fontFamily: 'Nunito',
              fontWeight: 800,
              textDecoration: 'none'
            }}
          >
            ← Scan a Toy
          </Link>
        </div>
      </>
    )
  }

  const overall = parseFloat(getOverall(result))

  return (
    <>
      <Navbar />

      <div className="page">

        <div className="result-hero">
          <span className="result-emoji">
            🎉
          </span>

          <h1>
            Assessment Complete!
          </h1>

          <p>
            Here is what our AI found about this toy
          </p>
        </div>

        <div className="overall-badge">
          <div className="badge-label">
            Overall Score
          </div>

          <div className="badge-score">
            {overall} / 5
          </div>

          <div className="badge-stars">
            {getStars(overall)}
          </div>

          <div className="badge-verdict">
            {getVerdict(overall)}
          </div>
        </div>

        <div className="rating-cards">
          <RatingCard
            type="cleanliness"
            icon="🧼"
            label="Cleanliness"
            rating={result.cleanliness.rating}
            description={
              result.cleanliness.description
            }
          />

          <RatingCard
            type="reusability"
            icon="♻️"
            label="Reusability"
            rating={result.reusability.rating}
            description={
              result.reusability.description
            }
          />

          <RatingCard
            type="reliability"
            icon="🔧"
            label="Reliability"
            rating={result.reliability.rating}
            description={
              result.reliability.description
            }
          />
        </div>

        {result.battery_operated && (
          <div className="battery-note">
            <span className="battery-icon">
              🔋
            </span>

            <div className="battery-text">
              <strong>
                Battery Operated Toy
              </strong>

              {result.battery_note}
            </div>
          </div>
        )}

        <div className="fun-fact">
          <span className="fun-fact-icon">
            💡
          </span>

          <div className="fun-fact-text">
            <strong>
              Did You Know?
            </strong>

            {result.fun_fact}
          </div>
        </div>

        <div className="share-card">
          <h3>
            🔗 Save or Share This Report
          </h3>

          <button
            type="button"
            onClick={handleShare}
            className="btn-scan-again"
            style={{
              border: 'none',
              cursor: 'pointer',
              marginBottom: 12
            }}
          >
            {copied
              ? '✅ Link Copied!'
              : '🔗 Share Report'}
          </button>

          <Link
            to="/"
            className="btn-scan-again"
          >
            🔄 Scan Again
          </Link>
        </div>

      </div>
    </>
  )
}