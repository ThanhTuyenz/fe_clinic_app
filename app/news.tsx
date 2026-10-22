import { ScrollView, Text, TouchableOpacity, View } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { ScreenShell } from '../src/components/common/ScreenShell'
import { CLINIC_ARTICLES } from '../src/data/articles'
export default function ArticlesScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>()
  const router = useRouter()
  const article = CLINIC_ARTICLES.find(item => item.id === id)
  return <ScreenShell showBackButton title={article ? 'Cẩm nang khám bệnh' : 'Cẩm nang VitaCare'}><ScrollView contentContainerStyle={{ padding: 20 }}>
    {article ? <><Text className="mb-2 text-xs font-semibold uppercase text-primary-700">{article.category}</Text><Text className="mb-4 text-2xl font-bold text-slate-900">{article.title}</Text>{article.paragraphs.map((paragraph, index) => <Text key={index} className="mb-4 text-base leading-7 text-slate-700">{paragraph}</Text>)}</> : id ? <Text className="text-slate-600">Không tìm thấy bài viết.</Text> : CLINIC_ARTICLES.map(item => <TouchableOpacity key={item.id} onPress={() => router.push({ pathname: '/news', params: { id: item.id } })} className="mb-4 rounded-xl border border-slate-200 bg-white p-4"><Text className="text-xs font-semibold uppercase text-primary-700">{item.category}</Text><Text className="mt-2 text-lg font-semibold text-slate-900">{item.title}</Text><Text className="mt-2 text-sm leading-6 text-slate-600">{item.summary}</Text></TouchableOpacity>)}
    <View className="h-6" />
  </ScrollView></ScreenShell>
}
