<template>
  <div>
    <h2>OBS Viewer</h2>
    <div id="videos" style="display: flex; flex-wrap: wrap; gap: 8px"></div>
    <pre>{{ logs.join('\n') }}</pre>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { socket } from '~/composables/use_socket.js'

const logs = ref([])
const pcs = {}
const videoEls = {}

function log(...args) {
  logs.value.push(`[${new Date().toLocaleTimeString()}] ${args.join(' ')}`)
}

function createVideoElement(guestId) {
  const container = document.getElementById('videos')
  const v = document.createElement('video')
  v.autoplay = true
  v.playsInline = true
  v.id = `video-${guestId}`
  v.style.width = '320px'
  v.style.height = '180px'
  v.style.background = '#000'
  container.appendChild(v)
  videoEls[guestId] = v
  return v
}

async function createOfferToGuest(guestId) {
  // Fermer l'ancienne connexion s'il y en a une
  if (pcs[guestId]) {
    pcs[guestId].close()
    log('Closed existing connection with', guestId)
  }
  
  log('Creating offer for guest', guestId)
  
  // Créer l'élément vidéo en avance - vérifier que l'élément existe vraiment dans le DOM
  if (!videoEls[guestId] || !document.getElementById(`video-${guestId}`)) {
    createVideoElement(guestId)
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
    videoEls[guestId].remove()
    delete videoEls[guestId]
  }
  log('Closed guest', guestId)
}

onMounted(() => {
  socket.on('connect', () => {
    log('OBS connected', socket.id)
    socket.emit('joinObs')
  })

  socket.on('switchProgram', (roomId, guestList) => {
    log('SwitchProgram to room', roomId, 'with', guestList.length, 'guests')
    
    // Fermer toutes les connexions existantes
    Object.keys(pcs).forEach(closeGuest)
    
    // Nettoyage complet du container vidéo pour éviter les éléments orphelins
    const container = document.getElementById('videos')
    if (container) {
      container.innerHTML = ''
    }
    
    // Nettoyer également les références aux éléments vidéo
    Object.keys(videoEls).forEach(guestId => delete videoEls[guestId])
    
    // Créer de nouvelles connexions pour tous les guests de la nouvelle room
    guestList.forEach(createOfferToGuest)
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
