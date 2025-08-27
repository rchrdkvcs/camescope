<script setup>
import { ref, onMounted, computed } from 'vue'
import { socket } from '~/composables/use_socket.js'

// State
const sessions = ref([])
const layouts = ref([])
const currentSession = ref(null)
const currentLayout = ref(null)
const selectedSessionForSwitch = ref(null)
const logs = ref([])
const showLogs = computed(() => process.env.NODE_ENV === 'development')
const showCreateModal = ref(false)
const newSessionForm = ref({
  name: '',
  maxParticipants: 10
})

// Status indicators
const isLive = computed(() => currentSession.value?.status === 'active')

// Methods
function log(...args) {
  console.log('[ADMIN]', ...args)
}

function getStatusClass(status) {
  const classes = {
    draft: 'bg-gray-600 text-gray-300',
    active: 'bg-green-600 text-green-100',
    finished: 'bg-red-600 text-red-100',
  }
  return classes[status] || 'bg-gray-600'
}

// Session management
function openCreateModal() {
  newSessionForm.value.name = `Session ${new Date().toLocaleString()}`
  showCreateModal.value = true
}

async function createNewSession() {
  try {
    log('Sending data:', {
      name: newSessionForm.value.name,
      maxParticipants: newSessionForm.value.maxParticipants,
    })
    
    const response = await fetch('/api/sessions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: newSessionForm.value.name,
        maxParticipants: newSessionForm.value.maxParticipants,
      }),
    })
    
    log('Response status:', response.status)
    const responseData = await response.json()
    log('Response data:', responseData)
    
    if (!response.ok) {
      log('Erreur API:', responseData.error, responseData.details)
      return
    }
    
    sessions.value.push(responseData)
    showCreateModal.value = false
    newSessionForm.value.name = ''
    newSessionForm.value.maxParticipants = 10
    log('Session créée:', responseData.name, 'ID:', responseData.id, 'Slug:', responseData.roomSlug)
  } catch (error) {
    log('Erreur création session:', error.message)
  }
}

function cancelCreate() {
  showCreateModal.value = false
  newSessionForm.value.name = ''
  newSessionForm.value.maxParticipants = 10
}


function selectSession(session) {
  currentSession.value = session
  log('Session sélectionnée:', session.name)
}

async function switchToSession(session) {
  try {
    socket.emit('switchProgram', session.roomSlug)
    currentSession.value = session
    log('Switched to session:', session.name, 'Slug:', session.roomSlug)
  } catch (error) {
    log('Erreur switch session:', error.message)
  }
}

function quickSwitchToSession() {
  if (selectedSessionForSwitch.value) {
    switchToSession(selectedSessionForSwitch.value)
  }
}

function stop() {
  socket.emit('switchProgram', null)
  currentSession.value = null
  log('Stopped all programs')
}

// Layout management
function selectLayout(layout) {
  currentLayout.value = layout
  log('Layout sélectionné:', layout.name)
}

async function applyLayout(layout) {
  try {
    socket.emit('applyLayout', layout)
    currentLayout.value = layout
    log('Layout appliqué:', layout.name)
  } catch (error) {
    log('Erreur application layout:', error.message)
  }
}

// Data loading
async function loadSessions() {
  try {
    const response = await fetch('/api/sessions')
    sessions.value = await response.json()
    log('Sessions chargées:', sessions.value.length)
  } catch (error) {
    log('Erreur chargement sessions:', error.message)
    // Données de test en cas d'erreur
    sessions.value = [
      {
        id: 1,
        name: 'Tournoi Test A',
        roomId: 'A',
        status: 'active',
        currentParticipants: 5,
        maxParticipants: 10,
      },
      {
        id: 2,
        name: 'Tournoi Test B',
        roomId: 'B',
        status: 'draft',
        currentParticipants: 2,
        maxParticipants: 8,
      },
    ]
  }
}

async function loadLayouts() {
  try {
    const response = await fetch('/api/layouts')
    layouts.value = await response.json()
    log('Layouts chargés:', layouts.value.length)
  } catch (error) {
    log('Erreur chargement layouts:', error.message)
    // Données de test en cas d'erreur
    layouts.value = [
      {
        id: 1,
        name: '2 Caméras Split',
        config: { maxCameras: 2 },
      },
      {
        id: 2,
        name: '5x5 Gauche-Droite',
        config: { maxCameras: 10 },
      },
      {
        id: 3,
        name: 'Principal + 4 Secondaires',
        config: { maxCameras: 5 },
      },
    ]
  }
}

onMounted(() => {
  socket.on('connect', () => log('Admin connected', socket.id))
  loadSessions()
  loadLayouts()
})
</script>

<template>
  <div class="min-h-screen bg-gray-900 text-white">
    <!-- Header -->
    <header class="bg-gray-800 shadow-lg">
      <div class="max-w-7xl mx-auto px-4 py-6">
        <h1 class="text-3xl font-bold text-white">Dashboard Admin - Camescope</h1>
        <p class="text-gray-400 mt-2">Gestion des sessions de tournois et streaming live</p>
      </div>
    </header>

    <div class="max-w-7xl mx-auto px-4 py-8">
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <!-- Sessions Panel -->
        <div class="lg:col-span-2">
          <div class="bg-gray-800 rounded-lg shadow-lg p-6">
            <div class="flex items-center justify-between mb-6">
              <h2 class="text-xl font-semibold flex items-center">
                <svg class="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    d="M15 10l4.5-4.5M21 6l-6 6-6-6 6-6z"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                  />
                </svg>
                Sessions Actives
              </h2>
              <button
                class="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition-colors"
                @click="openCreateModal"
              >
                + Nouvelle Session
              </button>
            </div>

            <!-- Sessions List -->
            <div class="space-y-4">
              <div
                v-for="session in sessions"
                :key="session.id"
                :class="{ 'ring-2 ring-blue-500': currentSession?.id === session.id }"
                class="bg-gray-700 rounded-lg p-4 cursor-pointer hover:bg-gray-600 transition-colors"
                @click="selectSession(session)"
              >
                <div class="flex items-center justify-between">
                  <div>
                    <h3 class="font-medium">{{ session.name }}</h3>
                    <p class="text-sm text-gray-400">
                      Slug: {{ session.roomSlug }} • {{ session.currentParticipants || 0 }}/{{
                        session.maxParticipants
                      }}
                      participants
                    </p>
                  </div>
                  <div class="flex items-center space-x-2">
                    <span
                      :class="getStatusClass(session.status)"
                      class="px-2 py-1 text-xs rounded-full"
                    >
                      {{ session.status }}
                    </span>
                    <button
                      v-if="session.status === 'active'"
                      class="bg-green-600 hover:bg-green-700 px-3 py-1 text-sm rounded transition-colors"
                      @click.stop="switchToSession(session)"
                    >
                      📺 Live
                    </button>
                  </div>
                </div>
              </div>

              <!-- Empty state -->
              <div v-if="sessions.length === 0" class="text-center py-12 text-gray-400">
                <svg
                  class="w-16 h-16 mx-auto mb-4 opacity-50"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                  />
                </svg>
                <p>Aucune session créée</p>
                <button class="mt-4 text-blue-400 hover:text-blue-300" @click="openCreateModal">
                  Créer votre première session
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Control Panel -->
        <div class="space-y-6">
          <!-- Live Control -->
          <div class="bg-gray-800 rounded-lg shadow-lg p-6">
            <h3 class="text-lg font-semibold mb-4 flex items-center">
              <div
                :class="isLive ? 'bg-red-500 animate-pulse' : 'bg-gray-500'"
                class="w-3 h-3 rounded-full mr-2"
              ></div>
              Contrôle Live
            </h3>

            <div class="space-y-4">
              <div>
                <label class="block text-sm text-gray-400 mb-2">Session active</label>
                <div class="text-lg font-medium">
                  {{ currentSession?.name || 'Aucune session' }}
                </div>
              </div>

              <div class="flex space-x-2">
                <button
                  :disabled="!isLive"
                  class="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed px-4 py-2 rounded-lg transition-colors"
                  @click="stop"
                >
                  ⏹ Stop
                </button>
              </div>
            </div>
          </div>

          <!-- Quick Session Switch -->
          <div class="bg-gray-800 rounded-lg shadow-lg p-6">
            <h3 class="text-lg font-semibold mb-4">Switch Rapide</h3>
            <div class="space-y-3">
              <select
                v-model="selectedSessionForSwitch"
                class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
              >
                <option :value="null" disabled>Sélectionner une session...</option>
                <option 
                  v-for="session in sessions.filter(s => s.status !== 'finished')" 
                  :key="session.id"
                  :value="session"
                >
                  {{ session.name }} ({{ session.roomSlug }})
                </option>
              </select>
              <button
                :disabled="!selectedSessionForSwitch"
                class="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed px-4 py-2 rounded-lg transition-colors"
                @click="quickSwitchToSession"
              >
                🔄 Switch
              </button>
            </div>
          </div>

          <!-- Layouts -->
          <div class="bg-gray-800 rounded-lg shadow-lg p-6">
            <h3 class="text-lg font-semibold mb-4">Layouts</h3>
            <div class="space-y-2">
              <div
                v-for="layout in layouts"
                :key="layout.id"
                :class="{ 'ring-2 ring-blue-500': currentLayout?.id === layout.id }"
                class="flex items-center justify-between p-3 bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-600 transition-colors"
                @click="selectLayout(layout)"
              >
                <div>
                  <div class="font-medium">{{ layout.name }}</div>
                  <div class="text-xs text-gray-400">
                    {{ layout.config.maxCameras }} caméras max
                  </div>
                </div>
                <button
                  class="bg-green-600 hover:bg-green-700 px-2 py-1 text-xs rounded transition-colors"
                  @click.stop="applyLayout(layout)"
                >
                  Appliquer
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Debug Logs (dev only) -->
      <div v-if="showLogs && logs.length > 0" class="mt-8 bg-gray-800 rounded-lg p-4">
        <h3 class="text-sm font-medium mb-2 text-gray-400">Debug Logs</h3>
        <pre class="text-xs text-gray-300 bg-gray-900 rounded p-3 overflow-auto max-h-32">{{
          logs.join('\n')
        }}</pre>
      </div>
    </div>

    <!-- Modal Création Session -->
    <div v-if="showCreateModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div class="bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
        <h3 class="text-xl font-semibold text-white mb-4">Nouvelle Session</h3>
        
        <form @submit.prevent="createNewSession" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">
              Nom de la session
            </label>
            <input
              v-model="newSessionForm.name"
              type="text"
              required
              class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
              placeholder="Ex: Tournoi Weekend Cup"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">
              Nombre max de participants
            </label>
            <input
              v-model.number="newSessionForm.maxParticipants"
              type="number"
              min="1"
              max="50"
              required
              class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div class="flex space-x-3 pt-4">
            <button
              type="button"
              @click="cancelCreate"
              class="flex-1 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              class="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Créer
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
