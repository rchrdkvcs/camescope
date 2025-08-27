import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'tournament_sessions'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.string('name', 255).notNullable()
      table.text('description').nullable()
      table.string('room_id', 50).unique().notNullable()
      table.enum('status', ['draft', 'active', 'finished']).defaultTo('draft')
      table.integer('max_participants').defaultTo(10)
      table.integer('current_participants').defaultTo(0)
      table.integer('admin_id').unsigned().nullable()
      table.integer('current_layout_id').unsigned().nullable()
      
      table.timestamp('scheduled_at').nullable()
      table.timestamp('started_at').nullable()
      table.timestamp('ended_at').nullable()
      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}