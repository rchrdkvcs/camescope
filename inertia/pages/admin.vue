<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { socket } from '~/composables/use_socket'

const status = ref('Connecting...')
const currentProgram = ref(null)
const rooms = ref([])
const manualRoom = ref('')
const logs = ref([])

function log(...args) {
  const msg = `[${new Date().toLocaleTimeString()}] ${args.join(' ')}`
  logs.value.push(msg)
}

function switchToRoom(roomId) {
  socket.emit('switchProgram', roomId)
  log('Switching to room:', roomId)
}

function switchToManualRoom() {
  if (manualRoom.value.trim()) {
    socket.emit('switchProgram', manualRoom.value.trim())
    log('Manual switch to room:', manualRoom.value.trim())
    manualRoom.value = ''
  }
}

function stopProgram() {
  socket.emit('switchProgram', null)
  log('Stopping current program')
}

// Socket event handlers
function handleConnect() {
  status.value = 'Connected'
  log('Admin connected')

  // Join as admin
  socket.emit('joinAdmin')
}

function handleRoomsList(data) {
  rooms.value = data.rooms || []
  currentProgram.value = data.currentProgram
  log('Rooms list received:', rooms.value)
}

function handleProgramSwitched(data) {
  currentProgram.value = data.roomId
  status.value = data.roomId ? `Broadcasting: ${data.roomId}` : 'No program'
  log('Program switched to:', data.roomId)
}

function handleProducerAdded(data) {
  log('New producer:', data.producerId, 'in room:', data.roomId)

  // Update rooms list if new room
  if (!rooms.value.includes(data.roomId)) {
    rooms.value.push(data.roomId)
  }
}

function handlePeerDisconnected(data) {
  log('Peer disconnected from room:', data.roomId)
}

onMounted(() => {
  log('Admin page loaded')

  // Setup socket listeners
  socket.on('connect', handleConnect)
  socket.on('roomsList', handleRoomsList)
  socket.on('programSwitched', handleProgramSwitched)
  socket.on('producerAdded', handleProducerAdded)
  socket.on('peerDisconnected', handlePeerDisconnected)

  // Connect if not already
  if (socket.connected) {
    handleConnect()
  }
})

onBeforeUnmount(() => {
  // Remove listeners
  socket.off('connect', handleConnect)
  socket.off('roomsList', handleRoomsList)
  socket.off('programSwitched', handleProgramSwitched)
  socket.off('producerAdded', handleProducerAdded)
  socket.off('peerDisconnected', handlePeerDisconnected)

  log('Admin cleanup done')
})
</script>

<template>
  <UContainer class="h-screen max-h-screen overflow-hidden w-full flex flex-col gap-8 p-6">
    <div class="flex flex-col w-full gap-4 flex-shrink-0">
      <div class="flex items-center justify-between">
        <h2 class="text-xl font-semibold">Sessions disponible</h2>
        <UBadge :label="status" size="xl" variant="subtle" />
      </div>

      <UAlert
        v-if="rooms.length === 0"
        color="warning"
        description="No rooms available. Please wait for a program to start."
        icon="lucide:x"
        title="No rooms available"
        variant="subtle"
      />

      <div v-else class="flex justify-start items-center gap-4 p-2 overflow-x-auto">
        <div
          v-for="room in rooms"
          :key="room"
          :class="currentProgram === room ? 'ring-2 ring-error' : 'ring-1 ring-default'"
          class="bg-elevated/50 rounded-md p-3 flex flex-col gap-2 w-48 h-24 cursor-pointer hover:bg-elevated transition-all duration-250 ease-in-out"
          @click="switchToRoom(room)"
        >
          <div class="flex flex-col">
            <p class="text-sm text-muted">Sessions</p>
            <p>{{ room }}</p>
          </div>
        </div>
      </div>
    </div>

    <div class="flex flex-col w-full gap-4 flex-1 min-h-0 overflow-auto">
      <div class="flex items-center justify-between">
        <h2 class="text-xl font-semibold">Programme courant</h2>
        <UButton
          v-if="currentProgram"
          color="error"
          icon="lucide:x"
          label="Arrêter la diffusion"
          @click="stopProgram"
        />
      </div>

      <UAlert
        v-if="!currentProgram"
        color="warning"
        description="No program is currently being broadcasted."
        icon="lucide:x"
        title="No program"
        variant="subtle"
      />

      <div class="flex flex-col gap-4 min-h-0 p-2">
        <div
          class="size-full aspect-video bg-elevated/50 ring-1 ring-default rounded-lg flex items-center justify-center"
        >
          <span class="text-xl font-medium">{{ currentProgram }}</span>
        </div>
      </div>
    </div>
  </UContainer>
</template>
