import { getApiBase, parseJsonResponse } from './apiBase.js'

/** Chuẩn hóa một dòng khoa từ API (tên trường có thể khác nhau). */
export function normalizeDepartmentRow(raw) {
  if (!raw || typeof raw !== 'object') return null
  const id = String(raw.id ?? raw._id ?? raw.deptID ?? raw.deptId ?? raw.departmentId ?? '').trim()
  const name = String(
    raw.name ?? raw.deptName ?? raw.departmentName ?? raw.title ?? raw.label ?? '',
  ).trim()
  const description = String(
    raw.description ?? raw.desc ?? raw.summary ?? raw.bio ?? raw.note ?? '',
  ).trim()
  if (!name && !id) return null
  return {
    ...raw,
    id: id || name,
    name: name || 'Khoa khám',
    description,
  }
}

function extractDepartmentsPayload(data) {
  if (Array.isArray(data)) return data
  if (!data || typeof data !== 'object') return []
  const buckets = [data.departments, data.data, data.rows, data.items]
  for (const b of buckets) {
    if (Array.isArray(b)) return b
  }
  return []
}

export async function listDepartments() {
  const base = getApiBase()
  const res = await fetch(`${base}/api/departments`, { method: 'GET' })
  const data = await parseJsonResponse(res)
  if (!res.ok) {
    throw new Error(data.message || 'Không lấy được danh sách khoa.')
  }
  const raw = extractDepartmentsPayload(data)
  return raw.map(normalizeDepartmentRow).filter(Boolean)
}
