import express from 'express'
import cors from 'cors'
import multer from 'multer'
import dotenv from 'dotenv'
import { GoogleGenAI } from '@google/genai'

dotenv.config()

process.on('exit', (code) => {
  console.log(`[diagnostic] process exiting with code ${code}`)
})
process.on('uncaughtException', (err) => {
  console.error('[diagnostic] uncaughtException:', err)
})
process.on('unhandledRejection', (reason) => {
  console.error('[diagnostic] unhandledRejection:', reason)
})

if (!process.env.GEMINI_API_KEY) {
  console.error('[diagnostic] GEMINI_API_KEY is missing or empty — check Backend/.env')
} else {
  console.log(`[diagnostic] GEMINI_API_KEY loaded, length ${process.env.GEMINI_API_KEY.length}`)
}

const app = express()
const PORT = process.env.PORT || 5000

const allowedOrigins = [
  'http://localhost:5173',
  process.env.FRONTEND_URL
].filter(Boolean)

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  }
}))

app.use(express.json())

app.use((req, res, next) => {
  console.log(`[diagnostic] incoming request: ${req.method} ${req.url} (origin: ${req.headers.origin || 'none'})`)
  next()
})

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024
  }
})

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
})

async function generateContentWithRetry(params, maxRetries = 2) {
  let lastError

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await ai.models.generateContent(params)
    } catch (error) {
      lastError = error

      const isRetryable = error.status === 503 || error.status === 429

      if (!isRetryable || attempt === maxRetries) {
        throw error
      }

      const delayMs = 1000 * Math.pow(2, attempt)
      console.log(`[diagnostic] Gemini call failed (status ${error.status}), retrying in ${delayMs}ms (attempt ${attempt + 1}/${maxRetries})`)
      await new Promise((resolve) => setTimeout(resolve, delayMs))
    }
  }

  throw lastError
}

function cleanJsonResponse(text) {
  return text
    .replace(/```json/g, '')
    .replace(/```/g, '')
    .trim()
}

app.get('/', (req, res) => {
  res.json({
    message: 'Toy AI backend is running'
  })
})

app.post('/api/analyze-toy', upload.single('toyImage'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file uploaded.'
      })
    }

    if (!req.file.mimetype.startsWith('image/')) {
      return res.status(400).json({
        success: false,
        message: 'Uploaded file must be an image.'
      })
    }

    const imageBase64 = req.file.buffer.toString('base64')

    const prompt = `
You are an AI assistant helping a nonprofit organisation assess donated toys from images.

Analyse the toy image and return ONLY valid JSON. Do not include markdown, explanations, or code fences.

Important rules:
- Do not claim the toy is definitely safe.
- Only identify visible issues from the image.
- Always state that staff review is required.
- Be practical and helpful for a toy donation workflow.
- If you are unsure, use a medium or low confidence level.

Return JSON using exactly this structure:

{
  "id": "generated-id",
  "toyCategory": "Soft toy / electronic toy / vehicle toy / puzzle / doll / board game / other",
  "toyNameGuess": "short guessed toy name",
  "conditionSummary": "short summary of visible condition",
  "cleanliness": {
    "rating": 1,
    "description": "cleanliness explanation"
  },
  "reusability": {
    "rating": 1,
    "description": "reusability explanation"
  },
  "reliability": {
    "rating": 1,
    "description": "reliability explanation"
  },
  "repairability": "High / Medium / Low",
  "repairabilityReason": "short reason",
  "suggestedActions": [
    "action 1",
    "action 2",
    "action 3"
  ],
  "useCase": "how this toy may be used",
  "suggestedAgeRange": "example age range with staff review note",
  "visibleSafetyConcerns": [
    "concern 1",
    "concern 2"
  ],
  "donationReadiness": "Ready / Needs cleaning / Needs repair / Needs staff review / Not recommended",
  "battery_operated": false,
  "battery_note": "battery-related note or 'No visible battery requirement identified from the image.'",
  "confidence": "High / Medium / Low",
  "staffReviewRequired": true,
  "fun_fact": "short positive fact about toy reuse or donation"
}

Ratings must be numbers from 1 to 5.
`

    const response = await generateContentWithRetry({
      model: 'gemini-3.8-flash',
      contents: [
        {
          role: 'user',
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: req.file.mimetype,
                data: imageBase64
              }
            }
          ]
        }
      ]
    })

    const rawText = response.text
    const cleanedText = cleanJsonResponse(rawText)

    let parsedResult

    try {
      parsedResult = JSON.parse(cleanedText)
    } catch (parseError) {
      console.error('JSON parse error:', parseError)
      console.error('Gemini raw response:', rawText)

      return res.status(500).json({
        success: false,
        message: 'AI returned an invalid format. Please try again.',
        rawResponse: rawText
      })
    }

    parsedResult.id = `toy-${Date.now()}`

    return res.json({
      success: true,
      result: parsedResult
    })
  } catch (error) {
    console.error('Gemini API error:', error)

    const isBusy = error.status === 503 || error.status === 429

    return res.status(500).json({
      success: false,
      message: isBusy
        ? "Google's AI service is busy right now. Please try again in a moment."
        : 'Failed to analyse toy image.',
      error: error.message
    })
  }
})

const server = app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`)
})

server.on('error', (err) => {
  console.error('[diagnostic] server error:', err)
})

setInterval(() => {
  console.log('[diagnostic] heartbeat - process still alive')
}, 5000)