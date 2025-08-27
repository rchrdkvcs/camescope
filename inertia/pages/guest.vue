<template>
  <div>
    <h2>Guest — Room {{ roomId }}</h2>
    <video
      ref="preview"
      autoplay
      muted
      playsinline
      style="width: 360px; height: 200px; background: #000"
    ></video>
    <pre>{{ logs.join('\n') }}</pre>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { socket } from '~/composables/use_socket.js'

const props = defineProps({ roomId: String })
const preview = ref(null)
const logs = ref([])
const pcs = {}

function log(...args) {
  if (process.env.NODE_ENV === 'development') {
    logs.value.push(`[${new Date().toLocaleTimeString()}] ${args.join(' ')}`)
    console.log('[GUEST]', ...args)
  }
}

let localStream = null

onMounted(async () => {
  socket.on('connect', () => {
    log('Connected', socket.id)
    socket.emit('joinRoom', props.roomId)
  })

  try {
    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
    if (preview.value) preview.value.srcObject = localStream
    log('Local media obtained - video:', localStream.getVideoTracks().length, 'audio:', localStream.getAudioTracks().length)
  } catch (error) {
    log('Error getting user media:', error.message)
    return
  }

  socket.on('offer', async ({ from, sdp }) => {
    log('Offer from', from)
    
    // Toujours fermer l'ancienne connexion s'il y en a une
    if (pcs[from]) {
      pcs[from].close()
      log('Closed existing connection with', from)
    }
    
    // Créer une nouvelle PeerConnection pour chaque offer
    const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] })
    pcs[from] = pc

    localStream.getTracks().forEach((track) => {
      pc.addTrack(track, localStream)
      log('Track added:', track.kind)
    })

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        socket.emit('ice-candidate', { to: from, candidate: e.candidate })
        // log('ICE candidate sent to', from, 'type:', e.candidate.type) // Trop verbeux
      } else {
        log('ICE gathering finished for', from)
      }
    }

    pc.onconnectionstatechange = () => {
      log('Connection state with', from, ':', pc.connectionState)
    }

    pc.onicegatheringstatechange = () => {
      // log('ICE gathering state with', from, ':', pc.iceGatheringState) // Moins critique
    }

    pc.oniceconnectionstatechange = () => {
      log('ICE connection state with', from, ':', pc.iceConnectionState)
      
      // Nettoyer les connexions fermées/échouées
      if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'closed') {
        if (pcs[from] === pc) {
          delete pcs[from]
          log('Cleaned up failed/closed connection with', from)
        }
      }
    }

    try {
      log('Setting remote description from', from, 'SDP type:', sdp.type)
      await pc.setRemoteDescription(new RTCSessionDescription(sdp))
      log('Remote description set from', from)
      
      const answer = await pc.createAnswer()
      log('Answer created for', from, 'SDP type:', answer.type)
      await pc.setLocalDescription(answer)
      log('Local description set for', from, 'gathering state:', pc.iceGatheringState)
      
      socket.emit('answer', { to: from, sdp: pc.localDescription })
      log('Answer sent to', from)
    } catch (error) {
      log('Error handling offer from', from, ':', error.message)
    }
  })

  socket.on('ice-candidate', async ({ from, candidate }) => {
    const pc = pcs[from]
    if (pc && candidate) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate))
        // log('ICE candidate added from', from) // Trop verbeux
      } catch (error) {
        log('Error adding ICE candidate from', from, ':', error.message)
      }
    }
  })
})

onBeforeUnmount(() => {
  Object.values(pcs).forEach((pc) => pc.close())
  if (localStream) localStream.getTracks().forEach((t) => t.stop())
  socket.disconnect()
})
</script>
