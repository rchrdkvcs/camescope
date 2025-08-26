<template>
  <div>
    <h2>Admin Panel</h2>
    <input v-model="room" placeholder="Room to broadcast" />
    <button @click="switchRoom">Switch</button>
    <button @click="stop">Stop</button>
    <pre>{{ logs.join('\n') }}</pre>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { socket } from '~/composables/use_socket.js'

const room = ref('')
const logs = ref([])

function log(...args) {
  logs.value.push(`[${new Date().toLocaleTimeString()}] ${args.join(' ')}`)
}

function switchRoom() {
  if (room.value) {
    socket.emit('switchProgram', room.value)
    log('Switched to', room.value)
  }
}

function stop() {
  socket.emit('switchProgram', null)
  log('Stopped program')
}

onMounted(() => {
  socket.on('connect', () => log('Admin connected', socket.id))
})
</script>
