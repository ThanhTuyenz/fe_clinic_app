import { useCallback, useEffect, useState } from 'react'
import { Image, StyleSheet, Text, View } from 'react-native'
import { resolveDoctorAvatarUrl } from '../api/doctors.js'
import { getDoctorInitials } from '../lib/user.js'
import { colors } from '../theme/colors.js'

export default function DoctorAvatar({ doctor, size = 44, style }) {
  const [failed, setFailed] = useState(false)
  const uri = resolveDoctorAvatarUrl(doctor)

  useEffect(() => {
    setFailed(false)
  }, [doctor?.id, doctor?._id, uri])

  const onError = useCallback(() => {
    setFailed(true)
  }, [])

  if (!failed && uri) {
    return (
      <Image
        source={{ uri }}
        style={[{ width: size, height: size, borderRadius: size / 2 }, styles.image, style]}
        resizeMode="cover"
        onError={onError}
      />
    )
  }

  return (
    <View style={[{ width: size, height: size, borderRadius: size / 2 }, styles.fallback, style]}>
      <Text style={[styles.fallbackText, { fontSize: Math.max(12, Math.round(size * 0.36)) }]}>
        {getDoctorInitials(doctor)}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  image: {
    backgroundColor: colors.border,
  },
  fallback: {
    backgroundColor: '#e0f2f1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackText: {
    fontWeight: '800',
    color: colors.primaryDark,
  },
})
