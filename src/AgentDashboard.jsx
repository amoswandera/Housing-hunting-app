import { useCallback, useEffect, useState } from 'react'
import { fetchAgentApplications, fetchManagedHomes, fetchProfile, reviewApplication, updateHomeAvailability, updateProfile, createHome, uploadHouseImage, uploadPdf } from './api'

const formatKes = (amount) => `KES ${Number(amount).toLocaleString('en-KE')}`

function AgentDashboard({ token, onNotify }) {
  const [homes, setHomes] = useState([])
  const [applications, setApplications] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [profile, setProfile] = useState({ name: '', phone: '', occupation: '', bio: '', company: '' })
  const [form, setForm] = useState({ name: '', location: '', region: 'Nairobi County', type: 'One bedroom', parking: true, price: '', deposit: '', image: '', tag: 'New listing', details: '' })
  const [imageFile, setImageFile] = useState(null)
  const [contractFiles, setContractFiles] = useState({})
  const [paybillFiles, setPaybillFiles] = useState({})

  const loadData = useCallback(async () => {
    const [managedHomes, receivedApplications] = await Promise.all([fetchManagedHomes(token), fetchAgentApplications(token)])
    setHomes(managedHomes)
    setApplications(receivedApplications)
  }, [token])

  useEffect(() => {
    const load = async () => {
      try {
        const [managedHomes, receivedApplications, savedProfile] = await Promise.all([fetchManagedHomes(token), fetchAgentApplications(token), fetchProfile(token)])
        setHomes(managedHomes)
        setApplications(receivedApplications)
        setProfile(savedProfile)
      } catch (error) { onNotify(error.message) }
    }
    load()
  }, [onNotify, token])

  const submitHome = async (event) => {
    event.preventDefault()
    try {
      let imageUrl = form.image
      if (imageFile) imageUrl = (await uploadHouseImage(imageFile, token)).url
      if (!imageUrl) throw new Error('Add an image URL or choose a house image file.')
      await createHome({ ...form, image: imageUrl }, token)
      setForm({ name: '', location: '', region: 'Nairobi County', type: 'One bedroom', parking: true, price: '', deposit: '', image: '', tag: 'New listing', details: '' })
      setImageFile(null)
      setShowForm(false)
      await loadData()
      onNotify('New vacant home published.')
    } catch (error) { onNotify(error.message) }
  }

  const saveProfile = async (event) => {
    event.preventDefault()
    try { setProfile(await updateProfile(profile, token)); setShowProfile(false); onNotify('Agent profile updated.') } catch (error) { onNotify(error.message) }
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
        if (!contractFiles[application.id] || !paybillFiles[application.id]) throw new Error('Choose both the contract PDF and paybill PDF before approving.')
        contractPdfUrl = (await uploadPdf(contractFiles[application.id], token)).url
        paybillPdfUrl = (await uploadPdf(paybillFiles[application.id], token)).url
      }
      await reviewApplication(application.id, { status, contractText: '', paybill: '', contractPdfUrl, paybillPdfUrl }, token)
      await loadData()
      onNotify(`Application ${status}.`)
    } catch (error) { onNotify(error.message) }
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

  return <section className="management"><div className="management-header"><div><p className="eyebrow">Your listings</p><h1>Agent workspace</h1><p>Publish vacant homes, maintain your profile and review tenant applications.</p></div><div className="management-actions"><button onClick={() => setShowForm((current) => !current)}>+ Add a new home <span>→</span></button><button onClick={() => setShowProfile((current) => !current)}>My agent profile <span>→</span></button></div></div>{showProfile && <form className="listing-form profile-form" onSubmit={saveProfile}><h2>Agent profile</h2><p className="form-help">These details are shown to tenants viewing your homes.</p><div className="form-grid"><label>Full name<input required value={profile.name} onChange={(event) => setProfile({ ...profile, name: event.target.value })} /></label><label>Phone number<input value={profile.phone} onChange={(event) => setProfile({ ...profile, phone: event.target.value })} /></label><label>Company or agency<input value={profile.company} onChange={(event) => setProfile({ ...profile, company: event.target.value })} /></label><label>Occupation<input value={profile.occupation} onChange={(event) => setProfile({ ...profile, occupation: event.target.value })} /></label><label className="wide-field">About you<textarea value={profile.bio} onChange={(event) => setProfile({ ...profile, bio: event.target.value })} /></label></div><button className="primary-action form-submit" type="submit">Save profile <span>→</span></button></form>}{showForm && <form className="listing-form" onSubmit={submitHome}><h2>Publish vacant home</h2><div className="form-grid"><label>Home name<input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label><label>Estate and town<input required placeholder="Kilimani, Nairobi" value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} /></label><label>County<select value={form.region} onChange={(event) => setForm({ ...form, region: event.target.value })}><option>Nairobi County</option><option>Mombasa County</option><option>Kisumu County</option><option>Nakuru County</option></select></label><label>Category<select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })}><option>Single room</option><option>Bedsitter</option><option>One bedroom</option><option>Two bedroom</option><option>Three bedroom</option><option>Four bedroom</option></select></label><label>Monthly rent (KES)<input required type="number" min="1" value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} /></label><label>Deposit (KES)<input required type="number" min="1" value={form.deposit} onChange={(event) => setForm({ ...form, deposit: event.target.value })} /></label><label>Photo URL<input type="url" placeholder="https://..." value={form.image} onChange={(event) => setForm({ ...form, image: event.target.value })} /></label><label>Upload house image<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={(event) => setImageFile(event.target.files?.[0] || null)} /></label><label>Short description<input value={form.details} onChange={(event) => setForm({ ...form, details: event.target.value })} /></label></div><p className="form-help">Choose a local image or provide an image URL. Maximum upload size: 8MB.</p><label className="check-label"><input type="checkbox" checked={form.parking} onChange={(event) => setForm({ ...form, parking: event.target.checked })} /> Parking available</label><button className="primary-action form-submit" type="submit">Publish listing <span>→</span></button></form>}{applications.length > 0 && <div className="table-panel application-panel"><div className="table-title"><h2>Tenant applications</h2><span>{applications.filter((item) => item.status === 'submitted').length} awaiting review</span></div>{applications.map((application) => <div className="agent-application" key={application.id}><div><strong>{application.tenant_name}</strong><span>{application.tenant_identifier} · {application.tenant_phone || 'No phone provided'}</span><small>{application.tenant_occupation || 'Occupation not provided'} · ID: {application.tenant_national_id || 'Not provided'}</small></div><div><strong>{application.name}</strong><span>{application.location}</span></div><span className={`application-status ${application.status}`}>{application.status}</span>{application.status === 'submitted' && <div className="review-actions"><button onClick={() => review(application, 'approved')}>Approve</button><button onClick={() => review(application, 'declined')}>Decline</button></div>}</div>)}</div>}<div className="stat-grid"><div><span>Your homes</span><strong>{homes.length}</strong><small>Managed in the database</small></div><div><span>Available homes</span><strong>{homes.filter((home) => home.available).length}</strong><small>Visible to tenants</small></div><div><span>Applications</span><strong>{applications.length}</strong><small>Tenant interest</small></div></div><div className="table-panel"><div className="table-title"><h2>Your current listings</h2><button onClick={() => loadData()}>Refresh ↻</button></div>{homes.map((home) => <div className="listing-row" key={home.id}><img src={home.image} alt="" /><div><strong>{home.name}</strong><span>{home.location} · {home.type}</span></div><span className={`availability ${home.available ? '' : 'pending'}`}>{home.available ? 'Available' : 'Taken'}</span><strong>{formatKes(home.price)} <small>/ mo</small></strong><button className="availability-button" onClick={() => toggleAvailability(home)}>{home.available ? 'Mark taken' : 'Make available'}</button></div>)}</div></section>
}

export default AgentDashboard
