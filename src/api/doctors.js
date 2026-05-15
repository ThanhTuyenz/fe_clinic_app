import { getApiBase, parseJsonResponse } from './apiBase.js'

const DEFAULT_DOCTOR_AVATAR =
  'https://sf-static.upanhlaylink.com/img/image_202603269925437b540c48178c53b73c88dd8146.jpg'

export function isMongoObjectId(id) {
  return typeof id === 'string' && /^[a-fA-F0-9]{24}$/.test(id)
}

function deriveExperienceYears(doctor) {
  if (!doctor) return null
  const directCandidate =
    doctor.experienceYears ??
    doctor.yearsOfExperience ??
    doctor.years ??
    doctor.experience ??
    doctor.expYears ??
    null

  if (directCandidate !== null && directCandidate !== undefined && directCandidate !== '') {
    const extracted = Number(String(directCandidate).replace(/[^\d.]/g, ''))
    if (Number.isFinite(extracted) && extracted > 0) return extracted
  }

  const bio = String(doctor.bio || '')
  const match =
    bio.match(/(?:hơn|trên)\s*(\d+)\s*năm\s*kinh nghiệm/i) ||
    bio.match(/kinh nghiệm\s*(\d+)\s*năm/i)
  if (match) return Number(match[1])

  const key = String(doctor.id || doctor.email || doctor.displayName || '')
  if (!key) return null
  let seed = 0
  for (let i = 0; i < key.length; i += 1) seed = (seed * 31 + key.charCodeAt(i)) % 100000
  return 3 + (seed % 18)
}

function injectExperienceIntoBio(doctor) {
  const years = deriveExperienceYears(doctor)
  if (!years) return doctor

  const bioRaw = String(doctor.bio || '').trim()
  const hasExp = /(?:hơn|trên)\s*\d+\s*năm\s*kinh nghiệm|kinh nghiệm\s*\d+\s*năm/i.test(bioRaw)
  const bioNext = hasExp
    ? bioRaw
    : `${bioRaw ? `${bioRaw}\n\n` : ''}Bác sĩ có hơn ${years} năm kinh nghiệm trong lĩnh vực chuyên môn.`

  return { ...doctor, experienceYears: years, bio: bioNext }
}

function deriveSpecialty(doctor) {
  if (!doctor) return ''
  if (doctor.specialtyName) return String(doctor.specialtyName).trim()
  if (doctor.specialty) return String(doctor.specialty).trim()
  const bio = String(doctor.bio || '').trim()
  if (!bio) return ''

  const m1 = bio.match(/^Bác sĩ\s*([^\n—-]+)\s*(?:—|-|$)/i)
  if (m1) return String(m1[1]).trim()

  const m2 = bio.match(/lĩnh vực\s+([^.\n]+)\./i)
  if (m2) return String(m2[1]).trim()

  return ''
}

/** URL ảnh đại diện bác sĩ: hỗ trợ đường dẫn tương đối (ghép EXPO_PUBLIC_API_URL) và nhiều tên field từ API. */
export function resolveDoctorAvatarUrl(doctor) {
  if (!doctor || typeof doctor !== 'object') return DEFAULT_DOCTOR_AVATAR

  const candidates = [
    doctor.avatarUrl,
    doctor.avatarURL,
    doctor.avatar,
    doctor.avatar_url,
    doctor.imageUrl,
    doctor.image_url,
    doctor.photoUrl,
    doctor.photo_url,
    doctor.profileImage,
    doctor.profilePicture,
    doctor.picture,
    doctor.headshot,
  ]

  let raw = ''
  for (const c of candidates) {
    if (c != null && String(c).trim()) {
      raw = String(c).trim()
      break
    }
  }

  if (!raw) return DEFAULT_DOCTOR_AVATAR

  if (/^https?:\/\//i.test(raw)) return raw
  if (raw.startsWith('//')) return `https:${raw}`

  const base = getApiBase().replace(/\/$/, '')
  const path = raw.startsWith('/') ? raw : `/${raw}`
  return `${base}${path}`
}

function normalizeDoctor(doctor) {
  const d = injectExperienceIntoBio(doctor)
  const specialty = deriveSpecialty(d)
  const normalized = specialty ? { ...d, specialty } : d
  const avatarUrl = resolveDoctorAvatarUrl(normalized)
  return { ...normalized, avatarUrl }
}

export async function listDoctors() {
  const base = getApiBase()
  let res
  try {
    res = await fetch(`${base}/api/doctors`, { method: 'GET' })
  } catch {
    throw new Error(
      'Không kết nối được máy chủ. Hãy chạy backend (ví dụ port 5000) và kiểm tra EXPO_PUBLIC_API_URL.',
    )
  }

  const data = await parseJsonResponse(res)

  if (!res.ok) {
    throw new Error(data.message || 'Không lấy được danh sách bác sĩ.')
  }

  const raw = (data.doctors || []).map(normalizeDoctor)
  const filtered = raw.filter((d) => isMongoObjectId(d?.id))
  if (raw.length > 0 && filtered.length === 0) {
    throw new Error(
      'Danh sách bác sĩ từ máy chủ không có id hợp lệ. Kiểm tra API /api/doctors có trả id là _id MongoDB (24 ký tự hex).',
    )
  }
  return filtered
}
