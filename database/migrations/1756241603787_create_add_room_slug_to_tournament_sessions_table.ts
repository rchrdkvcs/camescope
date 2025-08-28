import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'tournament_sessions'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('room_slug').unique().after('room_id')
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('room_slug')
    })
  }
}
