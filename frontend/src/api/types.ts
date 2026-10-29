export interface Top3Item {
  class: string
  confidence: number
}

export interface Prediction {
  id: number
  predicted_class: string
  confidence: number
  top3_predictions: Top3Item[] | null
  gradcam_path: string | null
  image_path: string
  disease_name: string
  disease_description: string
  created_at: string
}

export interface TokenResponse {
  access_token: string
  token_type: string
}

export interface RegisterPayload {
  username: string
  email: string
  password: string
  preferred_language: string
}
