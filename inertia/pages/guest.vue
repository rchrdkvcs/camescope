<script setup>
import { ref, onMounted } from 'vue'
import { socket } from '~/composables/use_socket.js'

const props = defineProps({ roomId: String })
const preview = ref(null)

let pc

onMounted(async () => {
  pc = new RTCPeerConnection({
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'turn:turn.cloudflare.com:3478', username: 'xxx', credential: 'yyy' },
    ],
  })

  // capture caméra
  const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
  if (preview.value) preview.value.srcObject = stream
  stream.getTracks().forEach((track) => pc.addTrack(track, stream))

  // ICE
  pc.onicecandidate = (e) => {
    if (e.candidate) {
      socket.emit('ice-candidate', { roomId: props.roomId, candidate: e.candidate })
    }
  }

  // Answer reçue
  socket.on('answer', async ({ answer }) => {
    await pc.setRemoteDescription(new RTCSessionDescription(answer))
  })

  // Start
  socket.emit('join', props.roomId)
  const offer = await pc.createOffer()
  await pc.setLocalDescription(offer)
  socket.emit('offer', { roomId: props.roomId, offer })
})
</script>

<template>
  <div>
    <h1>Invité - Room {{ roomId }}</h1>
    <video ref="preview" autoplay class="w-full" muted playsinline></video>
  </div>
</template>
