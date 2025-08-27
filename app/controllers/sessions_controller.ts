import type { HttpContext } from '@adonisjs/core/http'
import TournamentSession from '#models/tournament_session'
import Layout from '#models/layout'
import { randomUUID } from 'node:crypto'
import { DateTime } from 'luxon'

export default class SessionsController {
  async index({ response }: HttpContext) {
    try {
      const sessions = await TournamentSession.query()
        .preload('currentLayout')
        .orderBy('createdAt', 'desc')

      return response.json(sessions)
    } catch (error) {
      return response.status(500).json({ error: 'Erreur lors du chargement des sessions' })
    }
  }

  async show({ params, response }: HttpContext) {
    try {
      const session = await TournamentSession.query()
        .where('id', params.id)
        .orWhere('roomSlug', params.id)
        .preload('currentLayout')
        .preload('layouts')
        .firstOrFail()

      return response.json(session)
    } catch (error) {
      return response.status(404).json({ error: 'Session non trouvée' })
    }
  }

  async store({ request, response }: HttpContext) {
    try {
      const data = request.only(['name', 'description', 'maxParticipants'])
      
      console.log('Data received:', data)

      // Générer UUID et slug
      const roomId = randomUUID()
      const roomSlug = this.generateSlug(data.name)
      
      console.log('Generated roomId:', roomId, 'roomSlug:', roomSlug)

      // Vérifier l'unicité du slug
      let finalSlug = roomSlug
      let counter = 1
      while (await TournamentSession.findBy('roomSlug', finalSlug)) {
        finalSlug = `${roomSlug}-${counter}`
        counter++
      }

      console.log('Final slug:', finalSlug)

      const sessionData = {
        name: data.name,
        description: data.description,
        maxParticipants: data.maxParticipants || 10,
        roomId,
        roomSlug: finalSlug,
        status: 'draft' as const,
        currentParticipants: 0,
      }
      
      console.log('Creating session with data:', sessionData)

      const session = await TournamentSession.create(sessionData)
      
      console.log('Created session:', session.toJSON())

      return response.status(201).json(session)
    } catch (error) {
      console.error('Error creating session:', error)
      return response.status(500).json({ error: 'Erreur lors de la création de la session', details: error.message })
    }
  }

  async update({ params, request, response }: HttpContext) {
    try {
      const session = await TournamentSession.findOrFail(params.id)
      const data = request.only(['name', 'description', 'status', 'maxParticipants', 'currentLayoutId'])
      
      session.merge(data)
      await session.save()
      await session.load('currentLayout')

      return response.json(session)
    } catch (error) {
      return response.status(500).json({ error: 'Erreur lors de la mise à jour de la session' })
    }
  }

  async destroy({ params, response }: HttpContext) {
    try {
      const session = await TournamentSession.findOrFail(params.id)
      await session.delete()
      
      return response.status(204)
    } catch (error) {
      return response.status(500).json({ error: 'Erreur lors de la suppression de la session' })
    }
  }

  async start({ params, response }: HttpContext) {
    try {
      const session = await TournamentSession.findOrFail(params.id)
      
      if (session.status !== 'draft') {
        return response.status(400).json({ error: 'Seules les sessions en brouillon peuvent être démarrées' })
      }

      session.status = 'active'
      session.startedAt = DateTime.now()
      await session.save()

      return response.json(session)
    } catch (error) {
      return response.status(500).json({ error: 'Erreur lors du démarrage de la session' })
    }
  }

  async finish({ params, response }: HttpContext) {
    try {
      const session = await TournamentSession.findOrFail(params.id)
      
      if (session.status !== 'active') {
        return response.status(400).json({ error: 'Seules les sessions actives peuvent être terminées' })
      }

      session.status = 'finished'
      session.endedAt = DateTime.now()
      await session.save()

      return response.json(session)
    } catch (error) {
      return response.status(500).json({ error: 'Erreur lors de la fin de la session' })
    }
  }

  private generateSlug(name: string): string {
    if (!name || typeof name !== 'string') {
      return 'session-' + Date.now()
    }
    
    const slug = name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Supprimer les accents
      .replace(/[^a-z0-9\s-]/g, '') // Supprimer les caractères spéciaux
      .replace(/\s+/g, '-') // Remplacer les espaces par des tirets
      .replace(/-+/g, '-') // Supprimer les tirets multiples
      .replace(/^-+|-+$/g, '') // Supprimer les tirets en début/fin
      
    return slug || `session-${Date.now()}`
  }
}