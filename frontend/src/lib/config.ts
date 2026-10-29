export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/+$/, '')

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024
export const ACCEPTED_MIME = ['image/jpeg', 'image/png'] as const
export const ACCEPTED_EXT = ['.jpg', '.jpeg', '.png'] as const

export const LANGUAGES = [
  { code: 'en', label: 'English', native: 'English' },
  { code: 'hi', label: 'Hindi', native: 'हिन्दी' },
  { code: 'kn', label: 'Kannada', native: 'ಕನ್ನಡ' },
  { code: 'te', label: 'Telugu', native: 'తెలుగు' },
] as const

export type LanguageCode = (typeof LANGUAGES)[number]['code']
