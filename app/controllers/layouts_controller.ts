import type { HttpContext } from '@adonisjs/core/http'
import Layout from '#models/layout'

export default class LayoutsController {
  async index({ request, response }: HttpContext) {
    try {
      const query = Layout.query()

      // Filtrer par type si spécifié
      const type = request.qs().type
      if (type) {
        query.where('type', type)
      }

      // Filtrer par session si spécifié
      const sessionId = request.qs().sessionId
      if (sessionId) {
        query.where('sessionId', sessionId)
      } else {
        // Par défaut, ne récupérer que les layouts preset ou sans session
        query.where((builder) => {
          builder.where('type', 'preset').orWhereNull('sessionId')
        })
      }

      const layouts = await query.orderBy('isDefault', 'desc').orderBy('name')

      return response.json(layouts)
    } catch (error) {
      return response.status(500).json({ error: 'Erreur lors du chargement des layouts' })
    }
  }

  async show({ params, response }: HttpContext) {
    try {
      const layout = await Layout.findOrFail(params.id)
      return response.json(layout)
    } catch (error) {
      return response.status(404).json({ error: 'Layout non trouvé' })
    }
  }

  async store({ request, response }: HttpContext) {
    try {
      const data = request.only(['name', 'description', 'type', 'config', 'isDefault', 'sessionId'])

      // Validation basique de la config
      if (!data.config || !data.config.positions || !Array.isArray(data.config.positions)) {
        return response.status(400).json({ error: 'Configuration de layout invalide' })
      }

      // Si c'est un layout par défaut, désactiver les autres
      if (data.isDefault) {
        await Layout.query().where('isDefault', true).update({ isDefault: false })
      }

      const layout = await Layout.create(data)

      return response.status(201).json(layout)
    } catch (error) {
      return response.status(500).json({ error: 'Erreur lors de la création du layout' })
    }
  }

  async update({ params, request, response }: HttpContext) {
    try {
      const layout = await Layout.findOrFail(params.id)
      const data = request.only(['name', 'description', 'config', 'isDefault'])

      // Si c'est un layout par défaut, désactiver les autres
      if (data.isDefault && !layout.isDefault) {
        await Layout.query().where('isDefault', true).update({ isDefault: false })
      }

      layout.merge(data)
      await layout.save()

      return response.json(layout)
    } catch (error) {
      return response.status(500).json({ error: 'Erreur lors de la mise à jour du layout' })
    }
  }

  async destroy({ params, response }: HttpContext) {
    try {
      const layout = await Layout.findOrFail(params.id)

      // Empêcher la suppression du layout par défaut
      if (layout.isDefault) {
        return response.status(400).json({ error: 'Impossible de supprimer le layout par défaut' })
      }

      await layout.delete()

      return response.status(204)
    } catch (error) {
      return response.status(500).json({ error: 'Erreur lors de la suppression du layout' })
    }
  }

  async duplicate({ params, request, response }: HttpContext) {
    try {
      const original = await Layout.findOrFail(params.id)
      const data = request.only(['name'])

      const duplicate = await Layout.create({
        name: data.name || `${original.name} (Copie)`,
        description: original.description,
        type: 'custom',
        config: original.config,
        isDefault: false,
        sessionId: original.sessionId,
      })

      return response.status(201).json(duplicate)
    } catch (error) {
      return response.status(500).json({ error: 'Erreur lors de la duplication du layout' })
    }
  }
}
