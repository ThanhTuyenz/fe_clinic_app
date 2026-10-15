import { useCallback, useEffect, useRef, useState } from 'react'
import { AppState, NativeModules, PermissionsAndroid, Platform } from 'react-native'
import { io, Socket } from 'socket.io-client'
import type { MediaStream, RTCPeerConnection } from 'react-native-webrtc'
import { resolveApiBaseUrl } from '../constants/config'
import { useAuthStore } from '../store/useAuthStore'
import { telehealthService } from '../services/telehealthService'

type WebRTC = typeof import('react-native-webrtc')
type Candidate = ConstructorParameters<WebRTC['RTCIceCandidate']>[0]
type Description = ConstructorParameters<WebRTC['RTCSessionDescription']>[0]
export interface CallMessage { senderId: string; senderName: string; text: string; timestamp: string }
type CallStatus = 'idle' | 'connecting' | 'waiting' | 'connected' | 'disconnected' | 'finished' | 'error'

export function useTelehealthCall(appointmentId: string) {
  const [enabled, setEnabled] = useState(false)
  const [status, setStatus] = useState<CallStatus>('idle')
  const [error, setError] = useState('')
  const [rtc, setRtc] = useState<WebRTC | null>(null)
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null)
  const [audioMuted, setAudioMuted] = useState(false)
  const [videoOff, setVideoOff] = useState(false)
  const [peerVideoOff, setPeerVideoOff] = useState(false)
  const [messages, setMessages] = useState<CallMessage[]>([])
  const [ending, setEnding] = useState(false)
  const socketRef = useRef<Socket | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const peerRef = useRef<RTCPeerConnection | null>(null)

  useEffect(() => {
    if (!enabled) return
    let disposed = false
    let socket: Socket | null = null
    let stream: MediaStream | null = null
    let target: string | null = null
    let candidates: Candidate[] = []
    let signals = Promise.resolve()
    let joinTimer: ReturnType<typeof setTimeout> | undefined
    const closePeer = () => {
      peerRef.current?.close()
      peerRef.current = null
      candidates = []
      target = null
      if (!disposed) { setRemoteStream(null); setPeerVideoOff(false) }
    }
    const release = () => {
      clearTimeout(joinTimer)
      socket?.removeAllListeners()
      socket?.disconnect()
      socketRef.current = null
      closePeer()
      stream?.getTracks().forEach(track => track.stop())
      stream?.release()
      stream = null
      streamRef.current = null
    }
    const fail = (message: string) => {
      if (disposed) return
      release()
      setLocalStream(null)
      setError(message)
      setStatus('error')
      setEnabled(false)
    }
    const finish = () => {
      if (disposed) return
      release()
      setLocalStream(null)
      setStatus('finished')
      setEnabled(false)
      setEnding(false)
    }

    async function start() {
      try {
        setStatus('connecting'); setError(''); setAudioMuted(false); setVideoOff(false)
        // Re-check ownership/status before opening camera; the API can also refresh JWT.
        const room = await telehealthService.getRoom(appointmentId)
        if (disposed) return
        if (!['CONFIRMED', 'CHECKED_IN', 'IN_EXAMINATION'].includes(room.status)) {
          throw new Error('Lịch hẹn chưa được xác nhận hoặc đã kết thúc.')
        }
        let native: WebRTC
        try {
          if (!NativeModules.WebRTCModule) throw new Error('Missing WebRTC')
          native = require('react-native-webrtc') as WebRTC
        } catch {
          throw new Error('Bản app này chưa có thư viện gọi video. Vui lòng cài development build mới có WebRTC.')
        }
        setRtc(() => native)
        if (Platform.OS === 'android') {
          const permissions = [PermissionsAndroid.PERMISSIONS.CAMERA, PermissionsAndroid.PERMISSIONS.RECORD_AUDIO]
          const grants = await PermissionsAndroid.requestMultiple(permissions)
          if (permissions.some(permission => grants[permission] !== PermissionsAndroid.RESULTS.GRANTED)) {
            throw new Error('Bạn cần cho phép camera và micro. Nếu đã chặn quyền, hãy mở Cài đặt để cấp lại rồi thử lại.')
          }
        }
        if (disposed) return
        stream = await native.mediaDevices.getUserMedia({
          audio: true,
          video: { facingMode: 'user', width: 640, height: 480, frameRate: 24 },
        })
        if (disposed) { stream.getTracks().forEach(track => track.stop()); stream.release(); return }
        streamRef.current = stream
        setLocalStream(stream)
        const { token, user } = useAuthStore.getState()
        if (!token || !user) throw new Error('Vui lòng đăng nhập lại để vào phòng tư vấn.')
        const userId = user.id ?? user._id
        if (!userId) throw new Error('Không xác định được tài khoản. Vui lòng đăng nhập lại.')
        const userName = user.fullName || user.full_name || user.name || 'Bệnh nhân'
        const socketBase = resolveApiBaseUrl().replace(/\/api\/v\d+\/?$/, '')
        socket = io(`${socketBase}/telehealth`, {
          autoConnect: false, transports: ['websocket'], auth: { token }, reconnection: false, timeout: 10000,
        })
        socketRef.current = socket

        const createPeer = () => {
          if (peerRef.current) return peerRef.current
          const peer = new native.RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }] })
          peerRef.current = peer
          stream!.getTracks().forEach(track => peer.addTrack(track, stream!))
          peer.ontrack = (event: unknown) => {
            const { streams } = event as unknown as { streams: MediaStream[] }
            if (!disposed && streams[0]) setRemoteStream(streams[0])
          }
          peer.onicecandidate = (event: unknown) => {
            const { candidate } = event as unknown as { candidate: InstanceType<WebRTC['RTCIceCandidate']> | null }
            if (candidate && target) socket?.emit('webrtc:signal', {
              appointmentId, targetSocketId: target, signalData: { type: 'candidate', candidate: candidate.toJSON() },
            })
          }
          peer.onconnectionstatechange = () => {
            if (disposed || peerRef.current !== peer) return
            if (peer.connectionState === 'connected') setStatus('connected')
            if (peer.connectionState === 'disconnected') setStatus('disconnected')
            if (peer.connectionState === 'failed') fail('Không kết nối được video. Hãy thử lại trên cùng Wi-Fi; mạng khác có thể cần cấu hình TURN trên hệ thống.')
          }
          return peer
        }
        socket.on('connect', () => {
          joinTimer = setTimeout(() => fail('Không vào được phòng tư vấn. Vui lòng thử lại.'), 12000)
          socket?.emit('join:telehealth-room', { appointmentId, userId: String(userId), name: userName, role: 'PATIENT' },
            (result: { success?: boolean; message?: string }) => {
              if (result?.success === false) fail(result.message || 'Không có quyền vào phòng tư vấn.')
            })
        })
        socket.on('telehealth:joined-success', (data: { otherPeer?: { socketId: string } }) => {
          clearTimeout(joinTimer)
          target = data.otherPeer?.socketId || null
          setStatus('waiting')
        })
        socket.on('telehealth:peer-joined', (data: { newPeer: { socketId: string } }) => {
          closePeer(); target = data.newPeer.socketId; setStatus('connecting')
        })
        socket.on('telehealth:peer-left', () => { closePeer(); setStatus('waiting') })
        // Serialize offer + ICE processing so candidates wait for setRemoteDescription.
        socket.on('webrtc:signal', (payload: { senderSocketId: string; signalData: { type: string; sdp: Description; candidate: Candidate } }) => {
          signals = signals.then(async () => {
            if (disposed || payload.senderSocketId !== target) return
            const { signalData } = payload
            const peer = createPeer()
            if (signalData.type === 'offer') {
              await peer.setRemoteDescription(new native.RTCSessionDescription(signalData.sdp))
              for (const candidate of candidates.splice(0)) await peer.addIceCandidate(new native.RTCIceCandidate(candidate))
              const answer = await peer.createAnswer()
              await peer.setLocalDescription(answer)
              if (!disposed) socket?.emit('webrtc:signal', { appointmentId, targetSocketId: target, signalData: { type: 'answer', sdp: peer.localDescription?.toJSON() } })
            } else if (signalData.type === 'candidate') {
              if (peer.remoteDescription) await peer.addIceCandidate(new native.RTCIceCandidate(signalData.candidate))
              else candidates.push(signalData.candidate)
            }
          }).catch(() => fail('Không thể thiết lập cuộc gọi. Vui lòng vào lại phòng.'))
        })
        socket.on('telehealth:peer-media-toggled', (data: { isVideoOff?: boolean }) => {
          if (typeof data.isVideoOff === 'boolean') setPeerVideoOff(data.isVideoOff)
        })
        socket.on('telehealth:new-chat', (message: CallMessage) => setMessages(previous => [...previous, message]))
        socket.on('telehealth:call-ended', finish)
        socket.on('connect_error', () => fail('Không kết nối được máy chủ cuộc gọi. Kiểm tra mạng và đăng nhập rồi thử lại.'))
        socket.on('disconnect', () => fail('Đã mất kết nối phòng tư vấn. Vui lòng vào lại.'))
        socket.connect()
      } catch (cause) {
        fail(cause instanceof Error ? cause.message : 'Không mở được camera/micro.')
      }
    }
    void start()
    const appState = AppState.addEventListener('change', state => {
      if (state === 'background') fail('Cuộc gọi đã ngắt khi ứng dụng vào nền. Bấm vào lại phòng để tiếp tục.')
    })
    return () => { disposed = true; appState.remove(); release() }
  }, [enabled, appointmentId])

  const toggleMedia = useCallback((kind: 'audio' | 'video') => {
    const tracks = kind === 'audio' ? streamRef.current?.getAudioTracks() : streamRef.current?.getVideoTracks()
    if (!tracks?.length) return
    const muted = tracks[0].enabled
    tracks.forEach(track => { track.enabled = !muted })
    if (kind === 'audio') setAudioMuted(muted)
    else setVideoOff(muted)
    socketRef.current?.emit('telehealth:toggle-media', { appointmentId, ...(kind === 'audio' ? { isAudioMuted: muted } : { isVideoOff: muted }) })
  }, [appointmentId])

  const endCall = useCallback(() => {
    if (!socketRef.current?.connected || ending) return
    setEnding(true)
    socketRef.current.timeout(15000).emit('telehealth:end-call', { appointmentId, endedByRole: 'PATIENT' },
      (cause: Error | null, result?: { success: boolean; message?: string }) => {
        setEnding(false)
        if (cause || !result?.success) setError(result?.message || 'Chưa xác nhận được kết thúc cuộc gọi. Hãy thử lại.')
      })
  }, [appointmentId, ending])

  return {
    rtc, status, error, localStream, remoteStream, audioMuted, videoOff, peerVideoOff, messages, ending,
    join: () => { setMessages([]); setEnabled(true) },
    leave: () => { setEnabled(false); setLocalStream(null); setRemoteStream(null); setStatus('idle') },
    toggleAudio: () => toggleMedia('audio'), toggleVideo: () => toggleMedia('video'),
    switchCamera: () => streamRef.current?.getVideoTracks()[0]?._switchCamera(),
    sendMessage: (text: string) => {
      if (text.trim()) socketRef.current?.emit('telehealth:send-chat', { appointmentId, text: text.trim() })
    },
    endCall,
  }
}
