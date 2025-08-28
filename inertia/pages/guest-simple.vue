<template>
  <div class="guest-page">
    <h1>🎥 Guest - Room {{ roomId }}</h1>

    <div class="status">{{ status }}</div>

    <div class="video-section">
      <video ref="video" autoplay muted playsinline></video>
      <div class="controls">
        <button @click="start" :disabled="streaming">Start</button>
        <button @click="stop" :disabled="!streaming">Stop</button>
      </div>
    </div>

    <div class="logs">
      <div v-for="log in logs" :key="log">{{ log }}</div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import mediasoup from '~/composables/use_mediasoup'

const props = defineProps(['roomId'])

const video = ref()
const status = ref('Ready')
const streaming = ref(false)
const logs = ref([])

let stream = null

function log(...args) {
  const msg = `[${new Date().toLocaleTimeString()}] ${args.join(' ')}`
  logs.value.push(msg)
}

async function start() {
  try {
    status.value = 'Getting camera...'

    stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    })
    video.value.srcObject = stream
    log('Got media stream')

    status.value = 'Connecting...'
    await mediasoup.init()
    await mediasoup.joinRoom(props.roomId)
    log('Connected to room')

    status.value = 'Streaming...'
    await mediasoup.produce(stream)
    log('Started producing')

    streaming.value = true
    status.value = '🔴 LIVE'
  } catch (error) {
    status.value = 'Error: ' + error.message
    log('Error:', error.message)
  }
}

function stop() {
  if (stream) {
    stream.getTracks().forEach((track) => track.stop())
    stream = null
  }

  mediasoup.cleanup()
  streaming.value = false
  status.value = 'Stopped'
  log('Stopped streaming')
}

onMounted(() => {
  log('Guest page loaded for room:', props.roomId)
})

onBeforeUnmount(() => {
  stop()
})
</script>

<style scoped>
.guest-page {
  padding: 20px;
  max-width: 800px;
  margin: 0 auto;
}

h1 {
  color: #333;
  margin-bottom: 20px;
}

.status {
  background: #f0f0f0;
  padding: 10px;
  border-radius: 5px;
  margin-bottom: 20px;
  font-weight: bold;
}

.video-section {
  margin-bottom: 20px;
}

video {
  width: 100%;
  max-width: 640px;
  height: auto;
  background: #000;
  border-radius: 8px;
}

.controls {
  margin-top: 10px;
}

button {
  padding: 10px 20px;
  margin-right: 10px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 16px;
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

button:not(:disabled):hover {
  background: #ddd;
}

.logs {
  background: #f8f9fa;
  padding: 15px;
  border-radius: 5px;
  max-height: 300px;
  overflow-y: auto;
  font-family: monospace;
  font-size: 12px;
  line-height: 1.4;
}
</style>
