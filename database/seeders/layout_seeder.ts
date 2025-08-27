import { BaseSeeder } from '@adonisjs/lucid/seeders'
import Layout from '#models/layout'

export default class extends BaseSeeder {
  async run() {
    // Layout preset: 2 caméras en split
    await Layout.create({
      name: '2 Caméras Split',
      description: 'Deux caméras côte à côte en plein écran',
      type: 'preset',
      isDefault: true,
      config: {
        name: '2 Caméras Split',
        maxCameras: 2,
        positions: [
          { x: 0, y: 0, width: 50, height: 100, zIndex: 1 },
          { x: 50, y: 0, width: 50, height: 100, zIndex: 1 }
        ]
      }
    })

    // Layout preset: 5 caméras à gauche, 5 à droite
    await Layout.create({
      name: '5x5 Gauche-Droite',
      description: 'Cinq caméras à gauche et cinq à droite',
      type: 'preset',
      config: {
        name: '5x5 Gauche-Droite',
        maxCameras: 10,
        positions: [
          // Gauche - 5 caméras empilées
          { x: 0, y: 0, width: 25, height: 20, zIndex: 1 },
          { x: 0, y: 20, width: 25, height: 20, zIndex: 1 },
          { x: 0, y: 40, width: 25, height: 20, zIndex: 1 },
          { x: 0, y: 60, width: 25, height: 20, zIndex: 1 },
          { x: 0, y: 80, width: 25, height: 20, zIndex: 1 },
          // Droite - 5 caméras empilées
          { x: 75, y: 0, width: 25, height: 20, zIndex: 1 },
          { x: 75, y: 20, width: 25, height: 20, zIndex: 1 },
          { x: 75, y: 40, width: 25, height: 20, zIndex: 1 },
          { x: 75, y: 60, width: 25, height: 20, zIndex: 1 },
          { x: 75, y: 80, width: 25, height: 20, zIndex: 1 }
        ],
        background: {
          type: 'color',
          value: '#1a1a1a'
        }
      }
    })

    // Layout preset: Une caméra principale + 4 petites
    await Layout.create({
      name: 'Principal + 4 Secondaires',
      description: 'Une grande caméra principale et quatre petites',
      type: 'preset',
      config: {
        name: 'Principal + 4 Secondaires',
        maxCameras: 5,
        positions: [
          // Caméra principale
          { x: 10, y: 10, width: 60, height: 80, zIndex: 1 },
          // Caméras secondaires (coins droite)
          { x: 75, y: 5, width: 20, height: 15, zIndex: 2 },
          { x: 75, y: 25, width: 20, height: 15, zIndex: 2 },
          { x: 75, y: 45, width: 20, height: 15, zIndex: 2 },
          { x: 75, y: 65, width: 20, height: 15, zIndex: 2 }
        ]
      }
    })

    // Layout preset: Grille 3x3
    await Layout.create({
      name: 'Grille 3x3',
      description: 'Neuf caméras disposées en grille 3x3',
      type: 'preset',
      config: {
        name: 'Grille 3x3',
        maxCameras: 9,
        positions: [
          // Ligne 1
          { x: 5, y: 5, width: 28, height: 28, zIndex: 1 },
          { x: 36, y: 5, width: 28, height: 28, zIndex: 1 },
          { x: 67, y: 5, width: 28, height: 28, zIndex: 1 },
          // Ligne 2
          { x: 5, y: 36, width: 28, height: 28, zIndex: 1 },
          { x: 36, y: 36, width: 28, height: 28, zIndex: 1 },
          { x: 67, y: 36, width: 28, height: 28, zIndex: 1 },
          // Ligne 3
          { x: 5, y: 67, width: 28, height: 28, zIndex: 1 },
          { x: 36, y: 67, width: 28, height: 28, zIndex: 1 },
          { x: 67, y: 67, width: 28, height: 28, zIndex: 1 }
        ]
      }
    })
  }
}