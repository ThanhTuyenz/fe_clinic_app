import { create } from 'zustand'
import { BookingDraft, BookingMethodCode } from '../types/appointment'
import { Doctor } from '../types/doctor'
import { PatientInfoFormValues } from '../utils/validation'

interface BookingState {
  draft: BookingDraft
  step: number
  setBranchId: (branchId: string) => void
  setBookingMethod: (method: BookingMethodCode) => void
  setSpecialty: (specialty: any) => void
  setSpecialtyService: (specialtyService: any) => void
  setHealthPackage: (healthPackage: any) => void
  setIsAfterHours: (isAfterHours: boolean) => void
  setDoctor: (doctor: Doctor) => void
  setDateTime: (date: string, slot: string, slotId?: string) => void
  setPatientProfileId: (patientProfileId: string) => void
  setSelectedProfile: (profile: any) => void
  setVoucherCode: (code?: string) => void
  setAppliedVoucher: (voucher: any) => void
  setPatientInfo: (info: PatientInfoFormValues) => void
  addPrescriptionImage: (uri: string) => void
  removePrescriptionImage: (index: number) => void
  setStep: (step: number) => void
  resetBooking: () => void
}

const initialDraft: BookingDraft = {
  branchId: undefined,
  bookingMethod: 'SPECIALTY_EXAM',
  specialty: null,
  specialtyService: null,
  healthPackage: null,
  isAfterHours: false,
  doctor: null,
  date: '',
  slot: '',
  slotId: undefined,
  patientProfileId: undefined,
  patientType: 'self',
  patientName: '',
  patientPhone: '',
  patientDob: '',
  patientGender: 'male',
  patientCccd: '',
  symptoms: '',
  prescriptionImages: [],
}

export const useBookingStore = create<BookingState>((set) => ({
  draft: initialDraft,
  step: 1,

  setBranchId: (branchId) =>
    set((state) => ({
      draft: { ...state.draft, branchId },
    })),

  setBookingMethod: (bookingMethod) =>
    set((state) => ({
      draft: { ...state.draft, bookingMethod },
    })),

  setSpecialty: (specialty) =>
    set((state) => ({
      draft: { ...state.draft, specialty },
    })),

  setSpecialtyService: (specialtyService) =>
    set((state) => ({
      draft: { ...state.draft, specialtyService },
    })),

  setHealthPackage: (healthPackage) =>
    set((state) => ({
      draft: { ...state.draft, healthPackage },
    })),

  setIsAfterHours: (isAfterHours) =>
    set((state) => ({
      draft: { ...state.draft, isAfterHours },
    })),

  setDoctor: (doctor: Doctor) =>
    set((state) => ({
      draft: {
        ...state.draft,
        doctor,
        branchId: (doctor as any).branchId || (doctor as any).branchAssignments?.[0]?.branch?.id || state.draft.branchId,
      },
      step: 2,
    })),

  setDateTime: (date: string, slot: string, slotId?: string) =>
    set((state) => ({
      draft: { ...state.draft, date, slot, slotId },
      step: 3,
    })),

  setPatientProfileId: (patientProfileId: string) =>
    set((state) => ({
      draft: { ...state.draft, patientProfileId },
    })),

  setSelectedProfile: (selectedProfile: any) =>
    set((state) => ({
      draft: { ...state.draft, selectedProfile },
    })),

  setVoucherCode: (voucherCode?: string) =>
    set((state) => ({
      draft: { ...state.draft, voucherCode },
    })),

  setAppliedVoucher: (appliedVoucher: any) =>
    set((state) => ({
      draft: {
        ...state.draft,
        appliedVoucher,
        voucherCode: appliedVoucher?.code || undefined,
      },
    })),

  setPatientInfo: (info: PatientInfoFormValues) =>
    set((state) => ({
      draft: {
        ...state.draft,
        ...info,
      },
      step: 4,
    })),

  addPrescriptionImage: (uri: string) =>
    set((state) => ({
      draft: {
        ...state.draft,
        prescriptionImages: [...state.draft.prescriptionImages, uri],
      },
    })),

  removePrescriptionImage: (index: number) =>
    set((state) => ({
      draft: {
        ...state.draft,
        prescriptionImages: state.draft.prescriptionImages.filter((_, i) => i !== index),
      },
    })),

  setStep: (step: number) => set({ step }),

  resetBooking: () =>
    set({
      draft: initialDraft,
      step: 1,
    }),
}))
