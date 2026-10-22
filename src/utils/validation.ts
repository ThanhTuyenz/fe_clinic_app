import { z } from 'zod'

const uuidSchema = z.uuid()

export function isUuid(value: unknown): value is string {
  return uuidSchema.safeParse(value).success
}

export const phoneRegex = /^(0[3|5|7|8|9])[0-9]{8}$/

export const loginSchema = z.object({
  identifier: z
    .string()
    .min(1, 'Vui lòng nhập số điện thoại hoặc email.'),
  password: z
    .string()
    .min(6, 'Mật khẩu phải có tối thiểu 6 ký tự.'),
})

export type LoginFormValues = z.infer<typeof loginSchema>

export const registerSchema = z
  .object({
    fullName: z.string().min(2, 'Họ và tên tối thiểu 2 ký tự.'),
    phone: z
      .string()
      .regex(phoneRegex, 'Số điện thoại không hợp lệ (gồm 10 chữ số).'),
    email: z
      .string()
      .email('Email không đúng định dạng.')
      .optional()
      .or(z.literal('')),
    password: z.string().min(6, 'Mật khẩu tối thiểu 6 ký tự.'),
    confirmPassword: z.string().min(6, 'Vui lòng xác nhận mật khẩu.'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Mật khẩu xác nhận không khớp.',
    path: ['confirmPassword'],
  })

export type RegisterFormValues = z.infer<typeof registerSchema>

export const patientInfoSchema = z.object({
  patientType: z.enum(['self', 'relative']),
  patientName: z.string().min(2, 'Họ tên bệnh nhân phải có ít nhất 2 ký tự.'),
  patientPhone: z
    .string()
    .regex(phoneRegex, 'Số điện thoại không đúng định dạng.'),
  patientDob: z.string().min(1, 'Vui lòng chọn ngày sinh.'),
  patientGender: z.enum(['male', 'female', 'other'], {
    error: 'Vui lòng chọn giới tính.',
  }),
  patientCccd: z.string().optional(),
  symptoms: z.string().min(5, 'Vui lòng mô tả triệu chứng hoặc lý do khám (tối thiểu 5 ký tự).'),
})

export type PatientInfoFormValues = z.infer<typeof patientInfoSchema>
