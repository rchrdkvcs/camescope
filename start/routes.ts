/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import router from '@adonisjs/core/services/router'

router.get('/rooms/:roomId/guest', ({ params, inertia }) => {
  return inertia.render('guest-simple', { roomId: params.roomId })
})

router.get('/obs', ({ inertia }) => {
  return inertia.render('obs-simple')
})

router.get('/admin', ({ inertia }) => {
  return inertia.render('admin')
})

// API Routes
router
  .group(() => {
    // Sessions API
    router.resource('sessions', '#controllers/sessions_controller').apiOnly()
    router.post('sessions/:id/start', '#controllers/sessions_controller.start')
    router.post('sessions/:id/finish', '#controllers/sessions_controller.finish')

    // Layouts API
    router.resource('layouts', '#controllers/layouts_controller').apiOnly()
    router.post('layouts/:id/duplicate', '#controllers/layouts_controller.duplicate')
  })
  .prefix('/api')
