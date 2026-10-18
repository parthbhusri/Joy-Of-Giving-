import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar.jsx'
import { API_BASE_URL } from '../config/api.js'

// Simple line icons (match the Joy of Giving look; they take the text colour).
function Icon({ size = 18, children }) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  )
}

const CameraIcon = ({ size }) => (
  <Icon size={size}>
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
    <circle cx="12" cy="13" r="4" />
  </Icon>
)

const GalleryIcon = ({ size }) => (
  <Icon size={size}>
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <path d="M21 15l-5-5L5 21" />
  </Icon>
)

const SparkIcon = ({ size }) => (
  <Icon size={size}>
    <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z" />
  </Icon>
)

// Shrinks the scanned photo to a small JPEG data URL so it can be kept with
// the result (sessionStorage is small, and blob: URLs die on refresh).
function makeThumbnail(blobUrl, maxSize = 900, quality = 0.8) {
  return new Promise((resolve) => {
    const img = new Image()

    img.onload = () => {
      try {
        const scale = Math.min(
          1,
          maxSize / Math.max(img.width, img.height)
        )
        const canvas = document.createElement('canvas')

        canvas.width = Math.round(img.width * scale)
        canvas.height = Math.round(img.height * scale)
        canvas
          .getContext('2d')
          .drawImage(img, 0, 0, canvas.width, canvas.height)

        resolve(canvas.toDataURL('image/jpeg', quality))
      } catch {
        resolve(null)
      }
    }

    img.onerror = () => resolve(null)
    img.src = blobUrl
  })
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

      alert(
        'Camera could not be opened. Please allow camera permission or use Gallery instead.'
      )

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

    context.drawImage(
      video,
      0,
      0,
      canvas.width,
      canvas.height
    )

    canvas.toBlob((blob) => {
      if (!blob) return

      const capturedFile = new File(
        [blob],
        'captured-toy.jpg',
        {
          type: 'image/jpeg'
        }
      )

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

    try {
      setAnalyzing(true)

      // Clear previous scan result before starting a new analysis
      sessionStorage.removeItem('toyResult')

      const formData = new FormData()

      formData.append(
        'toyImage',
        image
      )

      const response = await fetch(
        `${API_BASE_URL}/api/analyze-toy`,
        {
          method: 'POST',
          body: formData
        }
      )

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ||
          'Failed to analyse toy image.'
        )
      }

      // Keep the photo that was scanned with its result so the Result page
      // can show it. (The backend's saved copy, imageUrl, takes over for
      // shared links once photo storage is switched on.)
      const photo = await makeThumbnail(imageURL)

      try {
        sessionStorage.setItem(
          'toyResult',
          JSON.stringify({
            ...data.result,
            photo
          })
        )
      } catch {
        // Storage full: still show the result, just without the cached photo.
        sessionStorage.setItem(
          'toyResult',
          JSON.stringify(data.result)
        )
      }

      navigate(
        `/result/${data.result.id}`
      )
    } catch (error) {
      console.error(
        'Toy analysis error:',
        error
      )

      alert(
        error.message ||
        'Something went wrong while analysing the toy.'
      )

      setAnalyzing(false)
    }
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
                animation:
                  'float 1.5s ease-in-out infinite'
              }}
            >
              🔍
            </div>

            <div className="analyzing-spinner" />

            <h2>
              Scanning Your Toy
            </h2>

            <p>
              Our AI is carefully analysing the image
              <br />
              and preparing your full assessment report.
            </p>

            <p
              style={{
                marginTop: 24,
                color: '#B8505C',
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

  const canAnalyse = Boolean(imageURL) && !cameraOpen

  let hint = 'Ready when you are'
  if (cameraOpen) hint = 'Capture a photo to continue'
  else if (!imageURL) hint = 'Add a photo to switch this on'

  return (
    <>
      <Navbar />

      <div className="page home-page">

        <div className="home-intro">
          <div className="section-eyebrow">
            AI Toy Scanner
          </div>

          <h1>
            Giving Preloved Toys
            <br />
            <span>
              a New Life
            </span>
          </h1>

          <p>
            Take or upload a photo. Our AI rates its
            cleanliness, reusability and reliability.
          </p>
        </div>

        <div
          className="camera-card"
          onDrop={(e) => {
            e.preventDefault()

            handleFile(
              e.dataTransfer.files[0]
            )
          }}
          onDragOver={(e) =>
            e.preventDefault()
          }
        >

          <div
            className={`camera-preview ${
              imageURL
                ? 'has-image'
                : ''
            }`}
          >
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

              <img
                src={imageURL}
                alt="Toy preview"
              />

            ) : (

              <>
                <div className="camera-corners" />

                <span className="camera-icon">
                  <CameraIcon size={52} />
                </span>

                <span className="camera-hint">
                  Take a photo or drop an image here
                </span>
              </>

            )}
          </div>

          {cameraOpen ? (

            <div className="camera-actions">

              <button
                className="btn-primary"
                onClick={capturePhoto}
              >
                📸 Capture Photo
              </button>

              <button
                className="btn-secondary"
                onClick={closeCamera}
              >
                ❌ Cancel
              </button>

            </div>

          ) : (

            <div className="camera-actions">

              <button
                className="btn-primary"
                onClick={openCamera}
              >
                <CameraIcon />
                Use Camera
              </button>

              <button
                className="btn-secondary"
                onClick={openGallery}
              >
                <GalleryIcon />
                Gallery
              </button>

            </div>

          )}

        </div>

        <canvas
          ref={canvasRef}
          style={{
            display: 'none'
          }}
        />

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            handleFile(
              e.target.files[0]
            )

            e.target.value = ''
          }}
        />

        <button
          className="btn-scan"
          onClick={handleScan}
          disabled={!canAnalyse}
        >
          <SparkIcon size={20} />
          Analyse This Toy
        </button>

        <p className="scan-hint">
          {hint}
        </p>

      </div>
    </>
  )
}
