<template>
  <div class="obs-page">
    <h1>📺 OBS Viewer</h1>
    
    <div class="status">{{ status }}</div>
    
    <div class="program-info">
      <strong>Program:</strong> {{ currentProgram || 'None selected' }}
      <span v-if="videoCount > 0">({{ videoCount }} feeds)</span>
    </div>
    
    <div class="videos" v-if="videoCount > 0">
      <div 
        v-for="(streamData, producerId) in streams" 
        :key="producerId"
        class="video-item"
      >
        <video 
          :ref="el => setVideoRef(producerId, el)"
          autoplay 
          playsinline 
          muted
        ></video>
        <div class="video-label">{{ producerId.slice(-8) }}</div>
      </div>
    </div>
    
    <div v-else class="no-feeds">
      <div class="icon">📷</div>
      <p>No live feeds</p>
      <small>Waiting for admin to select a program...</small>
    </div>
    
    <div class="logs">
      <div v-for="log in logs" :key="log">{{ log }}</div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import mediasoup from '~/composables/use_mediasoup'

const status = ref('Connecting...')
const currentProgram = ref(null)
const streams = ref({})
const videoElements = ref({})
const logs = ref([])

const videoCount = computed(() => Object.keys(streams.value).length)

function log(...args) {
  const msg = `[${new Date().toLocaleTimeString()}] ${args.join(' ')}`
  logs.value.push(msg)
  console.log('[OBS]', ...args)
}

function setVideoRef(producerId, el) {
  if (el) videoElements.value[producerId] = el
}

async function init() {
  try {
    await mediasoup.init()
    await mediasoup.joinObs()
    
    status.value = 'Connected - Waiting for program'
    log('OBS connected and ready')
    
  } catch (error) {
    status.value = 'Error: ' + error.message
    log('Error:', error.message)
  }
}

async function consumeProducer(producerId) {
  try {
    log('Consuming producer:', producerId)
    
    const { consumer, stream } = await mediasoup.consume(producerId)
    
    streams.value[producerId] = { consumer, stream }
    
    // Wait for DOM update then attach stream
    await nextTick()
    const videoEl = videoElements.value[producerId]
    if (videoEl) {
      videoEl.srcObject = stream
      log('Stream attached for:', producerId)
    }
    
  } catch (error) {
    log('Error consuming:', producerId, error.message)
  }
}

function removeConsumer(producerId) {
  const streamData = streams.value[producerId]
  if (streamData) {
    const videoEl = videoElements.value[producerId]
    if (videoEl) videoEl.srcObject = null
    
    delete streams.value[producerId]
    delete videoElements.value[producerId]
    log('Removed consumer:', producerId)
  }
}

// Event handlers
function handleNewProgram(data) {
  log('New program:', data.roomId, 'producers:', data.producers.length)
  currentProgram.value = data.roomId
  status.value = '🔴 Broadcasting: ' + data.roomId
  
  // Clear old streams
  Object.keys(streams.value).forEach(removeConsumer)
  
  // Consume all producers
  data.producers.forEach(consumeProducer)
}

function handleExistingProducers(data) {
  log('Existing producers:', data.producers.length)
  currentProgram.value = data.roomId
  status.value = '🔴 Broadcasting: ' + data.roomId
  
  data.producers.forEach(consumeProducer)
}

function handleNewProducer(data) {
  if (data.roomId === currentProgram.value) {
    log('New producer in current program:', data.producerId)
    consumeProducer(data.producerId)
  }
}

onMounted(() => {
  log('OBS page loaded')
  
  // Setup event listeners
  mediasoup.onNewProgram(handleNewProgram)
  mediasoup.onExistingProducers(handleExistingProducers)
  mediasoup.onNewProducer(handleNewProducer)
  
  init()
})

onBeforeUnmount(() => {
  Object.keys(streams.value).forEach(removeConsumer)
  mediasoup.cleanup()
  log('OBS cleanup done')
})
</script>

<style scoped>
.obs-page {
  padding: 20px;
  max-width: 1200px;
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
  margin-bottom: 15px;
  font-weight: bold;
}

.program-info {
  background: #e8f4f8;
  padding: 10px;
  border-radius: 5px;
  margin-bottom: 20px;
}

.videos {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 15px;
  margin-bottom: 20px;
}

.video-item {
  border: 1px solid #ddd;
  border-radius: 8px;
  overflow: hidden;
  background: #f8f9fa;
}

video {
  width: 100%;
  height: 200px;
  background: #000;
  object-fit: cover;
}

.video-label {
  padding: 8px;
  font-size: 12px;
  font-family: monospace;
  background: #f8f9fa;
  border-top: 1px solid #ddd;
}

.no-feeds {
  text-align: center;
  padding: 60px 20px;
  color: #666;
}

.no-feeds .icon {
  font-size: 48px;
  margin-bottom: 15px;
}

.logs {
  background: #f8f9fa;
  padding: 15px;
  border-radius: 5px;
  max-height: 200px;
  overflow-y: auto;
  font-family: monospace;
  font-size: 11px;
  line-height: 1.3;
}
</style>