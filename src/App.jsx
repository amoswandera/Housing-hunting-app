import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import AgentDashboard from './AgentDashboard'
import { cancelApplication, cancelBooking as cancelBookingApi, createSuperAdminUser, deleteSuperAdminHome, deleteSuperAdminUser, fetchAgentProfile, fetchAllHomesAdmin, fetchAllBuildingsAdmin, fetchBookings, fetchHomes, fetchMessages, fetchMyApplications, fetchMyRating, fetchProfile, fetchSuperAdminApplications, fetchSuperAdminOverview, fetchSuperAdminUsers, loginUser, registerUser, relistHome, requestPayment, resendVerificationEmail, resetPassword, returnHomeToAvailable, sendMessage, submitApplication, submitRating, transferAgentHomes, updatePassword, updateProfile, createBuilding, fetchBuildings, addUnitToBuilding, fetchBuildingDetails, fetchBuildingImages, fetchBuildingCategoryImages, fetchUnitsInBuilding } from './supabaseApi'
import { supabase } from './supabaseClient'
import './App.css'

// All Kenyan counties/regions available as listing locations
export const KENYA_REGIONS = [
  'Nairobi County',
  'Mombasa County',
  'Kisumu County',
  'Nakuru County',
  'Kiambu County',
  'Machakos County',
  'Kajiado County',
  'Uasin Gishu County',
  'Meru County',
  'Kilifi County',
  'Kwale County',
  'Nyeri County',
  'Murang\'a County',
  'Kirinyaga County',
  'Nyandarua County',
  'Laikipia County',
  'Samburu County',
  'Trans Nzoia County',
  'West Pokot County',
  'Elgeyo Marakwet County',
  'Nandi County',
  'Baringo County',
  'Kericho County',
  'Bomet County',
  'Kakamega County',
  'Vihiga County',
  'Bungoma County',
  'Busia County',
  'Siaya County',
  'Homabay County',
  'Migori County',
  'Kisii County',
  'Nyamira County',
  'Narok County',
  'Makueni County',
  'Kitui County',
  'Embu County',
  'Tharaka Nithi County',
  'Isiolo County',
  'Marsabit County',
  'Mandera County',
  'Wajir County',
  'Garissa County',
  'Tana River County',
  'Lamu County',
  'Taita Taveta County',
  'Turkana County',
]

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
  if (!value) return ''
  const trimmed = String(value).trim().toLowerCase()
  return trimmed.startsWith('+') ? `+${trimmed.slice(1).replace(/\D/g, '')}` : trimmed.replace(/[\s()-]/g, '')
}

const isValidEmail = (value) => {
  if (!value) return false
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}
const isValidPhone = (value) => {
  if (!value) return false
  return /^(?:\+254|0)(?:1|7)\d{8}$/.test(value)
}
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
  const [activeView, setActiveView] = useState(() => {
    const savedView = localStorage.getItem('activeView')
    const role = storedUser?.role
    if (savedView && role) {
      // Validate that the saved view is valid for the current role
      if (role === 'Tenant' && ['discover', 'saved', 'bookings', 'profile'].includes(savedView)) {
        return savedView
      }
      if (role === 'Agent' && ['agent-dashboard', 'agent-homes', 'agent-applications', 'agent-buildings', 'agent-profile'].includes(savedView)) {
        return savedView
      }
      if (role === 'SuperAdmin' && ['agent-dashboard', 'agent-homes', 'agent-applications'].includes(savedView)) {
        return savedView
      }
    }
    // Default fallback
    return role === 'Tenant' ? 'discover' : role === 'SuperAdmin' ? 'agent-dashboard' : role === 'Agent' ? 'agent-dashboard' : 'discover'
  })
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Persist activeView to localStorage
  useEffect(() => {
    if (activeView) {
      localStorage.setItem('activeView', activeView)
    }
  }, [activeView])
  const [agentProfileNonce, setAgentProfileNonce] = useState(0)
  const [tenantProfile, setTenantProfile] = useState({ name: '', phone: '', nationalId: '', occupation: '', bio: '', company: '' })
  const [showAgentProfile, setShowAgentProfile] = useState(false)
  const [selectedAgentProfile, setSelectedAgentProfile] = useState(null)
  const [openFaqIndex, setOpenFaqIndex] = useState(null)
  const [applyConfirm, setApplyConfirm] = useState(null)
  const [applyMessage, setApplyMessage] = useState('')
  const [priceRange, setPriceRange] = useState('All prices')
  const [sortBy, setSortBy] = useState('default')
  const [homePage, setHomePage] = useState(1)
  const [savedSearch, setSavedSearch] = useState('')
  const [savedRegion, setSavedRegion] = useState('All regions')
  const [savedCategory, setSavedCategory] = useState('All categories')
  const [bookingStatusFilter, setBookingStatusFilter] = useState('All')
  const [showUnitSelection, setShowUnitSelection] = useState(false)
  const [selectedBuilding, setSelectedBuilding] = useState(null)
  const [buildingUnits, setBuildingUnits] = useState([])
  const [unitFilterCategory, setUnitFilterCategory] = useState('All')
  const [unitFilterFloor, setUnitFilterFloor] = useState('All')
  const [showBuildingDetail, setShowBuildingDetail] = useState(false)
  const [buildingDetailImages, setBuildingDetailImages] = useState([])
  const [buildingDetailImageIndex, setBuildingDetailImageIndex] = useState(0)
  const [showNotifications, setShowNotifications] = useState(false)
  const [readNotifications, setReadNotifications] = useState(new Set())
  // Navigation history for proper back button behavior
  const [navigationHistory, setNavigationHistory] = useState(['discover'])
  // Messaging state
  const [openMessageAppId, setOpenMessageAppId] = useState(null)
  const [messageThreads, setMessageThreads] = useState({}) // { [appId]: Message[] }
  const [newMessageText, setNewMessageText] = useState('')
  const [messageSending, setMessageSending] = useState(false)
  // Rating state
  const [ratingModal, setRatingModal] = useState(null) // { homeId, homeName, existing }
  const [ratingStars, setRatingStars] = useState(0)
  const [ratingReview, setRatingReview] = useState('')
  const [selectedApplicationDetail, setSelectedApplicationDetail] = useState(null) // For viewing application details including tenant_message
  const [showTenantApplicationDetailPage, setShowTenantApplicationDetailPage] = useState(false) // For full-page application detail view
  const [tenantDetailImageIndex, setTenantDetailImageIndex] = useState(0) // For image gallery in tenant detail page
  const [isMobile, setIsMobile] = useState(false) // For responsive layout
  const [expandedDiscoverCard, setExpandedDiscoverCard] = useState(null) // 'homes' or 'buildings' or null
  const [expandedBookingsCard, setExpandedBookingsCard] = useState(null) // 'homes' or 'buildings' or null

  // Navigation helpers
  const navigateTo = useCallback((view) => {
    setNavigationHistory(prev => [...prev, view])
    setActiveView(view)
  }, [])

  const navigateBack = useCallback(() => {
    if (navigationHistory.length > 1) {
      const newHistory = [...navigationHistory]
      newHistory.pop() // Remove current view
      const previousView = newHistory[newHistory.length - 1]
      setNavigationHistory(newHistory)
      setActiveView(previousView)
      return true
    }
    return false
  }, [navigationHistory])

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
    if (showTenantApplicationDetailPage) {
      setShowTenantApplicationDetailPage(false)
      setSelectedApplicationDetail(null)
      setTenantDetailImageIndex(0)
      return true
    }
    if (selectedApplicationDetail) {
      setSelectedApplicationDetail(null)
      return true
    }
    if (mobileMenuOpen) {
      setMobileMenuOpen(false)
      return true
    }
    if (showTenantProfile) {
      setShowTenantProfile(false)
      navigateBack()
      return true
    }
    // Use navigation history instead of hardcoding 'discover'
    if (activeView !== 'discover') {
      navigateBack()
      return true
    }
    return false
  }, [activeView, mobileMenuOpen, paymentApplication, selectedHome, selectedApplicationDetail, showTenantProfile, showTenantApplicationDetailPage, currentImageIndex, navigateBack])

  // Manage browser history so hardware back buttons on Android WebView / browsers step back instead of exiting
  useEffect(() => {
    const handlePopState = () => {
      handleBack()
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [handleBack])

  useEffect(() => {
    if (selectedHome || paymentApplication || selectedApplicationDetail || showTenantApplicationDetailPage || showTenantProfile || activeView !== 'discover' || mobileMenuOpen) {
      window.history.pushState({ inAppView: true }, '')
    }
  }, [selectedHome, paymentApplication, selectedApplicationDetail, showTenantApplicationDetailPage, showTenantProfile, activeView, mobileMenuOpen])

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
    fetchHomes()
      .then(setHomes)
      .catch((error) => {
        console.error('Failed to fetch homes:', error)
        showToast('Failed to load homes. Please refresh.')
      })
  }, [])

  useEffect(() => {
    if (!authUser?.token || authUser.role !== 'Tenant') return
    fetchMyApplications(authUser.token).then((items) => {
      const applicationsArray = Array.isArray(items) ? items : []
      setApplications(applicationsArray)
      setBooked(applicationsArray.filter((item) => ['submitted', 'approved'].includes(item.status)).map((item) => item.home_id))
      // Re-fetch homes including any approved home so the tenant can still view it
      // in the discover view alongside other available homes
      // BUT: Exclude building units - they should only be visible through the building card
      const approvedHomeIds = applicationsArray
        .filter(a => a.status === 'approved' && a.home_id && !a.building_id)
        .map(a => a.home_id)
      fetchHomes({}, false, approvedHomeIds).then(setHomes).catch(() => {})
    }).catch(() => {})
  }, [authUser])

  // Detect mobile screen size for responsive layout
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

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
        localStorage.removeItem('activeView')
        setActiveView('discover')
      })
  }, [authUser?.token])

  const PAGE_SIZE = 12

  // Group homes by building for building cards
  const buildingsWithUnits = useMemo(() => {
    const buildingMap = {}
    homes.forEach(home => {
      if (home.building_id) {
        if (!buildingMap[home.building_id]) {
          buildingMap[home.building_id] = {
            id: home.building_id,
            name: home.building_name || 'Building',
            location: home.building_location || home.location,
            region: home.building_region || home.region,
            units: [],
            totalUnits: 0,
            availableUnits: 0,
            minPrice: Infinity,
            maxPrice: 0,
            categories: new Set(),
            images: home.building_images || []
          }
        }
        buildingMap[home.building_id].units.push(home)
        buildingMap[home.building_id].totalUnits++
        if (home.available) {
          buildingMap[home.building_id].availableUnits++
          buildingMap[home.building_id].minPrice = Math.min(buildingMap[home.building_id].minPrice, home.price)
          buildingMap[home.building_id].maxPrice = Math.max(buildingMap[home.building_id].maxPrice, home.price)
          if (home.category) buildingMap[home.building_id].categories.add(home.category)
        }
      }
    })
    return Object.values(buildingMap).map(b => ({
      ...b,
      categories: Array.from(b.categories),
      minPrice: b.minPrice === Infinity ? 0 : b.minPrice
    }))
  }, [homes])

  // Filter buildings by query and region
  const filteredBuildings = useMemo(() => {
    return buildingsWithUnits.filter(building => {
      const queryMatch = query === '' || 
        building.name.toLowerCase().includes(query.toLowerCase()) ||
        building.location.toLowerCase().includes(query.toLowerCase())
      const regionMatch = region === 'All regions' || building.region === region
      return queryMatch && regionMatch
    })
  }, [buildingsWithUnits, query, region])

  // Standalone homes (not part of any building)
  const standaloneHomes = useMemo(() => {
    return homes.filter(home => !home.building_id)
  }, [homes])

  const filteredHomes = useMemo(() => {
    let result = homes.filter((home) => {
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
    })
    if (sortBy === 'price-asc') result = [...result].sort((a, b) => a.price - b.price)
    else if (sortBy === 'price-desc') result = [...result].sort((a, b) => b.price - a.price)
    else if (sortBy === 'newest') result = [...result].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
    return result
  }, [category, homes, query, region, priceRange, sortBy])

  // Filtered homes for display - exclude building units since they're shown in building cards
  const filteredHomesForDisplay = useMemo(() => {
    return filteredHomes.filter(home => !home.building_id)
  }, [filteredHomes])

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

  const openBuildingUnits = async (building) => {
    try {
      const units = await fetchUnitsInBuilding(building.id, {
        category: unitFilterCategory,
        floor: unitFilterFloor
      })
      setBuildingUnits(units)
      setSelectedBuilding(building)
      setShowUnitSelection(true)
    } catch (error) {
      showToast('Failed to load units')
    }
  }

  const openBuildingDetail = async (building) => {
    try {
      const images = await fetchBuildingImages(building.id)
      setBuildingDetailImages(images.map(img => ({
        ...img,
        url: img.image_url || img.url || img.image || ''
      })))
      setSelectedBuilding(building)
      setShowBuildingDetail(true)
    } catch (error) {
      showToast('Failed to load building details')
    }
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
      // Set default view based on role on login
      const defaultView = result.user.role === 'Tenant' ? 'discover' : result.user.role === 'SuperAdmin' ? 'agent-dashboard' : result.user.role === 'Agent' ? 'agent-dashboard' : 'discover'
      setActiveView(defaultView)
      localStorage.setItem('activeView', defaultView)
      setShowAuthScreen(false)
      return { ok: true }
    } catch (error) {
      return { ok: false, error: error.message }
    }
  }

  const createAccount = async (account) => {
    try {
      const result = await registerUser(account)
      if (result && result.user) {
        setAccounts((current) => [...current, result.user])
      }
    } catch (error) {
      throw error
    }
  }

  const saveTenantProfile = async (event) => {
    event.preventDefault()
    try { const savedProfile = await updateProfile(tenantProfile, authUser.token); setTenantProfile(savedProfile); setShowTenantProfile(false); navigateBack(); setAuthUser((current) => ({ ...current, ...savedProfile })); showToast('Your profile was updated.') } catch (error) { showToast(error.message) }
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

  const loadMessages = async (appId) => {
    if (!authUser?.token) return
    const msgs = await fetchMessages(appId, authUser.token).catch(() => [])
    setMessageThreads(prev => ({ ...prev, [appId]: msgs }))
  }

  const handleSendMessage = async (appId) => {
    if (!newMessageText.trim() || messageSending) return
    setMessageSending(true)
    try {
      await sendMessage(appId, newMessageText, authUser.token)
      setNewMessageText('')
      await loadMessages(appId)
    } catch (err) { showToast(err.message) }
    finally { setMessageSending(false) }
  }

  const openRatingModal = async (application) => {
    const existing = await fetchMyRating(application.home_id, authUser.token).catch(() => null)
    setRatingStars(existing?.stars || 0)
    setRatingReview(existing?.review || '')
    setRatingModal({ homeId: application.home_id, homeName: application.name, existing })
  }

  const submitHomeRating = async () => {
    if (!ratingStars) { showToast('Please select a star rating.'); return }
    try {
      await submitRating(ratingModal.homeId, ratingStars, ratingReview, authUser.token)
      setRatingModal(null)
      showToast('Rating saved. Thank you!')
      // Refresh homes so the rating shows on cards
      fetchHomes({}, false, applications.filter(a => a.status === 'approved' && a.home_id).map(a => a.home_id))
        .then(setHomes).catch(() => {})
    } catch (err) { showToast(err.message) }
  }

  // Notifications: tenant application updates + 72h payment alerts
  const notifications = useMemo(() => {
    const notes = []
    if (authUser?.role === 'Tenant') {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      applications.forEach(app => {
        if (app.status === 'approved') {
          const deadline = app.payment_deadline ? new Date(app.payment_deadline) : null
          if (deadline && deadline < new Date() && app.payment_status !== 'paid') {
            notes.push({ id: `pay-${app.id}`, type: 'warning', text: `⚠ Payment overdue for ${app.name || 'a home'}. Deadline passed.` })
          } else if (deadline && app.payment_status !== 'paid') {
            const hrs = Math.max(0, Math.round((deadline - new Date()) / 3600000))
            notes.push({ id: `pay-${app.id}`, type: 'info', text: `⏰ Pay deposit for ${app.name || 'a home'} within ${hrs}h to secure it.` })
          } else {
            notes.push({ id: `appr-${app.id}`, type: 'success', text: `✓ Your application for ${app.name || 'a home'} was approved.` })
          }
        }
        if (app.status === 'declined' && app.reviewed_at && new Date(app.reviewed_at) > sevenDaysAgo) {
          notes.push({ id: `decl-${app.id}`, type: 'neutral', text: `Your application for ${app.name || 'a home'} was declined.` })
        }
      })
    }
    return notes
  }, [applications, authUser])

  const savedHomes = useMemo(() => homes.filter((home) => {
    if (!saved.includes(home.id)) return false
    const matchesRegion = savedRegion === 'All regions' || home.region === savedRegion
    const matchesCategory = savedCategory === 'All categories' || home.type === savedCategory
    const searchable = `${home.name} ${home.location} ${home.type}`.toLowerCase()
    return matchesRegion && matchesCategory && searchable.includes(savedSearch.toLowerCase())
  }), [homes, saved, savedRegion, savedCategory, savedSearch])
  const renderHomeCard = (home) => <article className="home-card" key={home.id}><div className="image-wrap" role="button" tabIndex={0} onClick={() => setSelectedHome(home)} onKeyDown={(event) => event.key === 'Enter' && setSelectedHome(home)}><img src={home.image || ''} alt={`${home.name} interior`} onError={(e) => { console.error('Home card image failed to load:', home.image) }} /><span className="home-tag">{home.tag}</span><span className="photo-hint">View photos ↗</span><button className={`save-button ${saved.includes(home.id) ? 'saved' : ''}`} onClick={(event) => { event.stopPropagation(); toggleSaved(home.id) }} aria-label={`Save ${home.name}`}>{saved.includes(home.id) ? '♥' : '♡'}</button></div><div className="home-info"><div className="home-title"><div><h3>{home.name}</h3><p>{home.location}</p></div>{home.rating ? <span className="rating">★ {home.rating}</span> : null}</div><p className="home-details">{home.type} <span>·</span> {home.details}</p><p className={`parking-status ${home.parking ? 'available' : 'unavailable'}`}>{home.parking ? '✓ Parking available' : '× No parking available'}</p><div className="home-footer"><div><strong>{formatKes(home.price)}</strong><span>/ month</span></div><div className="home-actions"><button onClick={() => setSelectedHome(home)}>View home <span>↗</span></button><a href={getDirectionsUrl(home)} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()}>Directions ↗</a></div></div></div></article>

  const renderBuildingCard = (building) => {
    // Use building images if available, otherwise fall back to first unit image
    const extractUrl = (img) => img?.url || img?.image_url || img?.image || ''
    const primaryImage = building.images && Array.isArray(building.images) && building.images.length > 0
      ? extractUrl(building.images.find(i => i.is_primary) || building.images[0])
      : (Array.isArray(building.units) && building.units.length > 0 ? building.units[0].image : '')
    const priceRange = building.minPrice === building.maxPrice
      ? formatKes(building.minPrice)
      : `${formatKes(building.minPrice)} – ${formatKes(building.maxPrice)}`

    return (
      <article className="home-card" key={building.id}>
        <div
          className="image-wrap"
          role="button"
          tabIndex={0}
          onClick={() => openBuildingUnits(building)}
          onKeyDown={(event) => event.key === 'Enter' && openBuildingUnits(building)}
        >
          <img 
            src={primaryImage || ''} 
            alt={`${building.name} exterior`}
            onError={(e) => {
              e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23e5e7eb" width="100" height="100"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%239ca3af"%3ENo Image%3C/text%3E%3C/svg%3E'
            }}
          />
          <span className="home-tag">{building.availableUnits} units available</span>
          <span className="photo-hint">View units ↗</span>
        </div>
        <div className="home-info">
          <div className="home-title">
            <div>
              <h3>{building.name}</h3>
              <p>{building.location}</p>
            </div>
          </div>
          <p className="home-details">
            {Array.isArray(building.categories) ? building.categories.join(', ') : ''} <span>·</span> {Array.isArray(building.units) ? building.units.length : 0} total units
          </p>
          <div className="home-footer">
            <div>
              <strong>{priceRange}</strong>
              <span>/ month</span>
            </div>
            <div className="home-actions">
              <button onClick={() => openBuildingUnits(building)}>View units <span>↗</span></button>
              <button 
                onClick={(e) => { e.stopPropagation(); openBuildingDetail(building) }}
                style={{ padding: '0', background: 'none', color: '#dd785e', fontSize: '10px', textDecoration: 'underline', marginLeft: '8px' }}
              >
                View building photos
              </button>
            </div>
          </div>
        </div>
      </article>
    )
  }

  if (showAuthScreen) {
    return <AuthScreen accounts={accounts} onLogin={login} onCreateAccount={createAccount} onBrowseHomes={() => setShowAuthScreen(false)} />
  }

  return (
    <div className="app-shell" onClick={() => setShowNotifications(false)}>
      {mobileMenuOpen && <div className="mobile-drawer-backdrop" onClick={() => setMobileMenuOpen(false)} />}
      <aside className={`sidebar ${mobileMenuOpen ? 'mobile-open' : ''}`}>
        <div className="brand"><span className="brand-mark">h</span><span>habitat</span></div>
        <div className="profile-card clickable" role="button" tabIndex={0} onClick={() => { setMobileMenuOpen(false); openMyProfile() }} onKeyDown={(event) => (event.key === 'Enter' || event.key === ' ') && openMyProfile()}><div className="avatar">{authUser ? authUser.initials : 'G'}</div><div><strong>{authUser ? authUser.name : 'Guest visitor'}</strong><span>{authUser ? `${authUser.role} account` : 'Browse-only access'}</span></div><span className="chevron">⌄</span></div>
        <nav className="main-nav">
          {!authUser && (
            <button className={`nav-item ${activeView === 'discover' ? 'active' : ''}`} onClick={() => { navigateTo('discover'); setMobileMenuOpen(false) }}><span>⌂</span> Discover</button>
          )}
          {authUser?.role === 'Tenant' && (
            <>
              <button className={`nav-item ${activeView === 'discover' && !showTenantProfile ? 'active' : ''}`} onClick={() => { navigateTo('discover'); setShowTenantProfile(false); setMobileMenuOpen(false) }}><span>⌂</span> Discover</button>
              <button className={`nav-item ${activeView === 'saved' && !showTenantProfile ? 'active' : ''}`} onClick={() => { navigateTo('saved'); setShowTenantProfile(false); setMobileMenuOpen(false) }}><span>♡</span> Saved <b>{saved.length}</b></button>
              <button className={`nav-item ${activeView === 'bookings' && !showTenantProfile ? 'active' : ''}`} onClick={() => { navigateTo('bookings'); setShowTenantProfile(false); setMobileMenuOpen(false) }}><span>▣</span> My bookings <b>{booked.length}</b></button>
            </>
          )}
          {(authUser?.role === 'Agent' || authUser?.role === 'SuperAdmin') && (
            <>
              {authUser?.role === 'SuperAdmin' && <button className={`nav-item ${activeView === 'agent-dashboard' ? 'active' : ''}`} onClick={() => { navigateTo('agent-dashboard'); setMobileMenuOpen(false) }}><span>◈</span> Dashboard</button>}
              {authUser?.role === 'Agent' && <button className={`nav-item ${activeView === 'agent-dashboard' ? 'active' : ''}`} onClick={() => { navigateTo('agent-dashboard'); setMobileMenuOpen(false) }}><span>◈</span> Dashboard</button>}
              <button className={`nav-item ${activeView === 'agent-homes' ? 'active' : ''}`} onClick={() => { navigateTo('agent-homes'); setMobileMenuOpen(false) }}><span>⌂</span> Homes</button>
              <button className={`nav-item ${activeView === 'agent-applications' ? 'active' : ''}`} onClick={() => { navigateTo('agent-applications'); setMobileMenuOpen(false) }}><span>📋</span> Applications</button>
              <button className={`nav-item ${activeView === 'agent-buildings' ? 'active' : ''}`} onClick={() => { navigateTo('agent-buildings'); setMobileMenuOpen(false) }}><span>🏢</span> Buildings</button>
            </>
          )}
          {authUser?.role === 'Tenant' && <button className={`nav-item ${activeView === 'profile' || showTenantProfile ? 'active' : ''}`} onClick={() => { navigateTo('profile'); setShowTenantProfile(true); setMobileMenuOpen(false) }}><span>♙</span> My profile</button>}
          {(authUser?.role === 'Agent' || authUser?.role === 'SuperAdmin') && <button className={`nav-item ${activeView === 'agent-profile' ? 'active' : ''}`} onClick={() => { navigateTo('agent-profile'); setAgentProfileNonce((n) => n + 1); setMobileMenuOpen(false) }}><span>♙</span> My profile</button>}
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
            <div style={{ position: 'relative' }}>
              <button className="icon-button" aria-label="Notifications" onClick={(e) => { e.stopPropagation(); setShowNotifications(n => !n) }} style={{ position: 'relative' }}>
                🔔
                {notifications.filter(n => !readNotifications.has(n.id)).length > 0 && (
                  <span style={{ position: 'absolute', top: '-4px', right: '-4px', background: '#df775d', color: '#fff', fontSize: '9px', fontWeight: 700, padding: '1px 5px', borderRadius: '10px', lineHeight: 1.4 }}>
                    {notifications.filter(n => !readNotifications.has(n.id)).length}
                  </span>
                )}
              </button>
              {showNotifications && (
                <div style={{ position: 'absolute', top: '40px', right: 0, background: '#fff', border: '1px solid #e7ede8', borderRadius: '8px', boxShadow: '0 8px 30px rgba(0,0,0,.12)', width: '300px', zIndex: 50, overflow: 'hidden' }}
                  onClick={e => e.stopPropagation()}>
                  <div style={{ padding: '12px 16px', borderBottom: '1px solid #e7ede8', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong style={{ fontSize: '12px', color: '#173d36' }}>Notifications</strong>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      {notifications.length > 0 && (
                        <button onClick={() => { setReadNotifications(new Set(notifications.map(n => n.id))) }} style={{ border: 'none', background: 'none', color: '#df775d', cursor: 'pointer', fontSize: '10px', fontWeight: 700 }}>Mark all read</button>
                      )}
                      <button onClick={() => setShowNotifications(false)} style={{ border: 'none', background: 'none', color: '#9aa49e', cursor: 'pointer', fontSize: '16px' }}>×</button>
                    </div>
                  </div>
                  {notifications.length === 0 ? (
                    <div style={{ padding: '24px 16px', textAlign: 'center', fontSize: '12px', color: '#9aa49e' }}>No new notifications</div>
                  ) : (
                    <ul style={{ margin: 0, padding: 0, listStyle: 'none', maxHeight: '320px', overflowY: 'auto' }}>
                      {notifications.map(n => {
                        const isRead = readNotifications.has(n.id)
                        return (
                          <li
                            key={n.id}
                            onClick={() => { setReadNotifications(prev => new Set([...prev, n.id])) }}
                            style={{
                              padding: '12px 16px',
                              borderBottom: '1px solid #f0f4f0',
                              fontSize: '12px',
                              lineHeight: 1.5,
                              color: isRead ? '#9aa49e' : n.type === 'warning' ? '#92400e' : n.type === 'success' ? '#1a5c3a' : '#4b5563',
                              background: isRead ? '#fafafa' : n.type === 'warning' ? '#fff8ed' : n.type === 'success' ? '#f0faf4' : '#fff',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px'
                            }}
                          >
                            <span style={{ flex: 1 }}>{n.text}</span>
                            {!isRead && <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#df775d', flexShrink: 0 }}></span>}
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </div>
              )}
            </div>
            {authUser ? (
              <>
                <div className="mini-avatar">{authUser.initials}</div>
                <button className="logout-button" onClick={() => { setAuthUser(null); setRole('Tenant'); localStorage.removeItem('activeView'); setNavigationHistory(['discover']); setActiveView('discover') }}>Log out</button>
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
                <button type="button" className="in-app-back-button" onClick={() => { setShowTenantProfile(false); navigateBack() }}>
                  ← Back
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
          <section className="search-panel"><div className="search-field"><span>⌕</span><input value={query} onChange={(event) => { setQuery(event.target.value); setHomePage(1) }} placeholder="Search by neighbourhood or home" /></div><div className="select-field"><span>⌖</span><select value={region} onChange={(event) => { setRegion(event.target.value); setHomePage(1) }}><option value="All regions">All regions</option>{KENYA_REGIONS.map(r => <option key={r} value={r}>{r}</option>)}</select></div><div className="select-field category-select"><span>⌂</span><select value={category} onChange={(event) => { setCategory(event.target.value); setHomePage(1) }}><option>All categories</option><option>Single room</option><option>Bedsitter</option><option>One bedroom</option><option>Two bedroom</option><option>Three bedroom</option><option>Four bedroom</option></select></div><div className="select-field category-select"><span>₭</span><select value={priceRange} onChange={(event) => { setPriceRange(event.target.value); setHomePage(1) }}><option>All prices</option><option>Under 30k</option><option>30k–60k</option><option>60k–100k</option><option>100k–200k</option><option>Over 200k</option></select></div><div className="select-field category-select"><span>⇅</span><select value={sortBy} onChange={(event) => { setSortBy(event.target.value); setHomePage(1) }}><option value="default">Default order</option><option value="price-asc">Price: low to high</option><option value="price-desc">Price: high to low</option><option value="newest">Newest first</option></select></div><button className="search-button" onClick={() => showToast(`${filteredHomes.length} homes found`)}>Search homes <span>→</span></button></section>
          
          {/* Nested Cards for Discover */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', marginBottom: '32px' }}>
            {/* Homes Card */}
            <div
              onClick={() => { setExpandedDiscoverCard(expandedDiscoverCard === 'homes' ? null : 'homes') }}
              style={{
                background: 'white',
                borderRadius: '12px',
                padding: '24px',
                border: '1px solid #e5e7eb',
                cursor: 'pointer',
                transition: 'all 0.2s',
                ':hover': { borderColor: '#3b82f6', boxShadow: '0 4px 12px rgba(59, 130, 246, 0.1)' }
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.1)' }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.boxShadow = 'none' }}
            >
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>🏠</div>
              <h3 style={{ margin: '0 0 8px', fontSize: '24px', fontWeight: 600 }}>Homes</h3>
              <p style={{ margin: '0 0 16px', color: '#6b7280', fontSize: '14px' }}>Standalone houses and apartments</p>
              <div style={{ fontSize: '32px', fontWeight: 700, color: '#1d3d33' }}>{filteredHomesForDisplay.length}</div>
              <p style={{ margin: '4px 0 0', color: '#9ca3af', fontSize: '12px' }}>Available homes</p>
            </div>

            {/* Apartments/Buildings Card */}
            <div
              onClick={() => { setExpandedDiscoverCard(expandedDiscoverCard === 'buildings' ? null : 'buildings') }}
              style={{
                background: 'white',
                borderRadius: '12px',
                padding: '24px',
                border: '1px solid #e5e7eb',
                cursor: 'pointer',
                transition: 'all 0.2s',
                ':hover': { borderColor: '#3b82f6', boxShadow: '0 4px 12px rgba(59, 130, 246, 0.1)' }
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.1)' }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.boxShadow = 'none' }}
            >
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>🏢</div>
              <h3 style={{ margin: '0 0 8px', fontSize: '24px', fontWeight: 600 }}>Apartments</h3>
              <p style={{ margin: '0 0 16px', color: '#6b7280', fontSize: '14px' }}>Units in apartment buildings</p>
              <div style={{ fontSize: '32px', fontWeight: 700, color: '#1d3d33' }}>{filteredBuildings.length}</div>
              <p style={{ margin: '4px 0 0', color: '#9ca3af', fontSize: '12px' }}>Available buildings</p>
            </div>
          </div>

          {/* Expanded Homes View */}
          {expandedDiscoverCard === 'homes' && (
            <div style={{ marginBottom: '32px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h2 style={{ margin: 0 }}>Homes</h2>
                <button onClick={() => setExpandedDiscoverCard(null)} style={{ padding: '8px 16px', cursor: 'pointer', background: 'none', border: '1px solid #d2ded5', borderRadius: '6px' }}>Close</button>
              </div>
              {filteredHomesForDisplay.length > 0 ? (
                <section className="home-grid">
                  {filteredHomesForDisplay.map(renderHomeCard)}
                </section>
              ) : (
                <div className="empty-state"><strong>No homes found</strong><span>Try a different neighbourhood or region.</span></div>
              )}
            </div>
          )}

          {/* Expanded Buildings View */}
          {expandedDiscoverCard === 'buildings' && (
            <div style={{ marginBottom: '32px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h2 style={{ margin: 0 }}>Apartments</h2>
                <button onClick={() => setExpandedDiscoverCard(null)} style={{ padding: '8px 16px', cursor: 'pointer', background: 'none', border: '1px solid #d2ded5', borderRadius: '6px' }}>Close</button>
              </div>
              <div className="users-toolbar" style={{ marginBottom: '16px' }}>
                <div className="search-field admin-user-search"><span>⌕</span><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search apartments" /></div>
                <select className="role-filter" value={region} onChange={e => setRegion(e.target.value)}><option value="All regions">All regions</option>{KENYA_REGIONS.map(r => <option key={r} value={r}>{r}</option>)}</select>
              </div>
              {filteredBuildings.length > 0 ? (
                <section className="home-grid">
                  {filteredBuildings.map(renderBuildingCard)}
                </section>
              ) : (
                <div className="empty-state"><strong>No apartments found</strong><span>Try a different neighbourhood or region.</span></div>
              )}
            </div>
          )}
          </>}
          {activeView === 'saved' && !showTenantProfile && <>
          <div className="subpage-back-bar"><button className="in-app-back-button" onClick={() => navigateBack()}>← Back</button></div>
          <div className="content-heading"><div><h2>Saved homes</h2><p>{savedHomes.length} home{savedHomes.length === 1 ? '' : 's'} saved</p></div></div>
          <div className="users-toolbar" style={{ margin: '0 0 20px' }}>
            <div className="search-field admin-user-search"><span>⌕</span><input value={savedSearch} onChange={e => setSavedSearch(e.target.value)} placeholder="Search saved homes" /></div>
            <select className="role-filter" value={savedRegion} onChange={e => setSavedRegion(e.target.value)}><option value="All regions">All regions</option>{KENYA_REGIONS.map(r => <option key={r} value={r}>{r}</option>)}</select>
            <select className="role-filter" value={savedCategory} onChange={e => setSavedCategory(e.target.value)}><option value="All categories">All categories</option><option>Single room</option><option>Bedsitter</option><option>One bedroom</option><option>Two bedroom</option><option>Three bedroom</option><option>Four bedroom</option></select>
          </div>
          {savedHomes.length > 0 ? <section className="home-grid">{savedHomes.map(renderHomeCard)}</section> : <div className="empty-state"><strong>{saved.length > 0 ? 'No saved homes match your filter' : 'No saved homes yet'}</strong><span>{saved.length > 0 ? 'Try clearing the search or filters.' : 'Tap the heart on any home to save it here.'}</span></div>}
          </>}
          {activeView === 'bookings' && !showTenantProfile && <>
          <div className="subpage-back-bar"><button className="in-app-back-button" onClick={() => navigateBack()}>← Back</button></div>
          
          {/* Nested Cards for Bookings */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', marginBottom: '32px' }}>
            {/* Home Applications Card */}
            <div
              onClick={() => { setExpandedBookingsCard(expandedBookingsCard === 'homes' ? null : 'homes') }}
              style={{
                background: 'white',
                borderRadius: '12px',
                padding: '24px',
                border: '1px solid #e5e7eb',
                cursor: 'pointer',
                transition: 'all 0.2s',
                ':hover': { borderColor: '#3b82f6', boxShadow: '0 4px 12px rgba(59, 130, 246, 0.1)' }
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.1)' }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.boxShadow = 'none' }}
            >
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>🏠</div>
              <h3 style={{ margin: '0 0 8px', fontSize: '24px', fontWeight: 600 }}>Home Applications</h3>
              <p style={{ margin: '0 0 16px', color: '#6b7280', fontSize: '14px' }}>Applications for standalone homes</p>
              <div style={{ fontSize: '32px', fontWeight: 700, color: '#1d3d33' }}>{applications.filter(a => !a.building_id).length}</div>
              <p style={{ margin: '4px 0 0', color: '#9ca3af', fontSize: '12px' }}>Total applications</p>
            </div>

            {/* Building Applications Card */}
            <div
              onClick={() => { setExpandedBookingsCard(expandedBookingsCard === 'buildings' ? null : 'buildings') }}
              style={{
                background: 'white',
                borderRadius: '12px',
                padding: '24px',
                border: '1px solid #e5e7eb',
                cursor: 'pointer',
                transition: 'all 0.2s',
                ':hover': { borderColor: '#3b82f6', boxShadow: '0 4px 12px rgba(59, 130, 246, 0.1)' }
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.1)' }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.boxShadow = 'none' }}
            >
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>🏢</div>
              <h3 style={{ margin: '0 0 8px', fontSize: '24px', fontWeight: 600 }}>Apartment Applications</h3>
              <p style={{ margin: '0 0 16px', color: '#6b7280', fontSize: '14px' }}>Applications for apartment units</p>
              <div style={{ fontSize: '32px', fontWeight: 700, color: '#1d3d33' }}>{applications.filter(a => a.building_id).length}</div>
              <p style={{ margin: '4px 0 0', color: '#9ca3af', fontSize: '12px' }}>Total applications</p>
            </div>
          </div>

          {/* Expanded Home Applications View */}
          {expandedBookingsCard === 'homes' && (
            <div className="table-panel" style={{ marginTop: '0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h2 style={{ margin: 0 }}>Home Applications</h2>
                <button onClick={() => setExpandedBookingsCard(null)} style={{ padding: '8px 16px', cursor: 'pointer', background: 'none', border: '1px solid #d2ded5', borderRadius: '6px' }}>Close</button>
              </div>
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
                  {applications.filter(a => !a.building_id && (bookingStatusFilter === 'All' || a.status === bookingStatusFilter)).length} application{applications.filter(a => !a.building_id && (bookingStatusFilter === 'All' || a.status === bookingStatusFilter)).length !== 1 ? 's' : ''}
                </span>
              </div>
              {applications.filter(a => !a.building_id).length > 0 ? (
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
                        .filter(a => !a.building_id && (bookingStatusFilter === 'All' || a.status === bookingStatusFilter))
                        .map((application) => (
                        <tr key={application.id}>
                          <td>
                            <div className="users-table-name">
                              {application.image ? (
                                <img
                                  src={application.image}
                                  alt={application.name}
                                  style={{
                                    width: '44px',
                                    height: '44px',
                                    borderRadius: '5px',
                                    flexShrink: 0,
                                    objectFit: 'cover',
                                  }}
                                />
                              ) : (
                                <div style={{
                                  width: '44px', height: '44px', borderRadius: '5px', flexShrink: 0,
                                  background: '#e4ecdf',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  fontSize: '18px', color: '#6c9a77'
                                }}>
                                  ⌂
                                </div>
                              )}
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
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
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
                              {/* Message button — always visible for active applications */}
                              {['submitted', 'approved'].includes(application.status) && (
                                <button style={{ border: 0, background: 'none', color: '#3e735e', fontSize: '10px', fontWeight: 700, padding: 0, cursor: 'pointer', marginTop: '4px', display: 'block' }}
                                  onClick={async () => {
                                    if (openMessageAppId === application.id) {
                                      setOpenMessageAppId(null)
                                    } else {
                                      setOpenMessageAppId(application.id)
                                      await loadMessages(application.id)
                                    }
                                  }}>
                                  💬 {openMessageAppId === application.id ? 'Close messages' : 'Messages'}
                                </button>
                              )}
                              {/* Rate button — only for approved applications */}
                              {application.status === 'approved' && application.payment_status === 'paid' && (
                                <button style={{ border: 0, background: 'none', color: '#d59a54', fontSize: '10px', fontWeight: 700, padding: 0, cursor: 'pointer', marginTop: '4px', display: 'block' }}
                                  onClick={() => openRatingModal(application)}>
                                  ★ Rate this home
                                </button>
                              )}
                              {/* View details button - shows tenant message */}
                              <button style={{ border: 0, background: 'none', color: '#6b7280', fontSize: '10px', fontWeight: 700, padding: 0, cursor: 'pointer', marginTop: '4px', display: 'block' }}
                                onClick={() => { setSelectedApplicationDetail(application); setShowTenantApplicationDetailPage(true); setTenantDetailImageIndex(0); }}>
                                View details
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="empty-state"><strong>No home applications</strong><span>You haven't applied for any standalone homes yet.</span></div>
              )}
            </div>
          )}

          {/* Expanded Building Applications View */}
          {expandedBookingsCard === 'buildings' && (
            <div className="table-panel" style={{ marginTop: '0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h2 style={{ margin: 0 }}>Apartment Applications</h2>
                <button onClick={() => setExpandedBookingsCard(null)} style={{ padding: '8px 16px', cursor: 'pointer', background: 'none', border: '1px solid #d2ded5', borderRadius: '6px' }}>Close</button>
              </div>
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
                  {applications.filter(a => a.building_id && (bookingStatusFilter === 'All' || a.status === bookingStatusFilter)).length} application{applications.filter(a => a.building_id && (bookingStatusFilter === 'All' || a.status === bookingStatusFilter)).length !== 1 ? 's' : ''}
                </span>
              </div>
              {applications.filter(a => a.building_id).length > 0 ? (
                <div className="users-table-wrap">
                  <table className="users-table applications-table">
                    <thead>
                      <tr>
                        <th>Apartment</th>
                        <th>Category</th>
                        <th>Floor</th>
                        <th>Region</th>
                        <th>Deposit</th>
                        <th>Status</th>
                        <th>Agent</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {applications
                        .filter(a => a.building_id && (bookingStatusFilter === 'All' || a.status === bookingStatusFilter))
                        .map((application) => (
                        <tr key={application.id}>
                          <td>
                            <div className="users-table-name">
                              {application.image ? (
                                <img
                                  src={application.image}
                                  alt={application.name}
                                  style={{
                                    width: '44px',
                                    height: '44px',
                                    borderRadius: '5px',
                                    flexShrink: 0,
                                    objectFit: 'cover',
                                  }}
                                />
                              ) : (
                                <div style={{
                                  width: '44px', height: '44px', borderRadius: '5px', flexShrink: 0,
                                  background: '#e4ecdf',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  fontSize: '18px', color: '#6c9a77'
                                }}>
                                  🏢
                                </div>
                              )}
                              <div>
                                <strong>{application.name || 'Apartment no longer listed'}</strong>
                                {application.location && <span style={{ display: 'block', fontSize: '10px', color: '#7f9585', marginTop: '2px' }}>{application.location}</span>}
                              </div>
                            </div>
                          </td>
                          <td><span style={{ fontSize: '11px', color: '#2d443b' }}>{application.category || '—'}</span></td>
                          <td><span style={{ fontSize: '11px', color: '#2d443b' }}>{application.floor || '—'}</span></td>
                          <td><span style={{ fontSize: '11px', color: '#2d443b' }}>{application.region || '—'}</span></td>
                          <td><span style={{ fontSize: '11px', color: '#2d443b', fontWeight: 600 }}>{formatKes(application.deposit)}</span></td>
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
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
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
                              {/* Message button — always visible for active applications */}
                              {['submitted', 'approved'].includes(application.status) && (
                                <button style={{ border: 0, background: 'none', color: '#3e735e', fontSize: '10px', fontWeight: 700, padding: 0, cursor: 'pointer', marginTop: '4px', display: 'block' }}
                                  onClick={async () => {
                                    if (openMessageAppId === application.id) {
                                      setOpenMessageAppId(null)
                                    } else {
                                      setOpenMessageAppId(application.id)
                                      await loadMessages(application.id)
                                    }
                                  }}>
                                  💬 {openMessageAppId === application.id ? 'Close messages' : 'Messages'}
                                </button>
                              )}
                              {/* Rate button — only for approved applications */}
                              {application.status === 'approved' && application.payment_status === 'paid' && (
                                <button style={{ border: 0, background: 'none', color: '#d59a54', fontSize: '10px', fontWeight: 700, padding: 0, cursor: 'pointer', marginTop: '4px', display: 'block' }}
                                  onClick={() => openRatingModal(application)}>
                                  ★ Rate this home
                                </button>
                              )}
                              {/* View details button - shows tenant message */}
                              <button style={{ border: 0, background: 'none', color: '#6b7280', fontSize: '10px', fontWeight: 700, padding: 0, cursor: 'pointer', marginTop: '4px', display: 'block' }}
                                onClick={() => { setSelectedApplicationDetail(application); setShowTenantApplicationDetailPage(true); setTenantDetailImageIndex(0); }}>
                                View details
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="empty-state"><strong>No apartment applications</strong><span>You haven't applied for any apartment units yet.</span></div>
              )}
            </div>
          )}
          </>}
        </>}

      {/* Message thread panel */}
      {openMessageAppId && (
        <div style={{ position: 'fixed', bottom: 0, right: 0, width: '100%', maxWidth: '420px', background: '#fff', borderTop: '1px solid #e7ede8', borderLeft: '1px solid #e7ede8', boxShadow: '0 -4px 24px rgba(0,0,0,.12)', zIndex: 90, display: 'flex', flexDirection: 'column', maxHeight: '420px' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #e7ede8', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#173d36' }}>
            <strong style={{ color: '#fff', fontSize: '13px' }}>💬 Messages</strong>
            <button onClick={() => setOpenMessageAppId(null)} style={{ border: 'none', background: 'none', color: '#a9c4bb', cursor: 'pointer', fontSize: '18px' }}>×</button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {(messageThreads[openMessageAppId] || []).length === 0
              ? <p style={{ fontSize: '12px', color: '#9aa49e', textAlign: 'center', margin: 'auto' }}>No messages yet. Send a message to start the conversation.</p>
              : (messageThreads[openMessageAppId] || []).map(msg => {
                  const isMe = msg.sender_id === authUser?.id
                  return (
                    <div key={msg.id} style={{ alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth: '80%' }}>
                      <div style={{ fontSize: '9px', color: '#9aa49e', marginBottom: '3px', textAlign: isMe ? 'right' : 'left' }}>
                        {msg.sender_name} · {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                      <div style={{ background: isMe ? '#173d36' : '#f6f9f5', color: isMe ? '#fff' : '#1d3d33', padding: '9px 13px', borderRadius: isMe ? '14px 14px 4px 14px' : '14px 14px 14px 4px', fontSize: '12px', lineHeight: 1.5 }}>
                        {msg.body}
                      </div>
                    </div>
                  )
                })
            }
          </div>
          <div style={{ padding: '10px 12px', borderTop: '1px solid #e7ede8', display: 'flex', gap: '8px' }}>
            <input
              value={newMessageText}
              onChange={e => setNewMessageText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSendMessage(openMessageAppId)}
              placeholder="Type a message..."
              style={{ flex: 1, border: '1px solid #dce4dd', borderRadius: '20px', padding: '9px 14px', fontSize: '12px', outline: 'none' }}
            />
            <button
              onClick={() => handleSendMessage(openMessageAppId)}
              disabled={messageSending || !newMessageText.trim()}
              style={{ background: '#173d36', color: '#fff', border: 'none', borderRadius: '50%', width: '36px', height: '36px', fontSize: '16px', cursor: 'pointer', flexShrink: 0, opacity: messageSending || !newMessageText.trim() ? 0.5 : 1 }}>
              ↑
            </button>
          </div>
        </div>
      )}

      {/* Rating modal */}
      {ratingModal && (
        <div className="modal-backdrop" onClick={() => setRatingModal(null)}>
          <div style={{ background: '#fff', borderRadius: '10px', padding: '32px', maxWidth: '380px', width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,.25)' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 6px', color: '#173d36', font: '400 20px Georgia,serif' }}>Rate this home</h3>
            <p style={{ margin: '0 0 20px', fontSize: '13px', color: '#718078' }}>{ratingModal.homeName}</p>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', justifyContent: 'center' }}>
              {[1,2,3,4,5].map(s => (
                <button key={s} onClick={() => setRatingStars(s)}
                  style={{ background: 'none', border: 'none', fontSize: '32px', cursor: 'pointer', color: s <= ratingStars ? '#d59a54' : '#e7ede8', lineHeight: 1 }}>
                  ★
                </button>
              ))}
            </div>
            <label style={{ display: 'block', marginBottom: '16px' }}>
              <span style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#476055', marginBottom: '7px' }}>Write a review (optional)</span>
              <textarea value={ratingReview} onChange={e => setRatingReview(e.target.value)}
                placeholder="Share your experience living in this home..."
                style={{ width: '100%', minHeight: '80px', border: '1px solid #dce4dd', borderRadius: '5px', padding: '11px', fontSize: '12px', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }} />
            </label>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={submitHomeRating}
                style={{ flex: 1, padding: '12px', background: '#173d36', color: '#fff', border: 'none', borderRadius: '7px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
                {ratingModal.existing ? 'Update rating' : 'Submit rating'}
              </button>
              <button onClick={() => setRatingModal(null)}
                style={{ padding: '12px 18px', background: 'none', color: '#9ca3af', border: '1px solid #dce4dd', borderRadius: '7px', fontSize: '13px', cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

        {authUser && role === 'Agent' && <AgentDashboard token={authUser.token} onNotify={showToast} openProfileNonce={agentProfileNonce} view={activeView === 'agent-homes' ? 'homes' : activeView === 'agent-applications' ? 'applications' : activeView === 'agent-buildings' ? 'buildings' : activeView === 'agent-dashboard' ? 'dashboard' : 'profile'} />}

        {authUser && role === 'SuperAdmin' && <SuperAdminPanel token={authUser.token} currentUserId={authUser.id} onNotify={showToast} activeView={activeView} />}
      </main>

      {!authUser && (
        <nav className="mobile-bottom-nav">
          <button className={`mobile-nav-item ${activeView === 'discover' ? 'active' : ''}`} onClick={() => { navigateTo('discover'); setMobileMenuOpen(false) }}>
            <span>⌂</span> Discover
          </button>
          <button className={`mobile-nav-item`} onClick={() => setShowAuthScreen(true)}>
            <span>♙</span> Sign in
          </button>
        </nav>
      )}
      {authUser?.role === 'Tenant' && (
        <nav className="mobile-bottom-nav">
          <button className={`mobile-nav-item ${activeView === 'discover' && !showTenantProfile ? 'active' : ''}`} onClick={() => { navigateTo('discover'); setShowTenantProfile(false); setMobileMenuOpen(false) }}>
            <span>⌂</span> Discover
          </button>
          <button className={`mobile-nav-item ${activeView === 'saved' && !showTenantProfile ? 'active' : ''}`} onClick={() => { navigateTo('saved'); setShowTenantProfile(false); setMobileMenuOpen(false) }}>
            <span>♡</span> Saved
            {saved.length > 0 && <b className="mobile-nav-badge">{saved.length}</b>}
          </button>
          <button className={`mobile-nav-item ${activeView === 'bookings' && !showTenantProfile ? 'active' : ''}`} onClick={() => { navigateTo('bookings'); setShowTenantProfile(false); setMobileMenuOpen(false) }}>
            <span>▣</span> Bookings
            {booked.length > 0 && <b className="mobile-nav-badge">{booked.length}</b>}
          </button>
          <button className={`mobile-nav-item ${showTenantProfile ? 'active' : ''}`} onClick={() => { navigateTo('profile'); setShowTenantProfile(true); setMobileMenuOpen(false) }}>
            <span>♙</span> Profile
          </button>
        </nav>
      )}
      {authUser?.role === 'Agent' && (
        <nav className="mobile-bottom-nav">
          <button className={`mobile-nav-item ${activeView === 'agent-dashboard' ? 'active' : ''}`} onClick={() => { navigateTo('agent-dashboard'); setMobileMenuOpen(false) }}>
            <span>◈</span> Dashboard
          </button>
          <button className={`mobile-nav-item ${activeView === 'agent-homes' ? 'active' : ''}`} onClick={() => { navigateTo('agent-homes'); setMobileMenuOpen(false) }}>
            <span>⌂</span> Homes
          </button>
          <button className={`mobile-nav-item ${activeView === 'agent-applications' ? 'active' : ''}`} onClick={() => { navigateTo('agent-applications'); setMobileMenuOpen(false) }}>
            <span>📋</span> Applications
          </button>
          <button className={`mobile-nav-item ${activeView === 'agent-buildings' ? 'active' : ''}`} onClick={() => { navigateTo('agent-buildings'); setMobileMenuOpen(false) }}>
            <span>🏢</span> Buildings
          </button>
        </nav>
      )}
      {authUser?.role === 'SuperAdmin' && (
        <nav className="mobile-bottom-nav">
          <button className={`mobile-nav-item ${activeView === 'agent-dashboard' ? 'active' : ''}`} onClick={() => { navigateTo('agent-dashboard'); setMobileMenuOpen(false) }}>
            <span>◈</span> Dashboard
          </button>
          <button className={`mobile-nav-item ${activeView === 'agent-homes' ? 'active' : ''}`} onClick={() => { navigateTo('agent-homes'); setMobileMenuOpen(false) }}>
            <span>⌂</span> Homes
          </button>
          <button className={`mobile-nav-item ${activeView === 'agent-applications' ? 'active' : ''}`} onClick={() => { navigateTo('agent-applications'); setMobileMenuOpen(false) }}>
            <span>📋</span> Applications
          </button>
          <button className={`mobile-nav-item ${activeView === 'agent-buildings' ? 'active' : ''}`} onClick={() => { navigateTo('agent-buildings'); setMobileMenuOpen(false) }}>
            <span>🏢</span> Buildings
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
              {(() => {
                const hasImages = selectedHome.images && selectedHome.images.length > 0
                const extractUrl = (img) => img?.url || img?.image_url || img?.image || ''
                const imageUrl = hasImages
                  ? extractUrl(selectedHome.images[currentImageIndex] || selectedHome.images[0])
                  : selectedHome.image
                
                return (
                  <>
                    <img 
                      className="modal-home-image" 
                      src={imageUrl || ''}
                      alt={`${selectedHome.name} interior`}
                      onError={(e) => {
                        e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23e5e7eb" width="100" height="100"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%239ca3af"%3ENo Image%3C/text%3E%3C/svg%3E'
                      }}
                    />
                    {/* Image Navigation */}
                    {hasImages && selectedHome.images.length > 1 && (
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
                              src={extractUrl(img)}
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
                  </>
                )
              })()}
            </div>
            <div className="modal-content">
              <p className="eyebrow">{selectedHome.location}</p>
              <h2>{selectedHome.building_name ? `${selectedHome.building_name} - ${selectedHome.unit_number}` : selectedHome.name}</h2>
              {selectedHome.unit_number && (
                <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '8px' }}>
                  Unit {selectedHome.unit_number} · {selectedHome.category} · {selectedHome.floor}
                </p>
              )}
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
              <div style={{ fontWeight: 700, color: '#1d3d33', fontSize: '14px' }}>
                {applyConfirm.building_name ? `${applyConfirm.building_name} - ${applyConfirm.unit_number}` : applyConfirm.name}
              </div>
              <div style={{ color: '#718078', fontSize: '12px', marginTop: '4px' }}>
                {applyConfirm.location} · {formatKes(applyConfirm.price)}/mo
                {applyConfirm.unit_number && ` · Unit ${applyConfirm.unit_number}`}
              </div>
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
      {showUnitSelection && selectedBuilding && (
        <div className="modal-backdrop" onClick={() => { setShowUnitSelection(false); setSelectedBuilding(null); setBuildingUnits([]) }}>
          <div className="unit-selection-modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal-top-bar">
              <button className="in-app-back-button" onClick={() => { setShowUnitSelection(false); setSelectedBuilding(null); setBuildingUnits([]) }}>
                ← Back
              </button>
              <h2>{selectedBuilding.name}</h2>
              <button className="close-button" onClick={() => { setShowUnitSelection(false); setSelectedBuilding(null); setBuildingUnits([]) }}>×</button>
            </div>
            <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
              <p style={{ color: '#6b7280', marginBottom: '16px' }}>{selectedBuilding.location} · {selectedBuilding.availableUnits} units available</p>
              
              <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
                <select
                  value={unitFilterCategory}
                  onChange={(e) => { setUnitFilterCategory(e.target.value); openBuildingUnits(selectedBuilding) }}
                  style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #e5e7eb', fontSize: '13px' }}
                >
                  <option value="All">All Categories</option>
                  <option value="bedsitter">Bedsitter</option>
                  <option value="1BR">1 Bedroom</option>
                  <option value="2BR">2 Bedroom</option>
                  <option value="3BR">3 Bedroom</option>
                  <option value="4BR">4 Bedroom</option>
                </select>
                <select
                  value={unitFilterFloor}
                  onChange={(e) => { setUnitFilterFloor(e.target.value); openBuildingUnits(selectedBuilding) }}
                  style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #e5e7eb', fontSize: '13px' }}
                >
                  <option value="All">All Floors</option>
                  <option value="1st">1st Floor</option>
                  <option value="2nd">2nd Floor</option>
                  <option value="3rd">3rd Floor</option>
                  <option value="4th">4th Floor</option>
                </select>
              </div>

              {buildingUnits.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '48px', color: '#9ca3af' }}>
                  <div style={{ fontSize: '48px', marginBottom: '16px' }}>🏢</div>
                  <p style={{ fontSize: '16px', marginBottom: '8px' }}>No units available</p>
                  <p style={{ fontSize: '14px' }}>Try adjusting your filters</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gap: '16px' }}>
                  {buildingUnits.map((unit) => {
                    // Unit images are now fetched from home_images table in fetchUnitsInBuilding
                    const unitImages = unit.images || []
                    const buildingImgs = unit.building_images || []
                    
                    // Use unit's custom images if available, otherwise fall back to building images
                    let finalImages = unitImages.length > 0 ? unitImages : buildingImgs
                    if (finalImages.length === 0) {
                      finalImages = [{ url: unit.image, is_primary: true, order_index: 0 }]
                    }
                    
                    // Extract URL from image object - handle multiple possible field names
                    const extractUrl = (img) => img?.url || img?.image_url || img?.image || ''
                    const unitImage = finalImages.length > 0 ? extractUrl(finalImages[0]) : ''
                    
                    // Normalize finalImages to have url field
                    const normalizedImages = finalImages.map(img => ({
                      ...img,
                      url: extractUrl(img)
                    }))
                    
                    // Prepare unit object with proper image data for the modal
                    const unitForModal = {
                      ...unit,
                      images: normalizedImages,
                      image: unitImage,
                      building_name: selectedBuilding.name,
                      building_location: selectedBuilding.location,
                    }
                    
                    return (
                      <div
                        key={unit.id}
                        style={{
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          padding: '16px',
                          display: 'flex',
                          gap: '16px',
                          cursor: 'pointer',
                          transition: 'border-color 0.2s'
                        }}
                        onClick={() => { setSelectedHome(unitForModal); setShowUnitSelection(false) }}
                        onMouseEnter={(e) => e.currentTarget.style.borderColor = '#3b82f6'}
                        onMouseLeave={(e) => e.currentTarget.style.borderColor = '#e5e7eb'}
                      >
                        <img
                          src={unitImage || ''}
                          alt={unit.name}
                          style={{ width: '120px', height: '90px', objectFit: 'cover', borderRadius: '6px' }}
                          onError={(e) => {
                            e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23e5e7eb" width="100" height="100"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%239ca3af"%3ENo Image%3C/text%3E%3C/svg%3E'
                          }}
                        />
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                            <div>
                              <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>{unit.unit_number}</h4>
                              <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#6b7280' }}>{unit.category} · {unit.floor}</p>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <strong style={{ fontSize: '16px', color: '#1d3d33' }}>{formatKes(unit.price)}</strong>
                              <span style={{ fontSize: '12px', color: '#6b7280' }}>/mo</span>
                            </div>
                          </div>
                          {unit.details && <p style={{ margin: '8px 0 0', fontSize: '13px', color: '#6b7280', lineHeight: 1.4 }}>{unit.details}</p>}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Building Detail Modal */}
      {showBuildingDetail && selectedBuilding && (
        <div className="modal-backdrop" onClick={() => { setShowBuildingDetail(false); setSelectedBuilding(null); setBuildingDetailImages([]) }}>
          <div className="booking-modal" onClick={(event) => event.stopPropagation()}>
            <button className="close-button" onClick={() => { setShowBuildingDetail(false); setSelectedBuilding(null); setBuildingDetailImages([]) }}>×</button>
            
            {/* Image Gallery */}
            <div className="image-gallery-container">
              {(() => {
                const hasImages = buildingDetailImages && buildingDetailImages.length > 0
                const extractUrl = (img) => img?.url || img?.image_url || img?.image || ''
                const imageUrl = hasImages
                  ? extractUrl(buildingDetailImages[buildingDetailImageIndex] || buildingDetailImages[0])
                  : ''
                
                return (
                  <>
                    <img 
                      className="modal-home-image" 
                      src={imageUrl || ''}
                      alt={`${selectedBuilding.name} exterior`}
                      onError={(e) => {
                        e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23e5e7eb" width="100" height="100"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%239ca3af"%3ENo Image%3C/text%3E%3C/svg%3E'
                      }}
                    />
                    {/* Image Navigation */}
                    {hasImages && buildingDetailImages.length > 1 && (
                      <>
                        <button 
                          className="gallery-nav-btn gallery-prev-btn"
                          onClick={() => setBuildingDetailImageIndex((prev) => prev === 0 ? buildingDetailImages.length - 1 : prev - 1)}
                        >
                          ‹
                        </button>
                        <button 
                          className="gallery-nav-btn gallery-next-btn"
                          onClick={() => setBuildingDetailImageIndex((prev) => (prev + 1) % buildingDetailImages.length)}
                        >
                          ›
                        </button>
                        {/* Thumbnails */}
                        <div className="gallery-thumbnails">
                          {buildingDetailImages.map((img, index) => (
                            <img
                              key={index}
                              src={extractUrl(img)}
                              alt={`Thumbnail ${index + 1}`}
                              className={`gallery-thumbnail ${index === buildingDetailImageIndex ? 'active' : ''}`}
                              onClick={() => setBuildingDetailImageIndex(index)}
                            />
                          ))}
                        </div>
                        <div className="gallery-counter">
                          {buildingDetailImageIndex + 1} / {buildingDetailImages.length}
                        </div>
                      </>
                    )}
                  </>
                )
              })()}
            </div>
            
            <div className="modal-content">
              <p className="eyebrow">{selectedBuilding.location}</p>
              <h2>{selectedBuilding.name}</h2>
              <p style={{ color: '#718078', lineHeight: 1.7, fontSize: '11px', marginBottom: '16px' }}>
                {selectedBuilding.availableUnits} units available · {selectedBuilding.total_units} total units
              </p>
              {selectedBuilding.description && (
                <p style={{ color: '#718078', lineHeight: 1.7, fontSize: '11px', marginBottom: '16px' }}>
                  {selectedBuilding.description}
                </p>
              )}
              {selectedBuilding.amenities && (
                <div style={{ marginBottom: '16px' }}>
                  <p style={{ fontWeight: 600, fontSize: '12px', marginBottom: '8px' }}>Amenities:</p>
                  <p style={{ color: '#718078', fontSize: '11px' }}>{selectedBuilding.amenities}</p>
                </div>
              )}
              <div style={{ marginTop: '24px' }}>
                <button 
                  className="primary-action" 
                  onClick={() => { setShowBuildingDetail(false); openBuildingUnits(selectedBuilding) }}
                >
                  View available units <span>→</span>
                </button>
              </div>
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

      {/* Application Detail Modal - shows tenant message */}
      {selectedApplicationDetail && !showTenantApplicationDetailPage && (
        <div className="modal-backdrop" onClick={() => setSelectedApplicationDetail(null)}>
          <div className="booking-modal" onClick={(event) => event.stopPropagation()}>
            <div className="form-header-bar">
              <button type="button" className="in-app-back-button" onClick={() => setSelectedApplicationDetail(null)}>← Back</button>
              <button type="button" className="close-button" onClick={() => setSelectedApplicationDetail(null)}>×</button>
            </div>
            <p className="eyebrow">Application Details</p>
            <h2>{selectedApplicationDetail.name || 'Home'}</h2>
            <div style={{ marginBottom: '20px' }}>
              <div style={{ marginBottom: '12px' }}>
                <strong style={{ fontSize: '12px', color: '#3e735e' }}>Status:</strong>
                <span className={`application-status ${selectedApplicationDetail.status}`} style={{ marginLeft: '8px' }}>{selectedApplicationDetail.status}</span>
              </div>
              <div style={{ marginBottom: '12px' }}>
                <strong style={{ fontSize: '12px', color: '#3e735e' }}>Location:</strong>
                <span style={{ marginLeft: '8px', fontSize: '13px' }}>{selectedApplicationDetail.location || '—'}</span>
              </div>
              <div style={{ marginBottom: '12px' }}>
                <strong style={{ fontSize: '12px', color: '#3e735e' }}>Applied on:</strong>
                <span style={{ marginLeft: '8px', fontSize: '13px' }}>{new Date(selectedApplicationDetail.created_at).toLocaleDateString()}</span>
              </div>
              {selectedApplicationDetail.tenant_message && (
                <div style={{ marginBottom: '12px', background: '#f6f9f5', padding: '12px', borderRadius: '6px' }}>
                  <strong style={{ fontSize: '12px', color: '#3e735e', display: 'block', marginBottom: '6px' }}>Your message:</strong>
                  <p style={{ margin: 0, fontSize: '13px', lineHeight: 1.5, color: '#1d3d33' }}>{selectedApplicationDetail.tenant_message}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Full-Page Tenant Application Detail View */}
      {showTenantApplicationDetailPage && selectedApplicationDetail && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: '#fff', zIndex: 2000, overflowY: 'auto' }}>
          <div className="form-header-bar" style={{ position: 'sticky', top: 0, background: '#fff', zIndex: 10, borderBottom: '1px solid #e5e7eb' }}>
            <button type="button" className="in-app-back-button" onClick={() => { setShowTenantApplicationDetailPage(false); setSelectedApplicationDetail(null); setTenantDetailImageIndex(0); }}>← Back</button>
            <button type="button" className="close-button" onClick={() => { setShowTenantApplicationDetailPage(false); setSelectedApplicationDetail(null); setTenantDetailImageIndex(0); }}>×</button>
          </div>
          
          <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', minHeight: 'calc(100vh - 60px)' }}>
            {/* Left Side - Unit Images Gallery */}
            <div style={{ 
              flex: isMobile ? 'none' : 1, 
              background: '#f5f5f5', 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              justifyContent: 'center', 
              padding: isMobile ? '16px' : '20px', 
              minWidth: isMobile ? '100%' : '50%',
              maxHeight: isMobile ? '50vh' : 'auto'
            }}>
              {(() => {
                const hasImages = selectedApplicationDetail.images && selectedApplicationDetail.images.length > 0
                const extractUrl = (img) => img?.url || img?.image_url || img?.image || ''
                const imageUrl = hasImages
                  ? extractUrl(selectedApplicationDetail.images[tenantDetailImageIndex] || selectedApplicationDetail.images[0])
                  : selectedApplicationDetail.image || ''

                return (
                  <>
                    <img
                      src={imageUrl || ''}
                      alt={selectedApplicationDetail.name || 'Unit'}
                      style={{
                        maxWidth: '100%',
                        maxHeight: isMobile ? '40vh' : '60vh',
                        width: isMobile ? '100%' : 'auto',
                        objectFit: 'contain',
                        borderRadius: '8px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                      }}
                      onError={(e) => {
                        e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%23e5e7eb" width="400" height="300"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%239ca3af"%3ENo Image%3C/text%3E%3C/svg%3E'
                      }}
                    />
                    {/* Image Navigation */}
                    {hasImages && selectedApplicationDetail.images.length > 1 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '8px' : '16px', marginTop: isMobile ? '8px' : '16px' }}>
                        <button
                          onClick={() => setTenantDetailImageIndex(prev => prev === 0 ? selectedApplicationDetail.images.length - 1 : prev - 1)}
                          style={{
                            padding: isMobile ? '6px 12px' : '8px 16px',
                            background: '#fff',
                            border: '1px solid #d2ded5',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: isMobile ? '16px' : '18px'
                          }}
                        >
                          ‹
                        </button>
                        <span style={{ fontSize: isMobile ? '12px' : '14px', color: '#6b7280' }}>
                          {tenantDetailImageIndex + 1} / {selectedApplicationDetail.images.length}
                        </span>
                        <button
                          onClick={() => setTenantDetailImageIndex(prev => (prev + 1) % selectedApplicationDetail.images.length)}
                          style={{
                            padding: isMobile ? '6px 12px' : '8px 16px',
                            background: '#fff',
                            border: '1px solid #d2ded5',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: isMobile ? '16px' : '18px'
                          }}
                        >
                          ›
                        </button>
                      </div>
                    )}
                    {/* Thumbnails */}
                    {hasImages && selectedApplicationDetail.images.length > 1 && (
                      <div style={{ display: 'flex', gap: isMobile ? '4px' : '8px', marginTop: isMobile ? '8px' : '16px', flexWrap: 'wrap', justifyContent: 'center' }}>
                        {selectedApplicationDetail.images.map((img, index) => (
                          <img
                            key={index}
                            src={extractUrl(img)}
                            alt={`Thumbnail ${index + 1}`}
                            style={{
                              width: isMobile ? '40px' : '60px',
                              height: isMobile ? '40px' : '60px',
                              objectFit: 'cover',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              border: index === tenantDetailImageIndex ? '2px solid #3e735e' : '1px solid #d2ded5',
                              opacity: index === tenantDetailImageIndex ? 1 : 0.6
                            }}
                            onClick={() => setTenantDetailImageIndex(index)}
                          />
                        ))}
                      </div>
                    )}
                  </>
                )
              })()}
            </div>

            {/* Right Side - Application Details */}
            <div style={{ 
              flex: isMobile ? 'none' : 1, 
              padding: isMobile ? '16px' : '32px', 
              background: '#fff', 
              minWidth: isMobile ? '100%' : '50%' 
            }}>
              <p className="eyebrow">APPLICATION</p>
              <h2 style={{ fontSize: isMobile ? '22px' : '28px', marginBottom: isMobile ? '16px' : '24px' }}>{selectedApplicationDetail.name || 'Unit'}</h2>
              
              {/* Status Badge */}
              <div style={{ marginBottom: '24px' }}>
                <span className={`application-status ${selectedApplicationDetail.status}`} style={{ fontSize: '14px', padding: '6px 12px', borderRadius: '20px' }}>
                  {selectedApplicationDetail.status}
                </span>
              </div>

              {/* Unit Details */}
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ fontSize: '16px', marginBottom: '12px', color: '#1d3d33' }}>Unit Information</h3>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(200px, 1fr))', gap: isMobile ? '8px' : '12px' }}>
                  <div>
                    <strong style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>Location</strong>
                    <span style={{ fontSize: '14px', color: '#1d3d33' }}>{selectedApplicationDetail.location || '—'}</span>
                  </div>
                  <div>
                    <strong style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>Region</strong>
                    <span style={{ fontSize: '14px', color: '#1d3d33' }}>{selectedApplicationDetail.region || '—'}</span>
                  </div>
                  {selectedApplicationDetail.building_name && (
                    <div>
                      <strong style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>Building</strong>
                      <span style={{ fontSize: '14px', color: '#1d3d33' }}>{selectedApplicationDetail.building_name}</span>
                    </div>
                  )}
                  {selectedApplicationDetail.unit_number && (
                    <div>
                      <strong style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>Unit Number</strong>
                      <span style={{ fontSize: '14px', color: '#1d3d33' }}>{selectedApplicationDetail.unit_number}</span>
                    </div>
                  )}
                  {selectedApplicationDetail.category && (
                    <div>
                      <strong style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>Category</strong>
                      <span style={{ fontSize: '14px', color: '#1d3d33' }}>{selectedApplicationDetail.category}</span>
                    </div>
                  )}
                  {selectedApplicationDetail.floor && (
                    <div>
                      <strong style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>Floor</strong>
                      <span style={{ fontSize: '14px', color: '#1d3d33' }}>{selectedApplicationDetail.floor}</span>
                    </div>
                  )}
                  <div>
                    <strong style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>Deposit</strong>
                    <span style={{ fontSize: '14px', color: '#1d3d33', fontWeight: 600 }}>{formatKes(selectedApplicationDetail.deposit)}</span>
                  </div>
                  {selectedApplicationDetail.price && (
                    <div>
                      <strong style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>Monthly Rent</strong>
                      <span style={{ fontSize: '14px', color: '#1d3d33', fontWeight: 600 }}>{formatKes(selectedApplicationDetail.price)}</span>
                    </div>
                  )}
                  <div>
                    <strong style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>Applied On</strong>
                    <span style={{ fontSize: '14px', color: '#1d3d33' }}>{new Date(selectedApplicationDetail.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              {/* Tenant Message */}
              {selectedApplicationDetail.tenant_message && (
                <div style={{ marginBottom: '24px', background: '#f6f9f5', padding: '16px', borderRadius: '8px' }}>
                  <strong style={{ fontSize: '12px', color: '#3e735e', display: 'block', marginBottom: '8px' }}>Your Message</strong>
                  <p style={{ margin: 0, fontSize: '14px', lineHeight: 1.6, color: '#1d3d33' }}>{selectedApplicationDetail.tenant_message}</p>
                </div>
              )}

              {/* Unit Description */}
              {selectedApplicationDetail.details && (
                <div style={{ marginBottom: '24px' }}>
                  <h3 style={{ fontSize: '16px', marginBottom: '12px', color: '#1d3d33' }}>Description</h3>
                  <p style={{ fontSize: '14px', lineHeight: 1.6, color: '#6b7280' }}>{selectedApplicationDetail.details}</p>
                </div>
              )}

              {/* Agent Information */}
              <div style={{ marginBottom: '24px', padding: '16px', background: '#f9fafb', borderRadius: '8px' }}>
                <h3 style={{ fontSize: '16px', marginBottom: '12px', color: '#1d3d33' }}>Agent Information</h3>
                <div style={{ marginBottom: '8px' }}>
                  <strong style={{ fontSize: '14px', color: '#1d3d33' }}>{selectedApplicationDetail.agent_name || 'House Agent'}</strong>
                </div>
                {selectedApplicationDetail.agent_company && (
                  <div style={{ marginBottom: '8px' }}>
                    <span style={{ fontSize: '13px', color: '#6b7280' }}>{selectedApplicationDetail.agent_company}</span>
                  </div>
                )}
                {selectedApplicationDetail.agent_phone && (
                  <div style={{ display: 'flex', gap: isMobile ? '6px' : '8px', marginTop: '12px' }}>
                    <a href={`tel:${cleanPhoneNumber(selectedApplicationDetail.agent_phone)}`} className="contact-btn call-btn" style={{ padding: isMobile ? '6px 12px' : '8px 16px' }}>
                      <span>📞</span> Call
                    </a>
                    <a href={getWhatsAppUrl(selectedApplicationDetail.agent_phone, selectedApplicationDetail.name)} target="_blank" rel="noopener noreferrer" className="contact-btn whatsapp-btn" style={{ padding: isMobile ? '6px 12px' : '8px 16px' }}>
                      <span>💬</span> WhatsApp
                    </a>
                  </div>
                )}
              </div>

              {/* Actions for Approved Applications */}
              {selectedApplicationDetail.status === 'approved' && (
                <div style={{ marginBottom: '24px' }}>
                  {selectedApplicationDetail.contract_pdf_url
                    ? <a href={selectedApplicationDetail.contract_pdf_url} target="_blank" rel="noreferrer" style={{ display: 'inline-block', padding: isMobile ? '10px 16px' : '12px 24px', background: '#3e735e', color: '#fff', borderRadius: '6px', textDecoration: 'none', fontSize: isMobile ? '13px' : '14px', fontWeight: 600 }}>View Contract ↗</a>
                    : <span style={{ fontSize: '13px', color: '#9ca3af' }}>Contract pending</span>}
                  {selectedApplicationDetail.payment_deadline && selectedApplicationDetail.payment_status !== 'paid' && (
                    <div style={{ marginTop: '12px' }}>
                      <span style={{ fontSize: isMobile ? '12px' : '13px', color: new Date(selectedApplicationDetail.payment_deadline) < new Date() ? '#ef4444' : '#f59e0b', fontWeight: 700 }}>
                        {new Date(selectedApplicationDetail.payment_deadline) < new Date()
                          ? '⚠ Payment deadline passed'
                          : `⏰ Pay by ${new Date(selectedApplicationDetail.payment_deadline).toLocaleString()}`}
                      </span>
                    </div>
                  )}
                  {selectedApplicationDetail.payment_status !== 'paid' && (
                    <button style={{ marginTop: '12px', padding: isMobile ? '10px 16px' : '12px 24px', background: '#d9775d', color: '#fff', border: 'none', borderRadius: '6px', fontSize: isMobile ? '13px' : '14px', fontWeight: 600, cursor: 'pointer' }}
                      onClick={() => { setPaymentApplication(selectedApplicationDetail); setPaymentPhone(authUser.phone || ''); setPaymentAmount(selectedApplicationDetail.deposit) }}>
                      Make Payment
                    </button>
                  )}
                  {selectedApplicationDetail.payment_status === 'paid' && (
                    <div style={{ marginTop: '12px', padding: '12px', background: '#d1fae5', borderRadius: '6px', color: '#065f46', fontSize: '14px', fontWeight: 600 }}>
                      ✓ Deposit Paid
                    </div>
                  )}
                </div>
              )}

              {/* Cancel for Submitted Applications */}
              {selectedApplicationDetail.status === 'submitted' && (
                <button style={{ padding: isMobile ? '10px 16px' : '12px 24px', background: '#c97861', color: '#fff', border: 'none', borderRadius: '6px', fontSize: isMobile ? '13px' : '14px', fontWeight: 600, cursor: 'pointer' }}
                  onClick={() => cancelBooking(selectedApplicationDetail.home_id)}>
                Cancel Application
              </button>
              )}

              {/* Rate for Paid Approved Applications */}
              {selectedApplicationDetail.status === 'approved' && selectedApplicationDetail.payment_status === 'paid' && (
                <button style={{ marginTop: '12px', padding: isMobile ? '10px 16px' : '12px 24px', background: '#d59a54', color: '#fff', border: 'none', borderRadius: '6px', fontSize: isMobile ? '13px' : '14px', fontWeight: 600, cursor: 'pointer' }}
                  onClick={() => openRatingModal(selectedApplicationDetail)}>
                ★ Rate This Unit
              </button>
              )}
            </div>
          </div>

          {/* Messages Section */}
          {['submitted', 'approved'].includes(selectedApplicationDetail.status) && (
            <div style={{ padding: isMobile ? '16px' : '32px', borderTop: '1px solid #e5e7eb', background: '#f9fafb' }}>
              <h3 style={{ fontSize: '16px', marginBottom: '16px', color: '#1d3d33' }}>Messages</h3>
              {openMessageAppId === selectedApplicationDetail.id ? (
                <>
                  <div style={{ maxHeight: isMobile ? '200px' : '300px', overflowY: 'auto', marginBottom: '16px', background: '#fff', padding: isMobile ? '12px' : '16px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                    {(messageThreads[selectedApplicationDetail.id] || []).length === 0 ? (
                      <p style={{ color: '#9ca3af', fontSize: '13px', textAlign: 'center', margin: '20px 0' }}>No messages yet. Start a conversation with the agent.</p>
                    ) : (
                      (messageThreads[selectedApplicationDetail.id] || []).map((msg, idx) => (
                        <div key={idx} style={{ marginBottom: '12px', padding: '10px 14px', borderRadius: '8px', background: msg.sender_id === authUser?.id ? '#3e735e' : '#f3f4f6', color: msg.sender_id === authUser?.id ? '#fff' : '#1d3d33', maxWidth: '80%', marginLeft: msg.sender_id === authUser?.id ? 'auto' : '0' }}>
                          <p style={{ margin: 0, fontSize: '13px', lineHeight: 1.4 }}>{msg.message}</p>
                          <span style={{ fontSize: '10px', opacity: 0.7, marginTop: '4px', display: 'block' }}>{new Date(msg.created_at).toLocaleString()}</span>
                        </div>
                      ))
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="text"
                      value={newMessageText}
                      onChange={(e) => setNewMessageText(e.target.value)}
                      placeholder="Type your message..."
                      style={{ flex: 1, padding: isMobile ? '10px' : '12px', border: '1px solid #d2ded5', borderRadius: '6px', fontSize: isMobile ? '13px' : '14px' }}
                      onKeyPress={(e) => e.key === 'Enter' && handleSendMessage(selectedApplicationDetail.id)}
                    />
                    <button
                      onClick={() => handleSendMessage(selectedApplicationDetail.id)}
                      disabled={messageSending || !newMessageText.trim()}
                      style={{ padding: isMobile ? '10px 16px' : '12px 24px', background: '#3e735e', color: '#fff', border: 'none', borderRadius: '6px', fontSize: isMobile ? '13px' : '14px', fontWeight: 600, cursor: messageSending || !newMessageText.trim() ? 'not-allowed' : 'pointer', opacity: messageSending || !newMessageText.trim() ? 0.6 : 1 }}
                    >
                      {messageSending ? 'Sending...' : 'Send'}
                    </button>
                  </div>
                </>
              ) : (
                <button
                  onClick={async () => {
                    setOpenMessageAppId(selectedApplicationDetail.id)
                    await loadMessages(selectedApplicationDetail.id)
                  }}
                  style={{ padding: isMobile ? '10px 16px' : '12px 24px', background: '#3e735e', color: '#fff', border: 'none', borderRadius: '6px', fontSize: isMobile ? '13px' : '14px', fontWeight: 600, cursor: 'pointer' }}
                >
                  💬 Open Messages
                </button>
              )}
            </div>
          )}
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
      if (!name || !name.trim() || !identifier || !identifier.trim() || !password || !password.trim() || !confirmPassword || !confirmPassword.trim()) {
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
      if (!password || password.length < 8) {
        setError('Password must be at least 8 characters long.')
        return
      }
      if (Array.isArray(accounts) && accounts.some((account) => account.identifier === normalizedIdentifier)) {
        setError('An account with this email or phone number already exists. Sign in instead.')
        return
      }
      const initials = name && name.trim() ? name.trim().split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase() : 'TN'
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

    if (!identifier || !identifier.trim() || !password || !password.trim()) {
      setError('Enter your email address and password to continue.')
      return
    }
    const normalizedIdentifier = normalizeIdentifier(identifier)
    if (!isValidEmail(normalizedIdentifier)) {
      setError('Enter a valid email address.')
      return
    }
    if (!password || password.length < 8) {
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

function SuperAdminPanel({ token, currentUserId, onNotify, activeView }) {
  const [overview, setOverview] = useState(null)
  const [users, setUsers] = useState([])
  const [homes, setHomes] = useState([])
  const [buildings, setBuildings] = useState([])
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
  const [selectedView, setSelectedView] = useState(null) // 'users', 'homes', 'applications', 'payments', 'buildings'
  const [showProfile, setShowProfile] = useState(false)
  const [profile, setProfile] = useState({ name: '', phone: '', occupation: '', bio: '', company: '' })
  const emptyNewUser = { name: '', identifier: '', password: '', role: 'Agent' }
  const [showAddUser, setShowAddUser] = useState(false)
  const [newUser, setNewUser] = useState(emptyNewUser)
  const [saving, setSaving] = useState(false)
  const [expandedApplicationSection, setExpandedApplicationSection] = useState(null) // 'home' or 'building' or null
  const [expandedHomeSection, setExpandedHomeSection] = useState(null) // 'available' or 'taken' or null
  const [expandedBuildingSection, setExpandedBuildingSection] = useState(null) // 'available' or 'full' or null
  const [navigationHistory, setNavigationHistory] = useState(['agent-dashboard']) // Track navigation history for SuperAdmin

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [stats, people] = await Promise.all([fetchSuperAdminOverview(token), fetchSuperAdminUsers(token)])
      setOverview(stats)
      setUsers(people)

      // Also fetch ALL homes (available + taken) for the admin view
      const allHomes = await fetchAllHomesAdmin(token)
      setHomes(allHomes)

      // Fetch all buildings (SuperAdmin sees all buildings)
      const allBuildings = await fetchAllBuildingsAdmin(token)
      setBuildings(allBuildings)

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
      setNavigationHistory(prev => [...prev, 'agent-dashboard'])
    } else if (activeView === 'agent-homes') {
      setSelectedView('homes')
      setShowProfile(false)
      setNavigationHistory(prev => [...prev, 'agent-homes'])
    } else if (activeView === 'agent-applications') {
      setSelectedView('applications')
      setShowProfile(false)
      setNavigationHistory(prev => [...prev, 'agent-applications'])
    } else if (activeView === 'agent-buildings') {
      setSelectedView('buildings')
      setShowProfile(false)
      setNavigationHistory(prev => [...prev, 'agent-buildings'])
    } else if (activeView === 'agent-profile') {
      setShowProfile(true)
      setSelectedView(null)
      setNavigationHistory(prev => [...prev, 'agent-profile'])
      // Load profile
      fetchProfile(token).then(setProfile).catch(onNotify)
    }
  }, [activeView, token, onNotify])

  // Navigation with history tracking for SuperAdmin
  const navigateTo = (view) => {
    setSelectedView(view)
    setNavigationHistory(prev => [...prev, view])
  }

  const handleNavigateBack = () => {
    if (navigationHistory.length > 1) {
      const newHistory = [...navigationHistory]
      newHistory.pop() // Remove current view
      const previousView = newHistory[newHistory.length - 1]
      setNavigationHistory(newHistory)
      if (previousView === 'agent-dashboard') {
        setSelectedView(null)
        setActiveView('agent-dashboard')
      } else if (previousView === 'agent-homes') {
        setSelectedView('homes')
        setActiveView('agent-homes')
      } else if (previousView === 'agent-applications') {
        setSelectedView('applications')
        setActiveView('agent-applications')
      } else if (previousView === 'agent-buildings') {
        setSelectedView('buildings')
        setActiveView('agent-buildings')
      } else if (previousView === 'agent-profile') {
        setShowProfile(true)
        setSelectedView(null)
        setActiveView('agent-profile')
      }
    }
  }

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
    // Exclude building units (homes with building_id)
    if (home.building_id) return false

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
    { label: 'Homes', value: homes.filter(h => !h.building_id).length, view: 'homes' },
    { label: 'Buildings', value: buildings.length, view: 'buildings' },
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
            <button onClick={() => { setSelectedView(null); onNavigateBack() }} style={{ padding: '8px 16px', cursor: 'pointer' }}>← Back</button>
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
                  {KENYA_REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
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

              {/* Nested Cards for Homes */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                {/* Available Homes Card */}
                <div
                  onClick={() => setExpandedHomeSection(expandedHomeSection === 'available' ? null : 'available')}
                  style={{
                    background: '#fff',
                    padding: '24px',
                    borderRadius: '8px',
                    boxShadow: '0 7px 24px rgba(29,53,39,.06)',
                    cursor: 'pointer',
                    border: expandedHomeSection === 'available' ? '2px solid #3b82f6' : '1px solid #e5e7eb',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '12px' }}>
                    <span style={{ fontSize: '28px', color: '#173d36' }}>⌂</span>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '18px', color: '#173d36' }}>Available Homes</h3>
                      <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#7c8981' }}>Homes currently available for tenants</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong style={{ fontSize: '28px', color: '#173d36', font: '400 32px Georgia, serif' }}>
                      {filteredHomes.filter(h => h.available).length}
                    </strong>
                    <span style={{ fontSize: '12px', color: '#9ba59f' }}>Total available homes</span>
                  </div>
                </div>

                {/* Taken Homes Card */}
                <div
                  onClick={() => setExpandedHomeSection(expandedHomeSection === 'taken' ? null : 'taken')}
                  style={{
                    background: '#fff',
                    padding: '24px',
                    borderRadius: '8px',
                    boxShadow: '0 7px 24px rgba(29,53,39,.06)',
                    cursor: 'pointer',
                    border: expandedHomeSection === 'taken' ? '2px solid #3b82f6' : '1px solid #e5e7eb',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '12px' }}>
                    <span style={{ fontSize: '28px', color: '#173d36' }}>🏠</span>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '18px', color: '#173d36' }}>Taken Homes</h3>
                      <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#7c8981' }}>Homes currently occupied by tenants</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong style={{ fontSize: '28px', color: '#173d36', font: '400 32px Georgia, serif' }}>
                      {filteredHomes.filter(h => !h.available).length}
                    </strong>
                    <span style={{ fontSize: '12px', color: '#9ba59f' }}>Total taken homes</span>
                  </div>
                </div>
              </div>

              {/* Expanded Table Views */}
              {expandedHomeSection === 'available' && (
                <div style={{ marginBottom: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 style={{ margin: 0 }}>Available Homes</h3>
                    <button onClick={() => setExpandedHomeSection(null)} style={{ padding: '8px 16px', cursor: 'pointer', background: '#f3f4f6', border: 'none', borderRadius: '6px' }}>Close</button>
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
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredHomes.filter(h => h.available).map((home) => (
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
                    {filteredHomes.filter(h => h.available).length === 0 && (
                      <div className="empty-state">
                        <strong>No available homes found</strong>
                        <span>Try a different search, region, or category.</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {expandedHomeSection === 'taken' && (
                <div style={{ marginBottom: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 style={{ margin: 0 }}>Taken Homes</h3>
                    <button onClick={() => setExpandedHomeSection(null)} style={{ padding: '8px 16px', cursor: 'pointer', background: '#f3f4f6', border: 'none', borderRadius: '6px' }}>Close</button>
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
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredHomes.filter(h => !h.available).map((home) => (
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
                    {filteredHomes.filter(h => !h.available).length === 0 && (
                      <div className="empty-state">
                        <strong>No taken homes found</strong>
                        <span>Try a different search, region, or category.</span>
                      </div>
                    )}
                  </div>
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
              
              {/* Nested Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
                {/* Home Applications Nested Card */}
                <div 
                  style={{ 
                    background: '#fff', 
                    borderRadius: '8px', 
                    padding: '24px', 
                    boxShadow: '0 7px 24px rgba(29,53,39,.06)',
                    cursor: 'pointer',
                    border: expandedApplicationSection === 'home' ? '2px solid #3b82f6' : '1px solid #e5e7eb',
                    transition: 'all 0.2s ease'
                  }}
                  onClick={() => setExpandedApplicationSection(expandedApplicationSection === 'home' ? null : 'home')}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '12px' }}>
                    <span style={{ fontSize: '28px', color: '#173d36' }}>⌂</span>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '18px', color: '#173d36' }}>Home Applications</h3>
                      <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#7c8981' }}>Manage standalone home applications</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong style={{ fontSize: '28px', color: '#173d36', font: '400 32px Georgia, serif' }}>
                      {applications.filter(app => !app.homes?.building_id).length}
                    </strong>
                    <span style={{ fontSize: '12px', color: '#9ba59f' }}>Total applications</span>
                  </div>
                </div>

                {/* Building Applications Nested Card */}
                <div 
                  style={{ 
                    background: '#fff', 
                    borderRadius: '8px', 
                    padding: '24px', 
                    boxShadow: '0 7px 24px rgba(29,53,39,.06)',
                    cursor: 'pointer',
                    border: expandedApplicationSection === 'building' ? '2px solid #3b82f6' : '1px solid #e5e7eb',
                    transition: 'all 0.2s ease'
                  }}
                  onClick={() => setExpandedApplicationSection(expandedApplicationSection === 'building' ? null : 'building')}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '12px' }}>
                    <span style={{ fontSize: '28px', color: '#173d36' }}>🏢</span>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '18px', color: '#173d36' }}>Building Applications</h3>
                      <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#7c8981' }}>Manage apartment/unit applications</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong style={{ fontSize: '28px', color: '#173d36', font: '400 32px Georgia, serif' }}>
                      {applications.filter(app => app.homes?.building_id).length}
                    </strong>
                    <span style={{ fontSize: '12px', color: '#9ba59f' }}>Total applications</span>
                  </div>
                </div>
              </div>

              {/* Expanded Section */}
              {expandedApplicationSection && (
                <div className="table-panel" style={{ marginTop: '24px' }}>
                  <div className="table-title">
                    <h2>{expandedApplicationSection === 'home' ? 'Home Applications' : 'Building Applications'}</h2>
                    <span>{expandedApplicationSection === 'home' ? applications.filter(app => !app.homes?.building_id).length : applications.filter(app => app.homes?.building_id).length} application{(expandedApplicationSection === 'home' ? applications.filter(app => !app.homes?.building_id).length : applications.filter(app => app.homes?.building_id).length) === 1 ? '' : 's'}</span>
                    <button onClick={() => setExpandedApplicationSection(null)}>✕ Close</button>
                  </div>
                  <div className="users-toolbar">
                    <div className="search-field admin-user-search">
                      <span>⌕</span>
                      <input
                        value={applicationSearch}
                        onChange={(event) => setApplicationSearch(event.target.value)}
                        placeholder="Search by tenant name or property"
                      />
                    </div>
                    <select
                      className="role-filter"
                      value={applicationRegionFilter}
                      onChange={(event) => setApplicationRegionFilter(event.target.value)}
                      aria-label="Filter applications by region"
                    >
                      <option value="All regions">All regions</option>
                      {KENYA_REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
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
                  {expandedApplicationSection === 'home' && (
                    <>
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
                              const isHomeApp = !app.homes?.building_id
                              const search = applicationSearch.toLowerCase()
                              const matchesSearch = !search ||
                                (app.profiles?.name || '').toLowerCase().includes(search) ||
                                (app.homes?.name || '').toLowerCase().includes(search) ||
                                (app.homes?.location || '').toLowerCase().includes(search)
                              const matchesRegion = applicationRegionFilter === 'All regions' || (app.homes?.region || '') === applicationRegionFilter
                              const matchesCategory = applicationCategoryFilter === 'All categories' || (app.homes?.type || '') === applicationCategoryFilter
                              return isHomeApp && matchesSearch && matchesRegion && matchesCategory
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
                        const isHomeApp = !app.homes?.building_id
                        const search = applicationSearch.toLowerCase()
                        const matchesSearch = !search ||
                          (app.profiles?.name || '').toLowerCase().includes(search) ||
                          (app.homes?.name || '').toLowerCase().includes(search) ||
                          (app.homes?.location || '').toLowerCase().includes(search)
                        const matchesRegion = applicationRegionFilter === 'All regions' || (app.homes?.region || '') === applicationRegionFilter
                        const matchesCategory = applicationCategoryFilter === 'All categories' || (app.homes?.type || '') === applicationCategoryFilter
                        return isHomeApp && matchesSearch && matchesRegion && matchesCategory
                      }).length === 0 && (
                        <div className="empty-state">
                          <strong>No home applications found</strong>
                          <span>Try a different search, region, or category.</span>
                        </div>
                      )}
                    </>
                  )}
                  {expandedApplicationSection === 'building' && (
                    <>
                      <div className="users-table-wrap">
                        <table className="users-table applications-table">
                          <thead>
                            <tr>
                              <th>Tenant</th>
                              <th>Building - Unit</th>
                              <th>Location</th>
                              <th>Region</th>
                              <th>Category</th>
                              <th>Deposit</th>
                              <th>Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {applications.filter(app => {
                              const isBuildingApp = app.homes?.building_id
                              const search = applicationSearch.toLowerCase()
                              const matchesSearch = !search ||
                                (app.profiles?.name || '').toLowerCase().includes(search) ||
                                (app.homes?.name || '').toLowerCase().includes(search) ||
                                (app.homes?.location || '').toLowerCase().includes(search)
                              const matchesRegion = applicationRegionFilter === 'All regions' || (app.homes?.region || '') === applicationRegionFilter
                              const matchesCategory = applicationCategoryFilter === 'All categories' || (app.homes?.type || '') === applicationCategoryFilter
                              return isBuildingApp && matchesSearch && matchesRegion && matchesCategory
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
                        const isBuildingApp = app.homes?.building_id
                        const search = applicationSearch.toLowerCase()
                        const matchesSearch = !search ||
                          (app.profiles?.name || '').toLowerCase().includes(search) ||
                          (app.homes?.name || '').toLowerCase().includes(search) ||
                          (app.homes?.location || '').toLowerCase().includes(search)
                        const matchesRegion = applicationRegionFilter === 'All regions' || (app.homes?.region || '') === applicationRegionFilter
                        const matchesCategory = applicationCategoryFilter === 'All categories' || (app.homes?.type || '') === applicationCategoryFilter
                        return isBuildingApp && matchesSearch && matchesRegion && matchesCategory
                      }).length === 0 && (
                        <div className="empty-state">
                          <strong>No building applications found</strong>
                          <span>Try a different search, region, or category.</span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {selectedView === 'buildings' && (
            <div className="table-panel">
              <div className="table-title">
                <h2>All Buildings</h2>
                <span>{buildings.length} building{buildings.length === 1 ? '' : 's'}</span>
              </div>

              {/* Nested Cards for Buildings - Group by Region */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                {Array.from(new Set(buildings.map(b => b.region))).map(region => (
                  <div
                    key={region}
                    onClick={() => setExpandedBuildingSection(expandedBuildingSection === region ? null : region)}
                    style={{
                      background: '#fff',
                      padding: '24px',
                      borderRadius: '8px',
                      boxShadow: '0 7px 24px rgba(29,53,39,.06)',
                      cursor: 'pointer',
                      border: expandedBuildingSection === region ? '2px solid #3b82f6' : '1px solid #e5e7eb',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '12px' }}>
                      <span style={{ fontSize: '28px', color: '#173d36' }}>🏢</span>
                      <div>
                        <h3 style={{ margin: 0, fontSize: '18px', color: '#173d36' }}>{region}</h3>
                        <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#7c8981' }}>Buildings in this region</p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong style={{ fontSize: '28px', color: '#173d36', font: '400 32px Georgia, serif' }}>
                        {buildings.filter(b => b.region === region).length}
                      </strong>
                      <span style={{ fontSize: '12px', color: '#9ba59f' }}>Total buildings</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Expanded Table View */}
              {expandedBuildingSection && (
                <div style={{ marginBottom: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 style={{ margin: 0 }}>Buildings in {expandedBuildingSection}</h3>
                    <button onClick={() => setExpandedBuildingSection(null)} style={{ padding: '8px 16px', cursor: 'pointer', background: '#f3f4f6', border: 'none', borderRadius: '6px' }}>Close</button>
                  </div>
                  <div className="users-table-wrap">
                    <table className="users-table homes-table">
                      <thead>
                        <tr>
                          <th>Building</th>
                          <th>Location</th>
                          <th>Type</th>
                          <th>Total Units</th>
                          <th>Agent</th>
                        </tr>
                      </thead>
                      <tbody>
                        {buildings.filter(b => b.region === expandedBuildingSection).map((building) => (
                          <tr key={building.id}>
                            <td>
                              <div className="users-table-name">
                                <div className="avatar" style={{ width: '40px', height: '40px', fontSize: '14px', backgroundImage: building.images && building.images.length > 0 ? `url(${building.images[0].url})` : 'none', backgroundSize: 'cover', backgroundPosition: 'center' }}></div>
                                <strong>{building.name}</strong>
                              </div>
                            </td>
                            <td>{building.location}</td>
                            <td>{building.type}</td>
                            <td>{building.total_units}</td>
                            <td>{building.agent_name || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {buildings.filter(b => b.region === expandedBuildingSection).length === 0 && (
                    <div className="empty-state">
                      <strong>No buildings found in this region</strong>
                    </div>
                  )}
                </div>
              )}

              {!loading && buildings.length === 0 && (
                <div className="empty-state">
                  <strong>No buildings found</strong>
                  <span>Buildings will appear here once agents add them.</span>
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
            <button type="button" className="in-app-back-button" onClick={() => { setShowProfile(false); onNavigateBack() }}>← Back</button>
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
