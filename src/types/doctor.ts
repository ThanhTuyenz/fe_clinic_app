export interface Department {
  id?: string | number
  _id?: string
  name: string
  description?: string
  icon?: string
  doctor_count?: number
}

export interface Specialty {
  id?: string | number
  _id?: string
  name: string
  department_id?: string | number
  departmentId?: string | number
  description?: string
}

export interface Doctor {
  id: string | number
  _id?: string
  name?: string
  full_name?: string
  fullName?: string
  title?: string // ThS, BSCKII, PGS.TS
  avatar?: string
  department?: Department | string
  department_id?: string | number
  department_name?: string
  specialty?: Specialty | string
  specialty_id?: string | number
  specialty_name?: string
  experience_years?: number
  price?: number
  consultation_fee?: number
  rating?: number
  bio?: string
  work_schedule?: string
}
