<script setup>
import { ref, onMounted } from 'vue'
import { socket } from '~/composables/use_socket.js'

const props = defineProps({ roomId: String })
const remote = ref(null)

let pc

onMounted(() => {
  pc = new RTCPeerConnection({
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'turn:turn.cloudflare.com:3478', username: 'xxx', credential: 'yyy' },
    ],
  })

  pc.ontrack = (e) => {
    if (remote.value) remote.value.srcObject = e.streams[0]
  }

  pc.onicecandidate = (e) => {
    if (e.candidate) {
      socket.emit('ice-candidate', { roomId: props.roomId, candidate: e.candidate })
    }
  }

  // Offre reçue → répondre
  socket.on('offer', async ({ offer }) => {
    await pc.setRemoteDescription(new RTCSessionDescription(offer))
    const answer = await pc.createAnswer()
    await pc.setLocalDescription(answer)
    socket.emit('answer', { roomId: props.roomId, answer })
  })

  socket.on('ice-candidate', async ({ candidate }) => {
    await pc.addIceCandidate(new RTCIceCandidate(candidate))
  })

  socket.emit('join', props.roomId)
})
</script>

<template>
  <div>
    <h1>OBS - Room {{ roomId }}</h1>
    <video ref="remote" autoplay class="w-full" playsinline></video>
  </div>
</template>
