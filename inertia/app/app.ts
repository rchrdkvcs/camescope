/// <reference path="../../adonisrc.ts" />
/// <reference path="../../config/inertia.ts" />

import '../css/app.css'
import { createApp, h } from 'vue'
import type { DefineComponent } from 'vue'
import { createInertiaApp } from '@inertiajs/vue3'
import { resolvePageComponent } from '@adonisjs/inertia/helpers'
import ui from '@nuxt/ui/vue-plugin'
import Default from '~/layouts/default.vue'

createInertiaApp({
  progress: { color: '#5468FF' },

  title: (title) => `${title}`,

  resolve: (name) => {
    return resolvePageComponent(
      `../pages/${name}.vue`,
      import.meta.glob<DefineComponent>('../pages/**/*.vue')
    ).then((page) => {
      page.default.layout = Default
      return page
    })
  },

  setup({ el, App, props, plugin }) {
    createApp({ render: () => h(App, props) })
      .use(ui)
      .use(plugin)
      .mount(el)
  },
})
