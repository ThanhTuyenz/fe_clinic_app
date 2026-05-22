import { useEffect, useState } from 'react'
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import Ionicons from '@expo/vector-icons/Ionicons'
import {
  CANCEL_REASON_PRESETS,
  resolveCancelReasonText,
  validateCancelReason,
} from '../lib/cancelAppointment.js'
import { colors } from '../theme/colors.js'
import PrimaryButton from './PrimaryButton.js'

export default function CancelAppointmentModal({ visible, loading, error, onClose, onConfirm }) {
  const [presetId, setPresetId] = useState('busy')
  const [otherText, setOtherText] = useState('')
  const [localError, setLocalError] = useState('')

  useEffect(() => {
    if (!visible) return
    setPresetId('busy')
    setOtherText('')
    setLocalError('')
  }, [visible])

  function handleClose() {
    if (loading) return
    onClose()
  }

  function handleConfirm() {
    const validationError = validateCancelReason(presetId, otherText)
    if (validationError) {
      setLocalError(validationError)
      return
    }
    setLocalError('')
    onConfirm(resolveCancelReasonText(presetId, otherText))
  }

  const displayError = localError || error
  const canConfirm =
    presetId !== 'other' || String(otherText || '').trim().length > 0

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} accessibilityRole="button" />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardWrap}
        >
          <View style={styles.sheet}>
            <Text style={styles.title}>Hủy lịch khám</Text>
            <Text style={styles.desc}>Vui lòng chọn lý do hủy để chúng tôi phục vụ bạn tốt hơn.</Text>

            <ScrollView
              style={styles.reasonScroll}
              contentContainerStyle={styles.reasonScrollContent}
              bounces={false}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator
            >
              <View style={styles.reasonList}>
                {CANCEL_REASON_PRESETS.map((preset) => {
                  const selected = presetId === preset.id
                  return (
                    <Pressable
                      key={preset.id}
                      style={[styles.reasonRow, selected && styles.reasonRowSelected]}
                      onPress={() => {
                        setPresetId(preset.id)
                        setLocalError('')
                      }}
                      disabled={loading}
                    >
                      <Ionicons
                        name={selected ? 'radio-button-on' : 'radio-button-off'}
                        size={22}
                        color={selected ? colors.primary : colors.textMuted}
                      />
                      <Text style={styles.reasonLabel}>{preset.label}</Text>
                    </Pressable>
                  )
                })}
              </View>

              {presetId === 'other' ? (
                <TextInput
                  style={styles.textarea}
                  placeholder="Nhập lý do…"
                  placeholderTextColor={colors.textMuted}
                  value={otherText}
                  onChangeText={(text) => {
                    setOtherText(text)
                    setLocalError('')
                  }}
                  multiline
                  maxLength={500}
                  editable={!loading}
                />
              ) : null}
            </ScrollView>

            <View style={styles.footer}>
              {displayError ? <Text style={styles.errorText}>{displayError}</Text> : null}
              <View style={styles.actions}>
                <View style={styles.actionBtn}>
                  <PrimaryButton title="Đóng" variant="secondary" onPress={handleClose} disabled={loading} />
                </View>
                <View style={styles.actionBtn}>
                  <PrimaryButton
                    title={loading ? 'Đang hủy…' : 'Xác nhận'}
                    variant="danger"
                    onPress={handleConfirm}
                    loading={loading}
                    disabled={loading || !canConfirm}
                  />
                </View>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    padding: 20,
  },
  keyboardWrap: {
    width: '100%',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 16,
    maxHeight: '88%',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  desc: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.textMuted,
    marginBottom: 12,
  },
  reasonScroll: {
    flexGrow: 0,
    flexShrink: 1,
  },
  reasonScrollContent: {
    paddingBottom: 4,
  },
  reasonList: {
    gap: 8,
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  reasonRowSelected: {
    borderColor: 'rgba(13, 148, 136, 0.45)',
    backgroundColor: colors.infoBg,
  },
  reasonLabel: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: colors.text,
  },
  textarea: {
    minHeight: 88,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: colors.text,
    textAlignVertical: 'top',
    marginTop: 12,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 14,
    marginTop: 12,
    gap: 10,
  },
  errorText: {
    color: colors.danger,
    fontSize: 13,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  actionBtn: {
    flex: 1,
  },
})
