import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import Admin from './admin.js'
import Layout from './layout.js'

export default class TournamentSession extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare name: string

  @column()
  declare description: string | null

  @column()
  declare roomId: string

  @column()
  declare roomSlug: string

  @column()
  declare status: 'draft' | 'active' | 'finished'

  @column()
  declare maxParticipants: number

  @column()
  declare currentParticipants: number

  @column()
  declare adminId: number | null

  @column()
  declare currentLayoutId: number | null

  @column.dateTime()
  declare scheduledAt: DateTime | null

  @column.dateTime()
  declare startedAt: DateTime | null

  @column.dateTime()
  declare endedAt: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => Admin)
  declare admin: BelongsTo<typeof Admin>

  @belongsTo(() => Layout, {
    foreignKey: 'currentLayoutId',
  })
  declare currentLayout: BelongsTo<typeof Layout>

  @hasMany(() => Layout)
  declare layouts: HasMany<typeof Layout>
}