/**
 * Utility to parse QR Code data from Vietnamese Chip-based Citizen Identity Card (CCCD gắn chip)
 *
 * Standard format on chip CCCD QR code:
 * nationalId|oldCmnd|fullName|dob(DDMMYYYY)|gender(Nam/Nữ)|address|issueDate(DDMMYYYY)
 *
 * Example:
 * 001201012345||NGUYỄN VĂN AN|15081995|Nam|Số 1 Đại Cồ Việt, Bách Khoa, Hai Bà Trưng, Hà Nội|10052021
 */

export interface ParsedCccd {
  nationalId: string // 12-digit CCCD
  oldId?: string // 9-digit CMND if available
  fullName: string // Họ và tên
  dateOfBirth: string // YYYY-MM-DD for backend APIs
  dobDisplay: string // DD/MM/YYYY for UI display
  gender: 'MALE' | 'FEMALE'
  genderLabel: string // Nam / Nữ
  address: string // Địa chỉ thường trú
  issueDate?: string // Ngày cấp (DD/MM/YYYY)
  rawPayload: string
}

export function parseCccdQr(qrText: string): ParsedCccd | null {
  const text = String(qrText || '').trim()
  if (!text) return null

  // Format with pipe delimiters
  if (text.includes('|')) {
    const parts = text.split('|').map((p) => p.trim())
    if (parts.length >= 5) {
      const nationalId = parts[0]
      // Validate 9 or 12 digit format
      if (/^\d{9,12}$/.test(nationalId)) {
        const oldId = parts[1] || undefined
        const fullName = parts[2] || ''
        const rawDob = parts[3] || '' // DDMMYYYY
        let dateOfBirth = ''
        let dobDisplay = ''

        if (rawDob.length === 8 && /^\d{8}$/.test(rawDob)) {
          const d = rawDob.slice(0, 2)
          const m = rawDob.slice(2, 4)
          const y = rawDob.slice(4, 8)
          dateOfBirth = `${y}-${m}-${d}`
          dobDisplay = `${d}/${m}/${y}`
        }

        const rawGender = (parts[4] || '').toLowerCase()
        const isFemale =
          rawGender === 'nữ' ||
          rawGender === 'nu' ||
          rawGender === 'female' ||
          rawGender === 'f'
        const gender: 'MALE' | 'FEMALE' = isFemale ? 'FEMALE' : 'MALE'
        const genderLabel = isFemale ? 'Nữ' : 'Nam'

        const address = parts[5] || ''

        let issueDate: string | undefined = undefined
        const rawIssue = parts[6] || ''
        if (rawIssue.length === 8 && /^\d{8}$/.test(rawIssue)) {
          const d = rawIssue.slice(0, 2)
          const m = rawIssue.slice(2, 4)
          const y = rawIssue.slice(4, 8)
          issueDate = `${d}/${m}/${y}`
        }

        return {
          nationalId,
          oldId,
          fullName: fullName.toUpperCase(),
          dateOfBirth,
          dobDisplay,
          gender,
          genderLabel,
          address,
          issueDate,
          rawPayload: text,
        }
      }
    }
  }

  // Fallback: If text is just a 12-digit number (pasted CCCD directly)
  if (/^\d{12}$/.test(text)) {
    return {
      nationalId: text,
      fullName: '',
      dateOfBirth: '',
      dobDisplay: '',
      gender: 'MALE',
      genderLabel: 'Nam',
      address: '',
      rawPayload: text,
    }
  }

  return null
}

/** Sample valid CCCD QR strings for testing */
export const SAMPLE_CCCD_QRS = [
  {
    label: 'Nguyễn Văn An (Nam - 1995)',
    payload:
      '001201012345||NGUYỄN VĂN AN|15081995|Nam|Số 1 Đại Cồ Việt, Bách Khoa, Hai Bà Trưng, Hà Nội|10052021',
  },
  {
    label: 'Trần Thị Mai (Nữ - 1998)',
    payload:
      '079198005678||TRẦN THỊ MAI|22041998|Nữ|201 Nguyễn Thị Minh Khai, Phường Bến Thành, Quận 1, TP. Hồ Chí Minh|15092022',
  },
  {
    label: 'Lê Hoàng Nam (Nam - 2002)',
    payload:
      '048202009876||LÊ HOÀNG NAM|05112002|Nam|123 Lê Duẩn, Phường Thạch Thang, Quận Hải Châu, Đà Nẵng|12032023',
  },
]
