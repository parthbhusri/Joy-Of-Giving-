import { useState, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import Navbar from '../components/Navbar.jsx'
import RatingCard from '../components/RatingCard.jsx'
import { API_BASE_URL } from '../config/api.js'
import logo from '../assets/logo.png'

export default function Result() {
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [photoFailed, setPhotoFailed] = useState(false)

  const { id } = useParams()

  useEffect(() => {
    setPhotoFailed(false)

    async function fetchResult() {
      try {
        setLoading(true)
        setError('')

        // A scan you just ran is kept in sessionStorage by Home.jsx,
        // so show it straight away.
        // Shared links with no matching local copy are loaded from
        // the backend/database instead.
        try {
          const cached = JSON.parse(
            sessionStorage.getItem('toyResult') || 'null'
          )

          if (cached && cached.id === id) {
            setResult(cached)
            return
          }
        } catch {
          // Ignore unreadable cache and fall through to the backend.
        }

        const response = await fetch(
          `${API_BASE_URL}/api/results/${encodeURIComponent(id)}`
        )

        let data

        try {
          data = await response.json()
        } catch {
          throw new Error(
            'The server could not load saved results. The backend may need to be updated or restarted.'
          )
        }

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

  // The scanned image itself is stored privately in Google Cloud Storage.
  // The frontend does not access the bucket directly.
  // Instead, our Express backend retrieves the image using the same
  // public result ID used by the MongoDB assessment.
  const photoSrc =
    result && id && !photoFailed
      ? `${API_BASE_URL}/api/results/${encodeURIComponent(id)}/image`
      : null

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

  // Opens the browser's print dialog, which has a
  // "Save as PDF" destination.
  function handleSave() {
    const previousTitle = document.title
    const toyName = (result?.toyNameGuess || 'Toy').trim()

    // The browser uses the page title as the default file name.
    document.title = `Joy of Giving - ${toyName} Assessment`

    function restoreTitle() {
      document.title = previousTitle
      window.removeEventListener('afterprint', restoreTitle)
    }

    window.addEventListener('afterprint', restoreTitle)
    window.print()
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
      // AbortError simply means the user closed
      // the native share sheet.
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

        <div className="print-only print-header">
          <img
            src={logo}
            alt="Joy of Giving"
            className="print-logo"
          />

          <div className="print-header-text">
            <strong>
              Toy Assessment Report
            </strong>

            <span>
              {new Date().toLocaleDateString('en-AU', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
              })}
            </span>
          </div>
        </div>

        {result.toyNameGuess && (
          <div className="print-only print-toy-name">
            <h2>
              {result.toyNameGuess}
            </h2>

            {result.toyCategory && (
              <span>
                {result.toyCategory}
              </span>
            )}
          </div>
        )}

        {photoSrc && (
          <div className="toy-image-card">
            <img
              src={photoSrc}
              alt={
                result.toyNameGuess
                  ? `Photo of ${result.toyNameGuess}`
                  : 'Scanned toy'
              }
              onError={() => setPhotoFailed(true)}
            />
          </div>
        )}

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

        <div className="print-only report-details">
          <h3 className="report-details-title">
            Toy Details
          </h3>

          <dl className="report-grid">
            {result.donationReadiness && (
              <div>
                <dt>
                  Donation readiness
                </dt>

                <dd>
                  {result.donationReadiness}
                </dd>
              </div>
            )}

            {result.repairability && (
              <div>
                <dt>
                  Repairability
                </dt>

                <dd>
                  {result.repairability}
                </dd>
              </div>
            )}

            {result.suggestedAgeRange && (
              <div>
                <dt>
                  Suggested age range
                </dt>

                <dd>
                  {result.suggestedAgeRange}
                </dd>
              </div>
            )}

            {result.confidence && (
              <div>
                <dt>
                  AI confidence
                </dt>

                <dd>
                  {result.confidence}
                </dd>
              </div>
            )}
          </dl>

          {result.conditionSummary && (
            <div className="report-section">
              <h4>
                Condition
              </h4>

              <p>
                {result.conditionSummary}
              </p>
            </div>
          )}

          {result.repairabilityReason && (
            <div className="report-section">
              <h4>
                Repair notes
              </h4>

              <p>
                {result.repairabilityReason}
              </p>
            </div>
          )}

          {result.useCase && (
            <div className="report-section">
              <h4>
                Suggested use
              </h4>

              <p>
                {result.useCase}
              </p>
            </div>
          )}

          {result.suggestedActions?.length > 0 && (
            <div className="report-section">
              <h4>
                Suggested actions
              </h4>

              <ul>
                {result.suggestedActions.map(
                  (action, i) => (
                    <li key={i}>
                      {action}
                    </li>
                  )
                )}
              </ul>
            </div>
          )}

          {result.visibleSafetyConcerns?.length > 0 && (
            <div className="report-section">
              <h4>
                Visible safety concerns
              </h4>

              <ul>
                {result.visibleSafetyConcerns.map(
                  (concern, i) => (
                    <li key={i}>
                      {concern}
                    </li>
                  )
                )}
              </ul>
            </div>
          )}

          <p className="report-disclaimer">
            This assessment was generated by AI from a single
            photo and is a guide only. It is not a safety
            guarantee &mdash; staff review is required before
            any toy is donated.
          </p>

          <p className="report-link">
            View online: {window.location.href}
          </p>
        </div>

        <div className="share-card">
          <h3>
            🔗 Save or Share This Report
          </h3>

          <p className="share-card-sub">
            Keep a PDF copy on your device or send the link
            to someone.
          </p>

          <div className="report-actions">
            <button
              type="button"
              onClick={handleSave}
              className="btn-save"
            >
              💾 Save as PDF
            </button>

            <button
              type="button"
              onClick={handleShare}
              className="btn-share"
            >
              {copied
                ? '✅ Link Copied!'
                : '🔗 Share Link'}
            </button>
          </div>

          <Link
            to="/"
            className="btn-scan-again btn-scan-again-full"
          >
            🔄 Scan Again
          </Link>
        </div>

      </div>
    </>
  )
}