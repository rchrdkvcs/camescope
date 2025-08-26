/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import router from '@adonisjs/core/services/router'
import { HttpContext } from '@adonisjs/core/http'
router.on('/').renderInertia('home')

// page invité
router.get('/rooms/:roomId/guest', ({ params, inertia }: HttpContext) => {
  return inertia.render('guest', { roomId: params.roomId })
})

// page OBS
router.get('/rooms/:roomId/obs', ({ params, inertia }: HttpContext) => {
  return inertia.render('obs', { roomId: params.roomId })
})
