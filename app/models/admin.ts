import { DateTime } from 'luxon'
import { BaseModel, column, beforeSave, hasMany } from '@adonisjs/lucid/orm'
import hash from '@adonisjs/core/services/hash'
import type { HasMany } from '@adonisjs/lucid/types/relations'
import TournamentSession from './tournament_session.js'

export default class Admin extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare username: string

  @column()
  declare email: string

  @column({ serializeAs: null })
  declare password: string

  @column()
  declare fullName: string | null

  @column()
  declare isActive: boolean

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @hasMany(() => TournamentSession)
  declare sessions: HasMany<typeof TournamentSession>

  @beforeSave()
  static async hashPassword(admin: Admin) {
    if (admin.$dirty.password) {
      admin.password = await hash.make(admin.password)
    }
  }
}
