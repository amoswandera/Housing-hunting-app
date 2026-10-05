import { supabase } from './supabaseClient'

// Helper function to handle Supabase errors
const handleSupabaseError = (error) => {
  if (error) {
    throw new Error(error.message || 'Request failed.')
  }
}

// Helper to get initials from name
const getInitials = (name) => {
  if (!name) return 'G'
  return name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()
}

// Helper to normalize phone/email identifier
const normalizeIdentifier = (value) => {
  const trimmed = String(value || '').trim().toLowerCase()
  return trimmed.startsWith('+') ? `+${trimmed.slice(1).replace(/\D/g, '')}` : trimmed.replace(/[\s()-]/g, '')
}

// Auth functions
export const registerUser = async (account) => {
  const { identifier, password, name, role } = account
  const normalizedIdentifier = normalizeIdentifier(identifier)

  const { data, error } = await supabase.auth.signUp({
    email: normalizedIdentifier.includes('@') ? normalizedIdentifier : undefined,
    phone: !normalizedIdentifier.includes('@') ? normalizedIdentifier : undefined,
    password,
    options: {
      data: {
        name: name.trim(),
        identifier: normalizedIdentifier,
        role: role || 'Tenant',
      },
      emailRedirectTo: window.location.origin,
    },
  })

  handleSupabaseError(error)

  // For email auth, check if email confirmation is required
  if (normalizedIdentifier.includes('@') && data.user && !data.session) {
    // Return success with a message about email verification
    return { user: { ...data.user, name, identifier: normalizedIdentifier, role: role || 'Tenant' }, requiresEmailVerification: true }
  }

  handleSupabaseError(error)

  // For phone auth, we need to manually create the profile
  if (!normalizedIdentifier.includes('@') && data.user) {
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: data.user.id,
        name: name.trim(),
        identifier: normalizedIdentifier,
        role: role || 'Tenant',
      })
    handleSupabaseError(profileError)
  }

  return { user: { ...data.user, name, identifier: normalizedIdentifier, role: role || 'Tenant' } }
}

export const loginUser = async (credentials) => {
  const { identifier, password, role } = credentials
  const normalizedIdentifier = normalizeIdentifier(identifier)

  let authResult
  if (normalizedIdentifier.includes('@')) {
    authResult = await supabase.auth.signInWithPassword({
      email: normalizedIdentifier,
      password,
    })
  } else {
    // For phone auth, we'll need to use OTP or custom auth
    // For now, we'll use email as a workaround
    throw new Error('Phone authentication requires OTP setup. Please use email for now.')
  }

  handleSupabaseError(authResult.error)

  // Check if email is verified for email-based accounts
  if (normalizedIdentifier.includes('@') && authResult.data.user && !authResult.data.user.email_confirmed_at) {
    throw new Error('Please verify your email before logging in. Check your inbox for the verification link.')
  }

  // Fetch user profile to get role and other details
  let profile
  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', authResult.data.user.id)
    .maybeSingle()

  // If profile doesn't exist, create it
  if (profileError || !profileData) {
    const { data: newProfile, error: createError } = await supabase
      .from('profiles')
      .insert({
        id: authResult.data.user.id,
        name: authResult.data.user.user_metadata?.name || 'User',
        identifier: authResult.data.user.email || authResult.data.user.phone,
        role: authResult.data.user.user_metadata?.role || 'Tenant',
      })
      .select()
      .single()

    if (createError) {
      // If we can't create the profile, use default values
      profile = {
        id: authResult.data.user.id,
        name: authResult.data.user.user_metadata?.name || 'User',
        identifier: authResult.data.user.email || authResult.data.user.phone,
        role: authResult.data.user.user_metadata?.role || 'Tenant',
        phone: '',
        national_id: '',
        occupation: '',
        bio: '',
        company: '',
      }
    } else {
      profile = newProfile
    }
  } else {
    profile = profileData
  }

  if (profile.role !== role) {
    const accountRole = profile.role === 'SuperAdmin' ? 'Admin' : profile.role
    throw new Error(`This account is registered as ${accountRole}. Select ${accountRole} to sign in.`)
  }

  return {
    token: authResult.data.session.access_token,
    user: {
      id: profile.id,
      name: profile.name,
      identifier: profile.identifier,
      role: profile.role,
      phone: profile.phone || '',
      national_id: profile.national_id || '',
      occupation: profile.occupation || '',
      bio: profile.bio || '',
      company: profile.company || '',
      initials: getInitials(profile.name),
    },
  }
}

export const resetPassword = async (email) => {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin,
  })
  handleSupabaseError(error)
  return { ok: true }
}

export const updatePassword = async (newPassword, token) => {
  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  })
  handleSupabaseError(error)
  return { ok: true }
}

export const fetchProfile = async (token) => {
  const { data: { user }, error: userError } = await supabase.auth.getUser(token)
  handleSupabaseError(userError)

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  handleSupabaseError(profileError)

  return {
    id: profile.id,
    name: profile.name,
    identifier: profile.identifier,
    role: profile.role,
    phone: profile.phone || '',
    national_id: profile.national_id || '',
    occupation: profile.occupation || '',
    bio: profile.bio || '',
    company: profile.company || '',
    initials: getInitials(profile.name),
  }
}

export const fetchTenantProfile = async (tenantId, token) => {
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', tenantId)
    .single()

  handleSupabaseError(profileError)

  return {
    id: profile.id,
    name: profile.name,
    identifier: profile.identifier,
    role: profile.role,
    phone: profile.phone || '',
    national_id: profile.national_id || '',
    occupation: profile.occupation || '',
    bio: profile.bio || '',
    company: profile.company || '',
    initials: getInitials(profile.name),
    created_at: profile.created_at,
  }
}

export const fetchAgentProfile = async (agentId, token) => {
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', agentId)
    .eq('role', 'Agent')
    .single()

  handleSupabaseError(profileError)

  return {
    id: profile.id,
    name: profile.name,
    identifier: profile.identifier,
    role: profile.role,
    phone: profile.phone || '',
    national_id: profile.national_id || '',
    occupation: profile.occupation || '',
    bio: profile.bio || '',
    company: profile.company || '',
    initials: getInitials(profile.name),
    created_at: profile.created_at,
  }
}

export const updateProfile = async (profile, token) => {
  const { data: { user }, error: userError } = await supabase.auth.getUser(token)
  handleSupabaseError(userError)

  const { data, error } = await supabase
    .from('profiles')
    .update({
      name: profile.name.trim(),
      phone: profile.phone || '',
      national_id: profile.national_id || '',
      occupation: profile.occupation || '',
      bio: profile.bio || '',
      company: profile.company || '',
    })
    .eq('id', user.id)
    .select()
    .single()

  handleSupabaseError(error)

  return {
    id: data.id,
    name: data.name,
    identifier: data.identifier,
    role: data.role,
    phone: data.phone || '',
    national_id: data.national_id || '',
    occupation: data.occupation || '',
    bio: data.bio || '',
    company: data.company || '',
    initials: getInitials(data.name),
  }
}

// Homes functions
export const fetchHomes = async (filters = {}) => {
  let query = supabase
    .from('homes')
    .select(`
      *,
      profiles!homes_owner_id_fkey (
        name,
        phone,
        bio,
        company
      )
    `)
    .eq('available', true)

  if (filters.region && filters.region !== 'All regions') {
    query = query.eq('region', filters.region)
  }
  if (filters.type && filters.type !== 'All categories') {
    query = query.eq('type', filters.type)
  }
  if (filters.search) {
    query = query.or(`name.ilike.%${filters.search}%,location.ilike.%${filters.search}%,type.ilike.%${filters.search}%`)
  }

  const { data, error } = await query.order('created_at', { ascending: false })
  handleSupabaseError(error)

  // Ensure data is an array before mapping
  if (!data || !Array.isArray(data)) {
    return []
  }

  return data.map((home) => ({
    ...home,
    parking: Boolean(home.parking),
    available: Boolean(home.available),
    agent_id: home.owner_id,
    agent_name: home.profiles?.name || '',
    agent_phone: home.profiles?.phone || '',
    agent_bio: home.profiles?.bio || '',
    agent_company: home.profiles?.company || '',
  }))
}

export const fetchManagedHomes = async (token) => {
  const { data: { user }, error: userError } = await supabase.auth.getUser(token)
  handleSupabaseError(userError)

  const { data, error } = await supabase
    .from('homes')
    .select('*')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false })

  handleSupabaseError(error)

  // Ensure data is an array before mapping
  if (!data || !Array.isArray(data)) {
    return []
  }

  return data.map((home) => ({
    ...home,
    parking: Boolean(home.parking),
    available: Boolean(home.available),
    agent_id: home.owner_id,
  }))
}

export const createHome = async (home, token) => {
  const { data: { user }, error: userError } = await supabase.auth.getUser(token)
  handleSupabaseError(userError)

  const { data, error } = await supabase
    .from('homes')
    .insert({
      ...home,
      owner_id: user.id,
      parking: home.parking ? 1 : 0,
    })
    .select()
    .single()

  handleSupabaseError(error)

  return {
    ...data,
    parking: Boolean(data.parking),
    available: Boolean(data.available),
    agent_id: data.owner_id,
  }
}

export const updateHomeAvailability = async (id, available, token) => {
  const { data: { user }, error: userError } = await supabase.auth.getUser(token)
  handleSupabaseError(userError)

  const { data, error } = await supabase
    .from('homes')
    .update({ available })
    .eq('id', id)
    .eq('owner_id', user.id)
    .select()
    .single()

  handleSupabaseError(error)

  return {
    ...data,
    parking: Boolean(data.parking),
    available: Boolean(data.available),
  }
}

// Applications functions
export const submitApplication = async (homeId, message, token) => {
  const { data: { user }, error: userError } = await supabase.auth.getUser(token)
  handleSupabaseError(userError)

  // Check if home is available
  const { data: home, error: homeError } = await supabase
    .from('homes')
    .select('available, deposit')
    .eq('id', homeId)
    .single()

  handleSupabaseError(homeError)

  if (!home || !home.available) {
    throw new Error('This home is no longer available.')
  }

  // Check for existing application
  const { data: existing, error: existingError } = await supabase
    .from('applications')
    .select('id')
    .eq('tenant_id', user.id)
    .eq('home_id', homeId)
    .in('status', ['submitted', 'approved'])
    .maybeSingle()

  handleSupabaseError(existingError)

  if (existing) {
    throw new Error('You already have an active application for this home.')
  }

  const { data, error } = await supabase
    .from('applications')
    .insert({
      tenant_id: user.id,
      home_id: homeId,
      tenant_message: message || '',
    })
    .select()
    .single()

  handleSupabaseError(error)

  return { id: data.id, status: data.status }
}

export const fetchMyApplications = async (token) => {
  const { data: { user }, error: userError } = await supabase.auth.getUser(token)
  handleSupabaseError(userError)

  const { data, error } = await supabase
    .from('applications')
    .select(`
      *,
      homes (
        name,
        location,
        deposit,
        image,
        profiles!homes_owner_id_fkey (
          name,
          phone,
          bio,
          company
        )
      )
    `)
    .eq('tenant_id', user.id)
    .order('created_at', { ascending: false })

  handleSupabaseError(error)

  // Ensure data is an array before mapping
  if (!data || !Array.isArray(data)) {
    return []
  }

  return data.map((app) => ({
    ...app,
    tenant_id: app.tenant_id,
    agent_name: app.homes?.profiles?.name || '',
    agent_phone: app.homes?.profiles?.phone || '',
    agent_bio: app.homes?.profiles?.bio || '',
    agent_company: app.homes?.profiles?.company || '',
    name: app.homes?.name || '',
    location: app.homes?.location || '',
    deposit: app.homes?.deposit || 0,
    image: app.homes?.image || '',
  }))
}

export const fetchAgentApplications = async (token) => {
  const { data: { user }, error: userError } = await supabase.auth.getUser(token)
  handleSupabaseError(userError)

  // First get the agent's home IDs
  const { data: homesData, error: homesError } = await supabase
    .from('homes')
    .select('id')
    .eq('owner_id', user.id)

  handleSupabaseError(homesError)

  if (!homesData || homesData.length === 0) {
    return []
  }

  const homeIds = homesData.map(h => h.id)

  // Then get applications for those homes
  const { data, error } = await supabase
    .from('applications')
    .select(`
      *,
      homes (
        name,
        location,
        region,
        type,
        deposit,
        image
      ),
      profiles!applications_tenant_id_fkey (
        name,
        identifier,
        phone,
        national_id,
        occupation,
        bio
      )
    `)
    .in('home_id', homeIds)
    .order('created_at', { ascending: false })

  handleSupabaseError(error)

  // Ensure data is an array before mapping
  if (!data || !Array.isArray(data)) {
    return []
  }

  return data.map((app) => ({
    ...app,
    tenant_id: app.tenant_id,
    tenant_name: app.profiles?.name || '',
    tenant_identifier: app.profiles?.identifier || '',
    tenant_phone: app.profiles?.phone || '',
    tenant_national_id: app.profiles?.national_id || '',
    tenant_occupation: app.profiles?.occupation || '',
    tenant_bio: app.profiles?.bio || '',
    name: app.homes?.name || '',
    location: app.homes?.location || '',
    region: app.homes?.region || '',
    type: app.homes?.type || '',
    deposit: app.homes?.deposit || 0,
    image: app.homes?.image || '',
  }))
}

export const reviewApplication = async (id, review, token) => {
  const { data: { user }, error: userError } = await supabase.auth.getUser(token)
  handleSupabaseError(userError)

  const { status, contractText, paybill, contractPdfUrl, paybillPdfUrl } = review

  if (!['approved', 'declined'].includes(status)) {
    throw new Error('Application status must be approved or declined.')
  }

  // Only require PDFs for approved applications
  if (status === 'approved' && (!contractPdfUrl || !paybillPdfUrl)) {
    throw new Error('Upload both the contract PDF and paybill PDF before approving.')
  }

  const updateData = {
    status,
    reviewed_at: new Date().toISOString(),
  }

  // Only add contract and paybill data if approved
  if (status === 'approved') {
    updateData.contract_text = contractText || ''
    updateData.paybill = paybill || ''
    updateData.contract_pdf_url = contractPdfUrl || ''
    updateData.paybill_pdf_url = paybillPdfUrl || ''
  }

  const { data, error } = await supabase
    .from('applications')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  handleSupabaseError(error)

  return { status: data.status }
}

export const requestPayment = async (id, phone, amount, token) => {
  const { data: { user }, error: userError } = await supabase.auth.getUser(token)
  handleSupabaseError(userError)

  const normalizedPhone = String(phone || '').replace(/[\s()-]/g, '')
  if (!/^(?:\+254|0)(?:1|7)\d{8}$/.test(normalizedPhone)) {
    throw new Error('Enter a valid Kenyan phone number.')
  }
  if (!amount || Number(amount) <= 0) {
    throw new Error('Enter a valid payment amount.')
  }

  const { data, error } = await supabase
    .from('applications')
    .update({
      payment_status: 'pending',
      payment_phone: normalizedPhone,
      payment_amount: Number(amount),
    })
    .eq('id', id)
    .eq('tenant_id', user.id)
    .eq('status', 'approved')
    .select()
    .single()

  handleSupabaseError(error)

  return {
    paymentStatus: 'pending',
    promptSent: true,
    message: `Payment prompt sent to ${normalizedPhone}.`,
  }
}

export const cancelApplication = async (id, token) => {
  const { data: { user }, error: userError } = await supabase.auth.getUser(token)
  handleSupabaseError(userError)

  const { data: application, error: appError } = await supabase
    .from('applications')
    .select('payment_status')
    .eq('id', id)
    .eq('tenant_id', user.id)
    .in('status', ['submitted', 'approved'])
    .single()

  handleSupabaseError(appError)

  const newStatus = application.payment_status === 'paid' ? 'refunded' : 'cancelled'

  const { data, error } = await supabase
    .from('applications')
    .update({ status: newStatus })
    .eq('id', id)
    .eq('tenant_id', user.id)
    .select()
    .single()

  handleSupabaseError(error)

  return { status: 'cancelled' }
}

// Storage functions
export const uploadHouseImage = async (file, token) => {
  const { data: { user }, error: userError } = await supabase.auth.getUser(token)
  handleSupabaseError(userError)

  const fileExt = file.name.split('.').pop()
  const fileName = `${user.id}/${Date.now()}.${fileExt}`

  const { data, error } = await supabase.storage
    .from('house-images')
    .upload(fileName, file, {
      upsert: true,
    })

  handleSupabaseError(error)

  const { data: { publicUrl } } = supabase.storage
    .from('house-images')
    .getPublicUrl(data.path)

  return { url: publicUrl }
}

export const uploadPdf = async (file, token) => {
  const { data: { user }, error: userError } = await supabase.auth.getUser(token)
  handleSupabaseError(userError)

  const fileName = `${user.id}/${Date.now()}.pdf`

  const { data, error } = await supabase.storage
    .from('documents')
    .upload(fileName, file, {
      upsert: true,
    })

  handleSupabaseError(error)

  const { data: { publicUrl } } = supabase.storage
    .from('documents')
    .getPublicUrl(data.path)

  return { url: publicUrl }
}

// SuperAdmin functions
export const fetchSuperAdminOverview = async (token) => {
  const { data: { user }, error: userError } = await supabase.auth.getUser(token)
  handleSupabaseError(userError)

  // Verify user is SuperAdmin
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  handleSupabaseError(profileError)

  if (profile.role !== 'SuperAdmin') {
    throw new Error('SuperAdmin access is required.')
  }

  const [
    { count: users },
    { count: tenants },
    { count: agents },
    { count: homes },
    { count: availableHomes },
    { count: applications },
    { count: pendingApplications },
    { count: payments },
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'Tenant'),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'Agent'),
    supabase.from('homes').select('*', { count: 'exact', head: true }),
    supabase.from('homes').select('*', { count: 'exact', head: true }).eq('available', true),
    supabase.from('applications').select('*', { count: 'exact', head: true }),
    supabase.from('applications').select('*', { count: 'exact', head: true }).eq('status', 'submitted'),
    supabase.from('applications').select('*', { count: 'exact', head: true }).in('payment_status', ['pending', 'paid']),
  ])

  return {
    users: users || 0,
    tenants: tenants || 0,
    agents: agents || 0,
    homes: homes || 0,
    availableHomes: availableHomes || 0,
    applications: applications || 0,
    pendingApplications: pendingApplications || 0,
    payments: payments || 0,
  }
}

export const fetchSuperAdminUsers = async (token) => {
  const { data: { user }, error: userError } = await supabase.auth.getUser(token)
  handleSupabaseError(userError)

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  handleSupabaseError(profileError)

  if (profile.role !== 'SuperAdmin') {
    throw new Error('SuperAdmin access is required.')
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, identifier, role, phone, company, created_at')
    .order('created_at', { ascending: false })

  handleSupabaseError(error)

  // Ensure data is an array before mapping
  if (!data || !Array.isArray(data)) {
    return []
  }

  return data.map((user) => ({
    ...user,
    createdAt: user.created_at,
  }))
}

export const createSuperAdminUser = async (account, token) => {
  const { data: { user }, error: userError } = await supabase.auth.getUser(token)
  handleSupabaseError(userError)

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  handleSupabaseError(profileError)

  if (profile.role !== 'SuperAdmin') {
    throw new Error('SuperAdmin access is required.')
  }

  const { name, identifier, password, role } = account
  const normalizedIdentifier = normalizeIdentifier(identifier)

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: normalizedIdentifier.includes('@') ? normalizedIdentifier : undefined,
    password,
    options: {
      data: {
        name: name.trim(),
        identifier: normalizedIdentifier,
        role,
      },
    },
  })

  handleSupabaseError(authError)

  // Update profile with additional fields
  const { data: profileData, error: updateError } = await supabase
    .from('profiles')
    .update({
      company: role === 'Agent' ? 'Habitat Operations' : '',
      bio: role === 'SuperAdmin' ? 'System administrator' : '',
    })
    .eq('id', authData.user.id)
    .select()
    .single()

  handleSupabaseError(updateError)

  return {
    user: {
      id: profileData.id,
      name: profileData.name,
      identifier: profileData.identifier,
      role: profileData.role,
      phone: profileData.phone,
      company: profileData.company,
      createdAt: profileData.created_at,
    },
  }
}

export const deleteSuperAdminUser = async (id, token) => {
  const { data: { user }, error: userError } = await supabase.auth.getUser(token)
  handleSupabaseError(userError)

  if (Number(id) === user.id) {
    throw new Error('You cannot remove your own super-admin account.')
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  handleSupabaseError(profileError)

  if (profile.role !== 'SuperAdmin') {
    throw new Error('SuperAdmin access is required.')
  }

  const { error } = await supabase.auth.admin.deleteUser(id)
  handleSupabaseError(error)

  return { ok: true }
}

// Legacy booking functions (kept for compatibility)
export const createBooking = async (homeId, token) => {
  // Bookings are deprecated in favor of applications
  return submitApplication(homeId, '', token)
}

export const fetchBookings = async (token) => {
  // Bookings are deprecated in favor of applications
  return fetchMyApplications(token)
}

export const cancelBooking = async (id, token) => {
  // Bookings are deprecated in favor of applications
  return cancelApplication(id, token)
}
