import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar.jsx'

const DUMMY_RESULT = {
  id: 'demo-001',
  cleanliness: {
    rating: 4,
    description: 'This toy appears to be in great condition with only minor surface marks visible. A quick wipe with a damp cloth will have it looking brand new and ready for a new owner to enjoy!'
  },
  reusability: {
    rating: 5,
    description: 'Excellent reusability! This toy is built from durable, high-quality materials and shows no signs of structural damage. It has plenty of play life left and will bring joy to many more children.'
  },
  reliability: {
    rating: 3,
    description: 'The toy is generally reliable but shows some light wear on the moving parts. With a little care and gentle play, it should continue to function well for some time to come.'
  },
  battery_operated: true,
  battery_note: 'This toy requires batteries to operate. Before gifting, check that the battery compartment is clean and free from corrosion. Standard AA batteries are recommended.',
  fun_fact: 'Did you know? Donating a toy saves it from landfill and gives it a second life with a child who will love it just as much as the first owner did!'
}

export default function Home() {
  const [imageURL, setImageURL] = useState(null)
  const [image, setImage] = useState(null)
  const [analyzing, setAnalyzing] = useState(false)
  const fileRef = useRef()
  const navigate = useNavigate()

  function handleFile(file) {
    if (!file) return
    setImage(file)
    setImageURL(URL.createObjectURL(file))
  }

  function openCamera() {
    fileRef.current.setAttribute('capture', 'environment')
    fileRef.current.click()
  }

  function openGallery() {
    fileRef.current.removeAttribute('capture')
    fileRef.current.click()
  }

  async function handleScan() {
    if (!image) return
    setAnalyzing(true)
    await new Promise(r => setTimeout(r, 3000))
    sessionStorage.setItem('toyResult', JSON.stringify({ ...DUMMY_RESULT, imageURL }))
    navigate('/result/demo-001')
  }

  if (analyzing) {
    return (
      <>
        <Navbar />
        <div className="page">
          <div className="analyzing">
            <div style={{ fontSize: 64, marginBottom: 20, animation: 'float 1.5s ease-in-out infinite' }}>🔍</div>
            <div className="analyzing-spinner" />
            <h2>Scanning Your Toy</h2>
            <p>Our AI is carefully analysing the image<br />and preparing your full assessment report.</p>
            <p style={{ marginTop: 24, color: '#F16B7B', fontFamily: 'Nunito', fontWeight: 800, fontSize: '0.9rem' }}>
              Checking cleanliness · reusability · reliability...
            </p>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <Navbar />

      {/* Hero Banner */}
      <div className="hero">
        <span className="hero-toys">🧸 🚂 🎮 🪀</span>
        <h1>Giving Preloved Toys<br /><span>a New Life</span></h1>
        <p className="hero-desc">
          Scan any donated toy with your phone camera. Our AI rates its cleanliness, reusability and reliability — instantly.
        </p>
        <button className="hero-cta" onClick={openCamera}>
          📷 Scan a Toy Now
        </button>
      </div>

      {/* Mission Strip */}
      <div className="mission-strip">
        <div className="mission-item">
          <span className="mission-icon">🚂</span>
          <span className="mission-label">Our Mission</span>
        </div>
        <div className="mission-item">
          <span className="mission-icon">🎁</span>
          <span className="mission-label">Donate a Toy</span>
        </div>
        <div className="mission-item">
          <span className="mission-icon">🤝</span>
          <span className="mission-label">Volunteer</span>
        </div>
      </div>

      <div className="page">

        {/* Section Header */}
        <div className="section-header" style={{ marginTop: 24 }}>
          <div className="section-eyebrow">AI Toy Scanner</div>
          <h2>Scan, Rate &amp; Share</h2>
        </div>

        {/* Camera Card */}
        <div
          className="camera-card"
          onDrop={e => { e.preventDefault(); handleFile(e.dataTransfer.files[0]) }}
          onDragOver={e => e.preventDefault()}>
          <div className={`camera-preview ${imageURL ? 'has-image' : ''}`}>
            {imageURL
              ? <img src={imageURL} alt="Toy preview" />
              : <>
                  <div className="camera-corners" />
                  <span className="camera-icon">📷</span>
                  <span className="camera-hint">Tap to scan or drop image here</span>
                </>
            }
          </div>
          <div className="camera-actions">
            <button className="btn-primary" onClick={openCamera}>
              📷 Use Camera
            </button>
            <button className="btn-secondary" onClick={openGallery}>
              🖼️ Gallery
            </button>
          </div>
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={e => handleFile(e.target.files[0])}
        />

        {imageURL && (
          <button className="btn-scan" onClick={handleScan}>
            ✨ Analyse This Toy
          </button>
        )}

        {/* How it works */}
        <div className="section-header">
          <div className="section-eyebrow">Simple Steps</div>
          <h2>How It Works</h2>
        </div>

        <div className="steps">
          <div className="step-item">
            <div className="step-num">1</div>
            <div className="step-text">
              <strong>Take a Photo</strong>
              <span>Use your phone camera or upload an image of the donated toy.</span>
            </div>
          </div>
          <div className="step-item">
            <div className="step-num">2</div>
            <div className="step-text">
              <strong>AI Scans the Toy</strong>
              <span>Our AI checks cleanliness, reusability and reliability, rating each out of 5 stars.</span>
            </div>
          </div>
          <div className="step-item">
            <div className="step-num">3</div>
            <div className="step-text">
              <strong>Save &amp; Share</strong>
              <span>Get a unique shareable link to your toy's full assessment report.</span>
            </div>
          </div>
        </div>

        {/* Footer note */}
        <p style={{ textAlign: 'center', color: '#9CA3AF', fontSize: '0.8rem', marginTop: 8 }}>
          🌍 Saving toys from landfill · giving joy to children
        </p>

      </div>
    </>
  )
}
