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
    refreshToken: authResult.data.session.refresh_token,
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

// Homes functions — fetch all homes (SuperAdmin sees all, others see available only)
export const fetchHomes = async (filters = {}, adminMode = false, includeHomeIds = []) => {
  // First fetch homes with their images
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

  // SuperAdmin sees all homes; everyone else sees only available ones
  // Exception: if the tenant has an approved home, include it even if unavailable
  if (!adminMode) {
    if (includeHomeIds.length > 0) {
      query = query.or(`available.eq.true,id.in.(${includeHomeIds.join(',')})`)
    } else {
      query = query.eq('available', true)
    }
  }

  const { data: homesData, error: homesError } = await query
  handleSupabaseError(homesError)

  // Get all home IDs
  const homeIds = homesData.map(h => h.id)

  // Fetch FAQs for all homes (gracefully fail if table doesn't exist yet)
  let faqsByHome = {}
  try {
    const { data: faqsData } = await supabase
      .from('home_faqs')
      .select('*')
      .in('home_id', homeIds.length > 0 ? homeIds : [])
      .order('order_index', { ascending: true })
    if (faqsData) {
      faqsData.forEach(faq => {
        if (!faqsByHome[faq.home_id]) faqsByHome[faq.home_id] = []
        faqsByHome[faq.home_id].push(faq)
      })
    }
  } catch { /* FAQ table not yet created, skip */ }

  // Try to fetch images for all homes (gracefully fail if table doesn't exist yet)
  let imagesByHome = {}
  try {
    const { data: imagesData, error: imagesError } = await supabase
      .from('home_images')
      .select('*')
      .in('home_id', homeIds.length > 0 ? homeIds : [])
      .order('order_index', { ascending: true })

    // Only handle error if it's not a "relation does not exist" error
    if (imagesError && !imagesError.message.includes('does not exist')) {
      handleSupabaseError(imagesError)
    }

    // Group images by home_id, normalising image_url → url so the gallery
    // renderer always reads img.url regardless of how images were stored.
    if (imagesData) {
      imagesData.forEach(img => {
        if (!imagesByHome[img.home_id]) {
          imagesByHome[img.home_id] = []
        }
        imagesByHome[img.home_id].push({
          ...img,
          url: img.image_url || img.url || '',
        })
      })
    }
  } catch (error) {
    // If home_images table doesn't exist yet, we'll use the single image fallback
    console.log('home_images table not yet created, using single image fallback')
  }

  // Apply filters
  let filteredHomes = homesData
  if (filters.region && filters.region !== 'All regions') {
    filteredHomes = filteredHomes.filter(h => h.region === filters.region)
  }
  if (filters.type && filters.type !== 'All categories') {
    filteredHomes = filteredHomes.filter(h => h.type === filters.type)
  }
  if (filters.search) {
    filteredHomes = filteredHomes.filter(h =>
      h.name.toLowerCase().includes(filters.search.toLowerCase()) ||
      h.location.toLowerCase().includes(filters.search.toLowerCase()) ||
      h.type.toLowerCase().includes(filters.search.toLowerCase())
    )
  }

  // Ensure data is an array before mapping
  if (!filteredHomes || !Array.isArray(filteredHomes)) {
    return []
  }

  return filteredHomes.map((home) => {
    const imgs = imagesByHome[home.id] || [{ url: home.image, is_primary: true, order_index: 0 }]
    // If the home was added by file upload, homes.image may be empty.
    // Use the primary (or first) image from home_images as the card thumbnail.
    const primaryImage = imgs.find(i => i.is_primary) || imgs[0]
    const cardImage = home.image || primaryImage?.url || ''
    return {
      ...home,
      parking: Boolean(home.parking),
      available: Boolean(home.available),
      agent_id: home.owner_id,
      agent_name: home.profiles?.name || '',
      agent_phone: home.profiles?.phone || '',
      agent_bio: home.profiles?.bio || '',
      agent_company: home.profiles?.company || '',
      image: cardImage,
      images: imgs,
      faqs: faqsByHome[home.id] || [],
    }
  })
}

export const addHomeImages = async (homeId, images, token) => {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)
    handleSupabaseError(userError)

    // Verify user owns the home
    const { data: home, error: homeError } = await supabase
      .from('homes')
      .select('owner_id')
      .eq('id', homeId)
      .single()

    handleSupabaseError(homeError)

    if (home.owner_id !== user.id) {
      throw new Error('You can only add images to your own homes.')
    }

    // Get current primary image
    const { data: currentImages } = await supabase
      .from('home_images')
      .select('is_primary')
      .eq('home_id', homeId)
      .eq('is_primary', true)

    const hasPrimary = currentImages && currentImages.length > 0

    // Add new images
    for (let i = 0; i < images.length; i++) {
      const image = images[i]
      const imageUrl = image.file ? (await uploadHouseImage(image.file, token)).url : image.url

      await supabase
        .from('home_images')
        .insert({
          home_id,
          image_url: imageUrl,
          is_primary: !hasPrimary && i === 0, // First image is primary if none exists
          order_index: i,
        })
    }

    return { success: true }
  } catch (error) {
    // If home_images table doesn't exist, skip and return success
    if (error.message && error.message.includes('does not exist')) {
      console.log('home_images table not yet created, skipping multiple images')
      return { success: true }
    }
    throw error
  }
}

export const deleteHomeImage = async (imageId, token) => {
  const { data: { user }, error: userError } = await supabase.auth.getUser(token)
  handleSupabaseError(userError)

  // Get the image to check home ownership
  const { data: image, error: imageError } = await supabase
    .from('home_images')
    .select('home_id')
    .eq('id', imageId)
    .single()

  handleSupabaseError(imageError)

  // Verify user owns the home
  const { data: home, error: homeError } = await supabase
    .from('homes')
    .select('owner_id')
    .eq('id', image.home_id)
    .single()

  handleSupabaseError(homeError)

  if (home.owner_id !== user.id) {
    throw new Error('You can only delete images from your own homes.')
  }

  // Delete the image
  const { error } = await supabase
    .from('home_images')
    .delete()
    .eq('id', imageId)

  handleSupabaseError(error)

  return { success: true }
}

export const setPrimaryImage = async (imageId, token) => {
  const { data: { user }, error: userError } = await supabase.auth.getUser(token)
  handleSupabaseError(userError)

  // Get the image to check home ownership
  const { data: image, error: imageError } = await supabase
    .from('home_images')
    .select('home_id')
    .eq('id', imageId)
    .single()

  handleSupabaseError(imageError)

  // Verify user owns the home
  const { data: home, error: homeError } = await supabase
    .from('homes')
    .select('owner_id')
    .eq('id', image.home_id)
    .single()

  handleSupabaseError(homeError)

  if (home.owner_id !== user.id) {
    throw new Error('You can only set primary image for your own homes.')
  }

  // Set all images for this home to non-primary
  await supabase
    .from('home_images')
    .update({ is_primary: false })
    .eq('home_id', image.home_id)

  // Set the selected image as primary
  const { error } = await supabase
    .from('home_images')
    .update({ is_primary: true })
    .eq('id', imageId)

  handleSupabaseError(error)

  return { success: true }
}

export const fetchManagedHomes = async (token) => {
  const { data: { user }, error: userError } = await supabase.auth.getUser(token)
  handleSupabaseError(userError)

  const { data: homesData, error: homesError } = await supabase
    .from('homes')
    .select('*')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false })

  handleSupabaseError(homesError)

  // Get all home IDs
  const homeIds = homesData ? homesData.map(h => h.id) : []

  // Try to fetch images for all homes (gracefully fail if table doesn't exist yet)
  let imagesByHome = {}
  try {
    const { data: imagesData, error: imagesError } = await supabase
      .from('home_images')
      .select('*')
      .in('home_id', homeIds.length > 0 ? homeIds : [])
      .order('order_index', { ascending: true })

    // Only handle error if it's not a "relation does not exist" error
    if (imagesError && !imagesError.message.includes('does not exist')) {
      handleSupabaseError(imagesError)
    }

    // Group images by home_id, normalising image_url → url so the gallery
    // renderer always reads img.url regardless of how images were stored.
    if (imagesData) {
      imagesData.forEach(img => {
        if (!imagesByHome[img.home_id]) {
          imagesByHome[img.home_id] = []
        }
        imagesByHome[img.home_id].push({
          ...img,
          url: img.image_url || img.url || '',
        })
      })
    }
  } catch (error) {
    // If home_images table doesn't exist yet, we'll use the single image fallback
    console.log('home_images table not yet created, using single image fallback')
  }

  // Ensure data is an array before mapping
  if (!homesData || !Array.isArray(homesData)) {
    return []
  }

  return homesData.map((home) => {
    const imgs = imagesByHome[home.id] || [{ url: home.image, is_primary: true, order_index: 0 }]
    const primaryImage = imgs.find(i => i.is_primary) || imgs[0]
    const cardImage = home.image || primaryImage?.url || ''
    return {
      ...home,
      parking: Boolean(home.parking),
      available: Boolean(home.available),
      agent_id: home.owner_id,
      image: cardImage,
      images: imgs,
    }
  })
}

export const createHome = async (home, images = [], token) => {
  const { data: { user }, error: userError } = await supabase.auth.getUser(token)
  handleSupabaseError(userError)

  // Destructure only the known DB columns — omit frontend-only fields like customRegion
  const { name, location, region, type, price, deposit, image, tag, details } = home
  const { data, error } = await supabase
    .from('homes')
    .insert({
      name,
      location,
      region,
      type,
      price,
      deposit,
      image,
      tag,
      details,
      owner_id: user.id,
      parking: home.parking ? 1 : 0,
    })
    .select()
    .single()

  handleSupabaseError(error)

  // Handle multiple images
  if (images && images.length > 0) {
    for (let i = 0; i < images.length; i++) {
      const image = images[i]
      const imageUrl = image.file ? (await uploadHouseImage(image.file, token)).url : image.url
      
      await supabase
        .from('home_images')
        .insert({
          home_id: data.id,
          image_url: imageUrl,
          is_primary: i === 0, // First image is primary
          order_index: i,
        })
    }
  }

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
        id,
        name,
        location,
        region,
        type,
        price,
        deposit,
        image,
        available,
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

  if (!data || !Array.isArray(data)) return []

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
    home_available: Boolean(app.homes?.available),
    payment_deadline: app.payment_deadline || null,
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

  return data.map((app) => {
    const identifier = app.profiles?.identifier || ''
    // tenant_email: if identifier looks like an email use it, else empty
    const tenant_email = identifier.includes('@') ? identifier : ''
    return {
      ...app,
      tenant_id: app.tenant_id,
      tenant_name: app.profiles?.name || '',
      tenant_identifier: identifier,
      tenant_email,
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
    }
  })
}

export const reviewApplication = async (id, review, token) => {
  const { data: { user }, error: userError } = await supabase.auth.getUser(token)
  handleSupabaseError(userError)

  const { status, contractText, paybill, contractPdfUrl, paybillPdfUrl } = review

  if (!['approved', 'declined'].includes(status)) {
    throw new Error('Application status must be approved or declined.')
  }

  if (status === 'approved') {
    // Get the application to find the tenant
    const { data: app } = await supabase
      .from('applications')
      .select('tenant_id, home_id')
      .eq('id', id)
      .single()

    if (app) {
      // Block if tenant already has an active approved application on another home
      const { data: existing } = await supabase
        .from('applications')
        .select('id, home_id')
        .eq('tenant_id', app.tenant_id)
        .eq('status', 'approved')
        .neq('id', id)
        .maybeSingle()

      if (existing) {
        throw new Error('This tenant already has an approved application on another home. A tenant can only be approved for one home at a time.')
      }
    }
  }

  // PDFs are optional — contract is now sent via email
  const updateData = {
    status,
    reviewed_at: new Date().toISOString(),
  }

  // On approval: set 72-hour payment deadline
  if (status === 'approved') {
    const deadline = new Date()
    deadline.setHours(deadline.getHours() + 72)
    updateData.payment_deadline = deadline.toISOString()
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

  // When approved, automatically mark the home as taken
  // and auto-decline all other submitted applications for the same home
  let declinedApplicants = []
  if (status === 'approved') {
    await supabase
      .from('homes')
      .update({ available: false })
      .eq('id', data.home_id)

    // Fetch all other submitted applications for this home (to notify them)
    const { data: others } = await supabase
      .from('applications')
      .select(`
        id,
        tenant_id,
        profiles!applications_tenant_id_fkey (name, identifier)
      `)
      .eq('home_id', data.home_id)
      .eq('status', 'submitted')
      .neq('id', id)

    if (others && others.length > 0) {
      // Auto-decline all of them
      await supabase
        .from('applications')
        .update({ status: 'declined', reviewed_at: new Date().toISOString() })
        .eq('home_id', data.home_id)
        .eq('status', 'submitted')
        .neq('id', id)

      // Return their details so the caller can send notification emails
      declinedApplicants = others.map(o => ({
        id: o.id,
        tenant_id: o.tenant_id,
        tenant_name: o.profiles?.name || 'Tenant',
        tenant_email: (o.profiles?.identifier || '').includes('@') ? o.profiles.identifier : '',
      }))
    }
  }

  return { status: data.status, home_id: data.home_id, tenant_id: data.tenant_id, declinedApplicants }
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

  // Pass the token explicitly so RLS sees the correct uid even if the
  // client-side session hasn't been restored yet (e.g. after a page refresh).
  const auth = { Authorization: `Bearer ${token}` }

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
    supabase.from('profiles').select('*', { count: 'exact', head: true }).setHeader('Authorization', `Bearer ${token}`),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'Tenant').setHeader('Authorization', `Bearer ${token}`),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'Agent').setHeader('Authorization', `Bearer ${token}`),
    supabase.from('homes').select('*', { count: 'exact', head: true }).setHeader('Authorization', `Bearer ${token}`),
    supabase.from('homes').select('*', { count: 'exact', head: true }).eq('available', true).setHeader('Authorization', `Bearer ${token}`),
    supabase.from('applications').select('*', { count: 'exact', head: true }).setHeader('Authorization', `Bearer ${token}`),
    supabase.from('applications').select('*', { count: 'exact', head: true }).eq('status', 'submitted').setHeader('Authorization', `Bearer ${token}`),
    supabase.from('applications').select('*', { count: 'exact', head: true }).in('payment_status', ['pending', 'paid']).setHeader('Authorization', `Bearer ${token}`),
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
    .setHeader('Authorization', `Bearer ${token}`)

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

  if (id === user.id) {
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

  // Protect tenants who have paid deposits — cannot be deleted until refunded
  const { data: paidApplications } = await supabase
    .from('applications')
    .select('id')
    .eq('tenant_id', id)
    .eq('payment_status', 'paid')
    .limit(1)

  if (paidApplications && paidApplications.length > 0) {
    throw new Error('Cannot delete this tenant — they have an active paid deposit. The deposit must be refunded before this account can be removed.')
  }

  const { error } = await supabase.auth.admin.deleteUser(id)
  handleSupabaseError(error)

  return { ok: true }
}

// FAQ functions
export const fetchHomeFaqs = async (homeId) => {
  const { data, error } = await supabase
    .from('home_faqs')
    .select('*')
    .eq('home_id', homeId)
    .order('order_index', { ascending: true })
  if (error && error.message.includes('does not exist')) return []
  handleSupabaseError(error)
  return data || []
}

export const createFaq = async (homeId, question, answer, token) => {
  const { data: { user }, error: userError } = await supabase.auth.getUser(token)
  handleSupabaseError(userError)
  const { data: countData } = await supabase.from('home_faqs').select('id', { count: 'exact', head: true }).eq('home_id', homeId)
  const { data, error } = await supabase
    .from('home_faqs')
    .insert({ home_id: homeId, question: question.trim(), answer: answer.trim(), order_index: countData || 0 })
    .select().single()
  handleSupabaseError(error)
  return data
}

export const updateFaq = async (faqId, question, answer, token) => {
  const { data: { user }, error: userError } = await supabase.auth.getUser(token)
  handleSupabaseError(userError)
  const { data, error } = await supabase
    .from('home_faqs')
    .update({ question: question.trim(), answer: answer.trim() })
    .eq('id', faqId)
    .select().single()
  handleSupabaseError(error)
  return data
}

export const deleteFaq = async (faqId, token) => {
  const { data: { user }, error: userError } = await supabase.auth.getUser(token)
  handleSupabaseError(userError)
  const { error } = await supabase.from('home_faqs').delete().eq('id', faqId)
  handleSupabaseError(error)
  return { ok: true }
}

export const fetchSuperAdminApplications = async (token) => {
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

  // Query with explicit Authorization header so RLS sees the correct uid
  // regardless of whether the client-side session has been restored yet.
  const { data, error } = await supabase
    .from('applications')
    .select(`
      *,
      homes (name, location, region, type, deposit),
      profiles!applications_tenant_id_fkey (name, phone)
    `)
    .order('created_at', { ascending: false })
    .setHeader('Authorization', `Bearer ${token}`)

  handleSupabaseError(error)

  return data || []
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

export const sendContractEmail = async (contractPayload, token) => {
  // Call the Supabase Edge Function which emails the contract via Resend
  const { data: { session } } = await supabase.auth.getSession()
  const accessToken = session?.access_token || token

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const res = await fetch(`${supabaseUrl}/functions/v1/send-contract`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify(contractPayload),
  })

  const result = await res.json()
  if (!res.ok) throw new Error(result.error || 'Failed to send contract email.')
  return result
}

export const sendStatusNotificationEmail = async (payload, token) => {
  const { data: { session } } = await supabase.auth.getSession()
  const accessToken = session?.access_token || token
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const res = await fetch(`${supabaseUrl}/functions/v1/send-status-notification`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  })
  const result = await res.json()
  if (!res.ok) throw new Error(result.error || 'Failed to send notification email.')
  return result
}

export const deleteSuperAdminHome = async (homeId, token) => {
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

  // Block deletion if any application for this home has been paid
  const { data: paidApps } = await supabase
    .from('applications')
    .select('id')
    .eq('home_id', homeId)
    .eq('payment_status', 'paid')
    .limit(1)

  if (paidApps && paidApps.length > 0) {
    throw new Error('Cannot delete this home — a tenant has already paid a deposit. The tenant must claim a refund first before this home can be removed.')
  }

  // Delete the home — cascades to applications, bookings, home_images, home_faqs
  const { error } = await supabase
    .from('homes')
    .delete()
    .eq('id', homeId)
    .setHeader('Authorization', `Bearer ${token}`)

  handleSupabaseError(error)
  return { ok: true }
}

export const transferAgentHomes = async (fromAgentId, toAgentId, token) => {
  const { data: { user }, error: userError } = await supabase.auth.getUser(token)
  handleSupabaseError(userError)

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  handleSupabaseError(profileError)
  if (profile.role !== 'SuperAdmin') throw new Error('SuperAdmin access is required.')

  const { data, error } = await supabase
    .from('homes')
    .update({ owner_id: toAgentId })
    .eq('owner_id', fromAgentId)
    .setHeader('Authorization', `Bearer ${token}`)

  handleSupabaseError(error)
  return { ok: true }
}

export const relistHome = async (homeId, token) => {
  const { data: { user }, error: userError } = await supabase.auth.getUser(token)
  handleSupabaseError(userError)

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()

  // Agent can only relist their own home; SuperAdmin can relist any
  let updateQuery = supabase.from('homes').update({ available: true }).eq('id', homeId)
  if (profile?.role !== 'SuperAdmin') {
    updateQuery = updateQuery.eq('owner_id', user.id)
  }

  const { error } = await updateQuery
  handleSupabaseError(error)
  return { ok: true }
}

export const returnHomeToAvailable = async (applicationId, homeId, token) => {
  // Revert application to submitted and relist the home
  const { error: appError } = await supabase
    .from('applications')
    .update({ status: 'submitted', payment_deadline: null, reviewed_at: null })
    .eq('id', applicationId)
  handleSupabaseError(appError)

  const { error: homeError } = await supabase
    .from('homes')
    .update({ available: true })
    .eq('id', homeId)
  handleSupabaseError(homeError)

  return { ok: true }
}

export const fetchAllHomesAdmin = async (token) => {
  const { data: { user }, error: userError } = await supabase.auth.getUser(token)
  handleSupabaseError(userError)

  const { data, error } = await supabase
    .from('homes')
    .select(`
      *,
      profiles!homes_owner_id_fkey (name, phone, company)
    `)
    .order('created_at', { ascending: false })
    .setHeader('Authorization', `Bearer ${token}`)

  handleSupabaseError(error)
  return (data || []).map(home => ({
    ...home,
    parking: Boolean(home.parking),
    available: Boolean(home.available),
    agent_id: home.owner_id,
    agent_name: home.profiles?.name || '',
    agent_phone: home.profiles?.phone || '',
    agent_company: home.profiles?.company || '',
    image: home.image || '',
  }))
}
