import express from 'express'
import cors from 'cors'
import multer from 'multer'
import dotenv from 'dotenv'
import connectDB from './config/db.js'
import { GoogleGenAI } from '@google/genai'
import { Storage } from '@google-cloud/storage'
import { randomUUID } from 'crypto'
import ToyScan from './models/ToyScan.js'

dotenv.config()

await connectDB()

// ----------------------------------------------------
// Diagnostics
// ----------------------------------------------------

process.on('exit', (code) => {
  console.log(
    `[diagnostic] process exiting with code ${code}`
  )
})

process.on('uncaughtException', (err) => {
  console.error(
    '[diagnostic] uncaughtException:',
    err
  )
})

process.on('unhandledRejection', (reason) => {
  console.error(
    '[diagnostic] unhandledRejection:',
    reason
  )
})

if (!process.env.GEMINI_API_KEY) {
  console.error(
    '[diagnostic] GEMINI_API_KEY is missing or empty — check Backend/.env'
  )
} else {
  console.log(
    `[diagnostic] GEMINI_API_KEY loaded, length ${process.env.GEMINI_API_KEY.length}`
  )
}

// ----------------------------------------------------
// Express setup
// ----------------------------------------------------

const app = express()
const PORT = process.env.PORT || 5000

const allowedOrigins = [
  'http://localhost:5173',
  process.env.FRONTEND_URL
].filter(Boolean)

app.use(
  cors({
    origin: function (origin, callback) {
      if (
        !origin ||
        allowedOrigins.includes(origin)
      ) {
        callback(null, true)
      } else {
        callback(
          new Error('Not allowed by CORS')
        )
      }
    }
  })
)

app.use(express.json())

app.use((req, res, next) => {
  console.log(
    `[diagnostic] incoming request: ${req.method} ${req.url} (origin: ${
      req.headers.origin || 'none'
    })`
  )

  next()
})

// ----------------------------------------------------
// File upload
// ----------------------------------------------------

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024
  }
})

// ----------------------------------------------------
// Google Cloud Storage
// ----------------------------------------------------

const storage = new Storage({
  projectId: 'joy-of-giving-toy-index'
})

const IMAGE_BUCKET_NAME =
  process.env.TOY_IMAGE_BUCKET ||
  'joy-of-giving-toy-images-144607008974'

const imageBucket =
  storage.bucket(IMAGE_BUCKET_NAME)

console.log(
  `[storage] Toy image bucket: ${IMAGE_BUCKET_NAME}`
)

// ----------------------------------------------------
// Gemini
// ----------------------------------------------------

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
})

/*
  Gemini retry + fallback system

  Primary:
  gemini-3.8-flash

  Fallback:
  gemini-3.7-flash

  Behaviour:
  - Maximum 2 attempts per model.
  - Retries transient 408, 429, and 5xx errors.
  - Waits about 1 second plus jitter before the single retry.
  - If the primary model still fails, switches to the fallback model.
*/

async function generateContentWithRetry(params) {
  const models = [
    'gemini-3.8-flash',
    'gemini-3.7-flash'
  ]

  const maxAttemptsPerModel = 2
  let lastError

  for (const model of models) {
    console.log(
      `[diagnostic] Trying Gemini model: ${model}`
    )

    for (
      let attempt = 1;
      attempt <= maxAttemptsPerModel;
      attempt++
    ) {
      try {
        const response =
          await ai.models.generateContent({
            ...params,
            model
          })

        console.log(
          `[diagnostic] Gemini request succeeded using ${model}`
        )

        return response
      } catch (error) {
        lastError = error

        const status = error.status

        const isRetryable =
          status === 408 ||
          status === 429 ||
          (status >= 500 &&
            status <= 599)

        console.error(
          `[diagnostic] ${model} failed with status ${status} ` +
            `(attempt ${attempt}/${maxAttemptsPerModel})`
        )

        // Bad request, authentication, permission, etc.
        // Switching models will not fix these errors.
        if (!isRetryable) {
          throw error
        }

        // This model has used all of its attempts.
        // Move to the fallback model if one remains.
        if (
          attempt ===
          maxAttemptsPerModel
        ) {
          console.warn(
            `[diagnostic] ${model} unavailable after ` +
              `${maxAttemptsPerModel} attempts. ` +
              `Trying fallback model...`
          )

          break
        }

        // One short retry delay with jitter.
        const jitter =
          Math.floor(Math.random() * 500)

        const delayMs = 1000 + jitter

        console.log(
          `[diagnostic] Retrying ${model} in ${delayMs}ms...`
        )

        await new Promise((resolve) =>
          setTimeout(resolve, delayMs)
        )
      }
    }
  }

  // Both models failed.
  throw lastError
}

// ----------------------------------------------------
// Gemini response cleanup
// ----------------------------------------------------

function cleanJsonResponse(text) {
  return text
    .replace(/```json/g, '')
    .replace(/```/g, '')
    .trim()
}

// ----------------------------------------------------
// Health check
// ----------------------------------------------------

app.get('/', (req, res) => {
  res.json({
    message: 'Toy AI backend is running'
  })
})

// ----------------------------------------------------
// Toy analysis endpoint
// ----------------------------------------------------

app.post(
  '/api/analyze-toy',
  upload.single('toyImage'),
  async (req, res) => {
    try {
      // ----------------------------------------------
      // Validate uploaded image
      // ----------------------------------------------

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message:
            'No image file uploaded.'
        })
      }

      if (
        !req.file.mimetype.startsWith(
          'image/'
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            'Uploaded file must be an image.'
        })
      }

      const imageBase64 =
        req.file.buffer.toString(
          'base64'
        )

      // ----------------------------------------------
      // Gemini prompt
      // ----------------------------------------------

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

      // ----------------------------------------------
      // Send image to Gemini
      // ----------------------------------------------

      const response =
        await generateContentWithRetry({
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: prompt
                },
                {
                  inlineData: {
                    mimeType:
                      req.file.mimetype,
                    data: imageBase64
                  }
                }
              ]
            }
          ]
        })

      // ----------------------------------------------
      // Parse Gemini response
      // ----------------------------------------------

      const rawText = response.text

      const cleanedText =
        cleanJsonResponse(rawText)

      let parsedResult

      try {
        parsedResult =
          JSON.parse(cleanedText)
      } catch (parseError) {
        console.error(
          'JSON parse error:',
          parseError
        )

        console.error(
          'Gemini raw response:',
          rawText
        )

        return res.status(500).json({
          success: false,
          message:
            'AI returned an invalid format. Please try again.'
        })
      }

      // ----------------------------------------------
      // Generate permanent public result ID
      // ----------------------------------------------

      const publicId = randomUUID()

      parsedResult.id = publicId

      // ----------------------------------------------
      // Build permanent Cloud Storage object name
      // ----------------------------------------------

      const imageObjectName =
        `toy-scans/${publicId}`

      // ----------------------------------------------
      // Upload image to private Cloud Storage bucket
      // ----------------------------------------------

      try {
        const imageFile =
          imageBucket.file(
            imageObjectName
          )

        await imageFile.save(
          req.file.buffer,
          {
            resumable: false,

            metadata: {
              contentType:
                req.file.mimetype,

              cacheControl:
                'private, max-age=3600'
            }
          }
        )

        console.log(
          `[storage] Toy image saved: ${imageObjectName}`
        )
      } catch (storageError) {
        console.error(
          '[storage] Failed to save toy image:',
          storageError
        )

        return res.status(500).json({
          success: false,
          message:
            'Toy analysis succeeded, but the image could not be saved.'
        })
      }

      // ----------------------------------------------
      // Save assessment + image reference to MongoDB
      // ----------------------------------------------

      try {
        const savedScan =
          await ToyScan.create({
            publicId,

            imageObjectName,

            imageMimeType:
              req.file.mimetype,

            toyCategory:
              parsedResult.toyCategory,

            toyNameGuess:
              parsedResult.toyNameGuess,

            conditionSummary:
              parsedResult.conditionSummary,

            cleanliness:
              parsedResult.cleanliness,

            reusability:
              parsedResult.reusability,

            reliability:
              parsedResult.reliability,

            repairability:
              parsedResult.repairability,

            repairabilityReason:
              parsedResult.repairabilityReason,

            suggestedActions:
              parsedResult.suggestedActions,

            useCase:
              parsedResult.useCase,

            suggestedAgeRange:
              parsedResult.suggestedAgeRange,

            visibleSafetyConcerns:
              parsedResult.visibleSafetyConcerns,

            donationReadiness:
              parsedResult.donationReadiness,

            battery_operated:
              parsedResult.battery_operated,

            battery_note:
              parsedResult.battery_note,

            confidence:
              parsedResult.confidence,

            staffReviewRequired:
              parsedResult.staffReviewRequired,

            fun_fact:
              parsedResult.fun_fact
          })

        console.log(
          `[database] Toy scan saved: ${savedScan.publicId}`
        )
      } catch (databaseError) {
        console.error(
          '[database] Failed to save toy scan:',
          databaseError
        )

        // MongoDB failed after the image was uploaded.
        // Delete the orphaned image so Storage and
        // MongoDB remain in sync.
        try {
          await imageBucket
            .file(imageObjectName)
            .delete()

          console.log(
            `[storage] Removed orphaned image: ${imageObjectName}`
          )
        } catch (cleanupError) {
          console.error(
            '[storage] Failed to remove orphaned image:',
            cleanupError
          )
        }

        return res.status(500).json({
          success: false,
          message:
            'Toy analysis succeeded, but the result could not be saved.'
        })
      }

      // ----------------------------------------------
      // Return saved result
      // ----------------------------------------------

      return res.json({
        success: true,
        result: parsedResult
      })
    } catch (error) {
      console.error(
        'Gemini API error:',
        error
      )

      const isBusy =
        error.status === 408 ||
        error.status === 429 ||
        (error.status >= 500 &&
          error.status <= 599)

      return res
        .status(
          isBusy ? 503 : 500
        )
        .json({
          success: false,

          message: isBusy
            ? "Google's AI service is temporarily busy. Please try again in a moment."
            : 'Failed to analyse toy image.'
        })
    }
  }
)

// ----------------------------------------------------
// Retrieve saved toy result
// ----------------------------------------------------

app.get(
  '/api/results/:publicId',
  async (req, res) => {
    try {
      const { publicId } =
        req.params

      console.log(
        `[database] Fetching toy scan: ${publicId}`
      )

      const scan =
        await ToyScan.findOne({
          publicId
        })
          .select('-_id -__v')
          .lean()

      if (!scan) {
        return res
          .status(404)
          .json({
            success: false,
            message:
              'Toy scan not found.'
          })
      }

      return res.json({
        success: true,
        result: {
          ...scan,
          id: scan.publicId
        }
      })
    } catch (error) {
      console.error(
        '[database] Failed to retrieve toy scan:',
        error
      )

      return res
        .status(500)
        .json({
          success: false,
          message:
            'Failed to retrieve toy scan.'
        })
    }
  }
)

// ----------------------------------------------------
// Retrieve saved toy image
// ----------------------------------------------------

app.get(
  '/api/results/:publicId/image',
  async (req, res) => {
    try {
      const { publicId } =
        req.params

      console.log(
        `[storage] Fetching toy image for: ${publicId}`
      )

      // Find the assessment first so we know which
      // Cloud Storage object belongs to this UUID.
      const scan =
        await ToyScan.findOne({
          publicId
        })
          .select(
            'imageObjectName imageMimeType'
          )
          .lean()

      if (!scan) {
        return res
          .status(404)
          .json({
            success: false,
            message:
              'Toy scan not found.'
          })
      }

      // Older database records created before image
      // storage was added will not have an image.
      if (!scan.imageObjectName) {
        return res
          .status(404)
          .json({
            success: false,
            message:
              'No saved image exists for this toy scan.'
          })
      }

      const imageFile =
        imageBucket.file(
          scan.imageObjectName
        )

      const [exists] =
        await imageFile.exists()

      if (!exists) {
        console.warn(
          `[storage] Image object missing: ${scan.imageObjectName}`
        )

        return res
          .status(404)
          .json({
            success: false,
            message:
              'Saved toy image could not be found.'
          })
      }

      const [imageBuffer] =
        await imageFile.download()

      res.set(
        'Content-Type',
        scan.imageMimeType ||
          'application/octet-stream'
      )

      res.set(
        'Cache-Control',
        'public, max-age=3600'
      )

      return res.send(
        imageBuffer
      )
    } catch (error) {
      console.error(
        '[storage] Failed to retrieve toy image:',
        error
      )

      return res
        .status(500)
        .json({
          success: false,
          message:
            'Failed to retrieve toy image.'
        })
    }
  }
)

// ----------------------------------------------------
// Upload / Express error handling
// ----------------------------------------------------

app.use(
  (error, req, res, next) => {
    if (
      error instanceof
        multer.MulterError &&
      error.code ===
        'LIMIT_FILE_SIZE'
    ) {
      console.warn(
        '[diagnostic] Upload rejected: image exceeds 5 MB limit'
      )

      return res
        .status(413)
        .json({
          success: false,
          message:
            'Image is too large. Please upload an image smaller than 5 MB.'
        })
    }

    if (
      error instanceof
      multer.MulterError
    ) {
      console.error(
        '[diagnostic] Multer error:',
        error
      )

      return res
        .status(400)
        .json({
          success: false,
          message:
            'There was a problem uploading the image.'
        })
    }

    console.error(
      '[diagnostic] Unhandled Express error:',
      error
    )

    return res
      .status(500)
      .json({
        success: false,
        message:
          'Internal server error.'
      })
  }
)

// ----------------------------------------------------
// Start server
// ----------------------------------------------------

const server = app.listen(
  PORT,
  () => {
    console.log(
      `Backend running on http://localhost:${PORT}`
    )
  }
)

server.on(
  'error',
  (err) => {
    console.error(
      '[diagnostic] server error:',
      err
    )
  }
)