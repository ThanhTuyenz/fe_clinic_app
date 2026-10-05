import React from 'react'
import { ScrollView, Text, TouchableOpacity, View } from 'react-native'
import { PackageCard } from './PackageCard'

export interface StaticHealthPackageItem {
  id: string
  category: string
  name: string
  desc: string
  price: number
  tag: string
  image: string
  color: string
  bgColor: string
  tagBg: string
  tagColor: string
  categoryColor: string
}

export const HEALTH_PACKAGES: StaticHealthPackageItem[] = [
  {
    id: 'pkg-1',
    category: 'TỔNG QUÁT',
    name: 'Khám Sức Khỏe Định Kỳ Toàn Diện',
    desc: 'Xét nghiệm máu, đường huyết, X-quang phổi và tư vấn bác sĩ chuyên khoa',
    price: 1500000,
    tag: 'PHỔ BIẾN',
    image: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=600&auto=format&fit=crop&q=80',
    color: '#059669',
    bgColor: 'bg-emerald-50',
    tagBg: 'bg-emerald-50 border-emerald-200',
    tagColor: 'text-emerald-700',
    categoryColor: 'text-emerald-700',
  },
  {
    id: 'pkg-2',
    category: 'TIM MẠCH',
    name: 'Tầm Soát Tim Mạch & Huyết Áp',
    desc: 'Đo điện tim ECG, siêu âm Doppler tim và hội chẩn cùng bác sĩ tim mạch',
    price: 1850000,
    tag: 'CHUYÊN SÂU',
    image: 'https://images.unsplash.com/photo-1628348068343-c6a848d2b6dd?w=600&auto=format&fit=crop&q=80',
    color: '#e11d48',
    bgColor: 'bg-rose-50',
    tagBg: 'bg-rose-50 border-rose-200',
    tagColor: 'text-rose-700',
    categoryColor: 'text-rose-600',
  },
  {
    id: 'pkg-3',
    category: 'NHI KHOA',
    name: 'Gói Kiểm Tra Dinh Dưỡng Cho Bé',
    desc: 'Đánh giá vi chất, tăng trưởng chiều cao, tầm soát hô hấp và tiêm chủng',
    price: 850000,
    tag: 'TIÊU CHUẨN',
    image: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=600&auto=format&fit=crop&q=80',
    color: '#d97706',
    bgColor: 'bg-amber-50',
    tagBg: 'bg-amber-50 border-amber-200',
    tagColor: 'text-amber-700',
    categoryColor: 'text-amber-600',
  },
  {
    id: 'pkg-4',
    category: 'XƯƠNG KHỚP',
    name: 'Tầm Soát Thoát Vị & Cột Sống',
    desc: 'Kiểm tra thoái hóa, phục hồi chức năng và tư vấn tư thế làm việc',
    price: 1200000,
    tag: 'VĂN PHÒNG',
    image: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=600&auto=format&fit=crop&q=80',
    color: '#0284c7',
    bgColor: 'bg-sky-50',
    tagBg: 'bg-sky-50 border-sky-200',
    tagColor: 'text-sky-700',
    categoryColor: 'text-sky-600',
  },
]

export interface HealthPackagesSectionProps {
  onSelectPackage: (pkg: StaticHealthPackageItem) => void
  onViewAll: () => void
}

export const HealthPackagesSection: React.FC<HealthPackagesSectionProps> = ({
  onSelectPackage,
  onViewAll,
}) => {
  return (
    <View className="mt-8 pt-2" style={{ marginTop: 32 }}>
      <View className="px-5 flex-row items-center justify-between mb-3.5">
        <View>
          <Text className="text-base font-extrabold text-slate-900 tracking-tight">
            Gói khám sức khỏe toàn diện
          </Text>
        </View>
        <TouchableOpacity onPress={onViewAll}>
          <Text className="text-xs font-semibold text-emerald-600">Xem tất cả</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20 }}
      >
        {HEALTH_PACKAGES.map((pkg) => (
          <PackageCard
            key={pkg.id}
            id={pkg.id}
            name={pkg.name}
            description={pkg.desc}
            price={pkg.price}
            image={pkg.image}
            specialtyName={pkg.category}
            badge={{
              label: pkg.tag,
              color: pkg.tagColor,
              bg: pkg.tagBg,
            }}
            onPress={() => onSelectPackage(pkg)}
          />
        ))}
      </ScrollView>
    </View>
  )
}
