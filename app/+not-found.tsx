import { Text, View } from 'react-native'
import { Link, Stack } from 'expo-router'

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Không tìm thấy trang' }} />
      <View className="flex-1 items-center justify-center p-5 bg-white">
        <Text className="text-xl font-bold text-slate-800 mb-2">
          Trang không tồn tại
        </Text>
        <Text className="text-slate-500 text-center mb-6">
          Đường dẫn bạn yêu cầu không tồn tại hoặc đã được di chuyển.
        </Text>
        <Link href="/" className="bg-primary-600 px-6 py-3 rounded-lg">
          <Text className="text-white font-semibold">Về trang chủ</Text>
        </Link>
      </View>
    </>
  )
}
