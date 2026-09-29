import React, { useState, useEffect, useRef } from 'react'
import {
  Alert,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Animated,
  Easing,
} from 'react-native'
import Ionicons from '@expo/vector-icons/Ionicons'
import * as ImagePicker from 'expo-image-picker'
import jsQR from 'jsqr'
import { parseCccdQr, ParsedCccd, SAMPLE_CCCD_QRS } from '../../utils/cccdParser'

interface CccdScannerModalProps {
  visible: boolean
  onClose: () => void
  onSuccess: (parsed: ParsedCccd) => void
  title?: string
}

export const CccdScannerModal: React.FC<CccdScannerModalProps> = ({
  visible,
  onClose,
  onSuccess,
  title = 'Quét mã QR thẻ CCCD',
}) => {
  const [activeTab, setActiveTab] = useState<'camera' | 'manual'>('camera')
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null)
  const [cameraActive, setCameraActive] = useState(false)
  const [scannedResult, setScannedResult] = useState<ParsedCccd | null>(null)
  const [manualText, setManualText] = useState('')
  const [isProcessingImage, setIsProcessingImage] = useState(false)

  // Video and stream refs for Web camera
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const scanIntervalRef = useRef<any>(null)

  // Stop camera stream helper
  const stopCameraStream = () => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current)
      scanIntervalRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    setCameraActive(false)
  }

  // Start Web Camera using navigator.mediaDevices.getUserMedia
  const startWebCamera = async () => {
    if (Platform.OS !== 'web' || typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setHasCameraPermission(false)
      return
    }

    try {
      stopCameraStream()
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 640 },
          height: { ideal: 640 },
        },
        audio: false,
      })

      streamRef.current = stream
      setHasCameraPermission(true)
      setCameraActive(true)

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play().catch(() => {})
      }

      // Start jsQR scanning loop on canvas
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d', { willReadFrequently: true })

      scanIntervalRef.current = setInterval(() => {
        if (!videoRef.current || videoRef.current.readyState < 2 || !ctx) return

        const w = videoRef.current.videoWidth || 480
        const h = videoRef.current.videoHeight || 480
        if (w === 0 || h === 0) return

        canvas.width = w
        canvas.height = h
        ctx.drawImage(videoRef.current, 0, 0, w, h)

        const imageData = ctx.getImageData(0, 0, w, h)
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'dontInvert',
        })

        if (code && code.data) {
          const parsed = parseCccdQr(code.data)
          if (parsed) {
            stopCameraStream()
            setScannedResult(parsed)
          }
        }
      }, 250)
    } catch {
      setHasCameraPermission(false)
      setCameraActive(false)
    }
  }

  // Lifecycle when modal opens/closes or changes tab
  useEffect(() => {
    if (visible && activeTab === 'camera' && !scannedResult) {
      startWebCamera()
    } else {
      stopCameraStream()
    }
    return () => {
      stopCameraStream()
    }
  }, [visible, activeTab, scannedResult])

  // Reset state when opening
  useEffect(() => {
    if (visible) {
      setScannedResult(null)
      setActiveTab('camera')
      setManualText('')
      setIsProcessingImage(false)
    }
  }, [visible])

  // Process raw text string from QR
  const processRawQr = (rawText: string) => {
    const parsed = parseCccdQr(rawText)
    if (!parsed) {
      Alert.alert(
        'Mã không đúng định dạng',
        'Mã QR không phải mã CCCD gắn chip hợp lệ của Bộ Công An Việt Nam.'
      )
      return
    }
    stopCameraStream()
    setScannedResult(parsed)
  }

  // Pick image from gallery and decode QR
  const handlePickImage = async () => {
    try {
      setIsProcessingImage(true)
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 1,
      })

      if (result.canceled || !result.assets || result.assets.length === 0) {
        setIsProcessingImage(false)
        return
      }

      const uri = result.assets[0].uri

      // Decode on Web via canvas & jsQR
      if (typeof document !== 'undefined') {
        const img = new Image()
        img.crossOrigin = 'Anonymous'
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas')
            const ctx = canvas.getContext('2d', { willReadFrequently: true })
            if (!ctx) {
              Alert.alert('Không thể đọc ảnh', 'Trình duyệt không hỗ trợ xử lý ảnh.')
              setIsProcessingImage(false)
              return
            }
            canvas.width = img.width
            canvas.height = img.height
            ctx.drawImage(img, 0, 0, img.width, img.height)
            const imageData = ctx.getImageData(0, 0, img.width, img.height)
            const code = jsQR(imageData.data, imageData.width, imageData.height, {
              inversionAttempts: 'dontInvert',
            })
            setIsProcessingImage(false)

            if (code && code.data) {
              processRawQr(code.data)
            } else {
              Alert.alert(
                'Không tìm thấy mã QR',
                'Không phát hiện được mã QR trên ảnh. Vui lòng chọn ảnh chụp rõ nét phần mã QR ở góc trên bên phải CCCD.'
              )
            }
          } catch {
            setIsProcessingImage(false)
            Alert.alert('Lỗi xử lý ảnh', 'Không thể giải mã hình ảnh vừa chọn.')
          }
        }
        img.onerror = () => {
          setIsProcessingImage(false)
          Alert.alert('Lỗi tải ảnh', 'Không thể đọc tệp hình ảnh.')
        }
        img.src = uri
      } else {
        setIsProcessingImage(false)
        Alert.alert('Thông báo', 'Vui lòng sử dụng tính năng dán chuỗi mã hoặc quét trực tiếp.')
      }
    } catch {
      setIsProcessingImage(false)
      Alert.alert('Lỗi', 'Không thể mở thư viện ảnh.')
    }
  }

  const handleConfirm = () => {
    if (!scannedResult) return
    onSuccess(scannedResult)
    onClose()
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-slate-900/60 justify-end">
        <View className="bg-white rounded-t-2xl max-h-[92%] overflow-hidden flex-col">
          {/* Header */}
          <View className="flex-row items-center justify-between px-5 py-3.5 border-b border-slate-100">
            <Text className="text-base font-bold text-slate-900">{title}</Text>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={onClose}
              className="p-1 items-center justify-center ml-2"
              style={{ outline: 'none' } as any}
            >
              <Ionicons name="close" size={24} color="#64748b" />
            </TouchableOpacity>
          </View>

          {/* If Result Found: Show Confirmation View */}
          {scannedResult ? (
            <ScrollView className="p-5" showsVerticalScrollIndicator={false}>
              <View className="bg-white border border-slate-200/90 rounded-xl p-4 mb-4">
                <View className="flex-row items-center mb-3">
                  <Ionicons name="checkmark-circle" size={24} color="#059669" style={{ marginRight: 8 }} />
                  <View className="flex-1">
                    <Text className="text-sm font-bold text-slate-900">
                      Nhận diện CCCD thành công
                    </Text>
                    <Text className="text-xs text-slate-500">
                      Kiểm tra thông tin trước khi áp dụng vào hồ sơ
                    </Text>
                  </View>
                </View>

                {/* Info Fields */}
                <View className="space-y-2 border-t border-slate-100 pt-3">
                  <View className="flex-row justify-between py-1 border-b border-slate-100">
                    <Text className="text-xs text-slate-500 font-medium">Họ và tên:</Text>
                    <Text className="text-xs font-bold text-slate-900">
                      {scannedResult.fullName || '—'}
                    </Text>
                  </View>

                  <View className="flex-row justify-between py-1 border-b border-slate-100">
                    <Text className="text-xs text-slate-500 font-medium">Số CCCD:</Text>
                    <Text className="text-xs font-bold text-emerald-700 tracking-wider">
                      {scannedResult.nationalId || '—'}
                    </Text>
                  </View>

                  <View className="flex-row justify-between py-1 border-b border-slate-100">
                    <Text className="text-xs text-slate-500 font-medium">Ngày sinh:</Text>
                    <Text className="text-xs font-semibold text-slate-800">
                      {scannedResult.dateOfBirth || '—'} ({scannedResult.gender === 'FEMALE' ? 'Nữ' : 'Nam'})
                    </Text>
                  </View>

                  {Boolean(scannedResult.address) && (
                    <View className="py-1">
                      <Text className="text-xs text-slate-500 font-medium mb-0.5">Nơi thường trú:</Text>
                      <Text className="text-xs font-medium text-slate-800 leading-relaxed">
                        {scannedResult.address}
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Action Buttons */}
              <View className="flex-row gap-3 pt-2 pb-6">
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setScannedResult(null)}
                  className="flex-1 py-3 rounded-lg border border-slate-200 items-center justify-center bg-white"
                >
                  <Text className="text-xs font-semibold text-slate-700">Quét lại</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={handleConfirm}
                  className="flex-2 py-3 rounded-lg bg-emerald-700 items-center justify-center shadow-xs"
                >
                  <Text className="text-xs font-bold text-white">Sử dụng thông tin này</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          ) : (
            /* Scanner & Manual Entry View */
            <View className="flex-col">
              {/* Tab Selector */}
              <View className="flex-row border-b border-slate-100 bg-slate-50/70 p-1.5 mx-4 mt-3 rounded-lg">
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setActiveTab('camera')}
                  className={`flex-1 py-2 rounded-md items-center justify-center flex-row ${
                    activeTab === 'camera' ? 'bg-white shadow-xs' : ''
                  }`}
                >
                  <Ionicons
                    name="camera-outline"
                    size={16}
                    color={activeTab === 'camera' ? '#047857' : '#64748b'}
                    style={{ marginRight: 6 }}
                  />
                  <Text
                    className={`text-xs font-bold ${
                      activeTab === 'camera' ? 'text-emerald-700' : 'text-slate-600'
                    }`}
                  >
                    Camera quét trực tiếp
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setActiveTab('manual')}
                  className={`flex-1 py-2 rounded-md items-center justify-center flex-row ${
                    activeTab === 'manual' ? 'bg-white shadow-xs' : ''
                  }`}
                >
                  <Ionicons
                    name="image-outline"
                    size={16}
                    color={activeTab === 'manual' ? '#047857' : '#64748b'}
                    style={{ marginRight: 6 }}
                  />
                  <Text
                    className={`text-xs font-bold ${
                      activeTab === 'manual' ? 'text-emerald-700' : 'text-slate-600'
                    }`}
                  >
                    Ảnh thư viện / Nhập mã
                  </Text>
                </TouchableOpacity>
              </View>

              {/* TAB 1: CAMERA VIEW */}
              {activeTab === 'camera' && (
                <View className="p-4 items-center">
                  <View className="w-full items-center">
                    {/* Camera Viewfinder container */}
                    <View className="w-72 h-72 rounded-2xl overflow-hidden bg-slate-900 relative justify-center items-center">
                      {Platform.OS === 'web' ? (
                        <video
                          ref={(node) => {
                            videoRef.current = node
                            if (node && streamRef.current && node.srcObject !== streamRef.current) {
                              node.srcObject = streamRef.current
                              node.play().catch(() => {})
                            }
                          }}
                          autoPlay
                          playsInline
                          muted
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                          }}
                        />
                      ) : (
                        <View className="items-center justify-center">
                          <Ionicons name="camera-outline" size={48} color="#64748b" />
                          <Text className="text-xs text-slate-400 mt-2">Đang tải máy ảnh...</Text>
                        </View>
                      )}

                      {/* Scanner Target Overlay */}
                      <View className="absolute inset-0 items-center justify-center pointer-events-none">
                        {/* 4 Clean Corner Markers (White, No Green, No Scanning Bar) */}
                        <View className="w-56 h-56 relative">
                          {/* Top Left */}
                          <View className="absolute top-0 left-0 w-7 h-7 border-t-2 border-l-2 border-white rounded-tl-md" />
                          {/* Top Right */}
                          <View className="absolute top-0 right-0 w-7 h-7 border-t-2 border-r-2 border-white rounded-tr-md" />
                          {/* Bottom Left */}
                          <View className="absolute bottom-0 left-0 w-7 h-7 border-b-2 border-l-2 border-white rounded-bl-md" />
                          {/* Bottom Right */}
                          <View className="absolute bottom-0 right-0 w-7 h-7 border-b-2 border-r-2 border-white rounded-br-md" />
                        </View>
                      </View>
                    </View>

                    <Text className="text-xs text-slate-500 text-center mt-3">
                      Đặt mã QR trên thẻ CCCD vào khung hình
                    </Text>

                    {/* Quick Button to Switch to Gallery / Sample if Camera Denied */}
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => setActiveTab('manual')}
                      className="mt-3 flex-row items-center bg-slate-100 px-3.5 py-1.5 rounded-full"
                    >
                      <Ionicons name="images-outline" size={14} color="#475569" style={{ marginRight: 5 }} />
                      <Text className="text-xs font-semibold text-slate-700">
                        Chọn ảnh / Dán mã nhanh
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* TAB 2: MANUAL / GALLERY PICK */}
              {activeTab === 'manual' && (
                <ScrollView className="p-4" showsVerticalScrollIndicator={false}>
                  {/* Gallery pick button */}
                  <TouchableOpacity
                    activeOpacity={0.8}
                    disabled={isProcessingImage}
                    onPress={handlePickImage}
                    className="flex-row items-center justify-center bg-white border border-slate-200 p-3.5 rounded-xl mb-4"
                  >
                    {isProcessingImage ? (
                      <ActivityIndicator size="small" color="#059669" style={{ marginRight: 8 }} />
                    ) : (
                      <Ionicons name="images-outline" size={20} color="#059669" style={{ marginRight: 8 }} />
                    )}
                    <Text className="text-xs font-bold text-slate-800">
                      {isProcessingImage ? 'Đang đọc mã từ ảnh...' : 'Chọn ảnh CCCD từ thư viện máy'}
                    </Text>
                  </TouchableOpacity>

                  {/* Manual Paste Text */}
                  <View className="mb-4">
                    <Text className="text-xs font-bold text-slate-600 mb-1.5">
                      Hoặc dán chuỗi dữ liệu mã QR CCCD:
                    </Text>
                    <TextInput
                      value={manualText}
                      onChangeText={setManualText}
                      placeholder="Dán chuỗi mã QR (ví dụ: 001201012345||NGUYỄN VĂN AN|...)"
                      placeholderTextColor="#94a3b8"
                      multiline
                      numberOfLines={3}
                      className="bg-white border border-slate-200 rounded-lg p-3 text-xs text-slate-800 text-top min-h-[70px]"
                    />
                    <TouchableOpacity
                      activeOpacity={0.8}
                      disabled={!manualText.trim()}
                      onPress={() => processRawQr(manualText.trim())}
                      className={`mt-2 py-2.5 rounded-lg items-center ${
                        manualText.trim() ? 'bg-emerald-700' : 'bg-slate-200 opacity-60'
                      }`}
                    >
                      <Text className="text-xs font-bold text-white">Giải mã & Áp dụng</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Sample test cases for development */}
                  <View className="border-t border-slate-100 pt-3 mb-6">
                    <Text className="text-2xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                      Dữ liệu CCCD mẫu (Thử nghiệm nhanh):
                    </Text>
                    <View className="gap-1.5">
                      {SAMPLE_CCCD_QRS.map((sample, idx) => (
                        <TouchableOpacity
                          key={idx}
                          activeOpacity={0.7}
                          onPress={() => processRawQr(sample.payload)}
                          className="bg-white border border-slate-200 p-2.5 rounded-md flex-row items-center justify-between"
                        >
                          <View className="flex-1 pr-2">
                            <Text className="text-xs font-semibold text-slate-800">
                              {sample.label}
                            </Text>
                            <Text numberOfLines={1} className="text-2xs text-slate-400 mt-0.5">
                              {sample.payload}
                            </Text>
                          </View>
                          <Ionicons name="arrow-forward-circle-outline" size={18} color="#059669" />
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                </ScrollView>
              )}
            </View>
          )}
        </View>
      </View>
    </Modal>
  )
}
