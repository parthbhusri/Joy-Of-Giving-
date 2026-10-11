// Single source of truth for the backend URL, so every page talks to the
// same backend (and therefore the same database).
//
// - `npm run dev`   -> local backend at http://localhost:5000
// - production build -> deployed Cloud Run backend
// Override either by creating Frontend/.env with:
//   VITE_API_URL=https://your-backend-url
const DEPLOYED_API_URL =
  'https://joy-of-giving-backend-144607008974.australia-southeast1.run.app'

export const API_BASE_URL = (
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? 'http://localhost:5000' : DEPLOYED_API_URL)
).replace(/\/$/, '')
