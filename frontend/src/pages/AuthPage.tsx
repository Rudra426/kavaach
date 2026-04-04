import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import gsap from 'gsap'
import { Shield, CheckCircle2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { DEMO_ACCOUNT, loginByPhone } from '../lib/api'
import { setSession } from '../lib/session'

type AuthMode = 'login' | 'signup'

const cityOptions = ['Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Pune', 'Chennai', 'Jaipur', 'Other']

export function AuthPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const mode: AuthMode = location.pathname === '/signup' ? 'signup' : 'login'

  const pageRef = useRef<HTMLDivElement | null>(null)
  const formRef = useRef<HTMLDivElement | null>(null)

  const [loginPhone, setLoginPhone] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [otpDigits, setOtpDigits] = useState<string[]>(Array.from({ length: 6 }, () => ''))
  const [loadingLogin, setLoadingLogin] = useState(false)

  const [signupName, setSignupName] = useState('')
  const [signupPhone, setSignupPhone] = useState('')
  const [signupCity, setSignupCity] = useState('Mumbai')
  const [signupPincode, setSignupPincode] = useState('')

  const otpValue = useMemo(() => otpDigits.join(''), [otpDigits])

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power2.out' } })
      tl.from('.auth-left', { x: -40, opacity: 0, duration: 0.6 })
        .from('.auth-right', { y: 20, opacity: 0, duration: 0.5 }, 0.2)
        .from('.wordmark', { scale: 0.92, opacity: 0, duration: 0.35 }, 0.5)
        .from('.tab-switcher', { y: 10, opacity: 0, duration: 0.3 }, 0.6)
        .from('.form-field', { y: 8, opacity: 0, stagger: 0.07, duration: 0.35 }, 0.7)
        .from('.form-cta', { scale: 0.95, opacity: 0, duration: 0.28 }, 0.9)

      gsap.to('.weather-line', {
        y: 20,
        repeat: -1,
        duration: 8,
        ease: 'none',
      })
    }, pageRef)

    return () => {
      ctx.revert()
    }
  }, [])

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(formRef.current, { opacity: 0, x: 12 }, { opacity: 1, x: 0, duration: 0.25, ease: 'power2.out' })
    }, formRef)

    return () => {
      ctx.revert()
    }
  }, [mode])

  const handleSendOtp = () => {
    if (loginPhone.trim().length < 10) {
      toast.error('Enter a valid mobile number')
      return
    }
    setOtpSent(true)
    toast.success('OTP sent (mock): 123456')
  }

  const handleOtpChange = (index: number, nextValue: string) => {
    const digit = nextValue.replace(/\D/g, '').slice(0, 1)
    setOtpDigits((prev) => {
      const copy = [...prev]
      copy[index] = digit
      return copy
    })

    if (digit && index < 5) {
      const nextInput = document.querySelector<HTMLInputElement>(`input[data-otp-index="${index + 1}"]`)
      nextInput?.focus()
    }
  }

  const handleLogin = async () => {
    if (!otpSent) {
      handleSendOtp()
      return
    }

    if (otpValue.length !== 6) {
      toast.error('Please enter 6-digit OTP')
      return
    }

    try {
      setLoadingLogin(true)
      const rider = await loginByPhone(loginPhone)
      if (!rider) {
        toast.error('Phone not found. Please sign up first.')
        navigate('/signup')
        return
      }
      setSession(rider.id, rider.phone)
      toast.success('Welcome back!')
      navigate(`/dashboard/${rider.id}`)
    } catch (error) {
      toast.error('Login failed. Please try again.')
    } finally {
      setLoadingLogin(false)
    }
  }

  const handleSignup = () => {
    if (!signupName || signupPhone.length < 10 || signupPincode.length !== 6) {
      toast.error('Please complete all required fields')
      return
    }

    navigate('/register', {
      state: {
        startStep: 2,
        prefill: {
          name: signupName,
          phone: signupPhone,
          city: signupCity,
          pincode: signupPincode,
        },
      },
    })
  }

  const handleDemoLogin = () => {
    setSession(DEMO_ACCOUNT.riderId, DEMO_ACCOUNT.phone)
    toast.success('Demo account ready')
    navigate(`/dashboard/${DEMO_ACCOUNT.riderId}`)
  }

  return (
    <div ref={pageRef} className="min-h-screen bg-bg">
      <div className="grid min-h-screen lg:grid-cols-[55%_45%]">
        <section className="auth-left relative hidden overflow-hidden bg-primary text-white lg:block">
          <div className="absolute inset-0 opacity-[0.06] [background-image:radial-gradient(#fff_1px,transparent_1px)] [background-size:5px_5px]" />
          <div className="absolute -bottom-20 -right-20 h-72 w-72 rounded-full bg-white/5" />
          <div className="absolute -bottom-10 -right-48 h-96 w-96 rounded-full bg-white/5" />
          <div className="absolute -bottom-32 -right-4 h-72 w-72 rounded-full bg-white/5" />

          <svg className="absolute inset-0 h-full w-full" viewBox="0 0 500 900" fill="none">
            <line className="weather-line" x1="70" y1="80" x2="140" y2="200" stroke="rgba(255,255,255,0.2)" strokeWidth="2" />
            <line className="weather-line" x1="130" y1="140" x2="200" y2="260" stroke="rgba(255,255,255,0.2)" strokeWidth="2" />
            <line className="weather-line" x1="300" y1="120" x2="370" y2="240" stroke="rgba(255,255,255,0.2)" strokeWidth="2" />
            <line className="weather-line" x1="350" y1="190" x2="420" y2="310" stroke="rgba(255,255,255,0.2)" strokeWidth="2" />
          </svg>

          <div className="relative mx-auto flex h-full max-w-lg flex-col justify-end px-12 pb-14 pt-12">
            <svg className="mb-8 h-72 w-full" viewBox="0 0 320 360" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M160 42L245 78V160C245 222 209 268 160 298C111 268 75 222 75 160V78L160 42Z" fill="white" fillOpacity="0.94" />
              <path d="M160 88L210 109V162C210 197 188 228 160 248C132 228 110 197 110 162V109L160 88Z" fill="#2E7D5E" />
              <circle cx="98" cy="260" r="16" fill="#2E7D5E" />
              <circle cx="222" cy="250" r="12" fill="#2E7D5E" />
              <path d="M160 193V138" stroke="#F7F5F0" strokeWidth="15" strokeLinecap="round" />
              <path d="M133 166H187" stroke="#F7F5F0" strokeWidth="15" strokeLinecap="round" />
            </svg>

            <blockquote className="font-display text-4xl leading-tight">
              बारिश हो या आंधी,
              <br />
              आपकी कमाई सुरक्षित है।
            </blockquote>
            <p className="mt-3 text-base text-white/75">
              Rain or storm - your income stays protected. Kavaach pays automatically when weather hits.
            </p>

            <div className="mt-6 flex flex-wrap gap-2 text-sm">
              <span className="rounded-full bg-white/15 px-3 py-1">🏍 12,400+ Riders</span>
              <span className="rounded-full bg-white/15 px-3 py-1">🌧 23 Cities</span>
              <span className="rounded-full bg-white/15 px-3 py-1">₹ 4.2Cr Paid</span>
            </div>
          </div>
        </section>

        <section className="auth-right flex items-center justify-center px-5 py-10 md:px-8">
          <div className="w-full max-w-md">
            <div className="rounded-2xl bg-surface p-6 md:p-8">
              <div className="wordmark flex items-center gap-2 text-primary">
                <Shield className="h-6 w-6" />
                <h1 className="font-display text-3xl">Kavaach</h1>
              </div>
              <div className="my-4 border-t border-border" />

              <div className="tab-switcher mx-auto mb-6 grid w-fit grid-cols-2 rounded-full bg-bg p-1">
                <Link
                  to="/login"
                  className={`rounded-full px-5 py-2 text-sm font-medium ${
                    mode === 'login' ? 'bg-primary text-white' : 'text-muted'
                  }`}
                >
                  Login
                </Link>
                <Link
                  to="/signup"
                  className={`rounded-full px-5 py-2 text-sm font-medium ${
                    mode === 'signup' ? 'bg-primary text-white' : 'text-muted'
                  }`}
                >
                  Sign Up
                </Link>
              </div>

              <div ref={formRef} key={mode}>
                {mode === 'login' ? (
                  <>
                    <h2 className="font-display text-3xl text-text">Welcome back</h2>
                    <p className="mt-2 text-sm text-muted">Enter your registered phone to continue</p>

                    <div className="mt-5 space-y-4">
                      <div className="form-field">
                        <label className="text-xs uppercase tracking-wide text-muted">Mobile Number</label>
                        <div className="mt-1 flex items-center gap-2">
                          <span className="rounded-xl bg-primary px-3 py-3 text-sm text-white">+91</span>
                          <input
                            value={loginPhone}
                            onChange={(event) => setLoginPhone(event.target.value.replace(/\D/g, '').slice(0, 10))}
                            className="input-base"
                            placeholder="98765 43210"
                          />
                        </div>
                      </div>

                      {!otpSent ? (
                        <button type="button" className="btn-primary form-cta w-full justify-center" onClick={handleSendOtp}>
                          Send OTP
                        </button>
                      ) : (
                        <div className="form-field rounded-xl border border-border bg-bg p-4">
                          <div className="flex items-center justify-between">
                            <label className="text-xs uppercase tracking-wide text-muted">Enter OTP</label>
                            <button type="button" className="text-sm text-accent" onClick={handleSendOtp}>
                              Resend OTP
                            </button>
                          </div>
                          <div className="mt-3 flex gap-2">
                            {otpDigits.map((digit, index) => (
                              <input
                                key={index}
                                data-otp-index={index}
                                value={digit}
                                onChange={(event) => handleOtpChange(index, event.target.value)}
                                className="h-12 w-10 border-b-2 border-border bg-transparent text-center font-display text-xl outline-none focus:border-primary"
                              />
                            ))}
                          </div>
                        </div>
                      )}

                      <button type="button" className="btn-primary form-cta w-full justify-center" onClick={handleLogin}>
                        {loadingLogin ? 'Loading...' : 'Continue →'}
                      </button>

                      <button type="button" className="btn-ghost form-cta w-full justify-center" onClick={handleDemoLogin}>
                        Use Demo Account
                      </button>
                      <p className="text-center text-xs text-muted">Demo phone: {DEMO_ACCOUNT.phone}</p>
                    </div>

                    <div className="my-5 flex items-center gap-3 text-sm text-muted">
                      <span className="h-px flex-1 bg-border" />
                      <span>or</span>
                      <span className="h-px flex-1 bg-border" />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <button className="rounded-xl border border-border px-3 py-3 text-sm text-muted">G Google</button>
                      <button className="rounded-xl border border-border px-3 py-3 text-sm text-muted">WhatsApp OTP</button>
                    </div>
                    <p className="mt-2 text-center text-xs text-muted">Coming soon</p>
                  </>
                ) : (
                  <>
                    <h2 className="font-display text-3xl text-text">Join Kavaach</h2>
                    <p className="mt-2 text-sm text-muted">Protection starts in under 2 minutes</p>
                    <div className="mt-5 space-y-4">
                      <div className="form-field">
                        <label className="text-xs uppercase tracking-wide text-muted">Full Name</label>
                        <input
                          value={signupName}
                          onChange={(event) => setSignupName(event.target.value)}
                          className="input-base mt-1"
                          placeholder="Rahul Kumar"
                        />
                      </div>

                      <div className="form-field">
                        <label className="text-xs uppercase tracking-wide text-muted">Mobile</label>
                        <div className="mt-1 flex items-center gap-2">
                          <span className="rounded-xl bg-primary px-3 py-3 text-sm text-white">+91</span>
                          <input
                            value={signupPhone}
                            onChange={(event) => setSignupPhone(event.target.value.replace(/\D/g, '').slice(0, 10))}
                            className="input-base"
                            placeholder="98765 43210"
                          />
                        </div>
                      </div>

                      <div className="form-field">
                        <label className="text-xs uppercase tracking-wide text-muted">City</label>
                        <select value={signupCity} onChange={(event) => setSignupCity(event.target.value)} className="input-base mt-1">
                          {cityOptions.map((city) => (
                            <option key={city}>{city}</option>
                          ))}
                        </select>
                      </div>

                      <div className="form-field relative">
                        <label className="text-xs uppercase tracking-wide text-muted">Pincode</label>
                        <input
                          value={signupPincode}
                          onChange={(event) => setSignupPincode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                          className="input-base mt-1"
                          placeholder="400063"
                        />
                        {signupPincode.length === 6 && (
                          <span className="pointer-events-none absolute right-4 top-9 flex items-center gap-1 text-xs text-accent2">
                            <CheckCircle2 className="h-4 w-4" />
                            {signupCity}
                          </span>
                        )}
                      </div>

                      <p className="text-center text-xs text-muted">
                        By continuing you agree to our <span className="text-accent underline">Terms</span> &{' '}
                        <span className="text-accent underline">Privacy Policy</span>
                      </p>

                      <button type="button" className="btn-primary form-cta w-full justify-center" onClick={handleSignup}>
                        Create My Account →
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>

            <p className="mt-4 text-center text-sm text-muted">
              Already protected?{' '}
              <Link to={mode === 'login' ? '/signup' : '/login'} className="text-accent underline">
                {mode === 'login' ? 'Sign up' : 'Login'}
              </Link>
            </p>
          </div>
        </section>
      </div>
    </div>
  )
}
