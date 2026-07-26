import axios from 'axios'
import { toastError, toastSuccess } from '@/hooks/use-toast'
import { extractApiMessage, shouldToastSuccess } from '@/lib/api-message'

// Unset → local Compose default. Empty string → same-origin (Railway combined app).
const baseURL =
  import.meta.env.VITE_API_BASE_URL === undefined
    ? 'http://localhost:3000'
    : import.meta.env.VITE_API_BASE_URL

declare module 'axios' {
  export interface AxiosRequestConfig {
    skipErrorToast?: boolean
    skipSuccessToast?: boolean
  }
}

export const api = axios.create({
  baseURL,
  timeout: 10_000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.response.use(
  (response) => {
    const config = response.config
    if (!shouldToastSuccess(config.method, config.skipSuccessToast)) {
      return response
    }

    const message = extractApiMessage(response.data)
    if (message) {
      toastSuccess(message)
    }

    return response
  },
  (error: unknown) => {
    if (axios.isAxiosError(error)) {
      if (!error.config?.skipErrorToast) {
        const message =
          extractApiMessage(error.response?.data) ??
          error.message ??
          'Request failed'
        toastError(message)
      }
    } else {
      toastError('Request failed')
    }

    return Promise.reject(error)
  },
)
