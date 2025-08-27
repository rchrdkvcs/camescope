import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import TournamentSession from './tournament_session.js'

interface CameraPosition {
  x: number
  y: number
  width: number
  height: number
  zIndex: number
}

interface LayoutConfig {
  name: string
  maxCameras: number
  positions: CameraPosition[]
  background?: {
    type: 'color' | 'image' | 'video'
    value: string
  }
}

export default class Layout extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare name: string

  @column()
  declare description: string | null

  @column()
  declare type: 'preset' | 'custom'

  @column({
    serialize: (value: string | LayoutConfig) => {
      if (typeof value === 'string') {
        return JSON.parse(value)
      }
      return value
    },
    prepare: (value: LayoutConfig) => JSON.stringify(value),
  })
  declare config: LayoutConfig

  @column()
  declare isDefault: boolean

  @column()
  declare sessionId: number | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => TournamentSession, {
    foreignKey: 'sessionId',
  })
  declare session: BelongsTo<typeof TournamentSession>
}
