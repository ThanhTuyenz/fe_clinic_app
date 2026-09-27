import { create } from 'zustand'
import { BookingDraft } from '../types/appointment'
import { Doctor } from '../types/doctor'
import { PatientInfoFormValues } from '../utils/validation'

interface BookingState {
  draft: BookingDraft
  step: number
  setDoctor: (doctor: Doctor) => void
  setDateTime: (date: string, slot: string) => void
  setPatientInfo: (info: PatientInfoFormValues) => void
  addPrescriptionImage: (uri: string) => void
  removePrescriptionImage: (index: number) => void
  setStep: (step: number) => void
  resetBooking: () => void
}

const initialDraft: BookingDraft = {
  doctor: null,
  date: '',
  slot: '',
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

  setDoctor: (doctor: Doctor) =>
    set((state) => ({
      draft: { ...state.draft, doctor },
      step: 2,
    })),

  setDateTime: (date: string, slot: string) =>
    set((state) => ({
      draft: { ...state.draft, date, slot },
      step: 3,
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
