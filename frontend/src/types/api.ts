export type Tier = 'GREEN' | 'YELLOW' | 'RED'

export interface PredictRequest {
  pincode: string
  weekly_earnings: number
  platforms: string[]
  delivery_type: string
  cold_chain: boolean
  medicine_type: string
  experience_years: number
  avg_deliveries_per_day: number
  no_claim_weeks: number
}

export interface PremiumQuote {
  weekly_premium: number
  monthly_premium: number
  annual_premium: number
  coverage_amount: number
  risk_score: number
  risk_level: string
  cap_applied: boolean
  city: string
  area: string
  zone: string
}

export interface RegisterRequest {
  name: string
  phone: string
  upi_id: string
  pincode: string
  platforms: string[]
  delivery_type: string
  weekly_earnings: number
  experience_years: number
  cold_chain: boolean
  medicine_type: string
  avg_deliveries_per_day: number
}

export interface RegisterResponse {
  success: boolean
  rider_id: string
  policy_id: string
  name: string
  city: string
  weekly_premium: number
  coverage_amount: number
  next_payment_due: string
  risk_score: number
  risk_level: string
  message: string
}

export interface RiderProfile {
  rider_id: string
  name: string
  phone: string
  upi_id: string
  pincode: string
  city: string
  platform: string
  delivery_type: string
  weekly_earnings: number
  cold_chain: boolean
  medicine_type: string
  member_since: string
  policy: {
    id: string | null
    status: string
    weekly_premium: number
    monthly_premium: number
    coverage_amount: number
    no_claim_weeks: number
    discount_percent: number
    next_payment_due: string | null
    start_date: string | null
    days_until_due: number | null
  }
  stats: {
    total_claims: number
    paid_claims: number
    total_received: number
    total_premium_paid: number
  }
}

export interface PolicyResponse {
  policy_id: string
  rider_id: string
  name: string
  phone: string
  pincode: string
  city: string
  platform: string
  delivery_type: string
  weekly_premium: number
  coverage_amount: number
  status: string
  no_claim_weeks: number
  next_payment_due: string
  start_date: string
}

export interface ClaimListItem {
  id: string
  rider_id: string
  policy_id: string
  trigger_id?: string
  fraud_score: number
  tier: Tier
  status: string
  payout_amount: number
  held_amount: number
  servicenow_ticket_id?: string | null
  created_at: string
}

export interface DashboardResponse {
  rider: {
    id: string
    name: string
    pincode: string
    city: string
    platform: string
  }
  policy: {
    id: string | null
    status: string
    weekly_premium: number
    coverage_amount: number
    no_claim_weeks: number
    next_payment_due: string | null
  }
  claims: Array<{
    id: string
    trigger_id: string
    fraud_score: number
    tier: Tier
    status: string
    payout_amount: number
    created_at: string
  }>
  active_triggers: Array<{
    id: string
    type: string
    severity: number
    fired_at: string
  }>
  weather_alert: boolean
}

export interface ClaimDetail {
  claim_id: string
  status: string
  tier: Tier
  fraud_score: number
  payout_amount: number
  held_amount: number
  created_at: string
  resolved_at: string | null
  servicenow_ticket: string | null
  trigger: {
    type: string | null
    actual: number | null
    threshold: number | null
    severity: number | null
    fired_at: string | null
  }
  payouts: Array<{
    amount: number
    type: string
    status: string
    upi_ref: string | null
    credited_at: string
  }>
  tier_explanation: string
}

export interface NotificationResponse {
  rider_id: string
  unread_count: number
  notifications: Array<{
    type: 'warning' | 'success' | 'alert' | 'info'
    title: string
    message: string
    time: string
  }>
}

export interface PaymentResponse {
  policy_id: string
  weekly_premium: number
  next_due: string
  payments: Array<{
    week: number
    due_date: string
    amount: number
    status: string
    upi_ref: string | null
  }>
}

export interface WeatherResponse {
  pincode: string
  city: string
  area: string
  temperature: number | null
  rainfall_probability: number | null
  wind_speed: number | null
  aqi: number
  alerts: Array<{
    type: string
    message: string
    severity: string
  }>
  coverage_active: boolean
  last_updated: string
}

export interface AdminStats {
  total_riders: number
  active_policies: number
  total_claims: number
  total_payouts: number
  total_paid_amount: number
}

export interface AdminHeatmapPoint {
  pincode: string
  city: string
  area: string
  risk_score: number
  active_riders: number
  active_triggers: number
  flood_risk: number
  heat_risk: number
  aqi_risk: number
}

export interface AdminRider {
  id: string
  name: string
  phone: string
  pincode: string
  city: string
  platform: string
  weekly_earnings: number
  created_at: string
}
