// Single source of truth for the backend URL, so every page talks to the
// same backend (and therefore the same database).
//
// To use a local backend instead, create Frontend/.env containing:
//   VITE_API_URL=http://localhost:5000
export const API_BASE_URL = (
  import.meta.env.VITE_API_URL ||
  'https://joy-of-giving-backend-144607008974.australia-southeast1.run.app'
).replace(/\/$/, '')
