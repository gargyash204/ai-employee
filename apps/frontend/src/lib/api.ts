import axios from 'axios'

// Unset → local Compose default. Empty string → same-origin (Railway combined app).
const baseURL =
  import.meta.env.VITE_API_BASE_URL === undefined
    ? 'http://localhost:3000'
    : import.meta.env.VITE_API_BASE_URL

export const api = axios.create({
  baseURL,
  timeout: 10_000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
})
