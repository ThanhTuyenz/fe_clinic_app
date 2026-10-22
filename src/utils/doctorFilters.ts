import { Doctor } from '../types/doctor'
export const DOCTOR_PRICE_OPTIONS = [{ id: 'all', title: 'Tất cả mức giá' }, { id: '0-200000', title: 'Dưới 200.000đ' }, { id: '200000-300000', title: '200.000đ đến dưới 300.000đ' }, { id: '300000-500000', title: '300.000đ đến dưới 500.000đ' }, { id: '500000-', title: 'Từ 500.000đ' }]
export const DOCTOR_EXPERIENCE_OPTIONS = [{ id: 'all', title: 'Tất cả kinh nghiệm' }, { id: 'under5', title: 'Dưới 5 năm' }, { id: '5to10', title: '5–10 năm' }, { id: 'over10', title: 'Trên 10 năm' }]
export function filterDoctors(doctors: Doctor[], price: string, experience: string, online: boolean) {
  const [min, max] = price.split('-').map(Number)
  return doctors.filter(doctor => {
    const years = doctor.experience_years ?? 0
    const fee = Number(online ? doctor.onlineConsultationFee ?? doctor.consultation_fee ?? doctor.price ?? 0 : doctor.consultation_fee ?? doctor.price ?? 0)
    return (price === 'all' || (Number.isFinite(fee) && fee >= min && (!max || fee < max)))
      && (experience === 'all' || (experience === 'under5' ? years < 5 : experience === '5to10' ? years >= 5 && years <= 10 : years > 10))
  })
}
