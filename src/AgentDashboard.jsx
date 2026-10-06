import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import { fetchAgentApplications, fetchManagedHomes, fetchProfile, fetchTenantProfile, reviewApplication, updateHomeAvailability, updatePassword, updateProfile, createHome, uploadHouseImage, uploadPdf, addHomeImages, deleteHomeImage, setPrimaryImage, fetchHomeFaqs, createFaq, updateFaq, deleteFaq } from './supabaseApi'
import { downloadContractPDF, getContractPDFBlob } from './generateContract'

const formatKes = (amount) => `KES ${Number(amount).toLocaleString('en-KE')}`

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
    : 'Hello, I am inquiring about an application on Habitat.'
  return `https://wa.me/${number}?text=${encodeURIComponent(text)}`
}

function AgentDashboard({ token, onNotify, openProfileNonce, view = 'homes' }) {
  const [homes, setHomes] = useState([])
  const [applications, setApplications] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [showTenantProfile, setShowTenantProfile] = useState(false)
  const [selectedTenant, setSelectedTenant] = useState(null)
  const [tenantProfile, setTenantProfile] = useState(null)
  const [profileNudge, setProfileNudge] = useState(false)
  const [profile, setProfile] = useState({ name: '', phone: '', occupation: '', bio: '', company: '' })
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [form, setForm] = useState({ name: '', location: '', region: 'Nairobi County', type: 'One bedroom', parking: true, price: '', deposit: '', image: '', tag: 'New listing', details: '', customRegion: '' })
  const [imageFile, setImageFile] = useState(null)
  const [imageFiles, setImageFiles] = useState([])
  const [contractFiles, setContractFiles] = useState({})
  const [paybillFiles, setPaybillFiles] = useState({})
  const [homeSearch, setHomeSearch] = useState('')
  const [homeRegionFilter, setHomeRegionFilter] = useState('All regions')
  const [homeCategoryFilter, setHomeCategoryFilter] = useState('All categories')
  const [applicationSearch, setApplicationSearch] = useState('')
  const [applicationRegionFilter, setApplicationRegionFilter] = useState('All regions')
  const [applicationCategoryFilter, setApplicationCategoryFilter] = useState('All categories')
  const [selectedHome, setSelectedHome] = useState(null)
  const [internalView, setInternalView] = useState(view) // 'homes' or 'applications'
  const [showContractForm, setShowContractForm] = useState(false)
  const [selectedApplication, setSelectedApplication] = useState(null) // full-page application detail
  const [homeFaqs, setHomeFaqs] = useState({}) // { [homeId]: [{id, question, answer}] }
  const [faqForm, setFaqForm] = useState({ homeId: null, editId: null, question: '', answer: '' })
  const [showFaqForm, setShowFaqForm] = useState(false)
  const [contractForm, setContractForm] = useState({
    tenantName: '',
    tenantId: '',
    tenantPhone: '',
    tenantEmail: '',
    tenantAddress: '',
    startDate: '',
    endDate: '',
    months: 12,
    paybill: '',
    bankAccount: '',
    utilities: {
      electricity: true,
      water: true,
      gas: false,
      internet: false,
      waste: true
    },
    petsAllowed: false,
    petsDetails: '',
    parkingIncluded: true,
    parkingDetails: ''
  })

  useEffect(() => {
    setInternalView(view)
  }, [view])

  const loadData = useCallback(async () => {
    try {
      const [managedHomes, receivedApplications] = await Promise.all([fetchManagedHomes(token), fetchAgentApplications(token)])
      setHomes(managedHomes)
      setApplications(receivedApplications)
    } catch (error) {
      onNotify(error.message)
    }
  }, [token, onNotify])

  useEffect(() => {
    const load = async () => {
      try {
        const savedProfile = await fetchProfile(token)
        setProfile(savedProfile)
        // Newly created agents must complete their profile before accessing listings
        const isIncomplete = !savedProfile.phone?.trim() || !savedProfile.company?.trim() || !savedProfile.occupation?.trim()
        if (isIncomplete) {
          setShowProfile(true)
          setProfileNudge(true)
        } else {
          await loadData()
        }
      } catch (error) { onNotify(error.message) }
    }
    load()
  }, [loadData, onNotify, token])

  // Open the profile form when the sidebar profile card is clicked.
  useEffect(() => {
    if (openProfileNonce) setShowProfile(true)
  }, [openProfileNonce])

  const submitHome = async (event) => {
    event.preventDefault()
    try {
      const sessionToken = (await supabase.auth.getSession()).data.session?.access_token
      if (!sessionToken) throw new Error('Authentication required')

      let imageUrl = form.image
      if (imageFile) imageUrl = (await uploadHouseImage(imageFile, sessionToken)).url
      if (!imageUrl && imageFiles.length === 0) throw new Error('Add an image URL or choose at least one house image file.')

      // Use custom region if "Other" is selected
      const region = form.region === 'Other' ? form.customRegion : form.region
      if (!region) throw new Error('Please enter a region name.')

      // Prepare images array
      const images = []
      if (imageFile) {
        images.push({ file: imageFile, is_primary: true })
      }
      if (imageFiles.length > 0) {
        imageFiles.forEach((file, index) => {
          images.push({ file, is_primary: index === 0 && !imageFile })
        })
      }

      await createHome({ ...form, region, image: imageUrl || '' }, images, sessionToken)
      setForm({ name: '', location: '', region: 'Nairobi County', type: 'One bedroom', parking: true, price: '', deposit: '', image: '', tag: 'New listing', details: '', customRegion: '' })
      setImageFile(null)
      setImageFiles([])
      setShowForm(false)
      await loadData()
      onNotify('New vacant home published.')
    } catch (error) { onNotify(error.message) }
  }

  const saveProfile = async (event) => {
    event.preventDefault()
    try {
      // Update password if provided
      if (password) {
        if (password.length < 8) {
          onNotify('Password must be at least 8 characters long.')
          return
        }
        if (password !== confirmPassword) {
          onNotify('Passwords do not match.')
          return
        }
        await updatePassword(password, token)
        setPassword('')
        setConfirmPassword('')
      }

      const updated = await updateProfile(profile, token)
      setProfile(updated)
      setShowProfile(false)
      setProfileNudge(false)
      onNotify('Agent profile updated.')
      await loadData()
    } catch (error) { onNotify(error.message) }
  }

  const toggleAvailability = async (home) => {
    try { await updateHomeAvailability(home.id, !home.available, token); await loadData(); onNotify(home.available ? 'Home marked as taken.' : 'Home marked as available.') } catch (error) { onNotify(error.message) }
  }

  const review = async (application, status) => {
    const approved = status === 'approved'
    try {
      let contractPdfUrl = ''
      let paybillPdfUrl = ''
      if (approved) {
        // Allow approval without PDFs - agent can generate contract later
        if (contractFiles[application.id] && paybillFiles[application.id]) {
          contractPdfUrl = (await uploadPdf(contractFiles[application.id], token)).url
          paybillPdfUrl = (await uploadPdf(paybillFiles[application.id], token)).url
        }
      }
      await reviewApplication(application.id, { status, contractText: '', paybill: '', contractPdfUrl, paybillPdfUrl }, token)
      await loadData()
      onNotify(`Application ${status}.`)
    } catch (error) { onNotify(error.message) }
  }

  const viewApplicationDetail = async (application) => {
    try {
      const tenantProf = await fetchTenantProfile(application.tenant_id, token)
      setTenantProfile(tenantProf)
      setSelectedTenant(application.tenant_id)
      setSelectedApplication(application)
    } catch (error) {
      onNotify(error.message)
    }
  }

  const closeApplicationDetail = () => {
    setSelectedApplication(null)
    setTenantProfile(null)
    setSelectedTenant(null)
  }

  const sendContractByEmail = (application) => {
    const home = homes.find(h => h.id === application.home_id)
    const contractData = {
      agentName: profile.name,
      agentAddress: profile.company || 'N/A',
      agentPhone: profile.phone || 'N/A',
      agentEmail: profile.identifier || 'N/A',
      tenantName: application.tenant_name || 'N/A',
      tenantId: application.tenant_national_id || 'N/A',
      tenantPhone: application.tenant_phone || 'N/A',
      tenantEmail: application.tenant_email || 'N/A',
      tenantAddress: 'N/A',
      propertyName: home?.name || 'N/A',
      propertyAddress: home?.location || 'N/A',
      propertyType: home?.type || 'N/A',
      bedrooms: parseInt(home?.type) || 1,
      parking: home?.parking || false,
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      months: 12,
      rent: home?.price || 0,
      deposit: home?.deposit || 0,
      paybill: contractForm.paybill || 'N/A',
      bankAccount: contractForm.bankAccount || 'N/A',
      utilities: contractForm.utilities,
      petsAllowed: contractForm.petsAllowed,
      petsDetails: contractForm.petsDetails,
      parkingIncluded: contractForm.parkingIncluded,
      parkingDetails: contractForm.parkingDetails,
    }
    // Download the PDF first
    downloadContractPDF(contractData, `${(home?.name || 'contract').replace(/\s+/g, '_')}_contract.pdf`)
    // Open mailto with instructions to attach the downloaded PDF
    const email = application.tenant_email
    const subject = encodeURIComponent(`Rental Contract — ${home?.name || 'Your Application'}`)
    const body = encodeURIComponent(
      `Dear ${application.tenant_name},\n\nYour application for ${home?.name} at ${home?.location} has been approved.\n\nPlease find the attached rental contract. Kindly review, sign, and return a copy.\n\nFor any queries, contact us:\nPhone: ${profile.phone || 'N/A'}\nEmail: ${profile.identifier || 'N/A'}\n\nRegards,\n${profile.name}\n${profile.company || 'Habitat Agent'}`
    )
    if (email) {
      window.open(`mailto:${email}?subject=${subject}&body=${body}`, '_blank')
      onNotify('Contract PDF downloaded. Email draft opened — attach the PDF and send.')
    } else {
      onNotify('Contract PDF downloaded. Tenant email not available — share the PDF manually.')
    }
  }

  const loadFaqsForHome = async (homeId) => {
    try {
      const faqs = await fetchHomeFaqs(homeId)
      setHomeFaqs(prev => ({ ...prev, [homeId]: faqs }))
    } catch { /* graceful fail */ }
  }

  const saveFaq = async () => {
    if (!faqForm.question.trim() || !faqForm.answer.trim()) {
      onNotify('Please fill in both question and answer.')
      return
    }
    try {
      if (faqForm.editId) {
        await updateFaq(faqForm.editId, faqForm.question, faqForm.answer, token)
      } else {
        await createFaq(faqForm.homeId, faqForm.question, faqForm.answer, token)
      }
      await loadFaqsForHome(faqForm.homeId)
      setFaqForm({ homeId: null, editId: null, question: '', answer: '' })
      setShowFaqForm(false)
      onNotify(faqForm.editId ? 'FAQ updated.' : 'FAQ added.')
    } catch (error) { onNotify(error.message) }
  }

  const removeFaq = async (homeId, faqId) => {
    try {
      await deleteFaq(faqId, token)
      await loadFaqsForHome(homeId)
      onNotify('FAQ removed.')
    } catch (error) { onNotify(error.message) }
  }

  const generateContract = (application, home) => {
    const contractData = {
      agentName: profile.name,
      agentAddress: profile.company || 'N/A',
      agentPhone: profile.phone || 'N/A',
      agentEmail: profile.identifier || 'N/A',
      tenantName: application.tenant_name || 'N/A',
      tenantId: application.tenant_national_id || 'N/A',
      tenantPhone: application.tenant_phone || 'N/A',
      tenantEmail: application.tenant_email || 'N/A',
      tenantAddress: 'N/A',
      propertyName: home.name,
      propertyAddress: home.location,
      propertyType: home.type,
      bedrooms: parseInt(home.type) || 1,
      parking: home.parking,
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      months: 12,
      rent: home.price,
      deposit: home.deposit,
      paybill: contractForm.paybill || 'N/A',
      bankAccount: contractForm.bankAccount || 'N/A',
      utilities: contractForm.utilities,
      petsAllowed: contractForm.petsAllowed,
      petsDetails: contractForm.petsDetails,
      parkingIncluded: contractForm.parkingIncluded,
      parkingDetails: contractForm.parkingDetails
    }
    downloadContractPDF(contractData, `${home.name.replace(/\s+/g, '_')}_contract.pdf`)
    onNotify('Contract PDF downloaded successfully.')
  }

  const openContractForm = (application, home) => {
    setContractForm({
      ...contractForm,
      tenantName: application.tenant_name || '',
      tenantId: application.tenant_national_id || '',
      tenantPhone: application.tenant_phone || '',
      tenantEmail: application.tenant_email || '',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    })
    setSelectedHome(home)
    setShowContractForm(true)
  }

  const pendingApplication = applications.find((application) => application.status === 'submitted')

  useEffect(() => {
    const actions = document.querySelector('.management-header .management-actions')
    if (!actions || !pendingApplication) return undefined
    const wrapper = document.createElement('div')
    wrapper.className = 'pdf-review-upload'
    wrapper.innerHTML = '<label>Contract PDF<input type="file" accept="application/pdf,.pdf"></label><label>Paybill PDF<input type="file" accept="application/pdf,.pdf"></label>'
    const inputs = wrapper.querySelectorAll('input')
    inputs[0].addEventListener('change', (event) => setContractFiles((current) => ({ ...current, [pendingApplication.id]: event.target.files?.[0] })))
    inputs[1].addEventListener('change', (event) => setPaybillFiles((current) => ({ ...current, [pendingApplication.id]: event.target.files?.[0] })))
    actions.appendChild(wrapper)
    return () => wrapper.remove()
  }, [pendingApplication])

  return (
    <section className="management">
      <div className="management-header">
        <div>
          <p className="eyebrow">Your listings</p>
          <h1>Agent workspace</h1>
          <p>Publish vacant homes, maintain your profile and review tenant applications.</p>
        </div>
        <div className="management-actions">
          <button onClick={() => setShowForm((current) => !current)}>+ Add a new home <span>→</span></button>
          <button onClick={() => setShowProfile((current) => !current)}>My agent profile <span>→</span></button>
        </div>
      </div>

      {/* Internal navigation for switching views */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <button 
          onClick={() => { setInternalView('homes'); setShowForm(false); setShowProfile(false); setShowTenantProfile(false); setSelectedHome(null) }}
          style={{ 
            padding: '10px 20px', borderRadius: '8px', border: internalView === 'homes' ? '2px solid #3b82f6' : '1px solid #e5e7eb', background: 'white', cursor: 'pointer',
            ':hover': { background: '#f9fafb' }
          }}
        >
          🏠 Homes
        </button>
        <button 
          onClick={() => { setInternalView('applications'); setShowForm(false); setShowProfile(false); setShowTenantProfile(false); setSelectedHome(null) }}
          style={{ 
            padding: '10px 20px', borderRadius: '8px', border: internalView === 'applications' ? '2px solid #3b82f6' : '1px solid #e5e7eb', background: 'white', cursor: 'pointer',
            ':hover': { background: '#f9fafb' }
          }}
        >
          📋 Applications
        </button>
      </div>

      {showProfile && (
        <form className="listing-form profile-form" onSubmit={saveProfile}>
          <div className="form-header-bar">
            <h2>Agent profile</h2>
            {!profileNudge && <button type="button" className="in-app-back-button" onClick={() => setShowProfile(false)}>← Back to dashboard</button>}
          </div>
          {profileNudge && (
            <p className="profile-nudge" style={{ background: '#fdf6ed', color: '#9c5b1c', padding: '12px 14px', borderRadius: '6px', borderLeft: '4px solid #e08b2d', marginBottom: '14px', fontSize: '11px', lineHeight: '1.5' }}>
              <strong>Welcome to Habitat!</strong> Please complete your agent profile (including a valid Kenyan phone number, company/agency, and occupation) before publishing or managing homes.
            </p>
          )}
          <p className="form-help">These details are shown to tenants viewing your homes.</p>
          <div className="form-grid">
            <label>Full name<input required value={profile.name} onChange={(event) => setProfile({ ...profile, name: event.target.value })} /></label>
            <label>Phone number<input required placeholder="+254712345678" value={profile.phone} onChange={(event) => setProfile({ ...profile, phone: event.target.value })} /></label>
            <label>Company or agency<input required placeholder="e.g. Habitat Premier Agencies" value={profile.company} onChange={(event) => setProfile({ ...profile, company: event.target.value })} /></label>
            <label>Occupation<input required placeholder="e.g. Licensed Property Manager" value={profile.occupation} onChange={(event) => setProfile({ ...profile, occupation: event.target.value })} /></label>
            <label className="wide-field">About you<textarea value={profile.bio} onChange={(event) => setProfile({ ...profile, bio: event.target.value })} /></label>
          </div>
          <div style={{ marginTop: '20px', borderTop: '1px solid #e5e7eb', paddingTop: '20px' }}>
            <p style={{ marginBottom: '12px', fontSize: '14px', fontWeight: '500' }}>Change password (optional)</p>
            <label>New password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Leave blank to keep current password" /></label>
            <label>Confirm new password<input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Re-enter new password" /></label>
          </div>
          <button className="primary-action form-submit" type="submit">Save profile <span>→</span></button>
        </form>
      )}

      {/* Full-page application detail view */}
      {selectedApplication && tenantProfile && (
        <div className="app-detail-page">
          <div className="app-detail-header">
            <h2>Application Detail</h2>
            <button type="button" className="in-app-back-button" onClick={closeApplicationDetail}>← Back to applications</button>
          </div>

          <div className="app-detail-grid">
            {/* Tenant info card */}
            <div className="app-detail-card">
              <h3>Tenant</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px' }}>
                <div className="avatar" style={{ width: '56px', height: '56px', fontSize: '22px', flexShrink: 0 }}>{tenantProfile.initials}</div>
                <div>
                  <div style={{ fontWeight: 700, color: '#1d3d33', fontSize: '14px' }}>{tenantProfile.name}</div>
                  <div style={{ color: '#7f9585', fontSize: '11px', marginTop: '3px' }}>Joined {new Date(tenantProfile.created_at).toLocaleDateString()}</div>
                </div>
              </div>
              <div className="app-detail-field"><span>Email / Login</span><strong>{tenantProfile.identifier}</strong></div>
              <div className="app-detail-field"><span>Phone</span><strong>{tenantProfile.phone || '—'}</strong></div>
              <div className="app-detail-field"><span>National ID</span><strong>{tenantProfile.national_id || '—'}</strong></div>
              <div className="app-detail-field"><span>Occupation</span><strong>{tenantProfile.occupation || '—'}</strong></div>
              {tenantProfile.bio && <div className="app-detail-field"><span>About</span><strong style={{ fontWeight: 400, lineHeight: 1.5, display: 'block' }}>{tenantProfile.bio}</strong></div>}
            </div>

            {/* Application / home info card */}
            <div className="app-detail-card">
              <h3>Application</h3>
              <div className="app-detail-field"><span>Status</span><strong><span className={`app-status-badge ${selectedApplication.status}`}>{selectedApplication.status}</span></strong></div>
              <div className="app-detail-field"><span>Home</span><strong>{selectedApplication.name}</strong></div>
              <div className="app-detail-field"><span>Location</span><strong>{selectedApplication.location}</strong></div>
              <div className="app-detail-field"><span>Region</span><strong>{selectedApplication.region}</strong></div>
              <div className="app-detail-field"><span>Category</span><strong>{selectedApplication.type}</strong></div>
              <div className="app-detail-field"><span>Deposit</span><strong>{formatKes(selectedApplication.deposit)}</strong></div>
              <div className="app-detail-field"><span>Applied on</span><strong>{new Date(selectedApplication.created_at).toLocaleDateString()}</strong></div>
              {selectedApplication.tenant_message && <div className="app-detail-field"><span>Tenant message</span><strong style={{ fontWeight: 400, lineHeight: 1.5, display: 'block' }}>{selectedApplication.tenant_message}</strong></div>}
            </div>
          </div>

          {/* Action buttons */}
          <div className="app-detail-actions">
            {tenantProfile.phone && (
              <>
                <a href={`tel:${cleanPhoneNumber(tenantProfile.phone)}`} className="app-action-call">📞 Call</a>
                <a href={getWhatsAppUrl(tenantProfile.phone, selectedApplication.name)} target="_blank" rel="noopener noreferrer" className="app-action-whatsapp">💬 WhatsApp</a>
              </>
            )}
            {selectedApplication.status === 'submitted' && (
              <>
                <button className="app-action-approve" onClick={async () => { await review(selectedApplication, 'approved'); closeApplicationDetail() }}>✓ Approve</button>
                <button className="app-action-decline" onClick={async () => { await review(selectedApplication, 'declined'); closeApplicationDetail() }}>✕ Decline</button>
              </>
            )}
            <button className="app-action-contract" onClick={() => sendContractByEmail(selectedApplication)}>📄 Send Contract</button>
          </div>
        </div>
      )}

      {showTenantProfile && tenantProfile && (
        <div className="listing-form profile-form" style={{ padding: '24px' }}>
          <div className="form-header-bar">
            <h2>Tenant Profile</h2>
            <button type="button" className="in-app-back-button" onClick={() => { setShowTenantProfile(false); setTenantProfile(null); setSelectedTenant(null) }}>← Back to dashboard</button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '24px' }}>
            <div className="avatar" style={{ width: '80px', height: '80px', fontSize: '32px' }}>{tenantProfile.initials}</div>
            <div>
              <h3 style={{ margin: '0 0 4px 0' }}>{tenantProfile.name}</h3>
              <p style={{ margin: '0', color: '#666' }}>{tenantProfile.role} · Joined {new Date(tenantProfile.created_at).toLocaleDateString()}</p>
            </div>
          </div>
          <div className="form-grid">
            <label>Email/Phone<input disabled value={tenantProfile.identifier} /></label>
            <label>Phone number<input disabled value={tenantProfile.phone || 'Not provided'} /></label>
            <label>National ID<input disabled value={tenantProfile.national_id || 'Not provided'} /></label>
            <label>Occupation<input disabled value={tenantProfile.occupation || 'Not provided'} /></label>
            <label className="wide-field">About<textarea disabled value={tenantProfile.bio || 'No bio provided'} style={{ minHeight: '100px' }} /></label>
          </div>
          {tenantProfile.phone && (
            <div className="agent-contact-actions" style={{ marginTop: '20px', display: 'flex', gap: '12px' }}>
              <a href={`tel:${cleanPhoneNumber(tenantProfile.phone)}`} className="contact-btn call-btn" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 20px', background: '#25D366', color: 'white', textDecoration: 'none', borderRadius: '6px' }}>
                <span>📞</span> Call Tenant
              </a>
              <a href={getWhatsAppUrl(tenantProfile.phone)} target="_blank" rel="noopener noreferrer" className="contact-btn whatsapp-btn" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 20px', background: '#25D366', color: 'white', textDecoration: 'none', borderRadius: '6px' }}>
                <span>💬</span> WhatsApp
              </a>
            </div>
          )}
        </div>
      )}

      {showForm && (
        <form className="listing-form" onSubmit={submitHome}>
          <div className="form-header-bar">
            <h2>Add a new home</h2>
            <button type="button" className="in-app-back-button" onClick={() => setShowForm(false)}>← Back to dashboard</button>
          </div>
          <p className="form-help">Add details for a new vacant home to your listings.</p>
          <div className="form-grid">
            <label>Home name<input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="e.g. The Willow House" /></label>
            <label>Location<input required value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} placeholder="e.g. Kitisuru, Nairobi" /></label>
            <label>Region<select required value={form.region} onChange={(event) => setForm({ ...form, region: event.target.value })}>
              <option value="Nairobi County">Nairobi County</option>
              <option value="Mombasa County">Mombasa County</option>
              <option value="Kisumu County">Kisumu County</option>
              <option value="Nakuru County">Nakuru County</option>
              <option value="Kiambu County">Kiambu County</option>
              <option value="Machakos County">Machakos County</option>
              <option value="Kajiado County">Kajiado County</option>
              <option value="Other">Other (specify below)</option>
            </select></label>
            {form.region === 'Other' && <label>Custom region<input required value={form.customRegion || ''} onChange={(event) => setForm({ ...form, customRegion: event.target.value })} placeholder="Enter region name" /></label>}
            <label>Home type<select required value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })}>
              <option value="Single room">Single room</option>
              <option value="Bedsitter">Bedsitter</option>
              <option value="One bedroom">One bedroom</option>
              <option value="Two bedroom">Two bedroom</option>
              <option value="Three bedroom">Three bedroom</option>
              <option value="Four bedroom">Four bedroom</option>
            </select></label>
            <label>Monthly rent (KES)<input required type="number" value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} placeholder="85000" /></label>
            <label>Deposit (KES)<input required type="number" value={form.deposit} onChange={(event) => setForm({ ...form, deposit: event.target.value })} placeholder="170000" /></label>
            <label>Image URL<input value={form.image} onChange={(event) => setForm({ ...form, image: event.target.value })} placeholder="https://example.com/image.jpg" /></label>
            <label>Or upload primary image<input type="file" accept="image/*" onChange={(event) => setImageFile(event.target.files?.[0])} /></label>
            <label className="wide-field">Additional images (optional)<input type="file" accept="image/*" multiple onChange={(event) => setImageFiles(Array.from(event.target.files || []))} /></label>
            {imageFiles.length > 0 && (
              <div className="image-preview" style={{ gridColumn: '1 / -1', display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '10px' }}>
                {imageFiles.map((file, index) => (
                  <div key={index} style={{ position: 'relative', width: '80px', height: '80px' }}>
                    <img src={URL.createObjectURL(file)} alt={`Preview ${index + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '4px' }} />
                    <button
                      type="button"
                      onClick={() => setImageFiles(imageFiles.filter((_, i) => i !== index))}
                      style={{ position: 'absolute', top: '-5px', right: '-5px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '50%', width: '20px', height: '20px', cursor: 'pointer', fontSize: '12px' }}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
            <label>Tag<input value={form.tag} onChange={(event) => setForm({ ...form, tag: event.target.value })} placeholder="e.g. Just listed" /></label>
            <label className="wide-field">Details<textarea value={form.details} onChange={(event) => setForm({ ...form, details: event.target.value })} placeholder="Describe the home..." /></label>
            <label><input type="checkbox" checked={form.parking} onChange={(event) => setForm({ ...form, parking: event.target.checked })} /> Parking available</label>
          </div>
          <button className="primary-action form-submit" type="submit">Publish home <span>→</span></button>
        </form>
      )}

      {internalView === 'homes' && !showForm && !showProfile && (
        <div className="table-panel">
          <div className="table-title">
            <h2>Your current listings</h2>
            <span>{homes.length} home{homes.length === 1 ? '' : 's'}</span>
            <button onClick={loadData}>Refresh ↻</button>
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
          {homes.length === 0 ? (
            <div className="empty-state"><strong>No homes listed yet</strong><span>Add your first home to get started.</span></div>
          ) : (
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
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {homes.filter(home => {
                    const search = homeSearch.toLowerCase()
                    const matchesSearch = !search ||
                      home.name.toLowerCase().includes(search) ||
                      home.location.toLowerCase().includes(search) ||
                      home.type.toLowerCase().includes(search) ||
                      home.region.toLowerCase().includes(search)
                    const matchesRegion = homeRegionFilter === 'All regions' || home.region === homeRegionFilter
                    const matchesCategory = homeCategoryFilter === 'All categories' || home.type === homeCategoryFilter
                    return matchesSearch && matchesRegion && matchesCategory
                  }).map((home) => (
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
                      <td><span className="role-static" style={{ padding: '4px 12px', borderRadius: '12px', fontSize: '12px', background: home.available ? '#10b981' : '#ef4444', color: 'white' }}>{home.available ? 'Available' : 'Taken'}</span></td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button 
                            onClick={() => { setSelectedHome(home); loadFaqsForHome(home.id) }}
                            style={{ padding: '6px 12px', fontSize: '12px', background: '#173d36', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                          >
                            View / FAQ
                          </button>
                          <button 
                            onClick={() => toggleAvailability(home)}
                            style={{ padding: '6px 12px', fontSize: '12px', background: home.available ? '#ef4444' : '#10b981', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                          >
                            {home.available ? 'Mark taken' : 'Mark available'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {homes.filter(home => {
                const search = homeSearch.toLowerCase()
                const matchesSearch = !search ||
                  home.name.toLowerCase().includes(search) ||
                  home.location.toLowerCase().includes(search) ||
                  home.type.toLowerCase().includes(search) ||
                  home.region.toLowerCase().includes(search)
                const matchesRegion = homeRegionFilter === 'All regions' || home.region === homeRegionFilter
                const matchesCategory = homeCategoryFilter === 'All categories' || home.type === homeCategoryFilter
                return matchesSearch && matchesRegion && matchesCategory
              }).length === 0 && (
                <div className="empty-state"><strong>No homes found</strong><span>Try a different search, region, or category.</span></div>
              )}
            </div>
          )}
        </div>
      )}

      {internalView === 'applications' && !showForm && !showProfile && (
        <div className="table-panel">
          <div className="table-title">
            <h2>Applications</h2>
            <span>{applications.length} application{applications.length === 1 ? '' : 's'}</span>
            <button onClick={loadData}>Refresh ↻</button>
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
          {applications.length === 0 ? (
            <div className="empty-state"><strong>No applications yet</strong><span>Applications from tenants will appear here.</span></div>
          ) : (
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
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {applications.filter(app => {
                    const search = applicationSearch.toLowerCase()
                    const matchesSearch = !search ||
                      (app.tenant_name || '').toLowerCase().includes(search) ||
                      (app.name || '').toLowerCase().includes(search) ||
                      (app.location || '').toLowerCase().includes(search)
                    const matchesRegion = applicationRegionFilter === 'All regions' || (app.region || '') === applicationRegionFilter
                    const matchesCategory = applicationCategoryFilter === 'All categories' || (app.type || '') === applicationCategoryFilter
                    return matchesSearch && matchesRegion && matchesCategory
                  }).map((application) => (
                    <tr key={application.id}>
                      <td>
                        <div className="users-table-name">
                          <div className="avatar">{application.tenant_name?.slice(0, 2).toUpperCase() || 'T'}</div>
                          <strong>{application.tenant_name || 'Tenant'}</strong>
                        </div>
                      </td>
                      <td>{application.name || '—'}</td>
                      <td>{application.location || '—'}</td>
                      <td>{application.region || '—'}</td>
                      <td>{application.type || '—'}</td>
                      <td>{formatKes(application.deposit)}</td>
                      <td><span className="role-static" style={{ padding: '4px 12px', borderRadius: '12px', fontSize: '12px', background: application.status === 'approved' ? '#10b981' : application.status === 'declined' ? '#ef4444' : '#f59e0b', color: 'white' }}>{application.status}</span></td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          <button onClick={() => viewApplicationDetail(application)} style={{ padding: '6px 14px', fontSize: '12px', background: '#173d36', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>View →</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {applications.filter(app => {
                const search = applicationSearch.toLowerCase()
                const matchesSearch = !search ||
                  (app.tenant_name || '').toLowerCase().includes(search) ||
                  (app.name || '').toLowerCase().includes(search) ||
                  (app.location || '').toLowerCase().includes(search)
                const matchesRegion = applicationRegionFilter === 'All regions' || (app.region || '') === applicationRegionFilter
                const matchesCategory = applicationCategoryFilter === 'All categories' || (app.type || '') === applicationCategoryFilter
                return matchesSearch && matchesRegion && matchesCategory
              }).length === 0 && (
                <div className="empty-state"><strong>No applications found</strong><span>Try a different search, region, or category.</span></div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Home Details Modal */}
      {selectedHome && (
        <div style={{ 
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000
        }} onClick={() => { setSelectedHome(null); setShowFaqForm(false) }}>
          <div style={{ 
            background: 'white', borderRadius: '12px', maxWidth: '600px', width: '90%',
            maxHeight: '80vh', overflowY: 'auto'
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{ height: '250px', backgroundImage: `url(${selectedHome.image})`, backgroundSize: 'cover', backgroundPosition: 'center', borderRadius: '12px 12px 0 0' }}></div>
            <div style={{ padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '16px' }}>
                <div>
                  <h2 style={{ margin: '0 0 8px 0' }}>{selectedHome.name}</h2>
                  <p style={{ margin: '0', color: '#666' }}>{selectedHome.location}</p>
                </div>
                <button onClick={() => setSelectedHome(null)} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer' }}>×</button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '16px' }}>
                <div><strong>Type:</strong> {selectedHome.type}</div>
                <div><strong>Region:</strong> {selectedHome.region}</div>
                <div><strong>Monthly rent:</strong> {formatKes(selectedHome.price)}</div>
                <div><strong>Deposit:</strong> {formatKes(selectedHome.deposit)}</div>
                <div><strong>Parking:</strong> {selectedHome.parking ? 'Available' : 'Not available'}</div>
                <div><strong>Status:</strong> {selectedHome.available ? 'Available' : 'Taken'}</div>
              </div>
              <p style={{ margin: '0 0 16px 0', color: '#666' }}>{selectedHome.details}</p>
              {/* FAQ management */}
              <div className="faq-crud-wrap">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <strong style={{ fontSize: '12px', color: '#3c5e4f' }}>FAQs for this home</strong>
                  <button
                    onClick={() => { loadFaqsForHome(selectedHome.id); setFaqForm({ homeId: selectedHome.id, editId: null, question: '', answer: '' }); setShowFaqForm(true) }}
                    style={{ fontSize: '11px', background: '#173d36', color: '#fff', border: 'none', borderRadius: '5px', padding: '6px 12px', cursor: 'pointer' }}
                  >+ Add FAQ</button>
                </div>
                {(homeFaqs[selectedHome.id] || []).map(faq => (
                  <div key={faq.id} className="faq-crud-item">
                    <div className="faq-crud-texts">
                      <div className="faq-crud-q">{faq.question}</div>
                      <div className="faq-crud-a">{faq.answer}</div>
                    </div>
                    <div className="faq-crud-btns">
                      <button className="faq-edit-btn" onClick={() => { setFaqForm({ homeId: selectedHome.id, editId: faq.id, question: faq.question, answer: faq.answer }); setShowFaqForm(true) }}>Edit</button>
                      <button className="faq-delete-btn" onClick={() => removeFaq(selectedHome.id, faq.id)}>Delete</button>
                    </div>
                  </div>
                ))}
                {(homeFaqs[selectedHome.id] || []).length === 0 && <p style={{ fontSize: '11px', color: '#9ca3af', margin: '4px 0 0' }}>No FAQs yet. Add common tenant questions.</p>}
                {showFaqForm && faqForm.homeId === selectedHome.id && (
                  <div className="faq-add-form">
                    <input placeholder="Question e.g. Is there water supply?" value={faqForm.question} onChange={e => setFaqForm({ ...faqForm, question: e.target.value })} />
                    <textarea placeholder="Answer e.g. Yes, water is available 24/7 via borehole." value={faqForm.answer} onChange={e => setFaqForm({ ...faqForm, answer: e.target.value })} />
                    <div className="faq-add-form-actions">
                      <button className="faq-save-btn" onClick={saveFaq}>{faqForm.editId ? 'Update FAQ' : 'Save FAQ'}</button>
                      <button className="faq-cancel-btn" onClick={() => { setShowFaqForm(false); setFaqForm({ homeId: null, editId: null, question: '', answer: '' }) }}>Cancel</button>
                    </div>
                  </div>
                )}
              </div>
              <button 
                onClick={() => { toggleAvailability(selectedHome); setSelectedHome(null) }}
                style={{ 
                  width: '100%', padding: '12px', borderRadius: '8px',
                  background: selectedHome.available ? '#ef4444' : '#10b981', color: 'white', border: 'none', cursor: 'pointer', fontSize: '16px'
                }}
              >
                {selectedHome.available ? 'Mark as taken' : 'Mark as available'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Contract Form Modal */}
      {showContractForm && selectedHome && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000
        }} onClick={() => setShowContractForm(false)}>
          <div style={{
            background: 'white', borderRadius: '12px', maxWidth: '600px', width: '90%',
            maxHeight: '80vh', overflowY: 'auto', padding: '24px'
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ margin: 0 }}>Generate Contract</h2>
              <button onClick={() => setShowContractForm(false)} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer' }}>×</button>
            </div>
            <p style={{ color: '#666', marginBottom: '16px' }}>Customize contract details for {selectedHome.name}</p>
            <div style={{ display: 'grid', gap: '16px' }}>
              <label style={{ display: 'block' }}>
                <strong>Tenant Name</strong>
                <input
                  type="text"
                  value={contractForm.tenantName}
                  onChange={(e) => setContractForm({ ...contractForm, tenantName: e.target.value })}
                  style={{ width: '100%', padding: '8px', marginTop: '4px', borderRadius: '4px', border: '1px solid #e5e7eb' }}
                />
              </label>
              <label style={{ display: 'block' }}>
                <strong>Tenant ID Number</strong>
                <input
                  type="text"
                  value={contractForm.tenantId}
                  onChange={(e) => setContractForm({ ...contractForm, tenantId: e.target.value })}
                  style={{ width: '100%', padding: '8px', marginTop: '4px', borderRadius: '4px', border: '1px solid #e5e7eb' }}
                />
              </label>
              <label style={{ display: 'block' }}>
                <strong>Tenant Phone</strong>
                <input
                  type="text"
                  value={contractForm.tenantPhone}
                  onChange={(e) => setContractForm({ ...contractForm, tenantPhone: e.target.value })}
                  style={{ width: '100%', padding: '8px', marginTop: '4px', borderRadius: '4px', border: '1px solid #e5e7eb' }}
                />
              </label>
              <label style={{ display: 'block' }}>
                <strong>Tenant Email</strong>
                <input
                  type="email"
                  value={contractForm.tenantEmail}
                  onChange={(e) => setContractForm({ ...contractForm, tenantEmail: e.target.value })}
                  style={{ width: '100%', padding: '8px', marginTop: '4px', borderRadius: '4px', border: '1px solid #e5e7eb' }}
                />
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <label style={{ display: 'block' }}>
                  <strong>Start Date</strong>
                  <input
                    type="date"
                    value={contractForm.startDate}
                    onChange={(e) => setContractForm({ ...contractForm, startDate: e.target.value })}
                    style={{ width: '100%', padding: '8px', marginTop: '4px', borderRadius: '4px', border: '1px solid #e5e7eb' }}
                  />
                </label>
                <label style={{ display: 'block' }}>
                  <strong>End Date</strong>
                  <input
                    type="date"
                    value={contractForm.endDate}
                    onChange={(e) => setContractForm({ ...contractForm, endDate: e.target.value })}
                    style={{ width: '100%', padding: '8px', marginTop: '4px', borderRadius: '4px', border: '1px solid #e5e7eb' }}
                  />
                </label>
              </div>
              <label style={{ display: 'block' }}>
                <strong>M-Pesa Paybill</strong>
                <input
                  type="text"
                  value={contractForm.paybill}
                  onChange={(e) => setContractForm({ ...contractForm, paybill: e.target.value })}
                  placeholder="e.g., 123456"
                  style={{ width: '100%', padding: '8px', marginTop: '4px', borderRadius: '4px', border: '1px solid #e5e7eb' }}
                />
              </label>
              <label style={{ display: 'block' }}>
                <strong>Bank Account</strong>
                <input
                  type="text"
                  value={contractForm.bankAccount}
                  onChange={(e) => setContractForm({ ...contractForm, bankAccount: e.target.value })}
                  placeholder="e.g., KCB Account 1234567890"
                  style={{ width: '100%', padding: '8px', marginTop: '4px', borderRadius: '4px', border: '1px solid #e5e7eb' }}
                />
              </label>
              <div>
                <strong>Utilities (Tenant pays)</strong>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginTop: '8px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="checkbox"
                      checked={contractForm.utilities.electricity}
                      onChange={(e) => setContractForm({ ...contractForm, utilities: { ...contractForm.utilities, electricity: e.target.checked } })}
                    />
                    Electricity
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="checkbox"
                      checked={contractForm.utilities.water}
                      onChange={(e) => setContractForm({ ...contractForm, utilities: { ...contractForm.utilities, water: e.target.checked } })}
                    />
                    Water
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="checkbox"
                      checked={contractForm.utilities.gas}
                      onChange={(e) => setContractForm({ ...contractForm, utilities: { ...contractForm.utilities, gas: e.target.checked } })}
                    />
                    Gas
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="checkbox"
                      checked={contractForm.utilities.internet}
                      onChange={(e) => setContractForm({ ...contractForm, utilities: { ...contractForm.utilities, internet: e.target.checked } })}
                    />
                    Internet
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="checkbox"
                      checked={contractForm.utilities.waste}
                      onChange={(e) => setContractForm({ ...contractForm, utilities: { ...contractForm.utilities, waste: e.target.checked } })}
                    />
                    Waste
                  </label>
                </div>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="checkbox"
                  checked={contractForm.petsAllowed}
                  onChange={(e) => setContractForm({ ...contractForm, petsAllowed: e.target.checked })}
                />
                <strong>Pets Allowed</strong>
              </label>
              {contractForm.petsAllowed && (
                <label style={{ display: 'block' }}>
                  <strong>Pet Details</strong>
                  <input
                    type="text"
                    value={contractForm.petsDetails}
                    onChange={(e) => setContractForm({ ...contractForm, petsDetails: e.target.value })}
                    placeholder="e.g., 1 dog, max 20kg"
                    style={{ width: '100%', padding: '8px', marginTop: '4px', borderRadius: '4px', border: '1px solid #e5e7eb' }}
                  />
                </label>
              )}
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="checkbox"
                  checked={contractForm.parkingIncluded}
                  onChange={(e) => setContractForm({ ...contractForm, parkingIncluded: e.target.checked })}
                />
                <strong>Parking Included</strong>
              </label>
              {contractForm.parkingIncluded && (
                <label style={{ display: 'block' }}>
                  <strong>Parking Details</strong>
                  <input
                    type="text"
                    value={contractForm.parkingDetails}
                    onChange={(e) => setContractForm({ ...contractForm, parkingDetails: e.target.value })}
                    placeholder="e.g., 1 reserved space, covered"
                    style={{ width: '100%', padding: '8px', marginTop: '4px', borderRadius: '4px', border: '1px solid #e5e7eb' }}
                  />
                </label>
              )}
            </div>
            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
              <button
                onClick={() => {
                  const application = applications.find(app => app.home_id === selectedHome.id)
                  if (application) {
                    generateContract(application, selectedHome)
                  }
                }}
                style={{
                  flex: 1, padding: '12px', borderRadius: '8px',
                  background: '#10b981', color: 'white', border: 'none', cursor: 'pointer', fontSize: '16px'
                }}
              >
                Generate & Download PDF
              </button>
              <button
                onClick={() => setShowContractForm(false)}
                style={{
                  padding: '12px 24px', borderRadius: '8px',
                  background: '#ef4444', color: 'white', border: 'none', cursor: 'pointer', fontSize: '16px'
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

export default AgentDashboard
