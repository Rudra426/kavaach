import axios from 'axios'

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:8000',
})

export interface ConsentPayload {
  policy_issuance: boolean
  location_use: boolean
  fraud_scoring: boolean
  notifications: boolean
  timestamp?: string
}

export interface GrievancePayload {
  rider_id: string
  policy_id?: string
  issue_type: string
  description: string
  contact: string
}

export const submitGrievance = (payload: GrievancePayload) =>
  API.post('/compliance/grievance', payload)

export const getPrivacyData = (riderId: string) =>
  API.get(`/compliance/privacy/${riderId}`)

export const requestDeletion = (riderId: string) =>
  API.post(`/compliance/deletion/${riderId}`)

export const withdrawConsent = (riderId: string, purpose: string) =>
  API.patch(`/compliance/consent/${riderId}/withdraw`, { purpose })
