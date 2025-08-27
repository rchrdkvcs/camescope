import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    // Ajouter la contrainte de clé étrangère pour current_layout_id
    this.schema.alterTable('tournament_sessions', (table) => {
      table.foreign('current_layout_id').references('id').inTable('layouts').onDelete('SET NULL')
    })
  }

  async down() {
    this.schema.alterTable('tournament_sessions', (table) => {
      table.dropForeign(['current_layout_id'])
    })
  }
}