import { useEffect, useRef, useState } from 'react'
import { ActivityIndicator, AppState, Linking, Platform, Text, TouchableOpacity, View } from 'react-native'
import { requireOptionalNativeModule } from 'expo'
import Ionicons from '@expo/vector-icons/Ionicons'
import { parseCccdQr, ParsedCccd } from '../../utils/cccdParser'

type CameraModule = typeof import('expo-camera')
let cameraModule: CameraModule | undefined
const QR_SCANNER_SETTINGS: import('expo-camera').BarcodeSettings = { barcodeTypes: ['qr'] }

export function getNativeCameraModule(): CameraModule | null {
  if (cameraModule) return cameraModule
  if (Platform.OS === 'web' || !requireOptionalNativeModule('ExpoCamera')) return null
  cameraModule ??= require('expo-camera') as CameraModule
  return cameraModule
}

export function NativeCccdCamera({ onScanned }: { onScanned: (parsed: ParsedCccd) => void }) {
  const camera = getNativeCameraModule()
  if (!camera) {
    return (
      <View className="p-6 items-center">
        <Text className="text-sm leading-6 text-white text-center">
          Bản app hiện tại chưa có camera quét QR. Vui lòng cài development build mới nhất.
        </Text>
      </View>
    )
  }
  return <CameraPreview camera={camera} onScanned={onScanned} />
}

function CameraPreview({ camera, onScanned }: {
  camera: CameraModule
  onScanned: (parsed: ParsedCccd) => void
}) {
  const [permission, requestPermission, getPermission] = camera.useCameraPermissions()
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)
  const [torch, setTorch] = useState(false)
  const [appActive, setAppActive] = useState(AppState.currentState !== 'background' && AppState.currentState !== 'inactive')
  const requested = useRef(false)
  const scanned = useRef(false)
  const startedAt = useRef(Date.now())
  const readyAt = useRef<number | null>(null)

  const retryCamera = () => {
    setError(null)
    setReady(false)
    setAttempt((value) => value + 1)
    startedAt.current = Date.now()
    readyAt.current = null
  }

  useEffect(() => {
    if (!permission || permission.granted || !permission.canAskAgain || requested.current) return
    requested.current = true
    void requestPermission().catch(() => setError('Không thể xin quyền máy ảnh. Vui lòng thử lại.'))
  }, [permission, requestPermission])

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      setAppActive(state === 'active')
      if (state === 'active') {
        startedAt.current = Date.now()
        void getPermission().catch(() => setError('Không thể kiểm tra quyền máy ảnh.'))
      } else {
        setReady(false)
        setTorch(false)
        readyAt.current = null
      }
    })
    return () => subscription.remove()
  }, [getPermission])

  useEffect(() => {
    if (!appActive || !permission?.granted || ready || error) return
    const timeout = setTimeout(() => setError('Không thể khởi động máy ảnh. Vui lòng thử lại.'), 12000)
    return () => clearTimeout(timeout)
  }, [appActive, permission?.granted, ready, error, attempt])

  if (error) {
    return (
      <View className="p-6 items-center gap-3">
        <Text className="text-sm leading-6 text-white text-center">{error}</Text>
        <TouchableOpacity onPress={retryCamera} className="bg-blue-600 px-4 py-3 rounded-lg">
          <Text className="font-semibold text-white">Thử lại</Text>
        </TouchableOpacity>
      </View>
    )
  }
  if (!permission) return <ActivityIndicator color="#ffffff" />
  if (!permission.granted) {
    return (
      <View className="p-6 items-center gap-3">
        <Text className="text-sm leading-6 text-white text-center">Cho phép truy cập máy ảnh để quét mã QR CCCD.</Text>
        <TouchableOpacity
          onPress={() => {
            const action = permission.canAskAgain ? requestPermission() : Linking.openSettings()
            void action.catch(() => setError('Không thể mở quyền máy ảnh. Vui lòng thử lại.'))
          }}
          className="bg-blue-600 px-4 py-3 rounded-lg"
        >
          <Text className="font-semibold text-white">{permission.canAskAgain ? 'Cho phép máy ảnh' : 'Mở cài đặt'}</Text>
        </TouchableOpacity>
      </View>
    )
  }

  if (!appActive) return <Text className="text-sm text-white">Máy ảnh đang tạm dừng.</Text>

  const { CameraView } = camera
  return (
    <View style={{ width: '100%', height: '100%' }}>
      <CameraView
        key={attempt}
        style={{ flex: 1 }}
        facing="back"
        autofocus="off"
        enableTorch={torch}
        barcodeScannerSettings={QR_SCANNER_SETTINGS}
        onCameraReady={() => {
          readyAt.current = Date.now()
          setReady(true)
          if (__DEV__) console.info('[CCCD camera] ready', { elapsedMs: readyAt.current - startedAt.current })
        }}
        onMountError={() => setError('Không thể mở máy ảnh. Vui lòng đóng ứng dụng khác đang dùng camera và thử lại.')}
        onBarcodeScanned={({ data }) => {
          if (scanned.current) return
          const parsed = parseCccdQr(data)
          if (!parsed) return
          scanned.current = true
          if (__DEV__) {
            const now = Date.now()
            console.info('[CCCD camera] scanned', {
              totalMs: now - startedAt.current,
              afterReadyMs: readyAt.current === null ? null : now - readyAt.current,
            })
          }
          onScanned(parsed)
        }}
      />
      {ready && (
        <TouchableOpacity
          accessibilityLabel={torch ? 'Tắt đèn pin' : 'Bật đèn pin'}
          onPress={() => setTorch((value) => !value)}
          className="absolute bottom-3 right-3 bg-slate-900/80 rounded-full w-11 h-11 items-center justify-center"
        >
          <Ionicons name={torch ? 'flash' : 'flash-outline'} size={22} color="#ffffff" />
        </TouchableOpacity>
      )}
      {!ready && (
        <View className="absolute inset-0 items-center justify-center bg-slate-900">
          <ActivityIndicator color="#ffffff" />
          <Text className="text-sm text-white mt-3">Đang mở máy ảnh...</Text>
        </View>
      )}
    </View>
  )
}
