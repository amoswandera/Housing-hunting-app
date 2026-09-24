import { useCallback, useEffect, useMemo, useState } from 'react'
import AgentDashboard from './AgentDashboard'
import { cancelApplication, cancelBooking as cancelBookingApi, createSuperAdminUser, deleteSuperAdminUser, fetchBookings, fetchHomes, fetchMyApplications, fetchProfile, fetchSuperAdminOverview, fetchSuperAdminUsers, loginUser, registerUser, requestPayment, submitApplication, updateProfile } from './api'
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
  },
]

const formatKes = (amount) => `KES ${amount.toLocaleString('en-KE')}`
const getDirectionsUrl = (home) => `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${home.name}, ${home.location}, Kenya`)}&travelmode=driving`

const normalizeIdentifier = (value) => {
  const trimmed = value.trim().toLowerCase()
  return trimmed.startsWith('+') ? `+${trimmed.slice(1).replace(/\D/g, '')}` : trimmed.replace(/[\s()-]/g, '')
}

const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
const isValidPhone = (value) => /^(?:\+254|0)(?:1|7)\d{8}$/.test(value)
const isValidIdentifier = (value) => isValidEmail(value) || isValidPhone(value)

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
  const [booked, setBooked] = useState([])
  const [toast, setToast] = useState('')
  const [homes, setHomes] = useState(initialHomes)
  const [applications, setApplications] = useState([])
  const [paymentApplication, setPaymentApplication] = useState(null)
  const [paymentPhone, setPaymentPhone] = useState('')
  const [paymentAmount, setPaymentAmount] = useState('')
  const [showTenantProfile, setShowTenantProfile] = useState(false)
  const [agentProfileNonce, setAgentProfileNonce] = useState(0)
  const [tenantProfile, setTenantProfile] = useState({ name: '', phone: '', nationalId: '', occupation: '', bio: '', company: '' })

  useEffect(() => {
    fetchHomes().then(setHomes).catch(() => {})
  }, [])

  useEffect(() => {
    if (!authUser?.token || authUser.role !== 'Tenant') return
    fetchMyApplications(authUser.token).then((items) => {
      setApplications(items)
      setBooked(items.filter((item) => ['submitted', 'approved'].includes(item.status)).map((item) => item.home_id))
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

  useEffect(() => {
    if (!authUser?.token) return
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
    return matchesRegion && matchesCategory && searchable.includes(query.toLowerCase())
  }), [category, homes, query, region])

  const showToast = useCallback((message) => {
    setToast(message)
    window.setTimeout(() => setToast(''), 2600)
  }, [])

  const toggleSaved = (id) => {
    setSaved((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])
  }

  const confirmBooking = async () => {
    if (!authUser) {
      setSelectedHome(null)
      setShowAuthScreen(true)
      return
    }
    try {
      await submitApplication(selectedHome.id, 'I would like to apply for this home.', authUser.token)
      const updatedApplications = await fetchMyApplications(authUser.token)
      setApplications(updatedApplications)
      setBooked((current) => [...new Set([...current, selectedHome.id])])
      showToast(`Application sent to ${selectedHome.agent_name || 'the house agent'}`)
      setSelectedHome(null)
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
      setAuthUser({ ...result.user, token: result.token })
      setRole(result.user.role)
      setShowAuthScreen(false)
      return true
    } catch {
      return false
    }
  }

  const createAccount = async (account) => {
    const result = await registerUser(account)
    setAccounts((current) => [...current, result.user])
  }

  const saveTenantProfile = async (event) => {
    event.preventDefault()
    try { const savedProfile = await updateProfile(tenantProfile, authUser.token); setTenantProfile(savedProfile); setShowTenantProfile(false); setAuthUser((current) => ({ ...current, ...savedProfile })); showToast('Your profile was updated.') } catch (error) { showToast(error.message) }
  }

  // Opens the signed-in user's own profile from the sidebar profile card.
  const openMyProfile = () => {
    if (!authUser) { setShowAuthScreen(true); return }
    if (authUser.role === 'Tenant') setShowTenantProfile(true)
    else if (authUser.role === 'Agent') setAgentProfileNonce((current) => current + 1)
    else showToast('Super-admin details are managed by the system.')
  }

  if (showAuthScreen) {
    return <AuthScreen accounts={accounts} onLogin={login} onCreateAccount={createAccount} onBrowseHomes={() => setShowAuthScreen(false)} />
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark">h</span><span>habitat</span></div>
        <div className="profile-card clickable" role="button" tabIndex={0} onClick={openMyProfile} onKeyDown={(event) => (event.key === 'Enter' || event.key === ' ') && openMyProfile()}><div className="avatar">{authUser ? authUser.initials : 'G'}</div><div><strong>{authUser ? authUser.name : 'Guest visitor'}</strong><span>{authUser ? `${authUser.role} account` : 'Browse-only access'}</span></div><span className="chevron">⌄</span></div>
        <nav className="main-nav">
          <button className="nav-item active"><span>⌂</span> Discover</button>
          <button className="nav-item" onClick={() => showToast(`${saved.length} homes saved`)}><span>♡</span> Saved <b>{saved.length}</b></button>
          <button className="nav-item" onClick={() => showToast(`${booked.length} active booking${booked.length === 1 ? '' : 's'}`)}><span>▣</span> My bookings <b>{booked.length}</b></button>
          {authUser?.role === 'Tenant' && <button className="nav-item" onClick={() => setShowTenantProfile((current) => !current)}><span>♙</span> My profile</button>}
        </nav>
        <div className="sidebar-bottom"><div className="help-icon">?</div><div><strong>Need a hand?</strong><span>Our team is here to help.</span></div><button aria-label="Open help">→</button></div>
      </aside>

      <main className="main-content">
        <header className="topbar"><div className="mobile-brand"><span className="brand-mark">h</span> habitat</div><div className="role-badge"><span className="role-dot"></span>{authUser ? `${role} workspace` : 'Browsing as guest'}</div><div className="top-actions"><button className="icon-button" aria-label="Notifications">♧<i></i></button>{authUser ? <><div className="mini-avatar">{authUser.initials}</div><button className="logout-button" onClick={() => { setAuthUser(null); setRole('Tenant') }}>Log out</button></> : <button className="login-link" onClick={() => setShowAuthScreen(true)}>Sign in to book</button>}</div></header>

        {role === 'Tenant' && <>
          {showTenantProfile && <form className="listing-form profile-form tenant-profile" onSubmit={saveTenantProfile}><h2>My tenant profile</h2><p className="form-help">These details are shared with an agent when you apply for a home.</p><div className="form-grid"><label>Full name<input required value={tenantProfile.name} onChange={(event) => setTenantProfile({ ...tenantProfile, name: event.target.value })} /></label><label>Phone number<input value={tenantProfile.phone} onChange={(event) => setTenantProfile({ ...tenantProfile, phone: event.target.value })} /></label><label>National ID<input value={tenantProfile.nationalId} onChange={(event) => setTenantProfile({ ...tenantProfile, nationalId: event.target.value })} /></label><label>Occupation<input value={tenantProfile.occupation} onChange={(event) => setTenantProfile({ ...tenantProfile, occupation: event.target.value })} /></label><label className="wide-field">About you<textarea value={tenantProfile.bio} onChange={(event) => setTenantProfile({ ...tenantProfile, bio: event.target.value })} /></label></div><button className="primary-action form-submit" type="submit">Save profile <span>→</span></button></form>}
          <section className="welcome"><div><p className="eyebrow">Monday, 12 August 2024</p><h1>Find a place<br /><em>to feel at home.</em></h1><p className="intro">Thoughtfully selected homes in the places you want to be.</p></div><div className="welcome-art"><div className="sun"></div><div className="hill hill-one"></div><div className="hill hill-two"></div><div className="house-art">⌂</div></div></section>
          <section className="search-panel"><div className="search-field"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by neighbourhood or home" /></div><div className="select-field"><span>⌖</span><select value={region} onChange={(event) => setRegion(event.target.value)}><option>All regions</option><option>Nairobi County</option><option>Mombasa County</option><option>Kisumu County</option><option>Nakuru County</option></select></div><div className="select-field category-select"><span>⌂</span><select value={category} onChange={(event) => setCategory(event.target.value)}><option>All categories</option><option>Single room</option><option>Bedsitter</option><option>One bedroom</option><option>Two bedroom</option><option>Three bedroom</option><option>Four bedroom</option></select></div><button className="search-button" onClick={() => showToast(`${filteredHomes.length} homes found`)}>Search homes <span>→</span></button></section>
          <div className="content-heading"><div><h2>Homes for you</h2><p>{filteredHomes.length} available homes, updated today</p></div><button className="view-toggle active">▦</button><button className="view-toggle">☷</button></div>
          <section className="home-grid">{filteredHomes.map((home) => <article className="home-card" key={home.id}><div className="image-wrap" role="button" tabIndex="0" onClick={() => setSelectedHome(home)} onKeyDown={(event) => event.key === 'Enter' && setSelectedHome(home)}><img src={home.image} alt={`${home.name} interior`} /><span className="home-tag">{home.tag}</span><span className="photo-hint">View photos ↗</span><button className={`save-button ${saved.includes(home.id) ? 'saved' : ''}`} onClick={(event) => { event.stopPropagation(); toggleSaved(home.id) }} aria-label={`Save ${home.name}`}>{saved.includes(home.id) ? '♥' : '♡'}</button></div><div className="home-info"><div className="home-title"><div><h3>{home.name}</h3><p>{home.location}</p></div><span className="rating">★ 4.9</span></div><p className="home-details">{home.type} <span>·</span> {home.details}</p><p className={`parking-status ${home.parking ? 'available' : 'unavailable'}`}>{home.parking ? '✓ Parking available' : '× No parking available'}</p><div className="home-footer"><div><strong>{formatKes(home.price)}</strong><span>/ month</span></div><div className="home-actions"><button onClick={() => setSelectedHome(home)}>View home <span>↗</span></button><a href={getDirectionsUrl(home)} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()}>Directions ↗</a></div></div></div></article>)}</section>
          {filteredHomes.length === 0 && <div className="empty-state"><strong>No homes found</strong><span>Try a different neighbourhood or region.</span></div>}
          {applications.length > 0 && <section className="application-list"><div className="content-heading"><div><h2>My applications</h2><p>Applications are reviewed by each house agent.</p></div></div>{applications.map((application) => <div className="application-row" key={application.id}><div><strong>{application.name}</strong><span>{application.location}</span></div><span className={`application-status ${application.status}`}>{application.status}</span>{application.status === 'approved' && <div className="contract-box"><strong>Approved</strong><span>{application.contract_pdf_url ? <a href={application.contract_pdf_url} target="_blank" rel="noreferrer">View contract PDF ↗</a> : 'Contract PDF pending'}</span><small>{application.paybill_pdf_url ? <a href={application.paybill_pdf_url} target="_blank" rel="noreferrer">View paybill PDF ↗</a> : 'Paybill PDF pending'}</small>{application.payment_status !== 'paid' && <button onClick={() => { setPaymentApplication(application); setPaymentPhone(authUser.phone || ''); setPaymentAmount(application.deposit) }}>Make payment</button>}{application.payment_status === 'pending' && <small>Payment prompt sent to {application.payment_phone}.</small>}{application.payment_status === 'paid' && <small>Deposit payment recorded.</small>}</div>}{application.status === 'submitted' && <button onClick={() => cancelBooking(application.home_id)}>Cancel application</button>}</div>)}</section>}
        </>}

        {authUser && role === 'Agent' && <AgentDashboard token={authUser.token} onNotify={showToast} openProfileNonce={agentProfileNonce} />}

        {authUser && role === 'SuperAdmin' && <SuperAdminPanel token={authUser.token} currentUserId={authUser.id} onNotify={showToast} />}
      </main>

      {selectedHome && <div className="modal-backdrop" onClick={() => setSelectedHome(null)}><div className="booking-modal" onClick={(event) => event.stopPropagation()}><button className="close-button" onClick={() => setSelectedHome(null)}>×</button><img className="modal-home-image" src={selectedHome.image} alt={`${selectedHome.name} interior`} /><div className="modal-content"><p className="eyebrow">{selectedHome.location}</p><h2>{selectedHome.name}</h2><p>{selectedHome.details} Submit an application and the agent will review it before you make any deposit payment.</p><div className="agent-profile"><div className="avatar">{(selectedHome.agent_name || 'Agent').slice(0, 2).toUpperCase()}</div><div><strong>{selectedHome.agent_name || 'House agent'}</strong><span>{selectedHome.agent_company || 'Habitat verified agent'}</span><small>{selectedHome.agent_phone || 'Contact details shared after application review'}</small></div></div><div className="fee-row"><div><span>Monthly rent</span><strong>{formatKes(selectedHome.price)}</strong></div><div><span>Deposit after approval</span><strong>{formatKes(selectedHome.deposit)}</strong></div></div><button className="primary-action" onClick={confirmBooking}>Send application <span>→</span></button><small>No payment is taken now. The agent will send a contract and paybill after approval.</small></div></div></div>}
      {paymentApplication && <div className="modal-backdrop" onClick={() => setPaymentApplication(null)}><form className="payment-modal" onClick={(event) => event.stopPropagation()} onSubmit={async (event) => { event.preventDefault(); try { const result = await requestPayment(paymentApplication.id, paymentPhone, paymentAmount, authUser.token); setApplications((current) => current.map((item) => item.id === paymentApplication.id ? { ...item, payment_status: 'pending', payment_phone: paymentPhone, payment_amount: paymentAmount } : item)); setPaymentApplication(null); showToast(result.message) } catch (error) { showToast(error.message) } }}><button type="button" className="close-button" onClick={() => setPaymentApplication(null)}>×</button><p className="eyebrow">Secure deposit request</p><h2>Make payment</h2><p>Enter the phone number that should receive the M-Pesa prompt and the deposit amount.</p><label>Phone number<input required value={paymentPhone} onChange={(event) => setPaymentPhone(event.target.value)} placeholder="0712345678" /></label><label>Amount (KES)<input required type="number" min="1" value={paymentAmount} onChange={(event) => setPaymentAmount(event.target.value)} /></label><button className="primary-action" type="submit">Pay and send prompt <span>→</span></button><small>The backend will send a prompt when Safaricom Daraja credentials are configured.</small></form></div>}
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

  useEffect(() => {
    const identifierInput = document.querySelector('.auth-panel input[type="email"]')
    if (identifierInput) {
      identifierInput.setAttribute('type', 'text')
      identifierInput.setAttribute('placeholder', 'you@example.com or 0712345678')
      identifierInput.form?.setAttribute('novalidate', '')
      const identifierLabel = identifierInput.closest('label')
      if (identifierLabel?.firstChild) identifierLabel.firstChild.textContent = 'Email or phone number'
    }
  }, [mode])

  const submitForm = async (event) => {
    event.preventDefault()
    setError('')
    setSuccess('')

    if (mode === 'register') {
      if (!name.trim() || !identifier.trim() || !password.trim() || !confirmPassword.trim()) {
        setError('Complete all fields to create your account.')
        return
      }
      const normalizedIdentifier = normalizeIdentifier(identifier)
      if (!isValidIdentifier(normalizedIdentifier)) {
        setError('Enter a valid email address or Kenyan phone number, such as +254712345678.')
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
        await onCreateAccount({ identifier: normalizedIdentifier, password, name: name.trim(), initials, role })
        setMode('login')
        setPassword('')
        setConfirmPassword('')
        setSuccess('Account created. Sign in with your new account.')
      } catch (error) {
        setError(error.message)
      }
      return
    }

    if (!identifier.trim() || !password.trim()) {
      setError('Enter your email or phone number and password to continue.')
      return
    }
    const normalizedIdentifier = normalizeIdentifier(identifier)
    if (!isValidIdentifier(normalizedIdentifier)) {
      setError('Enter a valid email address or Kenyan phone number.')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters long.')
      return
    }
    if (!await onLogin({ identifier: normalizedIdentifier, password, role })) {
      setError('No matching account found. Check your details or create an account first.')
    }
  }

  return <main className="auth-page"><section className="auth-visual"><div className="auth-brand"><span className="brand-mark">h</span> habitat</div><div className="auth-copy"><p className="eyebrow">A better way home</p><h1>Find your next<br /><em>chapter.</em></h1><p>Explore thoughtfully selected homes and make your move with confidence.</p></div><div className="auth-art"><div className="auth-sun"></div><div className="auth-hill auth-hill-one"></div><div className="auth-hill auth-hill-two"></div><div className="auth-house">⌂</div></div></section><section className="auth-panel"><div className="auth-panel-inner"><p className="eyebrow">{mode === 'login' ? 'Welcome back' : 'Start your journey'}</p><h2>{mode === 'login' ? 'Sign in to habitat' : 'Create your account'}</h2><p className="auth-subtitle">{mode === 'login' ? 'Sign in to save homes and book a property.' : 'Create a tenant account to book a home. Agents and admins are added by the Habitat team.'}</p><form onSubmit={submitForm}>{mode === 'register' && <label>Full name<input type="text" value={name} onChange={(event) => { setName(event.target.value); setError('') }} placeholder="Your full name" /></label>}<label>Email address<input type="email" value={email} onChange={(event) => { setEmail(event.target.value); setError('') }} placeholder="you@example.com" /></label><label>Password<div className="password-field"><input type="password" value={password} onChange={(event) => { setPassword(event.target.value); setError('') }} placeholder="Enter your password" />{mode === 'login' && <button type="button" onClick={() => setError('Password reset will be available once connected to your backend.')}>Forgot?</button>}</div></label>{mode === 'register' && <label>Confirm password<input type="password" value={confirmPassword} onChange={(event) => { setConfirmPassword(event.target.value); setError('') }} placeholder="Repeat your password" /></label>}{mode === 'login' && <fieldset><legend>Sign in as</legend><div className="auth-role-options">{[['Tenant', 'Tenant'], ['Agent', 'Agent'], ['SuperAdmin', 'Admin']].map(([value, label]) => <button type="button" key={value} className={role === value ? 'active' : ''} onClick={() => setRole(value)}><span>{value === 'Tenant' ? '⌂' : value === 'Agent' ? '▣' : '◆'}</span>{label}</button>)}</div></fieldset>}{error && <p className="auth-error">{error}</p>}{success && <p className="auth-success">{success}</p>}<button className="auth-submit" type="submit">{mode === 'login' ? `Continue to ${role.toLowerCase()} dashboard` : 'Create account'} <span>→</span></button></form><button className="auth-mode-toggle" onClick={() => { const next = mode === 'login' ? 'register' : 'login'; if (next === 'register') setRole('Tenant'); setMode(next); setError(''); setSuccess('') }}>{mode === 'login' ? 'New to habitat? Create an account' : 'Already have an account? Sign in'}</button>{onBrowseHomes && <button className="guest-browse-button" onClick={onBrowseHomes}>Continue browsing homes as a guest</button>}<p className="auth-note">You can browse homes without an account. Sign in is required to book.</p></div></section></main>
}

function SuperAdminPanel({ token, currentUserId, onNotify }) {
  const [overview, setOverview] = useState(null)
  const [users, setUsers] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
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
    } catch (error) {
      onNotify(error.message)
    } finally {
      setLoading(false)
    }
  }, [token, onNotify])

  useEffect(() => { loadData() }, [loadData])

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
    try {
      await deleteSuperAdminUser(user.id, token)
      setUsers((current) => current.filter((item) => item.id !== user.id))
      onNotify(`${user.name} was removed.`)
      loadData()
    } catch (error) { onNotify(error.message) }
  }

  const filteredUsers = users.filter((user) => {
    const haystack = `${user.name} ${user.identifier} ${user.role} ${user.company || ''}`.toLowerCase()
    return haystack.includes(search.trim().toLowerCase())
  })

  const stats = [
    { label: 'Total users', value: overview?.users, hint: 'All accounts' },
    { label: 'Tenants', value: overview?.tenants, hint: 'House seekers' },
    { label: 'Agents', value: overview?.agents, hint: 'Listing owners' },
    { label: 'Homes', value: overview?.homes, hint: `${overview?.availableHomes ?? 0} available` },
    { label: 'Applications', value: overview?.applications, hint: `${overview?.pendingApplications ?? 0} pending` },
    { label: 'Deposit payments', value: overview?.payments, hint: 'Pending or paid' },
  ]

  return <section className="management">
    <div className="management-header">
      <div><p className="eyebrow">System control</p><h1>Super-admin panel</h1><p>Monitor the platform and manage every account.</p></div>
      <div className="management-actions"><button onClick={() => loadData()}>Refresh ↻</button></div>
    </div>
    <div className="stat-grid">{stats.map((stat) => <div key={stat.label}><span>{stat.label}</span><strong>{loading || stat.value == null ? '—' : stat.value}</strong><small>{stat.hint}</small></div>)}</div>
    <div className="table-panel user-panel">
      <div className="table-title"><h2>Application users</h2><span>{filteredUsers.length} of {users.length} accounts</span><button className="add-user-button" onClick={() => setShowAddUser((current) => !current)}>{showAddUser ? 'Close' : '+ Add user'}</button></div>
      {showAddUser && <form className="add-user-form" onSubmit={createUser}>
        <label>Full name<input required value={newUser.name} onChange={(event) => setNewUser({ ...newUser, name: event.target.value })} placeholder="Jane Wanjiru" /></label>
        <label>Email or phone<input required value={newUser.identifier} onChange={(event) => setNewUser({ ...newUser, identifier: event.target.value })} placeholder="jane@example.com or 0712345678" /></label>
        <label>Temporary password<input required type="password" value={newUser.password} onChange={(event) => setNewUser({ ...newUser, password: event.target.value })} placeholder="At least 8 characters" /></label>
        <label>Role<select value={newUser.role} onChange={(event) => setNewUser({ ...newUser, role: event.target.value })}><option value="Agent">Agent</option><option value="Tenant">Tenant</option><option value="SuperAdmin">SuperAdmin</option></select></label>
        <button className="primary-action" type="submit" disabled={saving}>{saving ? 'Adding…' : 'Add user'} <span>→</span></button>
      </form>}
      <div className="search-field admin-user-search"><span>⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by name, email, role or company" /></div>
      {filteredUsers.map((user) => <div className="user-row" key={user.id}>
        <div className="avatar">{user.name.slice(0, 2).toUpperCase()}</div>
        <div><strong>{user.name}{user.id === currentUserId && <em> (you)</em>}</strong><span>{user.identifier}{user.company ? ` · ${user.company}` : ''}</span></div>
        <span className="role-static">{user.role}</span>
        {user.id === currentUserId ? <span /> : <button className="remove-user" onClick={() => removeUser(user)}>Remove</button>}
      </div>)}
      {!loading && filteredUsers.length === 0 && <div className="empty-state"><strong>No users found</strong><span>Try a different search.</span></div>}
    </div>
  </section>
}

export default App
