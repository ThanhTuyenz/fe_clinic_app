import { getApiBase, parseJsonResponse } from './apiBase.js'

export async function listSpecialties() {
  const base = getApiBase()
  const res = await fetch(`${base}/api/specialties`, { method: 'GET' })
  const data = await parseJsonResponse(res)
  if (!res.ok) {
    throw new Error(data.message || 'Không lấy được danh sách chuyên khoa.')
  }
  const raw = Array.isArray(data?.specialties) ? data.specialties : []
  return raw
    .map((s) => {
      const id = String(s.id || s._id || s.specialtyID || s.specialtyId || '').trim()
      const name = String(s.name || s.specialtyName || '').trim()
      const deptID = String(s.deptID || s.deptId || '').trim()
      return { ...s, id, name: name || id || '—', deptID }
    })
    .filter((s) => s.id)
}
