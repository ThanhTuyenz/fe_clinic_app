import { StyleSheet, Text, View } from 'react-native'
import { colors } from '../theme/colors.js'

export default function MessageBanner({ message, tone = 'error' }) {
  if (!message) return null
  const isInfo = tone === 'info'
  const isSuccess = tone === 'success'
  return (
    <View style={[styles.box, isSuccess ? styles.success : isInfo ? styles.info : styles.error]}>
      <Text style={[styles.text, isSuccess ? styles.successText : isInfo ? styles.infoText : styles.errorText]}>
        {message}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  box: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  error: {
    borderColor: '#fecaca',
    backgroundColor: colors.dangerBg,
  },
  info: {
    borderColor: 'rgba(13,148,136,0.35)',
    backgroundColor: colors.infoBg,
  },
  success: {
    borderColor: '#86efac',
    backgroundColor: '#ecfdf5',
  },
  text: {
    fontSize: 14,
    lineHeight: 20,
  },
  errorText: {
    color: colors.danger,
  },
  infoText: {
    color: colors.primaryDark,
  },
  successText: {
    color: '#047857',
    fontWeight: '600',
  },
})
