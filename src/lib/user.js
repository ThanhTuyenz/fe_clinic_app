export function getUserName(u) {
  const first = String(u?.firstName || '').trim()
  const last = String(u?.lastName || '').trim()
  const full = `${last} ${first}`.trim()
  if (full) return full
  return String(u?.displayName || u?.fullName || u?.name || '').trim()
}

export function getUserEmail(u) {
  return String(u?.email || u?.username || '').trim()
}

export function getUserDisplayName(u) {
  const name = getUserName(u)
  if (name) return name
  const email = getUserEmail(u)
  if (!email) return ''
  return String(email.split('@')[0] || '').trim()
}

export function getUserInitials(u) {
  const base = getUserDisplayName(u) || getUserEmail(u)
  if (!base) return '?'
  const words = base.trim().split(/\s+/).filter(Boolean)
  if (!words.length) return '?'
  return words
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
}

export function buildPatientCode(userId) {
  const raw = String(userId || '').replace(/[^a-fA-F0-9]/g, '')
  const yy = String(new Date().getFullYear()).slice(-2)
  const pad = (raw + '00000000').slice(0, 8).toUpperCase()
  return `YM${yy}${pad}`
}

export function resolvePatientCode(u) {
  const stored = String(u?.patientCode || '').trim()
  if (stored) return stored
  return buildPatientCode(u?.id || u?._id)
}

export function getDoctorFullName(d) {
  const first = String(d?.firstName || '').trim()
  const last = String(d?.lastName || '').trim()
  const full = `${last} ${first}`.trim()
  return full || String(d?.displayName || '').trim() || d?.email || ''
}

export function getDoctorInitials(doctor) {
  const name = getDoctorFullName(doctor)
  if (!name) return 'BS'
  const parts = String(name).trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }
  return (parts[0]?.slice(0, 2) || 'BS').toUpperCase()
}

export function formatDateVi(isoOrDate) {
  const d = isoOrDate instanceof Date ? isoOrDate : new Date(isoOrDate)
  if (Number.isNaN(d.getTime())) return ''
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yy = d.getFullYear()
  return `${dd}/${mm}/${yy}`
}
