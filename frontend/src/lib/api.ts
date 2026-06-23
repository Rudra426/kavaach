import axios from 'axios'
import type {
  AdminHeatmapPoint,
  AdminRider,
  AdminStats,
  ClaimDetail,
  ClaimListItem,
  DashboardResponse,
  NotificationResponse,
  PaymentResponse,
  PolicyResponse,
  PredictRequest,
  PremiumQuote,
  RegisterRequest,
  RegisterResponse,
  RiderProfile,
  WeatherResponse,
  WeatherAlert,
} from '../types/api'

const baseURL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'
let offlineModeUntil = 0

const DAY_MS = 24 * 60 * 60 * 1000

const PLATFORM_LABELS: Record<string, string> = {
  pharmeasy:  'PharmEasy',
  netmeds:    'Netmeds',
  tata1mg:    'Tata 1mg',
  apollo24x7: 'Apollo 24×7',
  phonepe:    'PhonePe Health',
}

const PINCODE_LOOKUP: Record<string, { city: string; area: string; zone: string }> = {
  '400063': { city: 'Mumbai',    area: 'Andheri East',     zone: 'residential' },
  '400001': { city: 'Mumbai',    area: 'Fort',             zone: 'commercial'  },
  '110001': { city: 'Delhi',     area: 'Connaught Place',  zone: 'commercial'  },
  '560001': { city: 'Bengaluru', area: 'MG Road',          zone: 'commercial'  },
  '500001': { city: 'Hyderabad', area: 'Abids',            zone: 'commercial'  },
  '390001': { city: 'Vadodara',  area: 'Alkapuri',         zone: 'commercial'  },
  '390002': { city: 'Vadodara',  area: 'Fatehgunj',        zone: 'residential' },
  '380001': { city: 'Ahmedabad', area: 'Bhadra',           zone: 'commercial'  },
  '395001': { city: 'Surat',     area: 'Nanpura',          zone: 'commercial'  },
  '411001': { city: 'Pune',      area: 'Shivajinagar',     zone: 'commercial'  },
  '600001': { city: 'Chennai',   area: "Parry's Corner",   zone: 'commercial'  },
}

export const DEMO_ACCOUNT = {
  riderId:  'DEMO001',
  phone:    '9999999999',
  name:     'Ramesh Demo',
  city:     'Mumbai',
  pincode:  '400063',
  upiId:    'ramesh.demo@ybl',
  platform: 'pharmeasy,netmeds',
}

export const api = axios.create({ baseURL, timeout: 15000 })

function isoDaysAgo(daysAgo: number): string {
  return new Date(Date.now() - daysAgo * DAY_MS).toISOString()
}

function isoDaysAhead(daysAhead: number): string {
  return new Date(Date.now() + daysAhead * DAY_MS).toISOString()
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function roundTo2(value: number): number {
  return Math.round(value * 100) / 100
}

function isNetworkError(error: unknown): boolean {
  return axios.isAxiosError(error) && !error.response
}

function isOfflineMode(): boolean {
  return Date.now() < offlineModeUntil
}

function enableOfflineMode(): void {
  offlineModeUntil = Date.now() + 60_000
}

function normalizePincodeInfo(pincode: string): { city: string; area: string; zone: string } {
  return PINCODE_LOOKUP[pincode] ?? { city: 'Unknown City', area: 'Unknown Area', zone: 'residential' }
}

function deriveRiskScore(pincode: string): number {
  const seed = pincode.replace(/\D/g, '').split('').reduce((sum, d) => sum + Number(d || 0), 0)
  return roundTo2(clamp(1.8 + ((seed * 17) % 32) / 10, 1, 5))
}

function riskLabel(score: number): string {
  if (score <= 2)   return 'Low'
  if (score <= 3.5) return 'Medium'
  return 'High'
}

function normalizeDeliveryType(deliveryType: string): 'hyperlocal' | 'same_day' | 'scheduled' {
  const value = deliveryType.toLowerCase().replace('-', '_')
  if (value === 'hyperlocal' || value === 'same_day' || value === 'scheduled') return value
  return 'same_day'
}

function estimatePremiumLocally(payload: PredictRequest): PremiumQuote {
  const weeklyEarnings  = clamp(Number(payload.weekly_earnings) || 0, 1500, 15000)
  const deliveryType    = normalizeDeliveryType(payload.delivery_type)
  const avgDeliveries   = clamp(Number(payload.avg_deliveries_per_day) || 10, 1, 30)
  const experienceYears = clamp(Number(payload.experience_years) || 1, 0, 20)
  const noClaimWeeks    = clamp(Number(payload.no_claim_weeks) || 0, 0, 7)
  const pincode         = payload.pincode || DEMO_ACCOUNT.pincode

  const { city, area, zone } = normalizePincodeInfo(pincode)
  const riskScore = deriveRiskScore(pincode)

  const modelMultiplier     = { hyperlocal: 1.35, same_day: 1.0, scheduled: 0.76 }[deliveryType]
  const coldChainMultiplier = payload.cold_chain
    ? ({ insulin: 1.35, vaccine: 1.3, biologic: 1.4, regular_cold: 1.2 }[payload.medicine_type] ?? 1.22)
    : 1.0
  const platformMultiplier  = 1 + (Math.max(payload.platforms.length, 1) - 1) * 0.05
  const consistencyDiscount = 1 - clamp((experienceYears / 20) * 0.07, 0, 0.07)
  const noClaimDiscount     = 1 - Math.min(noClaimWeeks * 0.03, 0.2)
  const deliveriesFactor    = 1 + (avgDeliveries - 10) * 0.01
  const riskFactor          = 1 + ((riskScore - 1) / 4) * 0.22

  let base = 35
  if (weeklyEarnings >= 3000 && weeklyEarnings < 6000) base = 60
  if (weeklyEarnings >= 6000) base = 95

  const raw    = base * modelMultiplier * coldChainMultiplier * platformMultiplier * deliveriesFactor * riskFactor * consistencyDiscount * noClaimDiscount
  const capped = Math.min(raw, weeklyEarnings * 0.15)
  const weeklyPremium = roundTo2(clamp(capped, 25, 250))

  return {
    weekly_premium:  weeklyPremium,
    monthly_premium: roundTo2(weeklyPremium * 4.33),
    annual_premium:  roundTo2(weeklyPremium * 52),
    coverage_amount: roundTo2(weeklyPremium * 52 * 10),
    risk_score:      riskScore,
    risk_level:      riskLabel(riskScore),
    cap_applied:     raw > weeklyEarnings * 0.15,
    city, area, zone,
  }
}

function buildDemoClaims(riderId: string): ClaimListItem[] {
  return [
    {
      id: 'CLMGRN1', rider_id: riderId, policy_id: 'POLDEMO1',
      trigger_id: 'TRGFLOOD1', fraud_score: 24, tier: 'GREEN',
      status: 'paid', payout_amount: 1440, held_amount: 0,
      servicenow_ticket_id: null, created_at: isoDaysAgo(2),
    },
    {
      id: 'CLMYLW1', rider_id: riderId, policy_id: 'POLDEMO1',
      trigger_id: 'TRGAQI1', fraud_score: 44, tier: 'YELLOW',
      status: 'partial_paid', payout_amount: 960, held_amount: 640,
      servicenow_ticket_id: 'SN_MOCK_CLMYLW1', created_at: isoDaysAgo(9),
    },
    {
      id: 'CLMRED1', rider_id: riderId, policy_id: 'POLDEMO1',
      trigger_id: 'TRGCYCL1', fraud_score: 78, tier: 'RED',
      status: 'review', payout_amount: 0, held_amount: 1900,
      servicenow_ticket_id: 'SN_MOCK_CLMRED1', created_at: isoDaysAgo(20),
    },
  ]
}

function buildDemoDashboard(riderId: string): DashboardResponse {
  const claims = buildDemoClaims(riderId)
  return {
    rider: {
      id: riderId, name: DEMO_ACCOUNT.name,
      pincode: DEMO_ACCOUNT.pincode, city: DEMO_ACCOUNT.city,
      platform: DEMO_ACCOUNT.platform,
    },
    policy: {
      id: 'POLDEMO1', status: 'active',
      weekly_premium: 187, coverage_amount: 97240,
      no_claim_weeks: 3, next_payment_due: isoDaysAhead(4),
    },
    claims: claims.map((c) => ({
      id: c.id, trigger_id: c.trigger_id ?? 'TRGDEMO',
      fraud_score: c.fraud_score, tier: c.tier,
      status: c.status, payout_amount: c.payout_amount,
      created_at: c.created_at,
    })),
    active_triggers: [{ id: 'TRGFLOOD1', type: 'flood', severity: 1.15, fired_at: isoDaysAgo(1) }],
    weather_alert: true,
  }
}

function buildDemoPolicy(riderId: string): PolicyResponse {
  return {
    policy_id: 'POLDEMO1', rider_id: riderId,
    name: DEMO_ACCOUNT.name, phone: DEMO_ACCOUNT.phone,
    pincode: DEMO_ACCOUNT.pincode, city: DEMO_ACCOUNT.city,
    platform: DEMO_ACCOUNT.platform,
    delivery_type: 'hyperlocal', weekly_premium: 187,
    coverage_amount: 97240, status: 'active',
    no_claim_weeks: 3, next_payment_due: isoDaysAhead(4),
    start_date: isoDaysAgo(56),
  }
}

function buildDemoRiderProfile(riderId: string): RiderProfile {
  return {
    rider_id: riderId, name: DEMO_ACCOUNT.name,
    phone: DEMO_ACCOUNT.phone, upi_id: DEMO_ACCOUNT.upiId,
    pincode: DEMO_ACCOUNT.pincode, city: DEMO_ACCOUNT.city,
    platform: DEMO_ACCOUNT.platform,
    delivery_type: 'hyperlocal', weekly_earnings: 6200,
    cold_chain: false,
    medicine_type: 'regular_cold',
    member_since: isoDaysAgo(56),
    policy: {
      id: 'POLDEMO1', status: 'active',
      weekly_premium: 187, monthly_premium: 809.71,
      coverage_amount: 97240, no_claim_weeks: 3,
      discount_percent: 9, next_payment_due: isoDaysAhead(4),
      start_date: isoDaysAgo(56), days_until_due: 4,
    },
    stats: { total_claims: 3, paid_claims: 2, total_received: 2400, total_premium_paid: 1496 },
  }
}

function buildDemoClaimDetail(claimId: string): ClaimDetail {
  const claims = buildDemoClaims(DEMO_ACCOUNT.riderId)
  const found  = claims.find((c) => c.id === claimId) ?? claims[0]
  return {
    claim_id:    found.id,
    status:      found.status,
    tier:        found.tier,
    fraud_score: found.fraud_score,
    payout_amount: found.payout_amount,
    held_amount:   found.held_amount,
    created_at:    found.created_at,
    resolved_at:   found.status.includes('paid') ? isoDaysAgo(1) : null,
    servicenow_ticket: found.servicenow_ticket_id ?? null,
    trigger: {
      type:      found.trigger_id?.includes('AQI') ? 'aqi' : found.trigger_id?.includes('CYCL') ? 'cyclone' : 'flood',
      actual:    found.trigger_id?.includes('AQI') ? 228 : 86,
      threshold: found.trigger_id?.includes('AQI') ? 200 : 75,
      severity:  found.trigger_id?.includes('AQI') ? 1.14 : 1.15,
      fired_at:  isoDaysAgo(2),
    },
    payouts: [
      {
        amount:      found.payout_amount,
        type:        found.tier === 'GREEN' ? 'full' : 'partial',
        status:      found.payout_amount > 0 ? 'processed' : 'pending',
        upi_ref:     found.payout_amount > 0 ? `rzp_demo_${found.id}` : null,
        credited_at: isoDaysAgo(2),
      },
    ],
    tier_explanation:
      found.tier === 'GREEN'
        ? 'Auto-paid immediately — all checks passed'
        : found.tier === 'YELLOW'
          ? '60% paid immediately, 40% pending soft verification'
          : 'Full hold — manual review in progress',
  }
}

function buildDemoNotifications(riderId: string): NotificationResponse {
  return {
    rider_id: riderId,
    unread_count: 4,
    notifications: [
      { type: 'warning', title: 'Premium Due Soon',         message: '₹187 due in 2 day(s)',                                    time: isoDaysAgo(0) },
      { type: 'success', title: 'Payout Credited',          message: '₹1,440 credited to your UPI (GREEN tier)',                 time: isoDaysAgo(2) },
      { type: 'alert',   title: 'FLOOD Alert in Mumbai',    message: 'Coverage active — payout will be processed automatically', time: isoDaysAgo(1) },
      { type: 'info',    title: 'No-Claim Discount Active', message: '3 claim-free week(s) — 9% discount applied',               time: isoDaysAgo(0) },
    ],
  }
}

function buildDemoPayments(): PaymentResponse {
  const payments = Array.from({ length: 8 }, (_, i) => {
    const week   = i + 1
    const isPaid = week < 8
    return {
      week,
      due_date: isoDaysAgo((8 - week) * 7),
      amount:   187,
      status:   isPaid ? 'paid' : 'due',
      upi_ref:  isPaid ? `KVPDEMO${String(week).padStart(3, '0')}` : null,
    }
  })
  return { policy_id: 'POLDEMO1', weekly_premium: 187, next_due: isoDaysAhead(4), payments }
}

function buildDemoWeather(pincode: string): WeatherResponse {
  const info = normalizePincodeInfo(pincode)
  const alert: WeatherAlert = { type: 'flood', message: 'Heavy rain alert in your area', severity: 'high', threshold: 75, actual_value: 82, unit: '%' }
  return {
    pincode, city: info.city, area: info.area,
    temperature: 38, rainfall_probability: 82,
    wind_speed: 41, aqi: 176,
    alerts: [alert],
    coverage_active: true,
    thresholds: { flood: 75, heat: 43, aqi: 200, cyclone: 60 },
    last_updated: new Date().toISOString(),
  }
}

function buildDemoAdminRiders(): AdminRider[] {
  return [
    {
      id: DEMO_ACCOUNT.riderId, name: DEMO_ACCOUNT.name,
      phone: DEMO_ACCOUNT.phone, pincode: DEMO_ACCOUNT.pincode,
      city: DEMO_ACCOUNT.city, platform: 'pharmeasy,netmeds',
      weekly_earnings: 6200, created_at: isoDaysAgo(56),
    },
    {
      id: 'RIDER102', name: 'Priya Nair',
      phone: '9880012233', pincode: '560001', city: 'Bengaluru',
      platform: 'tata1mg', weekly_earnings: 5400, created_at: isoDaysAgo(40),
    },
    {
      id: 'RIDER220', name: 'Arman Khan',
      phone: '9899944455', pincode: '110001', city: 'Delhi',
      platform: 'apollo24x7', weekly_earnings: 7200, created_at: isoDaysAgo(17),
    },
  ]
}

function buildDemoAdminClaims(): ClaimListItem[] {
  return [
    ...buildDemoClaims(DEMO_ACCOUNT.riderId),
    {
      id: 'CLM2201', rider_id: 'RIDER220', policy_id: 'POL2201',
      trigger_id: 'TRGHEAT9', fraud_score: 29, tier: 'GREEN',
      status: 'paid', payout_amount: 1680, held_amount: 0,
      servicenow_ticket_id: null, created_at: isoDaysAgo(3),
    },
    {
      id: 'CLM1021', rider_id: 'RIDER102', policy_id: 'POL1021',
      trigger_id: 'TRGAQI9', fraud_score: 59, tier: 'YELLOW',
      status: 'approved', payout_amount: 980, held_amount: 650,
      servicenow_ticket_id: 'SN_MOCK_CLM1021', created_at: isoDaysAgo(4),
    },
  ]
}

function buildDemoAdminHeatmap(): AdminHeatmapPoint[] {
  return [
    { pincode: '400063', city: 'Mumbai',    area: 'Andheri East',    risk_score: 3.4, active_riders: 14, active_triggers: 1, flood_risk: 0.74, heat_risk: 0.52, aqi_risk: 0.47 },
    { pincode: '110001', city: 'Delhi',     area: 'Connaught Place', risk_score: 3.8, active_riders: 11, active_triggers: 2, flood_risk: 0.48, heat_risk: 0.81, aqi_risk: 0.86 },
    { pincode: '560001', city: 'Bengaluru', area: 'MG Road',         risk_score: 2.1, active_riders:  9, active_triggers: 0, flood_risk: 0.39, heat_risk: 0.33, aqi_risk: 0.29 },
    { pincode: '500001', city: 'Hyderabad', area: 'Abids',           risk_score: 2.7, active_riders:  7, active_triggers: 1, flood_risk: 0.41, heat_risk: 0.58, aqi_risk: 0.49 },
    { pincode: '390001', city: 'Vadodara',  area: 'Alkapuri',        risk_score: 2.3, active_riders:  5, active_triggers: 0, flood_risk: 0.32, heat_risk: 0.62, aqi_risk: 0.55 },
  ]
}

function buildDemoAdminStats(): AdminStats {
  return { total_riders: 34, active_policies: 31, total_claims: 19, total_payouts: 15, total_paid_amount: 114260 }
}

function isDemoRider(riderId: string): boolean {
  return riderId.toUpperCase().startsWith('DEMO')
}

export async function predictPremium(payload: PredictRequest): Promise<PremiumQuote> {
  if (isOfflineMode()) return estimatePremiumLocally(payload)
  try {
    const { data } = await api.post<PremiumQuote>('/predict', payload)
    return data
  } catch (error) {
    if (isNetworkError(error)) enableOfflineMode()
    return estimatePremiumLocally(payload)
  }
}

export async function registerRider(payload: RegisterRequest): Promise<RegisterResponse> {
  const buildOfflineResponse = (): RegisterResponse => {
    const quote = estimatePremiumLocally({
      pincode:                payload.pincode,
      weekly_earnings:        payload.weekly_earnings,
      platforms:              payload.platforms,
      delivery_type:          payload.delivery_type,
      cold_chain:             payload.cold_chain,
      medicine_type:          payload.medicine_type,
      experience_years:       payload.experience_years,
      avg_deliveries_per_day: payload.avg_deliveries_per_day,
      no_claim_weeks:         0,
    })
    return {
      success:          true,
      rider_id:         payload.phone === DEMO_ACCOUNT.phone ? DEMO_ACCOUNT.riderId : `DEMO${Date.now().toString().slice(-4)}`,
      policy_id:        `POL${Date.now().toString().slice(-6)}`,
      name:             payload.name,
      city:             quote.city,
      weekly_premium:   quote.weekly_premium,
      coverage_amount:  quote.coverage_amount,
      next_payment_due: isoDaysAhead(7),
      risk_score:       quote.risk_score,
      risk_level:       quote.risk_level,
      message:          'Demo policy activated (offline mode).',
    }
  }

  if (isOfflineMode()) return buildOfflineResponse()
  try {
    const { data } = await api.post<RegisterResponse>('/register', payload)
    return data
  } catch (error) {
    if (isNetworkError(error)) enableOfflineMode()
    return buildOfflineResponse()
  }
}

export async function getDashboard(riderId: string): Promise<DashboardResponse> {
  if (isDemoRider(riderId)) return buildDemoDashboard(riderId)
  try {
    const { data } = await api.get<DashboardResponse>(`/dashboard/${riderId}`)
    return data
  } catch (error) {
    if (isNetworkError(error)) return buildDemoDashboard(riderId)
    throw error
  }
}

export async function getPolicy(riderId: string): Promise<PolicyResponse> {
  if (isDemoRider(riderId)) return buildDemoPolicy(riderId)
  try {
    const { data } = await api.get<PolicyResponse>(`/policy/${riderId}`)
    return data
  } catch (error) {
    if (isNetworkError(error)) return buildDemoPolicy(riderId)
    throw error
  }
}

export async function getRiderProfile(riderId: string): Promise<RiderProfile> {
  if (isDemoRider(riderId)) return buildDemoRiderProfile(riderId)
  try {
    const { data } = await api.get<RiderProfile>(`/rider/${riderId}`)
    return data
  } catch (error) {
    if (isNetworkError(error)) return buildDemoRiderProfile(riderId)
    throw error
  }
}

export async function getClaim(claimId: string): Promise<ClaimDetail> {
  try {
    const { data } = await api.get<ClaimDetail>(`/claim/${claimId}`)
    return data
  } catch (error) {
    if (isNetworkError(error) || claimId.toUpperCase().startsWith('CLM')) {
      return buildDemoClaimDetail(claimId)
    }
    throw error
  }
}

export async function getNotifications(riderId: string): Promise<NotificationResponse> {
  if (isDemoRider(riderId)) return buildDemoNotifications(riderId)
  try {
    const { data } = await api.get<NotificationResponse>(`/notifications/${riderId}`)
    return data
  } catch (error) {
    if (isNetworkError(error)) return buildDemoNotifications(riderId)
    throw error
  }
}

export async function getPayments(riderId: string): Promise<PaymentResponse> {
  if (isDemoRider(riderId)) return buildDemoPayments()
  try {
    const { data } = await api.get<PaymentResponse>(`/payments/${riderId}`)
    return data
  } catch (error) {
    if (isNetworkError(error)) return buildDemoPayments()
    throw error
  }
}

export async function payNow(riderId: string): Promise<{ payment_link: string }> {
  if (isDemoRider(riderId)) return { payment_link: 'https://rzp.io/demo-pay' }
  try {
    const { data } = await api.post<{ payment_link: string }>(`/premium/pay-now/${riderId}`)
    return data
  } catch (error) {
    if (isNetworkError(error)) return { payment_link: 'https://rzp.io/demo-pay' }
    throw error
  }
}

export async function subscribePremium(riderId: string): Promise<{ payment_link: string }> {
  if (isDemoRider(riderId)) return { payment_link: 'https://rzp.io/demo-autodebit' }
  try {
    const { data } = await api.post<{ payment_link: string }>(`/premium/subscribe/${riderId}`)
    return data
  } catch (error) {
    if (isNetworkError(error)) return { payment_link: 'https://rzp.io/demo-autodebit' }
    throw error
  }
}

export async function getWeather(pincode: string): Promise<WeatherResponse> {
  try {
    const { data } = await api.get<WeatherResponse>(`/weather/${pincode}`)
    return data
  } catch (error) {
    if (isNetworkError(error)) return buildDemoWeather(pincode)
    throw error
  }
}

export async function getAdminStats(): Promise<AdminStats> {
  try {
    const { data } = await api.get<AdminStats>('/admin/stats')
    return data
  } catch (error) {
    if (isNetworkError(error)) return buildDemoAdminStats()
    throw error
  }
}

export async function getAdminClaims(): Promise<ClaimListItem[]> {
  try {
    const { data } = await api.get<ClaimListItem[]>('/admin/claims')
    return data
  } catch (error) {
    if (isNetworkError(error)) return buildDemoAdminClaims()
    throw error
  }
}

export async function getAdminRiders(): Promise<AdminRider[]> {
  try {
    const { data } = await api.get<AdminRider[]>('/admin/riders')
    return data
  } catch (error) {
    if (isNetworkError(error)) return buildDemoAdminRiders()
    throw error
  }
}

export async function getAdminHeatmap(): Promise<AdminHeatmapPoint[]> {
  try {
    const { data } = await api.get<AdminHeatmapPoint[]>('/admin/heatmap')
    return data
  } catch (error) {
    if (isNetworkError(error)) return buildDemoAdminHeatmap()
    throw error
  }
}

export async function approveClaim(claimId: string): Promise<{ approved: boolean }> {
  try {
    const { data } = await api.post<{ approved: boolean }>(`/admin/approve/${claimId}`)
    return data
  } catch (error) {
    if (isNetworkError(error)) return { approved: true }
    throw error
  }
}

export async function rejectClaim(claimId: string): Promise<{ rejected: boolean }> {
  try {
    const { data } = await api.post<{ rejected: boolean }>(`/admin/reject/${claimId}`)
    return data
  } catch (error) {
    if (isNetworkError(error)) return { rejected: true }
    throw error
  }
}

export async function getClaimsForRider(riderId: string): Promise<ClaimListItem[]> {
  const claims = await getAdminClaims()
  return claims.filter((c) => c.rider_id === riderId)
}

export async function loginByPhone(phone: string): Promise<AdminRider | null> {
  if (phone === DEMO_ACCOUNT.phone) {
    return {
      id:              DEMO_ACCOUNT.riderId,
      name:            DEMO_ACCOUNT.name,
      phone:           DEMO_ACCOUNT.phone,
      pincode:         DEMO_ACCOUNT.pincode,
      city:            DEMO_ACCOUNT.city,
      platform:        DEMO_ACCOUNT.platform,
      weekly_earnings: 6200,
      created_at:      isoDaysAgo(56),
    }
  }
  const riders = await getAdminRiders()
  return riders.find((r) => r.phone === phone) ?? null
}

export function platformLabel(value: string): string {
  return value
    .split(',')
    .map((v) => PLATFORM_LABELS[v.trim()] ?? v)
    .join(', ')
}

// Re-export for components that import from this file
export type { WeatherAlert }
