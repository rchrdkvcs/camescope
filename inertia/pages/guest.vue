<script setup>
import { ref, onBeforeUnmount } from 'vue'
import mediasoup from '~/composables/use_mediasoup'

const props = defineProps(['roomId'])

const video = ref()
const status = ref('Ready')
const streaming = ref(false)

let stream = null

async function start() {
  try {
    status.value = 'Getting camera...'

    stream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 1920, min: 1280 },
        height: { ideal: 1080, min: 720 },
        aspectRatio: { exact: 16 / 9 },
      },
      audio: false,
    })
    video.value.srcObject = stream

    status.value = 'Connecting...'
    await mediasoup.init()
    await mediasoup.joinRoom(props.roomId)

    status.value = 'Streaming...'
    await mediasoup.produce(stream)

    streaming.value = true
    status.value = 'LIVE'
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
  status.value = 'Stopped'
}

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
        :label="status"
        class="rounded-full"
        icon="lucide:activity"
        size="xl"
        variant="subtle"
      />
    </div>

    <div class="grid grid-cols-3 w-full gap-8">
      <div class="col-span-2 flex flex-col items-center justify-center gap-4 w-full">
        <div
          v-if="!streaming"
          class="bg-elevated/50 rounded-lg w-full aspect-video flex flex-col items-center justify-center gap-6"
        >
          <UIcon class="size-24 text-muted" name="lucide:baby" />
          <p class="text-lg font-semibold">Souriez, Vous serez bientôt sur le grand ecran !</p>
        </div>
        <video
          ref="video"
          :class="streaming ? '' : 'hidden'"
          autoplay
          class="w-full aspect-video rounded-lg"
          muted
          playsinline
        ></video>
      </div>

      <UCard class="size-full" variant="soft">
        <template #header>
          <h2 class="text-lg font-semibold">Rejoindre depuis un autre appareil</h2>
        </template>

        <div class="flex flex-col gap-6 size-full">
          <div class="bg-white w-full flex-1 min-h-48 rounded-lg"></div>

          <UButtonGroup>
            <UInput
              :model-value="`https://camescope.com/join/${roomId}`"
              class="w-full"
              color="neutral"
              icon="lucide:link"
              readonly
              size="lg"
              variant="outline"
            />
            <UButton color="primary" icon="i-lucide-clipboard" size="lg" />
          </UButtonGroup>
        </div>
      </UCard>
    </div>

    <div class="w-full flex justify-center gap-4">
      <UButton
        v-if="!streaming"
        color="success"
        icon="lucide:camera"
        label="Commencer le partage"
        size="xl"
        variant="solid"
        @click="start"
      />
      <UButton
        v-if="!streaming"
        color="neutral"
        icon="lucide:eye"
        label="Previsualiser"
        size="xl"
        variant="subtle"
        @click="start"
      />
      <UButton
        v-else-if="streaming"
        color="error"
        icon="lucide:stop-circle"
        label="Arrêter le partage"
        size="xl"
        variant="subtle"
        @click="stop"
      />
    </div>
  </UContainer>
</template>
