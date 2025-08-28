<template>
  <div class="admin-page">
    <h1>⚙️ Admin Panel</h1>
    
    <div class="status">{{ status }}</div>
    
    <div class="current-program">
      <h3>Current Program</h3>
      <div class="program-display">
        <strong>{{ currentProgram || 'None' }}</strong>
        <button @click="stopProgram" v-if="currentProgram" class="stop-btn">Stop</button>
      </div>
    </div>
    
    <div class="rooms-section">
      <h3>Available Rooms</h3>
      <div v-if="rooms.length === 0" class="no-rooms">
        No active rooms found. Guests need to join first.
      </div>
      <div v-else class="rooms-list">
        <div 
          v-for="room in rooms" 
          :key="room"
          class="room-item"
          :class="{ active: room === currentProgram }"
        >
          <div class="room-name">📺 Room: {{ room }}</div>
          <button 
            @click="switchToRoom(room)" 
            :disabled="room === currentProgram"
            class="switch-btn"
          >
            {{ room === currentProgram ? 'Current' : 'Switch To' }}
          </button>
        </div>
      </div>
    </div>
    
    <div class="manual-switch">
      <h3>Manual Program Switch</h3>
      <div class="switch-controls">
        <input 
          v-model="manualRoom" 
          placeholder="Enter room ID (e.g., room1)"
          class="room-input"
        />
        <button @click="switchToManualRoom" :disabled="!manualRoom">
          Switch
        </button>
      </div>
    </div>
    
    <div class="logs">
      <div v-for="log in logs" :key="log">{{ log }}</div>
    </div>
  </div>
</template>

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
  console.log('[ADMIN]', ...args)
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

<style scoped>
.admin-page {
  padding: 20px;
  max-width: 800px;
  margin: 0 auto;
}

h1 {
  color: #333;
  margin-bottom: 20px;
}

h3 {
  margin: 20px 0 10px 0;
  color: #555;
}

.status {
  background: #f0f0f0;
  padding: 10px;
  border-radius: 5px;
  margin-bottom: 20px;
  font-weight: bold;
}

.current-program {
  background: #e8f4f8;
  padding: 15px;
  border-radius: 8px;
  margin-bottom: 20px;
}

.program-display {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.stop-btn {
  background: #dc3545;
  color: white;
  border: none;
  padding: 8px 15px;
  border-radius: 4px;
  cursor: pointer;
}

.stop-btn:hover {
  background: #c82333;
}

.rooms-section {
  background: #f8f9fa;
  padding: 15px;
  border-radius: 8px;
  margin-bottom: 20px;
}

.no-rooms {
  color: #666;
  font-style: italic;
  padding: 10px;
}

.rooms-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.room-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 5px;
  background: white;
}

.room-item.active {
  border-color: #007bff;
  background: #e3f2fd;
}

.room-name {
  font-weight: 500;
}

.switch-btn {
  background: #007bff;
  color: white;
  border: none;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
}

.switch-btn:disabled {
  background: #6c757d;
  cursor: not-allowed;
}

.switch-btn:not(:disabled):hover {
  background: #0056b3;
}

.manual-switch {
  background: #fff3cd;
  padding: 15px;
  border-radius: 8px;
  margin-bottom: 20px;
}

.switch-controls {
  display: flex;
  gap: 10px;
  align-items: center;
}

.room-input {
  flex: 1;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

button {
  padding: 8px 15px;
  background: #28a745;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

button:disabled {
  background: #6c757d;
  cursor: not-allowed;
}

button:not(:disabled):hover {
  opacity: 0.9;
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