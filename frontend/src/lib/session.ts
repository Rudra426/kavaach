const RIDER_ID_KEY = 'kavaach_rider_id'
const PHONE_KEY = 'kavaach_phone'

export function setSession(riderId: string, phone: string): void {
  localStorage.setItem(RIDER_ID_KEY, riderId)
  localStorage.setItem(PHONE_KEY, phone)
}

export function getSessionRiderId(): string | null {
  return localStorage.getItem(RIDER_ID_KEY)
}

export function clearSession(): void {
  localStorage.removeItem(RIDER_ID_KEY)
  localStorage.removeItem(PHONE_KEY)
}
