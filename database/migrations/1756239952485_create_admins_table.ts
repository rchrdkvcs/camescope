import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'admins'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.string('username', 50).unique().notNullable()
      table.string('email', 255).unique().notNullable()
      table.string('password', 255).notNullable()
      table.string('full_name', 100).nullable()
      table.boolean('is_active').defaultTo(true)

      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}