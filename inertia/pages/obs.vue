<template>
  <div class="relative w-full h-screen bg-gray-900 overflow-hidden">
    <!-- Background -->
    <div 
      v-if="currentLayout?.config?.background" 
      class="absolute inset-0 z-0"
      :style="getBackgroundStyle()"
    ></div>

    <!-- Video Container with Layout -->
    <div 
      id="videos-container" 
      class="relative w-full h-full"
      :style="{ backgroundColor: currentLayout?.config?.background?.value || '#000000' }"
    >
      <!-- Videos positioned by layout -->
      <div 
        v-for="(video, index) in positionedVideos" 
        :key="video.guestId"
        class="absolute transition-all duration-300 ease-in-out"
        :style="getVideoPositionStyle(video.position)"
      >
        <video 
          :id="`video-${video.guestId}`"
          autoplay 
          playsinline 
          muted
          class="w-full h-full object-cover rounded-lg shadow-lg"
          :style="{ backgroundColor: '#1a1a1a' }"
        ></video>
        
        <!-- Guest Info Overlay -->
        <div v-if="showOverlays" class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
          <div class="text-white text-xs font-medium">Guest {{ video.guestId.slice(-4) }}</div>
        </div>
      </div>

      <!-- Layout Info -->
      <div v-if="currentLayout && showDebug" class="absolute top-4 right-4 bg-black/70 text-white p-3 rounded-lg text-sm">
        <div>Layout: {{ currentLayout.name }}</div>
        <div>Max Cameras: {{ currentLayout.config.maxCameras }}</div>
        <div>Active Videos: {{ positionedVideos.length }}</div>
      </div>

      <!-- No Layout Message -->
      <div v-if="!currentLayout" class="absolute inset-0 flex items-center justify-center">
        <div class="text-center text-white/70">
          <svg class="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.5-4.5M21 6l-6 6-6-6 6-6z" />
          </svg>
          <p class="text-xl">En attente de layout...</p>
          <p class="text-sm mt-2">Sélectionnez un layout depuis l'admin</p>
        </div>
      </div>
    </div>

    <!-- Debug Panel (dev only) -->
    <div v-if="showDebug && logs.length > 0" class="absolute bottom-4 left-4 bg-black/80 text-white p-4 rounded-lg max-w-md max-h-48 overflow-auto">
      <div class="text-xs font-mono">
        <div v-for="log in logs.slice(-10)" :key="log" class="mb-1">{{ log }}</div>
      </div>
    </div>

    <!-- Controls -->
    <div class="absolute top-4 left-4 flex space-x-2">
      <button 
        @click="toggleOverlays" 
        class="bg-black/50 hover:bg-black/70 text-white px-3 py-1 rounded text-sm transition-colors"
      >
        {{ showOverlays ? '🏷️' : '🏷️' }} Infos
      </button>
      <button 
        @click="toggleDebug" 
        class="bg-black/50 hover:bg-black/70 text-white px-3 py-1 rounded text-sm transition-colors"
      >
        {{ showDebug ? '🐛' : '🐛' }} Debug
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, computed, nextTick } from 'vue'
import { socket } from '~/composables/use_socket.js'

// State
const logs = ref([])
const currentLayout = ref(null)
const activeGuests = ref([])
const showOverlays = ref(false)
const showDebug = ref(false)

// WebRTC
const pcs = {}
const videoEls = {}

// Computed
const positionedVideos = computed(() => {
  if (!currentLayout.value?.config?.positions) return []
  
  const positions = currentLayout.value.config.positions
  const maxVideos = Math.min(activeGuests.value.length, positions.length)
  
  return activeGuests.value.slice(0, maxVideos).map((guestId, index) => ({
    guestId,
    position: positions[index]
  }))
})

// Methods
function log(...args) {
  console.log('[OBS]', ...args)
}

function toggleOverlays() {
  showOverlays.value = !showOverlays.value
}

function toggleDebug() {
  showDebug.value = !showDebug.value
}

function getBackgroundStyle() {
  if (!currentLayout.value?.config?.background) return {}
  
  const bg = currentLayout.value.config.background
  switch (bg.type) {
    case 'color':
      return { backgroundColor: bg.value }
    case 'image':
      return { 
        backgroundImage: `url(${bg.value})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }
    case 'video':
      return {} // TODO: Implémenter vidéo de fond
    default:
      return {}
  }
}

function getVideoPositionStyle(position) {
  return {
    left: `${position.x}%`,
    top: `${position.y}%`,
    width: `${position.width}%`,
    height: `${position.height}%`,
    zIndex: position.zIndex || 1
  }
}

function createVideoElement(guestId) {
  const videoElement = document.getElementById(`video-${guestId}`)
  if (videoElement) {
    videoEls[guestId] = videoElement
    return videoElement
  }
  
  // Si l'élément n'existe pas dans le template, c'est un problème
  log('Error: Video element not found for', guestId)
  return null
}

function updateLayout(layout) {
  currentLayout.value = layout
  log('Layout updated:', layout?.name || 'None')
  
  // Réorganiser les vidéos selon le nouveau layout
  reorganizeVideos()
}

function reorganizeVideos() {
  if (!currentLayout.value) return
  
  // Mettre à jour la liste des guests actifs pour déclencher le re-render
  activeGuests.value = [...activeGuests.value]
}

async function createOfferToGuest(guestId) {
  // Fermer l'ancienne connexion s'il y en a une
  if (pcs[guestId]) {
    pcs[guestId].close()
    log('Closed existing connection with', guestId)
  }
  
  log('Creating offer for guest', guestId)
  
  // Ajouter le guest à la liste active s'il n'y est pas déjà
  if (!activeGuests.value.includes(guestId)) {
    activeGuests.value.push(guestId)
  }
  
  // Attendre que Vue mette à jour le DOM
  await nextTick()
  
  // Récupérer l'élément vidéo du DOM
  const videoElement = document.getElementById(`video-${guestId}`)
  if (videoElement) {
    videoEls[guestId] = videoElement
  } else {
    log('Warning: Video element not found for', guestId)
  }
  
  const pc = new RTCPeerConnection({ 
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
  })
  pcs[guestId] = pc

  pc.ontrack = (e) => {
    log('Track event received from', guestId, 'streams:', e.streams.length)
    const v = videoEls[guestId]
    if (v && e.streams[0]) {
      v.srcObject = e.streams[0]
      log('Video stream attached to element for', guestId)
    } else {
      log('Error: No video element or stream for', guestId)
    }
  }

  pc.onicecandidate = (e) => {
    if (e.candidate) {
      socket.emit('ice-candidate', { to: guestId, candidate: e.candidate })
      // log('ICE candidate sent to', guestId, 'type:', e.candidate.type) // Trop verbeux
    } else {
      log('ICE gathering finished for', guestId)
    }
  }

  pc.onconnectionstatechange = () => {
    log('Connection state for', guestId, ':', pc.connectionState)
  }

  pc.onicegatheringstatechange = () => {
    // log('ICE gathering state for', guestId, ':', pc.iceGatheringState) // Moins critique
  }

  pc.oniceconnectionstatechange = () => {
    log('ICE connection state for', guestId, ':', pc.iceConnectionState)
    
    // Tentative de reconnexion automatique si la connexion échoue
    if (pc.iceConnectionState === 'failed') {
      log('Connection failed, attempting reconnection for', guestId)
      setTimeout(() => {
        if (pcs[guestId] === pc) { // Vérifier que la connexion n'a pas été remplacée
          closeGuest(guestId)
          createOfferToGuest(guestId)
        }
      }, 2000)
    }
  }

  try {
    const offer = await pc.createOffer({ 
      offerToReceiveAudio: true, 
      offerToReceiveVideo: true 
    })
    log('Offer created for', guestId, 'SDP type:', offer.type)
    await pc.setLocalDescription(offer)
    log('Local description set for', guestId, 'gathering state:', pc.iceGatheringState)
    
    socket.emit('offer', { to: guestId, sdp: pc.localDescription })
    log('Offer sent to', guestId)
  } catch (error) {
    log('Error creating offer for', guestId, ':', error.message)
  }
}

function closeGuest(guestId) {
  if (pcs[guestId]) {
    pcs[guestId].close()
    delete pcs[guestId]
  }
  if (videoEls[guestId]) {
    delete videoEls[guestId]
  }
  
  // Retirer le guest de la liste active
  const index = activeGuests.value.indexOf(guestId)
  if (index > -1) {
    activeGuests.value.splice(index, 1)
  }
  
  log('Closed guest', guestId)
}

onMounted(async () => {
  socket.on('connect', () => {
    log('OBS connected', socket.id)
    socket.emit('joinObs')
  })

  // Charger le layout par défaut
  try {
    const response = await fetch('/api/layouts?type=preset')
    const layouts = await response.json()
    const defaultLayout = layouts.find(l => l.isDefault) || layouts[0]
    if (defaultLayout) {
      updateLayout(defaultLayout)
    }
  } catch (error) {
    log('Error loading default layout:', error.message)
    // Layout de fallback
    updateLayout({
      name: 'Layout par défaut',
      config: {
        maxCameras: 4,
        positions: [
          { x: 0, y: 0, width: 50, height: 50, zIndex: 1 },
          { x: 50, y: 0, width: 50, height: 50, zIndex: 1 },
          { x: 0, y: 50, width: 50, height: 50, zIndex: 1 },
          { x: 50, y: 50, width: 50, height: 50, zIndex: 1 }
        ]
      }
    })
  }

  socket.on('switchProgram', (roomId, guestList) => {
    log('SwitchProgram to room', roomId, 'with', guestList.length, 'guests')
    
    // Fermer toutes les connexions existantes
    Object.keys(pcs).forEach(closeGuest)
    
    // Nettoyer les références aux éléments vidéo
    Object.keys(videoEls).forEach(guestId => delete videoEls[guestId])
    
    // Vider la liste des guests actifs
    activeGuests.value = []
    
    // Créer de nouvelles connexions pour tous les guests de la nouvelle room
    guestList.forEach(createOfferToGuest)
  })

  socket.on('applyLayout', (layout) => {
    log('Layout applied from admin:', layout.name)
    updateLayout(layout)
  })

  socket.on('newGuest', createOfferToGuest)
  socket.on('guestLeft', closeGuest)

  socket.on('answer', async ({ from, sdp }) => {
    const pc = pcs[from]
    if (pc) {
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(sdp))
        log('Answer applied from', from)
      } catch (error) {
        log('Error setting remote description from', from, ':', error.message)
      }
    } else {
      log('No peer connection found for', from)
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
  Object.keys(pcs).forEach(closeGuest)
  socket.disconnect()
})
</script>
