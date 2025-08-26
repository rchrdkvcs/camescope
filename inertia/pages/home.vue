<script lang="ts" setup>
import { Head } from '@inertiajs/vue3'
import { socket } from '~/composables/use_socket'

socket.on('connect', () => {
  console.log('Connected to server')
})
</script>

<template>
  <Head title="Homepage" />

  <div class="container">
    <p>Hello</p>
  </div>
</template>
