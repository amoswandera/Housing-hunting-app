import { useCallback, useEffect, useMemo, useState } from 'react'
import AgentDashboard from './AgentDashboard'
import { cancelApplication, cancelBooking as cancelBookingApi, createSuperAdminUser, deleteSuperAdminHome, deleteSuperAdminUser, fetchAgentProfile, fetchAllHomesAdmin, fetchBookings, fetchHomes, fetchMyApplications, fetchProfile, fetchSuperAdminApplications, fetchSuperAdminOverview, fetchSuperAdminUsers, loginUser, registerUser, relistHome, requestPayment, resendVerificationEmail, resetPassword, returnHomeToAvailable, submitApplication, transferAgentHomes, updatePassword, updateProfile } from './supabaseApi'
import { supabase } from './supabaseClient'
import './App.css'

const initialHomes = [
  {
    id: 1,
    name: 'The Willow House',
    location: 'Kitisuru, Nairobi',
    region: 'Nairobi County',
    type: 'Two bedroom',
    parking: true,
    price: 85000,
    deposit: 170000,
    image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=900&q=80',
    tag: 'Just listed',
    details: 'Bright, quiet and close to Karura Forest.',
    agent_name: 'David Kimani',
    agent_phone: '+254712345678',
    agent_company: 'Habitat Premier Agencies',
  },
  {
    id: 2,
    name: 'Cedar & Stone',
    location: 'Kilimani, Nairobi',
    region: 'Nairobi County',
    type: 'Three bedroom',
    parking: true,
    price: 145000,
    deposit: 290000,
    image: 'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=900&q=80',
    tag: 'Popular',
    details: 'A calm, considered home with a private courtyard.',
    agent_name: 'Grace Muthoni',
    agent_phone: '+254722334455',
    agent_company: 'Urban Living Properties',
  },
  {
    id: 3,
    name: 'Palm Court Studio',
    location: 'Nyali, Mombasa',
    region: 'Mombasa County',
    type: 'Bedsitter',
    parking: false,
    price: 38000,
    deposit: 76000,
    image: 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=900&q=80',
    tag: 'Best value',
    details: 'A minimal, sunny studio near the coast.',
    agent_name: 'Hassan Omar',
    agent_phone: '+254733445566',
    agent_company: 'Coastline Haven Realty',
  },
  {
    id: 4,
    name: 'The Courtyard',
    location: 'Runda, Nairobi',
    region: 'Nairobi County',
    type: 'One bedroom',
    parking: true,
    price: 110000,
    deposit: 220000,
    image: 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=900&q=80',
    tag: 'Furnished',
    details: 'Turn-key apartment with a leafy shared garden.',
    agent_name: 'David Kimani',
    agent_phone: '+254712345678',
    agent_company: 'Habitat Premier Agencies',
  },
  {
    id: 5,
    name: 'Canopy House',
    location: 'Upper Hill, Nairobi',
    region: 'Nairobi County',
    type: 'Four bedroom',
    parking: true,
    price: 210000,
    deposit: 420000,
    image: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=900&q=80',
    tag: 'New today',
    details: 'Generous rooms, natural light and room to grow.',
    agent_name: 'Grace Muthoni',
    agent_phone: '+254722334455',
    agent_company: 'Urban Living Properties',
  },
  {
    id: 6,
    name: 'Lakeview Loft',
    location: 'Milimani, Kisumu',
    region: 'Kisumu County',
    type: 'Single room',
    parking: false,
    price: 55000,
    deposit: 110000,
    image: 'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?auto=format&fit=crop&w=900&q=80',
    tag: 'Quiet pick',
    details: 'A peaceful loft with a wide lake view.',
    agent_name: 'Otieno Brian',
    agent_phone: '+254711998877',
    agent_company: 'Lakeside Ventures',
  },
  {
    id: 7,
    name: 'Lavington Green',
    location: 'Lavington, Nairobi',
    region: 'Nairobi County',
    type: 'Two bedroom',
    parking: true,
    price: 95000,
    deposit: 190000,
    image: 'https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?auto=format&fit=crop&w=900&q=80',
    tag: 'Pet friendly',
    details: 'A leafy apartment with a generous balcony.',
    agent_name: 'David Kimani',
    agent_phone: '+254712345678',
    agent_company: 'Habitat Premier Agencies',
  },
  {
    id: 8,
    name: 'Umoja Corner',
    location: 'Umoja, Nairobi',
    region: 'Nairobi County',
    type: 'Bedsitter',
    parking: false,
    price: 32000,
    deposit: 64000,
    image: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=900&q=80',
    tag: 'Best value',
    details: 'A well-connected home for easy city living.',
    agent_name: 'David Kimani',
    agent_phone: '+254712345678',
    agent_company: 'Habitat Premier Agencies',
  },
  {
    id: 9,
    name: 'Nakuru Heights',
    location: 'Milimani, Nakuru',
    region: 'Nakuru County',
    type: 'Three bedroom',
    parking: true,
    price: 65000,
    deposit: 130000,
    image: 'https://images.unsplash.com/photo-1600566753051-f0b89df2dd90?auto=format&fit=crop&w=900&q=80',
    tag: 'New today',
    details: 'Spacious rooms in a quiet, central neighbourhood.',
    agent_name: 'Kiprono Koech',
    agent_phone: '+254720112233',
    agent_company: 'Rift Homes Limited',
  },
]

const formatKes = (amount) => `KES ${amount.toLocaleString('en-KE')}`
const getDirectionsUrl = (home) => `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${home.name}, ${home.location}, Kenya`)}&travelmode=driving`

const getStatusColor = (status) => {
  const colors = {
    'submitted': '#f59e0b',
    'approved': '#10b981',
    'declined': '#ef4444',
    'cancelled': '#6b7280',
    'refunded': '#8b5cf6',
  }
  return colors[status] || '#6b7280'
}

const normalizeIdentifier = (value) => {
  const trimmed = value.trim().toLowerCase()
  return trimmed.startsWith('+') ? `+${trimmed.slice(1).replace(/\D/g, '')}` : trimmed.replace(/[\s()-]/g, '')
}

const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
const isValidPhone = (value) => /^(?:\+254|0)(?:1|7)\d{8}$/.test(value)
const isValidIdentifier = (value) => isValidEmail(value) || isValidPhone(value)

const cleanPhoneNumber = (phone) => {
  if (!phone) return ''
  return String(phone).replace(/[^\d+]/g, '')
}

const formatWhatsAppNumber = (phone) => {
  if (!phone) return ''
  const digits = String(phone).replace(/\D/g, '')
  if (digits.startsWith('254')) return digits
  if (digits.startsWith('0')) return `254${digits.slice(1)}`
  return digits
}

const getWhatsAppUrl = (phone, propertyName = '') => {
  const number = formatWhatsAppNumber(phone)
  if (!number) return '#'
  const text = propertyName
    ? `Hello, I am interested in ${propertyName} listed on Habitat.`
    : 'Hello, I am inquiring about homes listed on Habitat.'
  return `https://wa.me/${number}?text=${encodeURIComponent(text)}`
}

// Persist the signed-in user per browser tab. sessionStorage (not localStorage)
// is used on purpose: it survives a page refresh so the user stays logged in,
// but is scoped to a single tab so you can open a second tab and sign in as a
// different user without the two sessions overwriting each other.
const SESSION_KEY = 'habitat.authUser'
const readStoredUser = () => {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function App() {
  const storedUser = readStoredUser()
  const [authUser, setAuthUser] = useState(storedUser)
  const [accounts, setAccounts] = useState([])
  const [showAuthScreen, setShowAuthScreen] = useState(false)
  const [role, setRole] = useState(storedUser?.role || 'Tenant')
  const [region, setRegion] = useState('All regions')
  const [category, setCategory] = useState('All categories')
  const [query, setQuery] = useState('')
  const [saved, setSaved] = useState([2])
  const [selectedHome, setSelectedHome] = useState(null)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [booked, setBooked] = useState([])
  const [toast, setToast] = useState('')
  const [homes, setHomes] = useState(initialHomes)
  const [applications, setApplications] = useState([])
  const [paymentApplication, setPaymentApplication] = useState(null)
  const [paymentPhone, setPaymentPhone] = useState('')
  const [paymentAmount, setPaymentAmount] = useState('')
  const [showTenantProfile, setShowTenantProfile] = useState(false)
  const [activeView, setActiveView] = useState(storedUser?.role === 'Tenant' ? 'discover' : storedUser?.role === 'SuperAdmin' ? 'agent-dashboard' : storedUser?.role === 'Agent' ? 'agent-homes' : 'discover')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [agentProfileNonce, setAgentProfileNonce] = useState(0)
  const [tenantProfile, setTenantProfile] = useState({ name: '', phone: '', nationalId: '', occupation: '', bio: '', company: '' })
  const [showAgentProfile, setShowAgentProfile] = useState(false)
  const [selectedAgentProfile, setSelectedAgentProfile] = useState(null)
  const [openFaqIndex, setOpenFaqIndex] = useState(null)
  const [applyConfirm, setApplyConfirm] = useState(null) // home to confirm application for
  const [applyMessage, setApplyMessage] = useState('') // tenant's custom message
  const [priceRange, setPriceRange] = useState('All prices')
  const [bookingStatusFilter, setBookingStatusFilter] = useState('All')

  // Handle in-app and device back navigation
  const handleBack = useCallback(() => {
    if (selectedHome) {
      setSelectedHome(null)
      setCurrentImageIndex(0)
      return true
    }
    if (paymentApplication) {
      setPaymentApplication(null)
      return true
    }
    if (mobileMenuOpen) {
      setMobileMenuOpen(false)
      return true
    }
    if (showTenantProfile) {
      setShowTenantProfile(false)
      setActiveView('discover')
      return true
    }
    if (activeView !== 'discover') {
      setActiveView('discover')
      return true
    }
    return false
  }, [activeView, mobileMenuOpen, paymentApplication, selectedHome, showTenantProfile, currentImageIndex])

  // Manage browser history so hardware back buttons on Android WebView / browsers step back instead of exiting
  useEffect(() => {
    const handlePopState = () => {
      handleBack()
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [handleBack])

  useEffect(() => {
    if (selectedHome || paymentApplication || showTenantProfile || activeView !== 'discover' || mobileMenuOpen) {
      window.history.pushState({ inAppView: true }, '')
    }
  }, [selectedHome, paymentApplication, showTenantProfile, activeView, mobileMenuOpen])

  // Capacitor native hardware back button listener
  useEffect(() => {
    let removeListener = null
    const bindCapacitor = async () => {
      try {
        const cap = window.Capacitor
        if (cap?.Plugins?.App) {
          const handle = await cap.Plugins.App.addListener('backButton', () => {
            const handled = handleBack()
            if (!handled) {
              cap.Plugins.App.exitApp()
            }
          })
          removeListener = () => handle?.remove?.()
        }
      } catch {
        // Fallback to popstate
      }
    }
    bindCapacitor()
    return () => {
      if (removeListener) removeListener()
    }
  }, [handleBack])

  useEffect(() => {
    fetchHomes().then(setHomes).catch(() => {})
  }, [])

  useEffect(() => {
    if (!authUser?.token || authUser.role !== 'Tenant') return
    fetchMyApplications(authUser.token).then((items) => {
      setApplications(items)
      setBooked(items.filter((item) => ['submitted', 'approved'].includes(item.status)).map((item) => item.home_id))
      // Re-fetch homes including any approved home so the tenant can still view it
      const approvedHomeIds = items
        .filter(a => a.status === 'approved' && a.home_id)
        .map(a => a.home_id)
      fetchHomes({}, false, approvedHomeIds).then(setHomes).catch(() => {})
    }).catch(() => {})
  }, [authUser])

  // Keep this tab's sessionStorage in sync with the signed-in user so a refresh
  // rehydrates the session instead of dropping the user back to the home page.
  useEffect(() => {
    try {
      if (authUser) sessionStorage.setItem(SESSION_KEY, JSON.stringify(authUser))
      else sessionStorage.removeItem(SESSION_KEY)
    } catch { /* storage may be unavailable in private mode */ }
  }, [authUser])

  // Keep authUser.token in sync whenever Supabase silently refreshes the JWT
  // (tokens expire after ~1 hour; without this the stored token goes stale and
  // every API call fails with "invalid JWT: token is expired").
  // We only react to TOKEN_REFRESHED — not SIGNED_IN — so that logging in on
  // another tab (which also fires onAuthStateChange via the shared event bus)
  // does not overwrite this tab's session. Each tab uses sessionStorage as its
  // Supabase storage adapter, so sessions are already isolated at the storage
  // level; this listener is purely to catch background token refreshes.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'TOKEN_REFRESHED' && session?.access_token) {
        setAuthUser((current) => current ? { ...current, token: session.access_token, refreshToken: session.refresh_token } : current)
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!authUser?.token) return
    // Restore the Supabase session so auth.uid() works for RLS policies.
    // When the app rehydrates from sessionStorage, the Supabase client has no
    // active session — setSession() re-establishes it so all DB queries work.
    if (authUser.refreshToken) {
      supabase.auth.setSession({
        access_token: authUser.token,
        refresh_token: authUser.refreshToken,
      }).catch(() => {})
    }
    // Validate the restored token once on load. If the server was restarted its
    // in-memory sessions are gone, so we clear the stale session cleanly.
    fetchProfile(authUser.token)
      .then((profile) => {
        setTenantProfile(profile)
        setAuthUser((current) => (current ? { ...current, ...profile } : current))
      })
      .catch(() => {
        setAuthUser(null)
        setRole('Tenant')
      })
  }, [authUser?.token])

  const filteredHomes = useMemo(() => homes.filter((home) => {
    const matchesRegion = region === 'All regions' || home.region === region
    const matchesCategory = category === 'All categories' || home.type === category
    const searchable = `${home.name} ${home.location} ${home.type}`.toLowerCase()
    const matchesQuery = searchable.includes(query.toLowerCase())
    let matchesPrice = true
    if (priceRange === 'Under 30k') matchesPrice = home.price < 30000
    else if (priceRange === '30k–60k') matchesPrice = home.price >= 30000 && home.price <= 60000
    else if (priceRange === '60k–100k') matchesPrice = home.price > 60000 && home.price <= 100000
    else if (priceRange === '100k–200k') matchesPrice = home.price > 100000 && home.price <= 200000
    else if (priceRange === 'Over 200k') matchesPrice = home.price > 200000
    return matchesRegion && matchesCategory && matchesQuery && matchesPrice
  }), [category, homes, query, region, priceRange])

  const showToast = useCallback((message) => {
    setToast(message)
    window.setTimeout(() => setToast(''), 2600)
  }, [])

  const toggleSaved = (id) => {
    setSaved((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])
  }

  const confirmBooking = () => {
    if (!authUser) {
      setSelectedHome(null)
      setCurrentImageIndex(0)
      setShowAuthScreen(true)
      return
    }
    // Profile gate: require at least a phone number before applying
    if (!tenantProfile.phone?.trim()) {
      showToast('Please add your phone number to your profile before applying.')
      setShowTenantProfile(true)
      setActiveView('profile')
      setSelectedHome(null)
      setCurrentImageIndex(0)
      return
    }
    // Show confirmation modal before submitting
    setApplyMessage('')
    setApplyConfirm(selectedHome)
  }

  const submitBooking = async () => {
    const home = applyConfirm
    const message = applyMessage.trim() || 'I would like to apply for this home.'
    setApplyConfirm(null)
    setApplyMessage('')
    setSelectedHome(null)
    setCurrentImageIndex(0)
    try {
      await submitApplication(home.id, message, authUser.token)
      const updatedApplications = await fetchMyApplications(authUser.token)
      setApplications(updatedApplications)
      setBooked((current) => [...new Set([...current, home.id])])
      showToast(`Application sent to ${home.agent_name || 'the house agent'}`)
    } catch (error) {
      showToast(error.message)
    }
  }

  const cancelBooking = async (id) => {
    const application = applications.find((item) => item.home_id === id && ['submitted', 'approved'].includes(item.status))
    if (application) {
      try {
        await cancelApplication(application.id, authUser.token)
        setApplications((current) => current.map((item) => item.id === application.id ? { ...item, status: item.payment_status === 'paid' ? 'refunded' : 'cancelled' } : item))
        setBooked((current) => current.filter((item) => item !== id))
        showToast('Application cancelled. Refund status updated if applicable.')
      } catch (error) { showToast(error.message) }
      return
    }
    try {
      const booking = (await fetchBookings(authUser.token)).find((item) => item.homeId === id && item.status === 'pending')
      if (!booking) throw new Error('Active booking not found.')
      await cancelBookingApi(booking.id, authUser.token)
      setBooked((current) => current.filter((item) => item !== id))
      showToast('Booking cancelled. Refund is being processed.')
    } catch (error) {
      showToast(error.message)
    }
  }

  const login = async (credentials) => {
    try {
      const result = await loginUser(credentials)
      setAuthUser({ ...result.user, token: result.token, refreshToken: result.refreshToken })
      setRole(result.user.role)
      setShowAuthScreen(false)
      return { ok: true }
    } catch (error) {
      return { ok: false, error: error.message }
    }
  }

  const createAccount = async (account) => {
    const result = await registerUser(account)
    setAccounts((current) => [...current, result.user])
  }

  const saveTenantProfile = async (event) => {
    event.preventDefault()
    try { const savedProfile = await updateProfile(tenantProfile, authUser.token); setTenantProfile(savedProfile); setShowTenantProfile(false); setActiveView('discover'); setAuthUser((current) => ({ ...current, ...savedProfile })); showToast('Your profile was updated.') } catch (error) { showToast(error.message) }
  }

  const viewAgentProfile = async (agentId) => {
    try {
      const profile = await fetchAgentProfile(agentId, authUser.token)
      setSelectedAgentProfile(profile)
      setShowAgentProfile(true)
    } catch (error) {
      showToast(error.message)
    }
  }

  // Opens the signed-in user's own profile from the sidebar profile card.
  const openMyProfile = () => {
    if (!authUser) { setShowAuthScreen(true); return }
    if (authUser.role === 'Tenant') { setActiveView('profile'); setShowTenantProfile(true) }
    else if (authUser.role === 'Agent') setAgentProfileNonce((current) => current + 1)
    else showToast('Super-admin details are managed by the system.')
  }

  const savedHomes = homes.filter((home) => saved.includes(home.id))
  const renderHomeCard = (home) => <article className="home-card" key={home.id}><div className="image-wrap" role="button" tabIndex="0" onClick={() => setSelectedHome(home)} onKeyDown={(event) => event.key === 'Enter' && setSelectedHome(home)}><img src={home.image} alt={`${home.name} interior`} /><span className="home-tag">{home.tag}</span><span className="photo-hint">View photos ↗</span><button className={`save-button ${saved.includes(home.id) ? 'saved' : ''}`} onClick={(event) => { event.stopPropagation(); toggleSaved(home.id) }} aria-label={`Save ${home.name}`}>{saved.includes(home.id) ? '♥' : '♡'}</button></div><div className="home-info"><div className="home-title"><div><h3>{home.name}</h3><p>{home.location}</p></div><span className="rating">★ 4.9</span></div><p className="home-details">{home.type} <span>·</span> {home.details}</p><p className={`parking-status ${home.parking ? 'available' : 'unavailable'}`}>{home.parking ? '✓ Parking available' : '× No parking available'}</p><div className="home-footer"><div><strong>{formatKes(home.price)}</strong><span>/ month</span></div><div className="home-actions"><button onClick={() => setSelectedHome(home)}>View home <span>↗</span></button><a href={getDirectionsUrl(home)} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()}>Directions ↗</a></div></div></div></article>

  if (showAuthScreen) {
    return <AuthScreen accounts={accounts} onLogin={login} onCreateAccount={createAccount} onBrowseHomes={() => setShowAuthScreen(false)} />
  }

  return (
    <div className="app-shell">
      {mobileMenuOpen && <div className="mobile-drawer-backdrop" onClick={() => setMobileMenuOpen(false)} />}
      <aside className={`sidebar ${mobileMenuOpen ? 'mobile-open' : ''}`}>
        <div className="brand"><span className="brand-mark">h</span><span>habitat</span></div>
        <div className="profile-card clickable" role="button" tabIndex={0} onClick={() => { setMobileMenuOpen(false); openMyProfile() }} onKeyDown={(event) => (event.key === 'Enter' || event.key === ' ') && openMyProfile()}><div className="avatar">{authUser ? authUser.initials : 'G'}</div><div><strong>{authUser ? authUser.name : 'Guest visitor'}</strong><span>{authUser ? `${authUser.role} account` : 'Browse-only access'}</span></div><span className="chevron">⌄</span></div>
        <nav className="main-nav">
          {!authUser && (
            <button className={`nav-item ${activeView === 'discover' ? 'active' : ''}`} onClick={() => { setActiveView('discover'); setMobileMenuOpen(false) }}><span>⌂</span> Discover</button>
          )}
          {authUser?.role === 'Tenant' && (
            <>
              <button className={`nav-item ${activeView === 'discover' && !showTenantProfile ? 'active' : ''}`} onClick={() => { setActiveView('discover'); setShowTenantProfile(false); setMobileMenuOpen(false) }}><span>⌂</span> Discover</button>
              <button className={`nav-item ${activeView === 'saved' && !showTenantProfile ? 'active' : ''}`} onClick={() => { setActiveView('saved'); setShowTenantProfile(false); setMobileMenuOpen(false) }}><span>♡</span> Saved <b>{saved.length}</b></button>
              <button className={`nav-item ${activeView === 'bookings' && !showTenantProfile ? 'active' : ''}`} onClick={() => { setActiveView('bookings'); setShowTenantProfile(false); setMobileMenuOpen(false) }}><span>▣</span> My bookings <b>{booked.length}</b></button>
            </>
          )}
          {(authUser?.role === 'Agent' || authUser?.role === 'SuperAdmin') && (
            <>
              {authUser?.role === 'SuperAdmin' && <button className={`nav-item ${activeView === 'agent-dashboard' ? 'active' : ''}`} onClick={() => { setActiveView('agent-dashboard'); setMobileMenuOpen(false) }}><span>◈</span> Dashboard</button>}
              <button className={`nav-item ${activeView === 'agent-homes' ? 'active' : ''}`} onClick={() => { setActiveView('agent-homes'); setMobileMenuOpen(false) }}><span>⌂</span> Homes</button>
              <button className={`nav-item ${activeView === 'agent-applications' ? 'active' : ''}`} onClick={() => { setActiveView('agent-applications'); setMobileMenuOpen(false) }}><span>📋</span> Applications</button>
            </>
          )}
          {authUser?.role === 'Tenant' && <button className={`nav-item ${activeView === 'profile' || showTenantProfile ? 'active' : ''}`} onClick={() => { setActiveView('profile'); setShowTenantProfile(true); setMobileMenuOpen(false) }}><span>♙</span> My profile</button>}
          {(authUser?.role === 'Agent' || authUser?.role === 'SuperAdmin') && <button className={`nav-item ${activeView === 'agent-profile' ? 'active' : ''}`} onClick={() => { setActiveView('agent-profile'); setAgentProfileNonce((n) => n + 1); setMobileMenuOpen(false) }}><span>♙</span> My profile</button>}
        </nav>
        <div className="sidebar-bottom"><div className="help-icon">?</div><div><strong>Need a hand?</strong><span>Our team is here to help.</span></div><button aria-label="Open help">→</button></div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <button className="mobile-menu-btn" onClick={() => setMobileMenuOpen((open) => !open)} aria-label="Toggle navigation menu">
            ☰
          </button>
          <div className="mobile-brand"><span className="brand-mark">h</span> habitat</div>
          <div className="role-badge"><span className="role-dot"></span>{authUser ? `${role} workspace` : 'Browsing as guest'}</div>
          <div className="top-actions">
            <button className="icon-button" aria-label="Notifications">♧<i></i></button>
            {authUser ? (
              <>
                <div className="mini-avatar">{authUser.initials}</div>
                <button className="logout-button" onClick={() => { setAuthUser(null); setRole('Tenant') }}>Log out</button>
              </>
            ) : (
              <button className="login-link" onClick={() => setShowAuthScreen(true)}>Sign in</button>
            )}
          </div>
        </header>

        {(!authUser || authUser.role === 'Tenant') && <>
          {showTenantProfile && (
            <form className="listing-form profile-form tenant-profile" onSubmit={saveTenantProfile}>
              <div className="form-header-bar">
                <h2>My tenant profile</h2>
                <button type="button" className="in-app-back-button" onClick={() => { setShowTenantProfile(false); setActiveView('discover') }}>
                  ← Back to Discover
                </button>
              </div>
              <p className="form-help">These details are shared with an agent when you apply for a home.</p>
              <div className="form-grid">
                <label>Full name<input required value={tenantProfile.name} onChange={(event) => setTenantProfile({ ...tenantProfile, name: event.target.value })} /></label>
                <label>Phone number<input value={tenantProfile.phone} onChange={(event) => setTenantProfile({ ...tenantProfile, phone: event.target.value })} /></label>
                <label>National ID<input value={tenantProfile.nationalId} onChange={(event) => setTenantProfile({ ...tenantProfile, nationalId: event.target.value })} /></label>
                <label>Occupation<input value={tenantProfile.occupation} onChange={(event) => setTenantProfile({ ...tenantProfile, occupation: event.target.value })} /></label>
                <label className="wide-field">About you<textarea value={tenantProfile.bio} onChange={(event) => setTenantProfile({ ...tenantProfile, bio: event.target.value })} /></label>
              </div>
              <button className="primary-action form-submit" type="submit">Save profile <span>→</span></button>
            </form>
          )}
          {activeView === 'discover' && !showTenantProfile && <>
          <section className="welcome"><div><p className="eyebrow">{new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p><h1>Find a place<br /><em>to feel at home.</em></h1><p className="intro">Thoughtfully selected homes in the places you want to be.</p></div><div className="welcome-art"><div className="sun"></div><div className="hill hill-one"></div><div className="hill hill-two"></div><div className="house-art">⌂</div></div></section>
          <section className="search-panel"><div className="search-field"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by neighbourhood or home" /></div><div className="select-field"><span>⌖</span><select value={region} onChange={(event) => setRegion(event.target.value)}><option>All regions</option><option>Nairobi County</option><option>Mombasa County</option><option>Kisumu County</option><option>Nakuru County</option></select></div><div className="select-field category-select"><span>⌂</span><select value={category} onChange={(event) => setCategory(event.target.value)}><option>All categories</option><option>Single room</option><option>Bedsitter</option><option>One bedroom</option><option>Two bedroom</option><option>Three bedroom</option><option>Four bedroom</option></select></div><div className="select-field category-select"><span>₭</span><select value={priceRange} onChange={(event) => setPriceRange(event.target.value)}><option>All prices</option><option>Under 30k</option><option>30k–60k</option><option>60k–100k</option><option>100k–200k</option><option>Over 200k</option></select></div><button className="search-button" onClick={() => showToast(`${filteredHomes.length} homes found`)}>Search homes <span>→</span></button></section>
          <div className="content-heading"><div><h2>Homes for you</h2><p>{filteredHomes.length} available homes, updated today</p></div><button className="view-toggle active">▦</button><button className="view-toggle">☷</button></div>
          <section className="home-grid">{filteredHomes.map(renderHomeCard)}</section>
          {filteredHomes.length === 0 && <div className="empty-state"><strong>No homes found</strong><span>Try a different neighbourhood or region.</span></div>}
          </>}
          {activeView === 'saved' && !showTenantProfile && <>
          <div className="subpage-back-bar"><button className="in-app-back-button" onClick={() => setActiveView('discover')}>← Back to Discover</button></div>
          <div className="content-heading"><div><h2>Saved homes</h2><p>{savedHomes.length} home{savedHomes.length === 1 ? '' : 's'} you have saved</p></div></div>
          {savedHomes.length > 0 ? <section className="home-grid">{savedHomes.map(renderHomeCard)}</section> : <div className="empty-state"><strong>No saved homes yet</strong><span>Tap the heart on any home to save it here.</span></div>}
          </>}
          {activeView === 'bookings' && !showTenantProfile && <>
          <div className="subpage-back-bar"><button className="in-app-back-button" onClick={() => setActiveView('discover')}>← Back to Discover</button></div>
          <div className="content-heading"><div><h2>My bookings</h2><p>Applications are reviewed by each house agent.</p></div></div>
          <div className="table-panel" style={{ marginTop: '0' }}>
            <div className="users-toolbar" style={{ marginBottom: '16px' }}>
              <select
                className="role-filter"
                value={bookingStatusFilter}
                onChange={(e) => setBookingStatusFilter(e.target.value)}
                aria-label="Filter by status"
                style={{ minWidth: '160px' }}
              >
                <option value="All">All statuses</option>
                <option value="submitted">Submitted</option>
                <option value="approved">Approved</option>
                <option value="declined">Declined</option>
                <option value="cancelled">Cancelled</option>
                <option value="refunded">Refunded</option>
              </select>
              <span style={{ fontSize: '11px', color: '#7f9585', marginLeft: '8px' }}>
                {applications.filter(a => bookingStatusFilter === 'All' || a.status === bookingStatusFilter).length} application{applications.filter(a => bookingStatusFilter === 'All' || a.status === bookingStatusFilter).length !== 1 ? 's' : ''}
              </span>
            </div>
            {applications.length > 0 ? (
              <div className="users-table-wrap">
                <table className="users-table applications-table">
                  <thead>
                    <tr>
                      <th>Home</th>
                      <th>Status</th>
                      <th>Agent</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {applications
                      .filter(a => bookingStatusFilter === 'All' || a.status === bookingStatusFilter)
                      .map((application) => (
                      <tr key={application.id}>
                        <td>
                          <div className="users-table-name">
                            <div style={{
                              width: '44px', height: '44px', borderRadius: '5px', flexShrink: 0,
                              backgroundImage: application.image ? `url(${application.image})` : 'none',
                              backgroundSize: 'cover', backgroundPosition: 'center',
                              background: application.image ? undefined : '#e4ecdf',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: '18px', color: '#6c9a77'
                            }}>
                              {!application.image && '⌂'}
                            </div>
                            <div>
                              <strong>{application.name || 'Home no longer listed'}</strong>
                              {application.location && <span style={{ display: 'block', fontSize: '10px', color: '#7f9585', marginTop: '2px' }}>{application.location}</span>}
                            </div>
                          </div>
                        </td>
                        <td><span className={`application-status ${application.status}`}>{application.status}</span></td>
                        <td>
                          {application.agent_phone ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <span style={{ fontSize: '11px', fontWeight: 700, color: '#2d443b' }}>{application.agent_name || 'House Agent'}</span>
                              <div style={{ display: 'flex', gap: '6px' }}>
                                <a href={`tel:${cleanPhoneNumber(application.agent_phone)}`} className="contact-btn call-btn mini" title="Call Agent"><span>📞</span> Call</a>
                                <a href={getWhatsAppUrl(application.agent_phone, application.name)} target="_blank" rel="noopener noreferrer" className="contact-btn whatsapp-btn mini" title="WhatsApp Agent"><span>💬</span> WhatsApp</a>
                              </div>
                            </div>
                          ) : <span style={{ color: '#9aa49e', fontSize: '11px' }}>—</span>}
                        </td>
                        <td>
                          {application.status === 'approved' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              {application.contract_pdf_url
                                ? <a href={application.contract_pdf_url} target="_blank" rel="noreferrer" style={{ fontSize: '11px', color: '#3e735e', fontWeight: 700 }}>View contract ↗</a>
                                : <span style={{ fontSize: '10px', color: '#9aa49e' }}>Contract pending</span>}
                              {application.payment_deadline && application.payment_status !== 'paid' && (
                                <span style={{ fontSize: '10px', color: new Date(application.payment_deadline) < new Date() ? '#ef4444' : '#f59e0b', fontWeight: 700 }}>
                                  {new Date(application.payment_deadline) < new Date()
                                    ? '⚠ Payment deadline passed'
                                    : `⏰ Pay by ${new Date(application.payment_deadline).toLocaleString()}`}
                                </span>
                              )}
                              {application.payment_status !== 'paid' && (
                                <button style={{ border: 0, background: 'none', color: '#d9775d', fontSize: '10px', fontWeight: 700, padding: 0, cursor: 'pointer', textAlign: 'left' }}
                                  onClick={() => { setPaymentApplication(application); setPaymentPhone(authUser.phone || ''); setPaymentAmount(application.deposit) }}>
                                  Make payment
                                </button>
                              )}
                              {application.payment_status === 'paid' && <span style={{ fontSize: '10px', color: '#568666', fontWeight: 700 }}>✓ Deposit paid</span>}
                            </div>
                          )}
                          {application.status === 'submitted' && (
                            <button style={{ border: 0, background: 'none', color: '#c97861', fontSize: '10px', fontWeight: 700, padding: 0, cursor: 'pointer' }}
                              onClick={() => cancelBooking(application.home_id)}>
                              Cancel
                            </button>
                          )}
                          {!['approved', 'submitted'].includes(application.status) && <span style={{ color: '#9aa49e', fontSize: '10px' }}>—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state"><strong>No bookings yet</strong><span>Apply for a home and it will appear here.</span></div>
            )}
          </div>
          </>}
        </>}

        {authUser && role === 'Agent' && <AgentDashboard token={authUser.token} onNotify={showToast} openProfileNonce={agentProfileNonce} view={activeView === 'agent-homes' ? 'homes' : activeView === 'agent-applications' ? 'applications' : 'profile'} />}

        {authUser && role === 'SuperAdmin' && <SuperAdminPanel token={authUser.token} currentUserId={authUser.id} onNotify={showToast} activeView={activeView} onBackToDashboard={() => setActiveView('agent-dashboard')} />}
      </main>

      {!authUser && (
        <nav className="mobile-bottom-nav">
          <button className={`mobile-nav-item ${activeView === 'discover' ? 'active' : ''}`} onClick={() => { setActiveView('discover'); setMobileMenuOpen(false) }}>
            <span>⌂</span> Discover
          </button>
          <button className={`mobile-nav-item`} onClick={() => setShowAuthScreen(true)}>
            <span>♙</span> Sign in
          </button>
        </nav>
      )}
      {authUser?.role === 'Tenant' && (
        <nav className="mobile-bottom-nav">
          <button className={`mobile-nav-item ${activeView === 'discover' && !showTenantProfile ? 'active' : ''}`} onClick={() => { setActiveView('discover'); setShowTenantProfile(false); setMobileMenuOpen(false) }}>
            <span>⌂</span> Discover
          </button>
          <button className={`mobile-nav-item ${activeView === 'saved' && !showTenantProfile ? 'active' : ''}`} onClick={() => { setActiveView('saved'); setShowTenantProfile(false); setMobileMenuOpen(false) }}>
            <span>♡</span> Saved
            {saved.length > 0 && <b className="mobile-nav-badge">{saved.length}</b>}
          </button>
          <button className={`mobile-nav-item ${activeView === 'bookings' && !showTenantProfile ? 'active' : ''}`} onClick={() => { setActiveView('bookings'); setShowTenantProfile(false); setMobileMenuOpen(false) }}>
            <span>▣</span> Bookings
            {booked.length > 0 && <b className="mobile-nav-badge">{booked.length}</b>}
          </button>
          <button className={`mobile-nav-item ${showTenantProfile ? 'active' : ''}`} onClick={() => { setShowTenantProfile(true); setActiveView('profile'); setMobileMenuOpen(false) }}>
            <span>♙</span> Profile
          </button>
        </nav>
      )}

      {selectedHome && (
        <div className="modal-backdrop" onClick={() => { setSelectedHome(null); setCurrentImageIndex(0); setOpenFaqIndex(null) }}>
          <div className="booking-modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal-top-bar">
              <button className="in-app-back-button" onClick={() => { setSelectedHome(null); setCurrentImageIndex(0) }}>
                ← Back
              </button>
              <button className="close-button" onClick={() => { setSelectedHome(null); setCurrentImageIndex(0) }}>×</button>
            </div>
            {/* Image Gallery */}
            <div className="image-gallery-container">
              <img 
                className="modal-home-image" 
                src={selectedHome.images && selectedHome.images.length > 0 
                  ? (selectedHome.images[currentImageIndex]?.url || selectedHome.images[0]?.url)
                  : selectedHome.image} 
                alt={`${selectedHome.name} interior`} 
              />
              {/* Image Navigation */}
              {selectedHome.images && selectedHome.images.length > 1 && (
                <>
                  <button 
                    className="gallery-nav-btn gallery-prev-btn"
                    onClick={() => setCurrentImageIndex((prev) => prev === 0 ? selectedHome.images.length - 1 : prev - 1)}
                  >
                    ‹
                  </button>
                  <button 
                    className="gallery-nav-btn gallery-next-btn"
                    onClick={() => setCurrentImageIndex((prev) => (prev + 1) % selectedHome.images.length)}
                  >
                    ›
                  </button>
                  {/* Thumbnails */}
                  <div className="gallery-thumbnails">
                    {selectedHome.images.map((img, index) => (
                      <img
                        key={index}
                        src={img.url}
                        alt={`Thumbnail ${index + 1}`}
                        className={`gallery-thumbnail ${index === currentImageIndex ? 'active' : ''}`}
                        onClick={() => setCurrentImageIndex(index)}
                      />
                    ))}
                  </div>
                  <div className="gallery-counter">
                    {currentImageIndex + 1} / {selectedHome.images.length}
                  </div>
                </>
              )}
            </div>
            <div className="modal-content">
              <p className="eyebrow">{selectedHome.location}</p>
              <h2>{selectedHome.name}</h2>
              <p>{selectedHome.details} Submit an application and the agent will review it before you make any deposit payment.</p>
              {/* FAQ Accordion */}
              {selectedHome.faqs && selectedHome.faqs.length > 0 && (
                <div className="faq-section">
                  <h4>Frequently asked questions</h4>
                  {selectedHome.faqs.map((faq, index) => (
                    <div key={faq.id || index} className="faq-item">
                      <button className="faq-question" onClick={() => setOpenFaqIndex(openFaqIndex === index ? null : index)}>
                        {faq.question}
                        <span className={`faq-chevron ${openFaqIndex === index ? 'open' : ''}`}>▼</span>
                      </button>
                      {openFaqIndex === index && <div className="faq-answer">{faq.answer}</div>}
                    </div>
                  ))}
                </div>
              )}
              <div className="agent-profile">
                <div className="avatar">{(selectedHome.agent_name || 'Agent').slice(0, 2).toUpperCase()}</div>
                <div style={{ flex: 1 }}>
                  <strong 
                    onClick={() => selectedHome.agent_id && viewAgentProfile(selectedHome.agent_id)}
                    style={{ cursor: 'pointer', ':hover': { textDecoration: 'underline' } }}
                  >
                    {selectedHome.agent_name || 'House agent'}
                  </strong>
                  <span>{selectedHome.agent_company || 'Habitat verified agent'}</span>
                  <small className="agent-phone-display">
                    📞 {selectedHome.agent_phone || '+254712345678'}
                  </small>
                </div>
                <div className="agent-contact-actions">
                  <a
                    href={`tel:${cleanPhoneNumber(selectedHome.agent_phone || '+254712345678')}`}
                    className="contact-btn call-btn"
                    title="Direct Phone Call"
                  >
                    <span>📞</span> Call
                  </a>
                  <a
                    href={getWhatsAppUrl(selectedHome.agent_phone || '+254712345678', selectedHome.name)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="contact-btn whatsapp-btn"
                    title="Chat on WhatsApp"
                  >
                    <span>💬</span> WhatsApp
                  </a>
                </div>
              </div>
              <div className="fee-row">
                <div><span>Monthly rent</span><strong>{formatKes(selectedHome.price)}</strong></div>
                <div><span>Deposit after approval</span><strong>{formatKes(selectedHome.deposit)}</strong></div>
              </div>
              <button className="primary-action" onClick={confirmBooking}>Send application <span>→</span></button>
              <small>No payment is taken now. The agent will send a contract and paybill after approval.</small>
            </div>
          </div>
        </div>
      )}
      {applyConfirm && (
        <div className="modal-backdrop" onClick={() => setApplyConfirm(null)}>
          <div style={{ background: '#fff', borderRadius: '10px', padding: '32px', maxWidth: '440px', width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,.25)' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 10px', color: '#173d36', font: '400 22px Georgia,serif' }}>Send Application</h3>
            <p style={{ fontSize: '13px', color: '#718078', lineHeight: 1.6, margin: '0 0 16px' }}>
              You are applying for:
            </p>
            <div style={{ background: '#f6f9f5', borderRadius: '7px', padding: '14px 18px', marginBottom: '20px' }}>
              <div style={{ fontWeight: 700, color: '#1d3d33', fontSize: '14px' }}>{applyConfirm.name}</div>
              <div style={{ color: '#718078', fontSize: '12px', marginTop: '4px' }}>{applyConfirm.location} · {formatKes(applyConfirm.price)}/mo</div>
              <div style={{ color: '#3e735e', fontSize: '12px', marginTop: '2px' }}>Agent: {applyConfirm.agent_name || 'House agent'}</div>
            </div>
            <label style={{ display: 'block', marginBottom: '20px' }}>
              <span style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#476055', marginBottom: '7px' }}>Message to agent (optional)</span>
              <textarea
                value={applyMessage}
                onChange={e => setApplyMessage(e.target.value)}
                placeholder="Introduce yourself — mention your occupation, move-in date, number of occupants, or anything relevant..."
                style={{ width: '100%', minHeight: '90px', border: '1px solid #dce4dd', borderRadius: '5px', padding: '11px', fontSize: '12px', color: '#29433a', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }}
              />
            </label>
            <small style={{ display: 'block', color: '#9aa49e', fontSize: '11px', marginBottom: '20px', textAlign: 'center' }}>No payment is taken now. The agent reviews your application first.</small>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={submitBooking} style={{ flex: 1, padding: '13px', background: '#173d36', color: '#fff', border: 'none', borderRadius: '7px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
                Send Application →
              </button>
              <button onClick={() => { setApplyConfirm(null); setApplyMessage('') }} style={{ padding: '13px 20px', background: 'none', color: '#9ca3af', border: '1px solid #dce4dd', borderRadius: '7px', fontSize: '13px', cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      {paymentApplication && (
        <div className="modal-backdrop" onClick={() => setPaymentApplication(null)}>
          <form className="payment-modal" onClick={(event) => event.stopPropagation()} onSubmit={async (event) => { event.preventDefault(); try { const result = await requestPayment(paymentApplication.id, paymentPhone, paymentAmount, authUser.token); setApplications((current) => current.map((item) => item.id === paymentApplication.id ? { ...item, payment_status: 'pending', payment_phone: paymentPhone, payment_amount: paymentAmount } : item)); setPaymentApplication(null); showToast(result.message) } catch (error) { showToast(error.message) } }}>
            <div className="form-header-bar">
              <button type="button" className="in-app-back-button" onClick={() => setPaymentApplication(null)}>← Back</button>
              <button type="button" className="close-button" onClick={() => setPaymentApplication(null)}>×</button>
            </div>
            <p className="eyebrow">Secure deposit request</p>
            <h2>Make payment</h2>
            <p>Enter the phone number that should receive the M-Pesa prompt and the deposit amount.</p>
            <label>Phone number<input required value={paymentPhone} onChange={(event) => setPaymentPhone(event.target.value)} placeholder="0712345678" /></label>
            <label>Amount (KES)<input required type="number" min="1" value={paymentAmount} onChange={(event) => setPaymentAmount(event.target.value)} /></label>
            <button className="primary-action" type="submit">Pay and send prompt <span>→</span></button>
            <small>The backend will send a prompt when Safaricom Daraja credentials are configured.</small>
          </form>
        </div>
      )}

      {/* Agent Profile Modal */}
      {showAgentProfile && selectedAgentProfile && (
        <div style={{ 
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000
        }} onClick={() => { setShowAgentProfile(false); setSelectedAgentProfile(null) }}>
          <div style={{ 
            background: 'white', padding: '32px', borderRadius: '12px', maxWidth: '500px', width: '90%',
            maxHeight: '80vh', overflowY: 'auto'
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2>Agent Profile</h2>
              <button onClick={() => { setShowAgentProfile(false); setSelectedAgentProfile(null) }} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer' }}>×</button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '24px' }}>
              <div className="avatar" style={{ width: '80px', height: '80px', fontSize: '32px' }}>{selectedAgentProfile.initials}</div>
              <div>
                <h3 style={{ margin: '0 0 4px 0' }}>{selectedAgentProfile.name}</h3>
                <p style={{ margin: '0', color: '#666' }}>{selectedAgentProfile.role}</p>
              </div>
            </div>
            <div style={{ display: 'grid', gap: '16px' }}>
              <div><strong>Email/Phone:</strong> {selectedAgentProfile.identifier}</div>
              {selectedAgentProfile.phone && <div><strong>Phone:</strong> {selectedAgentProfile.phone}</div>}
              {selectedAgentProfile.company && <div><strong>Company:</strong> {selectedAgentProfile.company}</div>}
              {selectedAgentProfile.occupation && <div><strong>Occupation:</strong> {selectedAgentProfile.occupation}</div>}
              {selectedAgentProfile.national_id && <div><strong>National ID:</strong> {selectedAgentProfile.national_id}</div>}
              {selectedAgentProfile.bio && <div><strong>About:</strong> {selectedAgentProfile.bio}</div>}
              <div><strong>Member since:</strong> {new Date(selectedAgentProfile.created_at).toLocaleDateString()}</div>
            </div>
            {selectedAgentProfile.phone && (
              <div className="agent-contact-actions" style={{ marginTop: '24px', display: 'flex', gap: '12px' }}>
                <a href={`tel:${cleanPhoneNumber(selectedAgentProfile.phone)}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 20px', background: '#25D366', color: 'white', textDecoration: 'none', borderRadius: '8px' }}>
                  <span>📞</span> Call Agent
                </a>
                <a href={getWhatsAppUrl(selectedAgentProfile.phone)} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 20px', background: '#25D366', color: 'white', textDecoration: 'none', borderRadius: '8px' }}>
                  <span>💬</span> WhatsApp
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}

function AuthScreen({ accounts, onLogin, onCreateAccount, onBrowseHomes }) {
  const [mode, setMode] = useState('login')
  const [role, setRole] = useState('Tenant')
  const [name, setName] = useState('')
  const [identifier, setIdentifier] = useState('')
  const email = identifier
  const setEmail = setIdentifier
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [resetMode, setResetMode] = useState(false)
  const [newPassword, setNewPassword] = useState('')

  useEffect(() => {
    const identifierInput = document.querySelector('.auth-panel input[type="email"]')
    if (identifierInput) {
      identifierInput.setAttribute('type', 'text')
      identifierInput.setAttribute('placeholder', 'you@example.com')
      identifierInput.form?.setAttribute('novalidate', '')
      const identifierLabel = identifierInput.closest('label')
      if (identifierLabel?.firstChild) identifierLabel.firstChild.textContent = 'Email address'
    }
  }, [mode])

  const submitForm = async (event) => {
    event.preventDefault()
    setError('')
    setSuccess('')

    if (resetMode) {
      if (!newPassword || newPassword.length < 8) {
        setError('Password must be at least 8 characters long.')
        return
      }
      try {
        await updatePassword(newPassword)
        setResetMode(false)
        setNewPassword('')
        setSuccess('Password updated successfully. Please sign in with your new password.')
      } catch (error) {
        setError(error.message)
      }
      return
    }

    if (mode === 'register') {
      if (!name.trim() || !identifier.trim() || !password.trim() || !confirmPassword.trim()) {
        setError('Complete all fields to create your account.')
        return
      }
      const normalizedIdentifier = normalizeIdentifier(identifier)
      // For now, only email registration is supported (phone auth requires SMS provider setup)
      if (!isValidEmail(normalizedIdentifier)) {
        setError('Please enter a valid email address. Phone registration requires additional setup.')
        return
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match.')
        return
      }
      if (password.length < 8) {
        setError('Password must be at least 8 characters long.')
        return
      }
      if (accounts.some((account) => account.identifier === normalizedIdentifier)) {
        setError('An account with this email or phone number already exists. Sign in instead.')
        return
      }
      const initials = name.trim().split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()
      try {
        const result = await onCreateAccount({ identifier: normalizedIdentifier, password, name: name.trim(), initials, role: 'Tenant' })
        // If email verification is required, switch to login mode
        if (result.requiresEmailVerification) {
          setMode('login')
          setPassword('')
          setConfirmPassword('')
          setSuccess('Please check your email to verify your account before logging in.')
        } else {
          setMode('login')
          setPassword('')
          setConfirmPassword('')
          setSuccess('Tenant account created successfully. Please sign in below.')
        }
      } catch (error) {
        setError(error.message)
      }
      return
    }

    if (!identifier.trim() || !password.trim()) {
      setError('Enter your email address and password to continue.')
      return
    }
    const normalizedIdentifier = normalizeIdentifier(identifier)
    if (!isValidEmail(normalizedIdentifier)) {
      setError('Enter a valid email address.')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters long.')
      return
    }
    const loginResult = await onLogin({ identifier: normalizedIdentifier, password, role })
    if (!loginResult?.ok) {
      setError(loginResult?.error || 'No matching account found. Check your details or create an account first.')
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-visual">
        <div className="auth-brand"><span className="brand-mark">h</span> habitat</div>
        <div className="auth-copy">
          <p className="eyebrow">A better way home</p>
          <h1>Find your next<br /><em>chapter.</em></h1>
          <p>Explore thoughtfully selected homes and make your move with confidence.</p>
        </div>
        <div className="auth-art">
          <div className="auth-sun"></div>
          <div className="auth-hill auth-hill-one"></div>
          <div className="auth-hill auth-hill-two"></div>
          <div className="auth-house">⌂</div>
        </div>
      </section>

      <section className="auth-panel">
        <div className="auth-panel-inner">
          {onBrowseHomes && (
            <div className="auth-nav-bar">
              <button type="button" className="in-app-back-button" onClick={onBrowseHomes}>
                ← Back to homes
              </button>
            </div>
          )}
          <p className="eyebrow">{mode === 'login' ? 'Welcome back' : 'Start your journey'}</p>
          <h2>{mode === 'login' ? 'Sign in to habitat' : 'Create tenant account'}</h2>
          <p className="auth-subtitle">
            {mode === 'login'
              ? 'Sign in to save homes, manage bookings, and contact agents.'
              : 'Create a tenant account to book homes. Agent and Admin accounts are provisioned by Habitat operations.'}
          </p>

          {mode === 'register' && (
            <div className="role-restriction-notice">
              <strong>Notice:</strong> Only tenant accounts can self-register. Email authentication is currently supported. Phone authentication requires additional SMS provider setup. Agents and administrators cannot create accounts here—they are provisioned by an admin and should use the <em>Sign in</em> option.
            </div>
          )}

          <form onSubmit={submitForm}>
            {mode === 'register' && (
              <label>
                Full name
                <input type="text" value={name} onChange={(event) => { setName(event.target.value); setError('') }} placeholder="Your full name" />
              </label>
            )}
            <label>
              Email address
              <input type="email" value={email} onChange={(event) => { setEmail(event.target.value); setError('') }} placeholder="you@example.com" />
            </label>
            <label>
              Password
              <div className="password-field">
                <input type="password" value={password} onChange={(event) => { setPassword(event.target.value); setError('') }} placeholder="Enter your password" />
                {mode === 'login' && !resetMode && <button type="button" onClick={async () => {
                  if (!identifier.trim() || !isValidEmail(identifier)) {
                    setError('Enter your email address to reset password.')
                    return
                  }
                  try {
                    await resetPassword(identifier)
                    setResetMode(true)
                    setSuccess('Password reset link sent to your email. Check your inbox.')
                  } catch (error) {
                    setError(error.message)
                  }
                }}>Forgot?</button>}
                {resetMode && <button type="button" onClick={() => { setResetMode(false); setNewPassword('') }}>Back to login</button>}
              </div>
            </label>
            {resetMode && (
              <label>
                New password
                <input type="password" value={newPassword} onChange={(event) => { setNewPassword(event.target.value); setError('') }} placeholder="Enter your new password (min 8 characters)" />
              </label>
            )}
            {mode === 'register' && (
              <label>
                Confirm password
                <input type="password" value={confirmPassword} onChange={(event) => { setConfirmPassword(event.target.value); setError('') }} placeholder="Repeat your password" />
              </label>
            )}

            {mode === 'login' && (
              <fieldset>
                <legend>Sign in as</legend>
                <div className="auth-role-options">
                  {[['Tenant', 'Tenant'], ['Agent', 'Agent'], ['SuperAdmin', 'Admin']].map(([value, label]) => (
                    <button type="button" key={value} className={role === value ? 'active' : ''} onClick={() => setRole(value)}>
                      <span>{value === 'Tenant' ? '⌂' : value === 'Agent' ? '▣' : '◆'}</span>
                      {label}
                    </button>
                  ))}
                </div>
              </fieldset>
            )}

            {error && <p className="auth-error">{error}</p>}
            {error && error.includes('verify your email') && (
              <button type="button" style={{ border: 0, background: 'none', color: '#3e735e', fontSize: '11px', fontWeight: 700, display: 'block', margin: '-6px auto 8px', cursor: 'pointer' }}
                onClick={async () => {
                  if (!identifier.trim()) { setError('Enter your email address first.'); return }
                  try {
                    await resendVerificationEmail(identifier.trim())
                    setSuccess('Verification email resent. Check your inbox.')
                    setError('')
                  } catch (err) {
                    setError(err.message)
                  }
                }}>
                Resend verification email →
              </button>
            )}
            {success && <p className="auth-success">{success}</p>}

            <button className="auth-submit" type="submit">
              {resetMode ? 'Update password' : mode === 'login' ? `Continue to ${role === 'SuperAdmin' ? 'admin' : role.toLowerCase()} dashboard` : 'Create tenant account'} <span>→</span>
            </button>
          </form>

          <button className="auth-mode-toggle" onClick={() => { const next = mode === 'login' ? 'register' : 'login'; setRole('Tenant'); setMode(next); setError(''); setSuccess('') }}>
            {mode === 'login' ? 'New to habitat? Create a tenant account' : 'Already have an account? Sign in'}
          </button>

          {onBrowseHomes && <button className="guest-browse-button" onClick={onBrowseHomes}>Continue browsing homes as a guest</button>}
          <p className="auth-note">You can browse homes without an account. Sign in is required to book.</p>
        </div>
      </section>
    </main>
  )
}

function SuperAdminPanel({ token, currentUserId, onNotify, activeView, onBackToDashboard }) {
  const [overview, setOverview] = useState(null)
  const [users, setUsers] = useState([])
  const [homes, setHomes] = useState([])
  const [applications, setApplications] = useState([])
  const [userSearch, setUserSearch] = useState('')
  const [userRoleFilter, setUserRoleFilter] = useState('All')
  const [homeSearch, setHomeSearch] = useState('')
  const [homeRegionFilter, setHomeRegionFilter] = useState('All regions')
  const [homeCategoryFilter, setHomeCategoryFilter] = useState('All categories')
  const [applicationSearch, setApplicationSearch] = useState('')
  const [applicationRegionFilter, setApplicationRegionFilter] = useState('All regions')
  const [applicationCategoryFilter, setApplicationCategoryFilter] = useState('All categories')
  const [loading, setLoading] = useState(true)
  const [selectedUser, setSelectedUser] = useState(null)
  const [showUserDetails, setShowUserDetails] = useState(false)
  const [selectedView, setSelectedView] = useState(null) // 'users', 'homes', 'applications', 'payments'
  const [showProfile, setShowProfile] = useState(false)
  const [profile, setProfile] = useState({ name: '', phone: '', occupation: '', bio: '', company: '' })
  const emptyNewUser = { name: '', identifier: '', password: '', role: 'Agent' }
  const [showAddUser, setShowAddUser] = useState(false)
  const [newUser, setNewUser] = useState(emptyNewUser)
  const [saving, setSaving] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [stats, people] = await Promise.all([fetchSuperAdminOverview(token), fetchSuperAdminUsers(token)])
      setOverview(stats)
      setUsers(people)
      
      // Also fetch ALL homes (available + taken) for the admin view
      const allHomes = await fetchAllHomesAdmin(token)
      setHomes(allHomes)
      
      // Fetch all applications (admin can see all)
      const allApps = await fetchSuperAdminApplications(token)
      setApplications(allApps)
    } catch (error) {
      onNotify(error.message)
    } finally {
      setLoading(false)
    }
  }, [token, onNotify])

  useEffect(() => { loadData() }, [loadData])

  // Sync with sidebar navigation
  useEffect(() => {
    if (activeView === 'agent-dashboard') {
      setSelectedView(null)
      setShowProfile(false)
    } else if (activeView === 'agent-homes') {
      setSelectedView('homes')
      setShowProfile(false)
    } else if (activeView === 'agent-applications') {
      setSelectedView('applications')
      setShowProfile(false)
    } else if (activeView === 'agent-profile') {
      setShowProfile(true)
      setSelectedView(null)
      // Load profile
      fetchProfile(token).then(setProfile).catch(onNotify)
    }
  }, [activeView, token, onNotify])

  const createUser = async (event) => {
    event.preventDefault()
    setSaving(true)
    try {
      const { user } = await createSuperAdminUser(newUser, token)
      onNotify(`${user.name} was added as a ${user.role}.`)
      setNewUser(emptyNewUser)
      setShowAddUser(false)
      loadData()
    } catch (error) { onNotify(error.message) } finally { setSaving(false) }
  }

  const removeUser = async (user) => {
    if (user.id === currentUserId) { onNotify('You cannot remove your own super-admin account.'); return }
    if (!window.confirm(`Remove ${user.name}? This permanently deletes the account.`)) return

    // If deleting an agent, offer to transfer their homes first
    if (user.role === 'Agent') {
      const agents = users.filter(u => u.role === 'Agent' && u.id !== user.id)
      if (agents.length > 0) {
        const transferTo = window.prompt(
          `${user.name} is an Agent with homes. Enter the email/identifier of the agent to transfer their homes to, or leave blank to leave homes unmanaged:\n\n` +
          agents.map(a => a.identifier).join('\n')
        )
        if (transferTo && transferTo.trim()) {
          const targetAgent = users.find(u => u.identifier === transferTo.trim())
          if (!targetAgent) { onNotify(`No agent found with identifier: ${transferTo.trim()}`); return }
          try {
            await transferAgentHomes(user.id, targetAgent.id, token)
            onNotify(`Homes transferred to ${targetAgent.name}.`)
          } catch (error) { onNotify(error.message); return }
        }
      }
    }

    try {
      await deleteSuperAdminUser(user.id, token)
      setUsers((current) => current.filter((item) => item.id !== user.id))
      onNotify(`${user.name} was removed.`)
      loadData()
    } catch (error) { onNotify(error.message) }
  }

  const viewUserDetails = (user) => {
    setSelectedUser(user)
    setShowUserDetails(true)
  }

  const filteredUsers = users.filter((user) => {
    if (userRoleFilter !== 'All' && user.role !== userRoleFilter) return false
    const haystack = `${user.name} ${user.identifier} ${user.company || ''}`.toLowerCase()
    return haystack.includes(userSearch.trim().toLowerCase())
  })

  const filteredHomes = homes.filter((home) => {
    const search = homeSearch.trim().toLowerCase()
    const matchesSearch = !search ||
      home.name.toLowerCase().includes(search) ||
      home.location.toLowerCase().includes(search) ||
      home.region.toLowerCase().includes(search) ||
      home.type.toLowerCase().includes(search) ||
      (home.agent_name || '').toLowerCase().includes(search)
    const matchesRegion = homeRegionFilter === 'All regions' || home.region === homeRegionFilter
    const matchesCategory = homeCategoryFilter === 'All categories' || home.type === homeCategoryFilter
    return matchesSearch && matchesRegion && matchesCategory
  })

  const stats = [
    { label: 'Total users', value: overview?.users, view: 'users', roleFilter: 'All' },
    { label: 'Tenants', value: overview?.tenants, view: 'users', roleFilter: 'Tenant' },
    { label: 'Agents', value: overview?.agents, view: 'users', roleFilter: 'Agent' },
    { label: 'Homes', value: overview?.homes, view: 'homes' },
    { label: 'Applications', value: overview?.applications, view: 'applications' },
    { label: 'Deposit payments', value: overview?.payments, view: 'payments' },
  ]

  return (
    <section className="management">
      <div className="management-header">
        <div><p className="eyebrow">System control</p><h1>Super-admin panel</h1><p>Monitor the platform and manage every account.</p></div>
        <div className="management-actions">
          <button onClick={() => loadData()}>Refresh ↻</button>
          <button onClick={() => setShowAddUser(true)}>+ Add user</button>
        </div>
      </div>

      {/* Stat Grid - Only show when no detailed view is selected */}
      {!selectedView && (
        <div className="stat-grid">
          {stats.map((stat) => (
            <div
              key={stat.label}
              onClick={() => {
                setSelectedView(stat.view)
                if (stat.view === 'users') setUserRoleFilter(stat.roleFilter || 'All')
              }}
              style={{
                cursor: 'pointer',
                transition: 'all 0.2s',
                ':hover': { transform: 'translateY(-4px)', boxShadow: '0 8px 16px rgba(0,0,0,0.1)' }
              }}
            >
              <span>{stat.label}</span>
              <strong>{loading || stat.value == null ? '—' : stat.value}</strong>
            </div>
          ))}
        </div>
      )}

      {/* Detailed Views - Replaces stat grid when selected */}
      {selectedView && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ margin: 0 }}>{selectedView.charAt(0).toUpperCase() + selectedView.slice(1)}</h2>
            <button onClick={() => { setSelectedView(null); onBackToDashboard?.() }} style={{ padding: '8px 16px', cursor: 'pointer' }}>← Back to overview</button>
          </div>

          {selectedView === 'users' && (
            <div className="table-panel user-panel">
              <div className="table-title">
                <h2>Users</h2>
                <span>{filteredUsers.length} account{filteredUsers.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="users-toolbar">
                <div className="search-field admin-user-search">
                  <span>⌕</span>
                  <input
                    value={userSearch}
                    onChange={(event) => setUserSearch(event.target.value)}
                    placeholder="Search by name, email or company"
                  />
                </div>
                <select
                  className="role-filter"
                  value={userRoleFilter}
                  onChange={(event) => setUserRoleFilter(event.target.value)}
                  aria-label="Filter users by role"
                >
                  <option value="All">All roles</option>
                  <option value="Tenant">Tenant</option>
                  <option value="Agent">Agent</option>
                  <option value="SuperAdmin">SuperAdmin</option>
                </select>
              </div>
              <div className="users-table-wrap">
                <table className="users-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Contact</th>
                      <th>Company</th>
                      <th>Role</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((user) => (
                      <tr key={user.id} onClick={() => viewUserDetails(user)}>
                        <td>
                          <div className="users-table-name">
                            <div className="avatar">{user.name.slice(0, 2).toUpperCase()}</div>
                            <strong>{user.name}{user.id === currentUserId && <em> (you)</em>}</strong>
                          </div>
                        </td>
                        <td>{user.identifier}</td>
                        <td>{user.company || '—'}</td>
                        <td><span className="role-static">{user.role}</span></td>
                        <td>
                          {user.id !== currentUserId && (
                            <button
                              className="remove-user"
                              onClick={(event) => { event.stopPropagation(); removeUser(user) }}
                            >
                              Remove
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!loading && filteredUsers.length === 0 && (
                <div className="empty-state">
                  <strong>No users found</strong>
                  <span>Try a different search or role filter.</span>
                </div>
              )}
            </div>
          )}

          {selectedView === 'homes' && (
            <div className="table-panel">
              <div className="table-title">
                <h2>Homes</h2>
                <span>{filteredHomes.length} home{filteredHomes.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="users-toolbar">
                <div className="search-field admin-user-search">
                  <span>⌕</span>
                  <input
                    value={homeSearch}
                    onChange={(event) => setHomeSearch(event.target.value)}
                    placeholder="Search by neighbourhood or home"
                  />
                </div>
                <select
                  className="role-filter"
                  value={homeRegionFilter}
                  onChange={(event) => setHomeRegionFilter(event.target.value)}
                  aria-label="Filter homes by region"
                >
                  <option value="All regions">All regions</option>
                  <option value="Nairobi County">Nairobi County</option>
                  <option value="Mombasa County">Mombasa County</option>
                  <option value="Kisumu County">Kisumu County</option>
                  <option value="Nakuru County">Nakuru County</option>
                  <option value="Kiambu County">Kiambu County</option>
                </select>
                <select
                  className="role-filter"
                  value={homeCategoryFilter}
                  onChange={(event) => setHomeCategoryFilter(event.target.value)}
                  aria-label="Filter homes by category"
                >
                  <option value="All categories">All categories</option>
                  <option value="Studio">Studio</option>
                  <option value="One bedroom">One bedroom</option>
                  <option value="Two bedroom">Two bedroom</option>
                  <option value="Three bedroom">Three bedroom</option>
                  <option value="Four bedroom">Four bedroom</option>
                </select>
              </div>
              <div className="users-table-wrap">
                <table className="users-table homes-table">
                  <thead>
                    <tr>
                      <th>Home</th>
                      <th>Location</th>
                      <th>Region</th>
                      <th>Category</th>
                      <th>Rent</th>
                      <th>Status</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredHomes.map((home) => (
                      <tr key={home.id}>
                        <td>
                          <div className="users-table-name">
                            <div className="avatar" style={{ width: '40px', height: '40px', fontSize: '14px', backgroundImage: `url(${home.image})`, backgroundSize: 'cover', backgroundPosition: 'center' }}></div>
                            <strong>{home.name}</strong>
                          </div>
                        </td>
                        <td>{home.location}</td>
                        <td>{home.region}</td>
                        <td>{home.type}</td>
                        <td>{formatKes(home.price)}/mo</td>
                        <td>
                          <span className="role-static" style={{ padding: '4px 12px', borderRadius: '12px', fontSize: '12px', background: home.available ? '#10b981' : '#ef4444', color: 'white' }}>
                            {home.available ? 'Available' : 'Taken'}
                          </span>
                        </td>
                        <td>
                          {!home.available && (
                            <button
                              style={{ border: 'none', background: 'none', color: '#3e735e', fontSize: '10px', fontWeight: 700, cursor: 'pointer', marginRight: '12px' }}
                              onClick={async () => {
                                if (!window.confirm(`Re-list "${home.name}" as available for new tenants?`)) return
                                try {
                                  await relistHome(home.id, token)
                                  setHomes(current => current.map(h => h.id === home.id ? { ...h, available: true } : h))
                                  onNotify(`${home.name} is now available.`)
                                } catch (error) { onNotify(error.message) }
                              }}
                            >
                              Re-list ↺
                            </button>
                          )}
                          <button
                            className="remove-user"
                            onClick={async () => {
                              if (!window.confirm(`Permanently delete "${home.name}"? This cannot be undone.`)) return
                              try {
                                await deleteSuperAdminHome(home.id, token)
                                setHomes(current => current.filter(h => h.id !== home.id))
                                onNotify(`${home.name} was deleted.`)
                              } catch (error) { onNotify(error.message) }
                            }}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!loading && filteredHomes.length === 0 && (
                <div className="empty-state">
                  <strong>No homes found</strong>
                  <span>Try a different search, region, or category.</span>
                </div>
              )}
            </div>
          )}

          {selectedView === 'applications' && (
            <div className="table-panel">
              <div className="table-title">
                <h2>All Applications</h2>
                <span>{applications.length} application{applications.length === 1 ? '' : 's'}</span>
              </div>
              <div className="users-toolbar">
                <div className="search-field admin-user-search">
                  <span>⌕</span>
                  <input
                    value={applicationSearch}
                    onChange={(event) => setApplicationSearch(event.target.value)}
                    placeholder="Search by tenant name or home"
                  />
                </div>
                <select
                  className="role-filter"
                  value={applicationRegionFilter}
                  onChange={(event) => setApplicationRegionFilter(event.target.value)}
                  aria-label="Filter applications by region"
                >
                  <option value="All regions">All regions</option>
                  <option value="Nairobi County">Nairobi County</option>
                  <option value="Mombasa County">Mombasa County</option>
                  <option value="Kisumu County">Kisumu County</option>
                  <option value="Nakuru County">Nakuru County</option>
                  <option value="Kiambu County">Kiambu County</option>
                </select>
                <select
                  className="role-filter"
                  value={applicationCategoryFilter}
                  onChange={(event) => setApplicationCategoryFilter(event.target.value)}
                  aria-label="Filter applications by category"
                >
                  <option value="All categories">All categories</option>
                  <option value="Studio">Studio</option>
                  <option value="One bedroom">One bedroom</option>
                  <option value="Two bedroom">Two bedroom</option>
                  <option value="Three bedroom">Three bedroom</option>
                  <option value="Four bedroom">Four bedroom</option>
                </select>
              </div>
              <div className="users-table-wrap">
                <table className="users-table applications-table">
                  <thead>
                    <tr>
                      <th>Tenant</th>
                      <th>Home</th>
                      <th>Location</th>
                      <th>Region</th>
                      <th>Category</th>
                      <th>Deposit</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {applications.filter(app => {
                      const search = applicationSearch.toLowerCase()
                      const matchesSearch = !search ||
                        (app.profiles?.name || '').toLowerCase().includes(search) ||
                        (app.homes?.name || '').toLowerCase().includes(search) ||
                        (app.homes?.location || '').toLowerCase().includes(search)
                      const matchesRegion = applicationRegionFilter === 'All regions' || (app.homes?.region || '') === applicationRegionFilter
                      const matchesCategory = applicationCategoryFilter === 'All categories' || (app.homes?.type || '') === applicationCategoryFilter
                      return matchesSearch && matchesRegion && matchesCategory
                    }).map((app) => (
                      <tr key={app.id}>
                        <td>
                          <div className="users-table-name">
                            <div className="avatar">{app.profiles?.name?.slice(0, 2).toUpperCase() || 'T'}</div>
                            <strong>{app.profiles?.name || 'Tenant'}</strong>
                          </div>
                        </td>
                        <td>{app.homes?.name || '—'}</td>
                        <td>{app.homes?.location || '—'}</td>
                        <td>{app.homes?.region || '—'}</td>
                        <td>{app.homes?.type || '—'}</td>
                        <td>{formatKes(app.homes?.deposit || 0)}</td>
                        <td><span className="role-static" style={{ padding: '4px 12px', borderRadius: '12px', fontSize: '12px', background: getStatusColor(app.status), color: 'white' }}>{app.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!loading && applications.filter(app => {
                const search = applicationSearch.toLowerCase()
                const matchesSearch = !search ||
                  (app.profiles?.name || '').toLowerCase().includes(search) ||
                  (app.homes?.name || '').toLowerCase().includes(search) ||
                  (app.homes?.location || '').toLowerCase().includes(search)
                const matchesRegion = applicationRegionFilter === 'All regions' || (app.homes?.region || '') === applicationRegionFilter
                const matchesCategory = applicationCategoryFilter === 'All categories' || (app.homes?.type || '') === applicationCategoryFilter
                return matchesSearch && matchesRegion && matchesCategory
              }).length === 0 && (
                <div className="empty-state">
                  <strong>No applications found</strong>
                  <span>Try a different search, region, or category.</span>
                </div>
              )}
            </div>
          )}

          {selectedView === 'payments' && (
            <div className="table-panel">
              <div className="table-title">
                <h2>Deposit Payments</h2>
                <span>{applications.filter(a => ['pending', 'paid'].includes(a.payment_status)).length} record{applications.filter(a => ['pending', 'paid'].includes(a.payment_status)).length !== 1 ? 's' : ''}</span>
              </div>
              <div className="users-toolbar">
                <div className="search-field admin-user-search">
                  <span>⌕</span>
                  <input
                    value={applicationSearch}
                    onChange={(event) => setApplicationSearch(event.target.value)}
                    placeholder="Search by tenant name or home"
                  />
                </div>
                <select
                  className="role-filter"
                  value={applicationRegionFilter}
                  onChange={(event) => setApplicationRegionFilter(event.target.value)}
                  aria-label="Filter by payment status"
                >
                  <option value="All regions">All payment statuses</option>
                  <option value="__pending">Pending</option>
                  <option value="__paid">Paid</option>
                </select>
              </div>
              <div className="users-table-wrap">
                <table className="users-table applications-table">
                  <thead>
                    <tr>
                      <th>Tenant</th>
                      <th>Home</th>
                      <th>Location</th>
                      <th>Amount</th>
                      <th>Phone</th>
                      <th>App Status</th>
                      <th>Payment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {applications.filter(app => {
                      const hasPay = ['pending', 'paid'].includes(app.payment_status)
                      if (!hasPay) return false
                      const search = applicationSearch.toLowerCase()
                      const matchesSearch = !search ||
                        (app.profiles?.name || '').toLowerCase().includes(search) ||
                        (app.homes?.name || '').toLowerCase().includes(search) ||
                        (app.homes?.location || '').toLowerCase().includes(search)
                      const matchesStatus =
                        applicationRegionFilter === 'All regions' ||
                        (applicationRegionFilter === '__pending' && app.payment_status === 'pending') ||
                        (applicationRegionFilter === '__paid' && app.payment_status === 'paid')
                      return matchesSearch && matchesStatus
                    }).map((app) => (
                      <tr key={app.id}>
                        <td>
                          <div className="users-table-name">
                            <div className="avatar">{app.profiles?.name?.slice(0, 2).toUpperCase() || 'T'}</div>
                            <strong>{app.profiles?.name || 'Tenant'}</strong>
                          </div>
                        </td>
                        <td>{app.homes?.name || '—'}</td>
                        <td>{app.homes?.location || '—'}</td>
                        <td><strong>{formatKes(app.payment_amount || 0)}</strong></td>
                        <td>{app.payment_phone || '—'}</td>
                        <td>
                          <span className="role-static" style={{ padding: '4px 12px', borderRadius: '12px', fontSize: '12px', background: getStatusColor(app.status), color: 'white' }}>
                            {app.status}
                          </span>
                        </td>
                        <td>
                          <span className="role-static" style={{ padding: '4px 12px', borderRadius: '12px', fontSize: '12px', background: app.payment_status === 'paid' ? '#10b981' : '#f59e0b', color: 'white' }}>
                            {app.payment_status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!loading && applications.filter(a => ['pending', 'paid'].includes(a.payment_status)).length === 0 && (
                <div className="empty-state">
                  <strong>No payment records yet</strong>
                  <span>Deposit payments will appear here once tenants initiate payment.</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {showProfile && (
        <form className="listing-form profile-form" onSubmit={async (event) => {
          event.preventDefault()
          try {
            const updated = await updateProfile({ name: profile.name, phone: profile.phone, occupation: profile.occupation, bio: profile.bio, company: profile.company }, token)
            onNotify('Profile updated.')
            setShowProfile(false)
          } catch (error) { onNotify(error.message) }
        }} style={{ maxWidth: '600px', margin: '0 auto' }}>
          <div className="form-header-bar">
            <h2>My profile</h2>
            <button type="button" className="in-app-back-button" onClick={() => { setShowProfile(false); onBackToDashboard?.() }}>← Back to overview</button>
          </div>
          <p className="form-help">These details are visible to other users.</p>
          <div className="form-grid">
            <label>Full name<input required value={profile.name} onChange={(event) => setProfile({ ...profile, name: event.target.value })} /></label>
            <label>Phone number<input value={profile.phone} onChange={(event) => setProfile({ ...profile, phone: event.target.value })} /></label>
            <label>Company<input value={profile.company} onChange={(event) => setProfile({ ...profile, company: event.target.value })} /></label>
            <label>Occupation<input value={profile.occupation} onChange={(event) => setProfile({ ...profile, occupation: event.target.value })} /></label>
            <label className="wide-field">About you<textarea value={profile.bio} onChange={(event) => setProfile({ ...profile, bio: event.target.value })} /></label>
          </div>
          <button className="primary-action" type="submit">Save changes <span>→</span></button>
        </form>
      )}

      {!selectedView && !showProfile && (
        <>
          {showAddUser && (
        <div className="add-user-modal" style={{ 
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000
        }}>
          <form className="add-user-form" onSubmit={createUser} style={{ 
            background: 'white', padding: '24px', borderRadius: '12px', maxWidth: '400px', width: '90%'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2>Add New User</h2>
              <button type="button" onClick={() => setShowAddUser(false)} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer' }}>×</button>
            </div>
            <label>Full name<input required value={newUser.name} onChange={(event) => setNewUser({ ...newUser, name: event.target.value })} placeholder="Jane Wanjiru" /></label>
            <label>Email or phone<input required value={newUser.identifier} onChange={(event) => setNewUser({ ...newUser, identifier: event.target.value })} placeholder="jane@example.com or 0712345678" /></label>
            <label>Temporary password<input required type="password" value={newUser.password} onChange={(event) => setNewUser({ ...newUser, password: event.target.value })} placeholder="At least 8 characters" /></label>
            <label>Role<select value={newUser.role} onChange={(event) => setNewUser({ ...newUser, role: event.target.value })}><option value="Agent">Agent</option><option value="Tenant">Tenant</option><option value="SuperAdmin">SuperAdmin</option></select></label>
            <button className="primary-action" type="submit" disabled={saving}>{saving ? 'Adding…' : 'Add user'} <span>→</span></button>
          </form>
        </div>
      )}
        </>
      )}

      {/* User Details Modal */}
      {showUserDetails && selectedUser && (
        <div className="user-details-modal" style={{ 
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{ 
            background: 'white', padding: '32px', borderRadius: '12px', maxWidth: '500px', width: '90%',
            maxHeight: '80vh', overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2>User Details</h2>
              <button onClick={() => { setShowUserDetails(false); setSelectedUser(null) }} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer' }}>×</button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '24px' }}>
              <div className="avatar" style={{ width: '80px', height: '80px', fontSize: '32px' }}>{selectedUser.name.slice(0, 2).toUpperCase()}</div>
              <div>
                <h3 style={{ margin: '0 0 4px 0' }}>{selectedUser.name}</h3>
                <p style={{ margin: '0', color: '#666' }}>{selectedUser.role}</p>
              </div>
            </div>
            <div style={{ display: 'grid', gap: '16px' }}>
              <div><strong>Email/Phone:</strong> {selectedUser.identifier}</div>
              {selectedUser.company && <div><strong>Company:</strong> {selectedUser.company}</div>}
              <div><strong>Created:</strong> {new Date(selectedUser.createdAt).toLocaleDateString()}</div>
              <div><strong>Role:</strong> {selectedUser.role}</div>
            </div>
            {selectedUser.id !== currentUserId && (
              <button 
                className="remove-user" 
                onClick={() => { removeUser(selectedUser); setShowUserDetails(false); setSelectedUser(null) }}
                style={{ marginTop: '24px', width: '100%', padding: '12px' }}
              >
                Remove User
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  )
}

export default App
