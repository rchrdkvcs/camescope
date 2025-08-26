/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import router from '@adonisjs/core/services/router'

// Guest (player) — room spécifique
router.get('/rooms/:roomId/guest', ({ params, inertia }) => {
  return inertia.render('guest', { roomId: params.roomId })
})

// OBS — URL fixe (la source navigateur OBS doit pointer sur /obs)
router.get('/obs', ({ inertia }) => {
  return inertia.render('obs')
})

// Admin — URL fixe (panel de production, bouton switch)
router.get('/admin', ({ inertia }) => {
  return inertia.render('admin')
})
