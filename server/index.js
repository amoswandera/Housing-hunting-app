import cors from 'cors'
import crypto from 'node:crypto'
import express from 'express'
import multer from 'multer'
import { mkdirSync, renameSync } from 'node:fs'
import { extname, join } from 'node:path'
import database from './database.js'

const app = express()
const port = process.env.PORT || 3001
const sessions = new Map()

app.use(cors())
app.use(express.json())
const uploadDirectory = join(process.cwd(), 'public', 'uploads')
mkdirSync(uploadDirectory, { recursive: true })
const upload = multer({
  dest: uploadDirectory,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_request, file, callback) => {
    const extension = extname(file.originalname).toLowerCase()
    const acceptedMime = /^image\/(jpeg|png|webp|gif)$/.test(file.mimetype)
    const acceptedExtension = ['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(extension)
    callback(null, acceptedMime || acceptedExtension)
  },
})
app.use('/uploads', express.static(uploadDirectory))

app.get('/', (_request, response) => response.json({
  name: 'Habitat API',
  status: 'running',
  health: '/api/health',
  homes: '/api/homes',
}))

const normalizeIdentifier = (value) => {
  const trimmed = String(value || '').trim().toLowerCase()
  return trimmed.startsWith('+') ? `+${trimmed.slice(1).replace(/\D/g, '')}` : trimmed.replace(/[\s()-]/g, '')
}

const isValidIdentifier = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) || /^(?:\+254|0)(?:1|7)\d{8}$/.test(value)
const hashPassword = (password) => crypto.scryptSync(password, 'habitat-local-salt', 64).toString('hex')
const publicUser = (user) => ({ id: user.id, name: user.name, identifier: user.identifier, role: user.role, phone: user.phone || '', nationalId: user.national_id || '', occupation: user.occupation || '', bio: user.bio || '', company: user.company || '', initials: user.name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase() })

const requireSession = (request, response, next) => {
  const token = request.headers.authorization?.replace('Bearer ', '')
  const userId = sessions.get(token)
  if (!userId) return response.status(401).json({ error: 'Authentication required.' })
  const user = database.prepare('SELECT * FROM users WHERE id = ?').get(userId)
  if (!user) return response.status(401).json({ error: 'Session is no longer valid.' })
  request.user = user
  next()
}

const requireAgent = (request, response, next) => {
  if (request.user.role !== 'Agent') return response.status(403).json({ error: 'Agent access is required.' })
  next()
}

const requireSuperAdmin = (request, response, next) => {
  if (request.user.role !== 'SuperAdmin') return response.status(403).json({ error: 'SuperAdmin access is required.' })
  next()
}

const homeFromRow = (home) => ({ ...home, parking: Boolean(home.parking), available: Boolean(home.available) })

app.get('/api/health', (_request, response) => response.json({ ok: true }))

app.get('/api/superadmin/overview', requireSession, requireSuperAdmin, (_request, response) => {
  const counts = {
    users: database.prepare('SELECT COUNT(*) AS count FROM users').get().count,
    tenants: database.prepare("SELECT COUNT(*) AS count FROM users WHERE role = 'Tenant'").get().count,
    agents: database.prepare("SELECT COUNT(*) AS count FROM users WHERE role = 'Agent'").get().count,
    homes: database.prepare('SELECT COUNT(*) AS count FROM homes').get().count,
    availableHomes: database.prepare('SELECT COUNT(*) AS count FROM homes WHERE available = 1').get().count,
    applications: database.prepare('SELECT COUNT(*) AS count FROM applications').get().count,
    pendingApplications: database.prepare("SELECT COUNT(*) AS count FROM applications WHERE status = 'submitted'").get().count,
    payments: database.prepare("SELECT COUNT(*) AS count FROM applications WHERE payment_status IN ('pending', 'paid')").get().count,
  }
  response.json(counts)
})

app.get('/api/superadmin/users', requireSession, requireSuperAdmin, (_request, response) => {
  response.json(database.prepare('SELECT id, name, identifier, role, phone, company, created_at AS createdAt FROM users ORDER BY created_at DESC').all())
})

app.post('/api/superadmin/users', requireSession, requireSuperAdmin, (request, response) => {
  const { name, identifier, password, role } = request.body
  const normalizedIdentifier = normalizeIdentifier(identifier)
  if (!name?.trim() || !isValidIdentifier(normalizedIdentifier)) return response.status(400).json({ error: 'Enter a valid name and email or phone number.' })
  if (!password || password.length < 8) return response.status(400).json({ error: 'Password must be at least 8 characters long.' })
  if (!['Tenant', 'Agent', 'SuperAdmin'].includes(role)) return response.status(400).json({ error: 'Choose Tenant, Agent or SuperAdmin.' })
  try {
    const result = database.prepare('INSERT INTO users (name, identifier, password_hash, role) VALUES (?, ?, ?, ?)').run(name.trim(), normalizedIdentifier, hashPassword(password), role)
    const user = database.prepare('SELECT id, name, identifier, role, phone, company, created_at AS createdAt FROM users WHERE id = ?').get(result.lastInsertRowid)
    response.status(201).json({ user })
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') return response.status(409).json({ error: 'An account with this email or phone number already exists.' })
    response.status(500).json({ error: 'Could not create the account.' })
  }
})

app.delete('/api/superadmin/users/:id', requireSession, requireSuperAdmin, (request, response) => {
  if (Number(request.params.id) === request.user.id) return response.status(400).json({ error: 'You cannot remove your own super-admin account.' })
  const result = database.prepare('DELETE FROM users WHERE id = ?').run(request.params.id)
  if (!result.changes) return response.status(404).json({ error: 'User not found.' })
  response.json({ ok: true })
})

app.post('/api/uploads/house-image', requireSession, requireAgent, upload.single('image'), (request, response) => {
  if (!request.file) return response.status(400).json({ error: 'Choose a JPG, PNG, WEBP, or GIF image under 8MB.' })
  const filename = `${request.file.filename}${extname(request.file.originalname).toLowerCase() || '.jpg'}`
  renameSync(request.file.path, join(uploadDirectory, filename))
  response.status(201).json({ url: `http://localhost:${port}/uploads/${filename}` })
})

app.use((error, _request, response, next) => {
  if (error instanceof multer.MulterError) {
    const message = error.code === 'LIMIT_FILE_SIZE' ? 'Image must be 8MB or smaller.' : 'Could not process the image upload.'
    return response.status(400).json({ error: message })
  }
  if (error) return response.status(400).json({ error: 'Choose a JPG, JPEG, PNG, WEBP, or GIF image.' })
  next()
})

const pdfUpload = multer({ dest: uploadDirectory, limits: { fileSize: 10 * 1024 * 1024 }, fileFilter: (_request, file, callback) => callback(null, file.mimetype === 'application/pdf' || extname(file.originalname).toLowerCase() === '.pdf') })
app.post('/api/uploads/document', requireSession, requireAgent, pdfUpload.single('document'), (request, response) => {
  if (!request.file) return response.status(400).json({ error: 'Choose a PDF document under 10MB.' })
  const filename = `${request.file.filename}.pdf`
  renameSync(request.file.path, join(uploadDirectory, filename))
  response.status(201).json({ url: `http://localhost:${port}/uploads/${filename}` })
})

app.get('/api/homes', (request, response) => {
  const { region, type, search } = request.query
  const filters = []
  const values = []
  if (region && region !== 'All regions') { filters.push('region = ?'); values.push(region) }
  if (type && type !== 'All categories') { filters.push('type = ?'); values.push(type) }
  if (search) { filters.push('(name LIKE ? OR location LIKE ? OR type LIKE ?)'); values.push(`%${search}%`, `%${search}%`, `%${search}%`) }
  filters.push('available = 1')
  const where = `WHERE ${filters.join(' AND ')}`
  const homes = database.prepare(`SELECT homes.id, homes.name, homes.location, homes.region, homes.type, homes.parking, homes.price, homes.deposit, homes.image, homes.tag, homes.details, homes.owner_id AS agent_id, agents.name AS agent_name, agents.phone AS agent_phone, agents.bio AS agent_bio, agents.company AS agent_company FROM homes LEFT JOIN users AS agents ON agents.id = homes.owner_id ${where} ORDER BY homes.created_at DESC`).all(...values)
  response.json(homes.map(homeFromRow))
})

app.get('/api/agent/homes', requireSession, requireAgent, (request, response) => {
  const homes = database.prepare('SELECT * FROM homes WHERE owner_id = ? ORDER BY created_at DESC').all(request.user.id)
  response.json(homes.map(homeFromRow))
})

app.post('/api/agent/homes', requireSession, requireAgent, (request, response) => {
  const { name, location, region, type, parking, price, deposit, image, tag, details } = request.body
  if (!name || !location || !region || !type || !price || !deposit || !image) return response.status(400).json({ error: 'Complete the home details before publishing.' })
  const result = database.prepare('INSERT INTO homes (name, location, region, type, parking, price, deposit, image, tag, details, owner_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(name, location, region, type, parking ? 1 : 0, Number(price), Number(deposit), image, tag || 'New listing', details || 'A new home available on Habitat.', request.user.id)
  response.status(201).json(homeFromRow(database.prepare('SELECT * FROM homes WHERE id = ?').get(result.lastInsertRowid)))
})

app.patch('/api/agent/homes/:id/status', requireSession, requireAgent, (request, response) => {
  const available = request.body.available ? 1 : 0
  const result = database.prepare('UPDATE homes SET available = ? WHERE id = ? AND owner_id = ?').run(available, request.params.id, request.user.id)
  if (!result.changes) return response.status(404).json({ error: 'Home not found in your listings.' })
  response.json(homeFromRow(database.prepare('SELECT * FROM homes WHERE id = ?').get(request.params.id)))
})

app.post('/api/auth/register', (request, response) => {
  const { name, identifier, password, role } = request.body
  const normalizedIdentifier = normalizeIdentifier(identifier)
  if (!name?.trim() || !isValidIdentifier(normalizedIdentifier)) return response.status(400).json({ error: 'Enter a valid name and email or phone number.' })
  if (!password || password.length < 8) return response.status(400).json({ error: 'Password must be at least 8 characters long.' })
  if (role !== 'Tenant') return response.status(403).json({ error: 'Only tenant accounts can be self-registered. Agents and admins are added by an administrator.' })
  try {
    const result = database.prepare('INSERT INTO users (name, identifier, password_hash, role) VALUES (?, ?, ?, ?)').run(name.trim(), normalizedIdentifier, hashPassword(password), role)
    const user = database.prepare('SELECT id, name, identifier, role FROM users WHERE id = ?').get(result.lastInsertRowid)
    response.status(201).json({ user: publicUser(user) })
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') return response.status(409).json({ error: 'An account with this email or phone number already exists.' })
    response.status(500).json({ error: 'Could not create the account.' })
  }
})

app.post('/api/auth/login', (request, response) => {
  const { identifier, password, role } = request.body
  if (!['Tenant', 'Agent', 'SuperAdmin'].includes(role)) return response.status(401).json({ error: 'This account type is no longer available.' })
  const normalizedIdentifier = normalizeIdentifier(identifier)
  const user = database.prepare('SELECT * FROM users WHERE identifier = ? AND role = ?').get(normalizedIdentifier, role)
  if (!user || user.password_hash !== hashPassword(password || '')) return response.status(401).json({ error: 'No matching account found.' })
  const token = crypto.randomBytes(32).toString('hex')
  sessions.set(token, user.id)
  response.json({ token, user: publicUser(user) })
})

app.get('/api/profile', requireSession, (request, response) => response.json(publicUser(request.user)))

app.patch('/api/profile', requireSession, (request, response) => {
  const { name, phone, nationalId, occupation, bio, company } = request.body
  if (!name?.trim()) return response.status(400).json({ error: 'Name is required.' })
  database.prepare('UPDATE users SET name = ?, phone = ?, national_id = ?, occupation = ?, bio = ?, company = ? WHERE id = ?').run(name.trim(), phone || '', nationalId || '', occupation || '', bio || '', company || '', request.user.id)
  response.json(publicUser(database.prepare('SELECT * FROM users WHERE id = ?').get(request.user.id)))
})

app.get('/api/agents/:id/profile', (request, response) => {
  const agent = database.prepare("SELECT id, name, phone, bio, company FROM users WHERE id = ? AND role = 'Agent'").get(request.params.id)
  if (!agent) return response.status(404).json({ error: 'Agent profile not found.' })
  response.json(agent)
})

app.post('/api/applications', requireSession, (request, response) => {
  if (request.user.role !== 'Tenant') return response.status(403).json({ error: 'Only tenants can submit applications.' })
  const { homeId, message } = request.body
  const home = database.prepare('SELECT id, owner_id, deposit, available FROM homes WHERE id = ?').get(homeId)
  if (!home || !home.available) return response.status(404).json({ error: 'This home is no longer available.' })
  const existing = database.prepare("SELECT id FROM applications WHERE tenant_id = ? AND home_id = ? AND status IN ('submitted', 'approved')").get(request.user.id, homeId)
  if (existing) return response.status(409).json({ error: 'You already have an active application for this home.' })
  const result = database.prepare('INSERT INTO applications (tenant_id, home_id, tenant_message) VALUES (?, ?, ?)').run(request.user.id, homeId, message || '')
  response.status(201).json({ id: result.lastInsertRowid, status: 'submitted' })
})

app.get('/api/applications/mine', requireSession, (request, response) => {
  const applications = database.prepare(`SELECT applications.*, homes.name, homes.location, homes.deposit, homes.image, users.name AS agent_name, users.phone AS agent_phone, users.bio AS agent_bio, users.company AS agent_company FROM applications JOIN homes ON homes.id = applications.home_id LEFT JOIN users ON users.id = homes.owner_id WHERE applications.tenant_id = ? ORDER BY applications.created_at DESC`).all(request.user.id)
  response.json(applications)
})

app.get('/api/agent/applications', requireSession, requireAgent, (request, response) => {
  const applications = database.prepare(`SELECT applications.*, homes.name, homes.location, homes.deposit, homes.image, users.name AS tenant_name, users.identifier AS tenant_identifier, users.phone AS tenant_phone, users.national_id AS tenant_national_id, users.occupation AS tenant_occupation, users.bio AS tenant_bio FROM applications JOIN homes ON homes.id = applications.home_id JOIN users ON users.id = applications.tenant_id WHERE homes.owner_id = ? ORDER BY applications.created_at DESC`).all(request.user.id)
  response.json(applications)
})

app.patch('/api/agent/applications/:id', requireSession, requireAgent, (request, response) => {
  const { status, contractText, paybill, contractPdfUrl, paybillPdfUrl } = request.body
  if (!['approved', 'declined'].includes(status)) return response.status(400).json({ error: 'Application status must be approved or declined.' })
  if (status === 'approved' && (!contractPdfUrl || !paybillPdfUrl)) return response.status(400).json({ error: 'Upload both the contract PDF and paybill PDF before approving.' })
  const result = database.prepare(`UPDATE applications SET status = ?, contract_text = ?, paybill = ?, contract_pdf_url = ?, paybill_pdf_url = ?, reviewed_at = CURRENT_TIMESTAMP WHERE id = ? AND home_id IN (SELECT id FROM homes WHERE owner_id = ?)`)
    .run(status, contractText || '', paybill || '', contractPdfUrl || '', paybillPdfUrl || '', request.params.id, request.user.id)
  if (!result.changes) return response.status(404).json({ error: 'Application not found in your listings.' })
  response.json({ status })
})

app.patch('/api/applications/:id/payment', requireSession, (request, response) => {
  const { phone, amount } = request.body
  const normalizedPhone = String(phone || '').replace(/[\s()-]/g, '')
  if (!/^(?:\+254|0)(?:1|7)\d{8}$/.test(normalizedPhone)) return response.status(400).json({ error: 'Enter a valid Kenyan phone number.' })
  if (!amount || Number(amount) <= 0) return response.status(400).json({ error: 'Enter a valid payment amount.' })
  const result = database.prepare("UPDATE applications SET payment_status = 'pending', payment_phone = ?, payment_amount = ? WHERE id = ? AND tenant_id = ? AND status = 'approved'").run(normalizedPhone, Number(amount), request.params.id, request.user.id)
  if (!result.changes) return response.status(404).json({ error: 'Only approved applications can receive a payment.' })
  response.json({ paymentStatus: 'pending', promptSent: true, message: `Payment prompt sent to ${normalizedPhone}.` })
})

app.patch('/api/applications/:id/cancel', requireSession, (request, response) => {
  const result = database.prepare("UPDATE applications SET status = CASE WHEN payment_status = 'paid' THEN 'refunded' ELSE 'cancelled' END WHERE id = ? AND tenant_id = ? AND status IN ('submitted', 'approved')").run(request.params.id, request.user.id)
  if (!result.changes) return response.status(404).json({ error: 'Active application not found.' })
  response.json({ status: 'cancelled' })
})

app.post('/api/bookings', requireSession, (request, response) => {
  const { homeId } = request.body
  const home = database.prepare('SELECT id, deposit, available FROM homes WHERE id = ?').get(homeId)
  if (!home || !home.available) return response.status(404).json({ error: 'This home is no longer available.' })
  const existing = database.prepare("SELECT id FROM bookings WHERE user_id = ? AND home_id = ? AND status = 'pending'").get(request.user.id, homeId)
  if (existing) return response.status(409).json({ error: 'You already have an active booking for this home.' })
  const result = database.prepare('INSERT INTO bookings (user_id, home_id, deposit) VALUES (?, ?, ?)').run(request.user.id, homeId, home.deposit)
  response.status(201).json({ id: result.lastInsertRowid, homeId, status: 'pending', deposit: home.deposit })
})

app.get('/api/bookings', requireSession, (request, response) => {
  const bookings = database.prepare(`SELECT bookings.id, bookings.home_id AS homeId, bookings.status, bookings.deposit, homes.name, homes.location FROM bookings JOIN homes ON homes.id = bookings.home_id WHERE bookings.user_id = ? ORDER BY bookings.created_at DESC`).all(request.user.id)
  response.json(bookings)
})

app.patch('/api/bookings/:id/cancel', requireSession, (request, response) => {
  const result = database.prepare("UPDATE bookings SET status = 'refunded' WHERE id = ? AND user_id = ? AND status = 'pending'").run(request.params.id, request.user.id)
  if (!result.changes) return response.status(404).json({ error: 'Active booking not found.' })
  response.json({ status: 'refunded' })
})

app.listen(port, () => console.log(`Habitat API running at http://localhost:${port}`))
