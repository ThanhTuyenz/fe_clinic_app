import React from 'react'
import { Text, TouchableOpacity, View } from 'react-native'
import { useRouter } from 'expo-router'
import { CLINIC_ARTICLES } from '../../data/articles'
export const MedicalNewsSection: React.FC = React.memo(() => {
  const router = useRouter()
  return <View className="mt-8 px-5"><View className="mb-4 flex-row items-center justify-between"><Text className="text-base font-bold text-slate-900">Cẩm nang khám bệnh</Text><TouchableOpacity onPress={() => router.push('/news')}><Text className="text-xs font-semibold text-primary-700">Xem tất cả</Text></TouchableOpacity></View>{CLINIC_ARTICLES.map(article => <TouchableOpacity key={article.id} onPress={() => router.push({ pathname: '/news', params: { id: article.id } })} className="mb-3 rounded-xl border border-slate-200 bg-white p-4"><Text className="text-[10px] font-semibold uppercase text-primary-700">{article.category}</Text><Text className="mt-1 text-sm font-bold text-slate-900">{article.title}</Text><Text className="mt-2 text-xs leading-5 text-slate-500">{article.summary}</Text></TouchableOpacity>)}</View>
})
