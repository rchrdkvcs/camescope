<script setup>
import { ref, onBeforeUnmount, onMounted } from 'vue'
import mediasoup from '~/composables/use_mediasoup'
import { useQRCode } from '~/composables/use_qrcode.js'

const props = defineProps(['roomId'])

const { getImageUrl } = useQRCode()
const qrCodeUrl = ref('')

const video = ref()
const status = ref('ready')
const streaming = ref(false)
const previewing = ref(false)

let stream = null

async function getCamera() {
  if (stream) {
    stream.getTracks().forEach((track) => track.stop())
    stream = null
  }

  stream = await navigator.mediaDevices.getUserMedia({
    video: {
      width: { ideal: 1920, min: 1280 },
      height: { ideal: 1080, min: 720 },
      aspectRatio: { exact: 16 / 9 },
    },
    audio: false,
  })
  video.value.srcObject = stream
}

async function preview() {
  try {
    status.value = 'accessing camera'
    await getCamera()
    previewing.value = true
    status.value = 'previewing'
  } catch (error) {
    status.value = 'Error: ' + error.message
  }
}

async function start() {
  try {
    if (!stream) {
      status.value = 'accessing camera'
      await getCamera()
    }

    previewing.value = true
    status.value = 'connecting'

    // Reset mediasoup state
    mediasoup.cleanup()
    await mediasoup.init()
    await mediasoup.joinRoom(props.roomId)

    status.value = 'starting streaming'
    await mediasoup.produce(stream)

    streaming.value = true
    status.value = 'streaming'
  } catch (error) {
    status.value = 'Error: ' + error.message
  }
}

function stop() {
  if (stream) {
    stream.getTracks().forEach((track) => track.stop())
    stream = null
  }

  mediasoup.cleanup()
  streaming.value = false
  previewing.value = false
  status.value = 'ready'
}

const getStatus = (status) => {
  switch (status) {
    case 'ready':
      return {
        icon: 'lucide:check',
        label: 'Prêt à démarrer',
        color: 'primary',
      }
    case 'accessing camera':
      return {
        icon: 'lucide:camera',
        label: 'Accès à la caméra en cours...',
        color: 'warning',
      }
    case 'previewing':
      return {
        icon: 'lucide:eye',
        label: 'Aperçu du flux vidéo',
        color: 'info',
      }
    case 'connecting':
      return {
        icon: 'lucide:activity',
        label: 'Connexion au serveur...',
        color: 'info',
      }
    case 'starting streaming':
      return {
        icon: 'lucide:video',
        label: 'Démarrage du partage...',
        color: 'info',
      }
    case 'streaming':
      return {
        icon: 'lucide:activity',
        label: 'Diffusion en cours',
        color: 'success',
      }
    default:
      return {
        icon: 'lucide:x',
        label: 'Erreur',
        color: 'danger',
      }
  }
}

onMounted(async () => {
  try {
    qrCodeUrl.value = await getImageUrl(`${window.origin}/rooms/${props.roomId}/guest`)
  } catch (error) {
    console.error('Erreur lors de la génération du QR code:', error)
  }
})

onBeforeUnmount(() => {
  stop()
})
</script>

<template>
  <UContainer class="flex flex-col items-center justify-center min-h-screen w-full gap-16">
    <div class="header flex items-center justify-between w-full">
      <div class="flex flex-col gap-2">
        <h1 class="text-2xl font-semibold">Rejoindre la diffusion</h1>
        <p class="text-sm text-muted">Session : {{ roomId }}</p>
      </div>

      <UBadge
        :color="getStatus(status).color"
        :icon="getStatus(status).icon"
        :label="getStatus(status).label"
        class="rounded-full"
        size="xl"
        variant="subtle"
      />
    </div>

    <div class="grid grid-cols-4 w-full gap-8">
      <div class="col-span-3 flex flex-col items-center justify-center gap-4 w-full">
        <div
          v-if="!previewing && !streaming"
          class="bg-elevated/50 rounded-lg w-full aspect-video flex flex-col items-center justify-center gap-8 ring-1 ring-default"
        >
          <UIcon class="size-32 text-muted" name="lucide:baby" />
          <div class="flex flex-col items-center justify-center gap-2">
            <p class="text-lg font-semibold">Prêt pour votre moment de gloire ?</p>
            <p class="text-muted">Activez votre caméra pour rejoindre la diffusion en direct</p>
          </div>
        </div>
        <video
          ref="video"
          :class="previewing || streaming ? '' : 'hidden'"
          autoplay
          class="w-full aspect-video rounded-lg ring-1 ring-default"
          muted
          playsinline
        ></video>
      </div>

      <div>
        <UCard class="w-full h-fit" variant="subtle">
          <template #header>
            <h2 class="text-lg font-semibold">Rejoindre depuis mobile</h2>
          </template>

          <div class="flex flex-col gap-6 size-full">
            <img
              v-if="qrCodeUrl"
              :src="qrCodeUrl"
              alt="Generated QR Code"
              class="w-3/4 mx-auto aspect-square flex-1 rounded-sm"
            />
            <div
              v-else
              class="w-3/4 mx-auto aspect-square flex-1 rounded-sm bg-elevated/50 flex items-center justify-center"
            >
              <UIcon class="size-12 text-muted animate-spin" name="lucide:loader-2" />
            </div>

            <UButtonGroup>
              <UInput
                :model-value="`camescope.com/r/${roomId}`"
                class="w-full"
                color="neutral"
                icon="lucide:link"
                readonly
                size="lg"
                variant="subtle"
              />
              <UButton color="primary" icon="i-lucide-clipboard" size="lg" />
            </UButtonGroup>
          </div>
        </UCard>

        <UAlert
          class="mt-8"
          color="info"
          description="Appuyez sur démarrer le partage pour commencer la diffusion. Vous pouvez aussi continuer depuis votre mobile en scannant le QR code ou en utilisant le lien."
          icon="lucide:info"
          title="Comment ça marche ?"
          variant="subtle"
        />
      </div>
    </div>

    <div class="w-full flex justify-center gap-4">
      <UButton
        v-if="!streaming"
        icon="lucide:video"
        label="Démarrer le partage"
        size="xl"
        variant="solid"
        @click="start"
      />
      <UButton
        v-if="!previewing && !streaming"
        color="neutral"
        icon="lucide:eye"
        size="xl"
        variant="subtle"
        @click="preview"
      />
      <UButton
        v-if="streaming"
        color="error"
        icon="lucide:stop-circle"
        label="Arrêter le partage"
        size="xl"
        variant="solid"
        @click="stop"
      />
      <UButton
        v-if="previewing && !streaming"
        color="neutral"
        icon="lucide:eye-off"
        size="xl"
        variant="subtle"
        @click="stop"
      />
    </div>
  </UContainer>
</template>
