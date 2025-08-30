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

const cams = computed(() => {
  return Object.entries(streams.value).slice(0, 5)
})
</script>

<template>
  <div class="relative h-screen w-full">
    <!-- Left side group (5 cameras) -->
    <div class="absolute top-1/2 left-4 flex flex-col gap-6 -translate-y-1/2">
      <div
        v-for="([producerId, streamData], idx) in cams"
        :key="'left-' + producerId"
        class="relative"
      >
        <video
          :ref="(el) => setVideoRef(producerId, el)"
          autoplay
          class="w-52 aspect-video rounded-sm object-cover"
          muted
          playsinline
        ></video>
        <UBadge
          :label="producerId.slice(0, 8)"
          class="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2"
          color="neutral"
          size="sm"
          variant="soft"
        />
      </div>
    </div>
  </div>
</template>
