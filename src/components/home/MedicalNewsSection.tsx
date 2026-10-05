import React from 'react'
import { Alert, Text, TouchableOpacity, View } from 'react-native'
import { Image } from 'expo-image'

export interface NewsItem {
  id: string
  category: string
  title: string
  date: string
  views: string
  img: string
}

export const MEDICAL_NEWS: NewsItem[] = [
  {
    id: 'news-1',
    category: 'CÔNG NGHỆ Y TẾ',
    title: 'Ứng dụng AI trong chẩn đoán sớm và tư vấn sức khỏe trực tuyến tại VitaCare',
    date: 'Hôm nay',
    views: '1.2k lượt xem',
    img: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=600&auto=format&fit=crop&q=80',
  },
  {
    id: 'news-2',
    category: 'TIM MẠCH',
    title: '5 dấu hiệu cảnh báo bệnh lý tim mạch sớm mà người trẻ thường bỏ qua',
    date: 'Hôm qua',
    views: '850 lượt xem',
    img: 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=600&auto=format&fit=crop&q=80',
  },
  {
    id: 'news-3',
    category: 'DINH DƯỠNG',
    title: 'Chế độ ăn khoa học giúp tăng cường miễn dịch và bảo vệ đường tiêu hóa',
    date: '3 ngày trước',
    views: '2.1k lượt xem',
    img: 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=600&auto=format&fit=crop&q=80',
  },
]

export const MedicalNewsSection: React.FC = () => {
  return (
    <View className="mt-8 pt-2 px-5" style={{ marginTop: 32 }}>
      <View className="flex-row items-center justify-between mb-3.5">
        <View>
          <Text className="text-base font-extrabold text-slate-900 tracking-tight">
            Kiến thức y khoa mới nhất
          </Text>
        </View>
        <TouchableOpacity
          onPress={() =>
            Alert.alert('Cẩm nang sức khỏe', 'Chuyên mục tin tức y khoa cập nhật mỗi ngày.')
          }
        >
          <Text className="text-xs font-semibold text-emerald-600">Xem thêm</Text>
        </TouchableOpacity>
      </View>

      {/* Tin nổi bật to */}
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => Alert.alert('Chi tiết bài viết', MEDICAL_NEWS[0].title)}
        className="bg-white rounded-lg border border-slate-200/90 shadow-2xs overflow-hidden mb-3"
      >
        <View className="h-36 relative bg-slate-100">
          <Image
            source={{ uri: MEDICAL_NEWS[0].img }}
            style={{ width: '100%', height: '100%' }}
            contentFit="cover"
          />
          <View className="absolute top-2.5 left-2.5 bg-emerald-700 px-2 py-0.5 rounded-lg shadow-xs">
            <Text className="text-white text-[9px] font-bold uppercase tracking-wider">
              {MEDICAL_NEWS[0].category}
            </Text>
          </View>
        </View>
        <View className="p-3.5">
          <Text numberOfLines={2} className="text-sm font-bold text-slate-900 leading-snug">
            {MEDICAL_NEWS[0].title}
          </Text>
          <View className="flex-row items-center mt-2 text-slate-400">
            <Text className="text-[11px] text-slate-400">{MEDICAL_NEWS[0].date}</Text>
            <Text className="text-[11px] text-slate-300 mx-1.5">•</Text>
            <Text className="text-[11px] text-slate-400">{MEDICAL_NEWS[0].views}</Text>
          </View>
        </View>
      </TouchableOpacity>

      {/* 2 bài viết dạng danh sách phẳng */}
      <View className="gap-2.5">
        {MEDICAL_NEWS.slice(1).map((news) => (
          <TouchableOpacity
            key={news.id}
            activeOpacity={0.8}
            onPress={() => Alert.alert('Chi tiết bài viết', news.title)}
            className="flex-row items-center p-2.5 bg-white rounded-lg border border-slate-200/80 shadow-2xs"
          >
            <View className="w-[72px] h-[72px] rounded-lg overflow-hidden bg-slate-100 mr-3" style={{ width: 72, height: 72 }}>
              <Image
                source={{ uri: news.img }}
                style={{ width: 72, height: 72 }}
                contentFit="cover"
              />
            </View>
            <View className="flex-1 pr-1">
              <Text className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">
                {news.category}
              </Text>
              <Text numberOfLines={2} className="text-xs font-bold text-slate-900 mt-0.5 leading-snug">
                {news.title}
              </Text>
              <Text className="text-[10px] text-slate-400 mt-1">
                {news.date} • {news.views}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  )
}
