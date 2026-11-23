import React from 'react'
import { Text, View } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { clinicHomepageQuery, homeDoctorsQuery } from '../../queries/homeQueries'
export const ClinicStatsSection: React.FC = React.memo(() => {
  const query = useQuery(clinicHomepageQuery)
  const doctors = useQuery({ ...homeDoctorsQuery, select: rows => rows.length })
  if (!query.data || doctors.data === undefined) return null
  const stats = { ...query.data.stats, doctorCount: doctors.data }
  return <View className="px-5 pt-8"><View className="rounded-xl border border-primary-100 bg-primary-50/50 p-4"><Text className="mb-4 text-xs font-bold uppercase text-primary-800">Hệ thống VitaCare</Text><View className="flex-row justify-between">{[{ label: 'Bác sĩ', value: stats.doctorCount }, { label: 'Chuyên khoa', value: stats.specialtyCount }, { label: 'Cơ sở', value: stats.branchCount }].map(item => <View key={item.label} className="flex-1 items-center"><Text className="text-lg font-bold text-primary-800">{item.value}</Text><Text className="mt-1 text-xs text-slate-600">{item.label}</Text></View>)}</View></View></View>
})
