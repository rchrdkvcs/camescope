import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'layouts'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.string('name', 255).notNullable()
      table.text('description').nullable()
      table.enum('type', ['preset', 'custom']).defaultTo('preset')
      table.json('config').notNullable()
      table.boolean('is_default').defaultTo(false)
      table.integer('session_id').unsigned().references('id').inTable('tournament_sessions').nullable()

      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}