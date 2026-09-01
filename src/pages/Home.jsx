import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar.jsx'

const DUMMY_RESULT = {
  id: 'demo-001',
  cleanliness: {
    rating: 4,
    description:
      'This toy appears to be in great condition with only minor surface marks visible. A quick wipe with a damp cloth will have it looking brand new and ready for a new owner to enjoy!'
  },
  reusability: {
    rating: 5,
    description:
      'Excellent reusability! This toy is built from durable, high-quality materials and shows no signs of structural damage. It has plenty of play life left and will bring joy to many more children.'
  },
  reliability: {
    rating: 3,
    description:
      'The toy is generally reliable but shows some light wear on the moving parts. With a little care and gentle play, it should continue to function well for some time to come.'
  },
  battery_operated: true,
  battery_note:
    'This toy requires batteries to operate. Before gifting, check that the battery compartment is clean and free from corrosion. Standard AA batteries are recommended.',
  fun_fact:
    'Did you know? Donating a toy saves it from landfill and gives it a second life with a child who will love it just as much as the first owner did!'
}

export default function Home() {
  const [imageURL, setImageURL] = useState(null)
  const [image, setImage] = useState(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [cameraOpen, setCameraOpen] = useState(false)

  const fileRef = useRef(null)
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)

  const navigate = useNavigate()

  function handleFile(file) {
    if (!file) return

    if (!file.type.startsWith('image/')) {
      alert('Please upload a valid image file.')
      return
    }

    setImage(file)
    setImageURL(URL.createObjectURL(file))
  }

  function openGallery() {
    if (!fileRef.current) return
    fileRef.current.click()
  }

  async function openCamera() {
    try {
      setCameraOpen(true)

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment'
        },
        audio: false
      })

      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
    } catch (error) {
      console.error('Camera error:', error)
      alert('Camera could not be opened. Please allow camera permission or use Gallery instead.')
      setCameraOpen(false)
    }
  }

  function closeCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }

    setCameraOpen(false)
  }

  function capturePhoto() {
    const video = videoRef.current
    const canvas = canvasRef.current

    if (!video || !canvas) return

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    const context = canvas.getContext('2d')
    context.drawImage(video, 0, 0, canvas.width, canvas.height)

    canvas.toBlob((blob) => {
      if (!blob) return

      const capturedFile = new File([blob], 'captured-toy.jpg', {
        type: 'image/jpeg'
      })

      setImage(capturedFile)
      setImageURL(URL.createObjectURL(blob))
      closeCamera()
    }, 'image/jpeg')
  }

  async function handleScan() {
    if (!image) {
      alert('Please upload or capture a toy image first.')
      return
    }

    setAnalyzing(true)

    await new Promise((resolve) => setTimeout(resolve, 3000))

    sessionStorage.setItem(
      'toyResult',
      JSON.stringify({
        ...DUMMY_RESULT,
        imageURL
      })
    )

    navigate('/result/demo-001')
  }

  if (analyzing) {
    return (
      <>
        <Navbar />

        <div className="page">
          <div className="analyzing">
            <div
              style={{
                fontSize: 64,
                marginBottom: 20,
                animation: 'float 1.5s ease-in-out infinite'
              }}
            >
              🔍
            </div>

            <div className="analyzing-spinner" />

            <h2>Scanning Your Toy</h2>

            <p>
              Our AI is carefully analysing the image
              <br />
              and preparing your full assessment report.
            </p>

            <p
              style={{
                marginTop: 24,
                color: '#F16B7B',
                fontFamily: 'Nunito',
                fontWeight: 800,
                fontSize: '0.9rem'
              }}
            >
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

      <div className="hero">
        <span className="hero-toys">🧸 🚂 🎮 🪀</span>

        <h1>
          Giving Preloved Toys
          <br />
          <span>a New Life</span>
        </h1>

        <p className="hero-desc">
          Scan any donated toy with your phone camera. Our AI rates its
          cleanliness, reusability and reliability — instantly.
        </p>

        <button className="hero-cta" onClick={openCamera}>
          📷 Scan a Toy Now
        </button>
      </div>

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
        <div className="section-header" style={{ marginTop: 24 }}>
          <div className="section-eyebrow">AI Toy Scanner</div>
          <h2>Scan, Rate &amp; Share</h2>
        </div>

        <div
          className="camera-card"
          onDrop={(e) => {
            e.preventDefault()
            handleFile(e.dataTransfer.files[0])
          }}
          onDragOver={(e) => e.preventDefault()}
        >
          <div className={`camera-preview ${imageURL ? 'has-image' : ''}`}>
            {cameraOpen ? (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  borderRadius: '12px'
                }}
              />
            ) : imageURL ? (
              <img src={imageURL} alt="Toy preview" />
            ) : (
              <>
                <div className="camera-corners" />
                <span className="camera-icon">📷</span>
                <span className="camera-hint">
                  Tap to scan or drop image here
                </span>
              </>
            )}
          </div>

          {cameraOpen ? (
            <div className="camera-actions">
              <button className="btn-primary" onClick={capturePhoto}>
                📸 Capture Photo
              </button>

              <button className="btn-secondary" onClick={closeCamera}>
                ❌ Cancel
              </button>
            </div>
          ) : (
            <div className="camera-actions">
              <button className="btn-primary" onClick={openCamera}>
                📷 Use Camera
              </button>

              <button className="btn-secondary" onClick={openGallery}>
                🖼️ Gallery
              </button>
            </div>
          )}
        </div>

        <canvas ref={canvasRef} style={{ display: 'none' }} />

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            handleFile(e.target.files[0])
            e.target.value = ''
          }}
        />

        {imageURL && !cameraOpen && (
          <button className="btn-scan" onClick={handleScan}>
            ✨ Analyse This Toy
          </button>
        )}

        <div className="section-header">
          <div className="section-eyebrow">Simple Steps</div>
          <h2>How It Works</h2>
        </div>

        <div className="steps">
          <div className="step-item">
            <div className="step-num">1</div>

            <div className="step-text">
              <strong>Take a Photo</strong>
              <span>
                Use your phone camera or upload an image of the donated toy.
              </span>
            </div>
          </div>

          <div className="step-item">
            <div className="step-num">2</div>

            <div className="step-text">
              <strong>AI Scans the Toy</strong>
              <span>
                Our AI checks cleanliness, reusability and reliability, rating
                each out of 5 stars.
              </span>
            </div>
          </div>

          <div className="step-item">
            <div className="step-num">3</div>

            <div className="step-text">
              <strong>Save &amp; Share</strong>
              <span>
                Get a unique shareable link to your toy&apos;s full assessment
                report.
              </span>
            </div>
          </div>
        </div>

        <p
          style={{
            textAlign: 'center',
            color: '#9CA3AF',
            fontSize: '0.8rem',
            marginTop: 8
          }}
        >
          🌍 Saving toys from landfill · giving joy to children
        </p>
      </div>
    </>
  )
}