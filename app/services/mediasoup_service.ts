import { createWorker, types as mediasoupTypes } from 'mediasoup'
import config from '#config/mediasoup'
import { Logger } from '@adonisjs/core/logger'

interface RoomData {
  router: mediasoupTypes.Router
  transports: Map<string, mediasoupTypes.WebRtcTransport>
  producers: Map<string, mediasoupTypes.Producer>
  consumers: Map<string, mediasoupTypes.Consumer>
}

interface TransportData {
  transport: mediasoupTypes.WebRtcTransport
  socketId: string
  roomId: string
}

class MediasoupService {
  private worker: mediasoupTypes.Worker | null = null
  private rooms = new Map<string, RoomData>()
  private transports = new Map<string, TransportData>()
  private logger = new Logger({ level: 'info', name: 'mediasoup' })

  async initialize(): Promise<void> {
    if (this.worker) return

    try {
      this.worker = await createWorker({
        logLevel: config.worker.logLevel,
        logTags: config.worker.logTags,
        rtcMinPort: config.worker.rtcMinPort,
        rtcMaxPort: config.worker.rtcMaxPort,
      })

      this.worker.on('died', (error) => {
        this.logger.error('mediasoup Worker died unexpectedly:', error)
        process.exit(1)
      })

      this.logger.info(`✅ mediasoup Worker created, PID: ${this.worker.pid}`)
    } catch (error) {
      this.logger.error('❌ Failed to create mediasoup worker:', error)
      throw error
    }
  }

  async getOrCreateRoom(roomId: string): Promise<RoomData> {
    if (this.rooms.has(roomId)) {
      return this.rooms.get(roomId)!
    }

    if (!this.worker) {
      await this.initialize()
    }

    const router = await this.worker!.createRouter({
      mediaCodecs: config.router.mediaCodecs,
    })

    // Remove invalid event listener - routers don't have newtransport event

    const room: RoomData = {
      router,
      transports: new Map(),
      producers: new Map(),
      consumers: new Map(),
    }

    this.rooms.set(roomId, room)
    this.logger.info(`✅ Room created: ${roomId}`)

    return room
  }

  async createWebRtcTransport(socketId: string, roomId: string) {
    const room = await this.getOrCreateRoom(roomId)

    const transport = await room.router.createWebRtcTransport({
      ...config.webRtcTransport,
      appData: { socketId, roomId },
    })

    transport.on('dtlsstatechange', (dtlsState) => {
      if (dtlsState === 'failed' || dtlsState === 'closed') {
        this.logger.warn(`Transport DTLS state changed to ${dtlsState}`)
      }
    })

    transport.on('@close', () => {
      this.transports.delete(transport.id)
      room.transports.delete(transport.id)
      this.logger.debug(`Transport closed: ${transport.id}`)
    })

    // Store transport (allow multiple transports per socket)
    room.transports.set(transport.id, transport)
    this.transports.set(transport.id, { transport, socketId, roomId })

    this.logger.info(`🚚 WebRTC transport created: ${transport.id}`)

    return {
      id: transport.id,
      iceParameters: transport.iceParameters,
      iceCandidates: transport.iceCandidates,
      dtlsParameters: transport.dtlsParameters,
    }
  }

  async connectTransport(transportId: string, dtlsParameters: mediasoupTypes.DtlsParameters) {
    const transportData = this.transports.get(transportId)
    if (!transportData) {
      throw new Error(`Transport not found: ${transportId}`)
    }

    await transportData.transport.connect({ dtlsParameters })
    this.logger.info(`✅ Transport connected: ${transportId}`)
  }

  async produce(
    transportId: string,
    kind: mediasoupTypes.MediaKind,
    rtpParameters: mediasoupTypes.RtpParameters,
    appData?: Record<string, unknown>
  ): Promise<string> {
    const transportData = this.transports.get(transportId)
    if (!transportData) {
      throw new Error(`Transport not found: ${transportId}`)
    }

    const { transport, roomId } = transportData
    const room = this.rooms.get(roomId)!

    const producer = await transport.produce({
      kind,
      rtpParameters,
      appData: { ...appData, socketId: transportData.socketId },
    })

    producer.on('transportclose', () => {
      producer.close()
    })

    room.producers.set(producer.id, producer)

    this.logger.info(`🎬 Producer created: ${producer.id} (${kind})`)

    return producer.id
  }

  async consume(
    socketId: string,
    producerId: string,
    rtpCapabilities: mediasoupTypes.RtpCapabilities
  ) {
    // Find a recv transport for this socketId (prefer the latest one)
    let transportData: TransportData | null = null
    for (const [, data] of this.transports) {
      if (data.socketId === socketId) {
        transportData = data // Take the last one found (most recent)
      }
    }

    if (!transportData) {
      throw new Error(`No transport found for socket: ${socketId}`)
    }

    const { transport, roomId } = transportData

    // Find producer in any room (for cross-room consumption)
    let producer: mediasoupTypes.Producer | null = null
    let producerRoom: RoomData | null = null

    for (const [, room] of this.rooms) {
      const foundProducer = room.producers.get(producerId)
      if (foundProducer) {
        producer = foundProducer
        producerRoom = room
        break
      }
    }

    if (!producer || !producerRoom) {
      throw new Error(`Producer not found: ${producerId}`)
    }

    if (!producerRoom.router.canConsume({ producerId, rtpCapabilities })) {
      throw new Error('Cannot consume - incompatible RTP capabilities')
    }

    const consumer = await transport.consume({
      producerId,
      rtpCapabilities,
      paused: false,
      appData: { socketId: transportData.socketId },
    })

    consumer.on('transportclose', () => {
      consumer.close()
    })

    consumer.on('producerclose', () => {
      consumer.close()
    })

    const room = this.rooms.get(roomId)!
    room.consumers.set(consumer.id, consumer)

    this.logger.info(`🍿 Consumer created: ${consumer.id}`)

    return {
      id: consumer.id,
      producerId: consumer.producerId,
      kind: consumer.kind,
      rtpParameters: consumer.rtpParameters,
    }
  }

  async pauseConsumer(consumerId: string) {
    for (const room of this.rooms.values()) {
      const consumer = room.consumers.get(consumerId)
      if (consumer) {
        await consumer.pause()
        this.logger.info(`⏸️ Consumer paused: ${consumerId}`)
        return
      }
    }
    throw new Error(`Consumer not found: ${consumerId}`)
  }

  async resumeConsumer(consumerId: string) {
    for (const room of this.rooms.values()) {
      const consumer = room.consumers.get(consumerId)
      if (consumer) {
        await consumer.resume()
        this.logger.info(`▶️ Consumer resumed: ${consumerId}`)
        return
      }
    }
    throw new Error(`Consumer not found: ${consumerId}`)
  }

  cleanupSocket(socketId: string) {
    // Find and close all transports for this socket
    const transportsToClose = []
    for (const [transportId, data] of this.transports) {
      if (data.socketId === socketId) {
        transportsToClose.push({ transportId, data })
      }
    }

    for (const { transportId, data } of transportsToClose) {
      data.transport.close()
      this.transports.delete(transportId)

      // Remove from room too
      const room = this.rooms.get(data.roomId)
      if (room) {
        room.transports.delete(transportId)
      }

      this.logger.info(`🧹 Transport ${transportId} cleaned up for socket: ${socketId}`)
    }
  }

  getRoomProducers(roomId: string): string[] {
    const room = this.rooms.get(roomId)
    return room ? Array.from(room.producers.keys()) : []
  }

  async getWorkerStats() {
    return this.worker ? await this.worker.getResourceUsage() : null
  }

  getRoomStats(roomId: string) {
    const room = this.rooms.get(roomId)
    if (!room) return null

    return {
      routerId: room.router.id,
      transportsCount: room.transports.size,
      producersCount: room.producers.size,
      consumersCount: room.consumers.size,
    }
  }

  getAllRooms(): string[] {
    return Array.from(this.rooms.keys())
  }

  getRouterRtpCapabilities(roomId: string = 'default'): mediasoupTypes.RtpCapabilities {
    // Use existing room or create default one
    const room = this.rooms.get(roomId)
    if (room) {
      return room.router.rtpCapabilities
    }

    // For RTP capabilities request, we can create a temporary router
    // or use a default room. This is common pattern.
    throw new Error('No router available for RTP capabilities')
  }

  async getOrCreateDefaultRouter(): Promise<mediasoupTypes.RtpCapabilities> {
    const room = await this.getOrCreateRoom('default')
    return room.router.rtpCapabilities
  }

  async shutdown() {
    this.logger.info('🔴 Shutting down mediasoup service...')

    // Close all rooms
    for (const [roomId, room] of this.rooms) {
      room.router.close()
      this.logger.info(`Room closed: ${roomId}`)
    }

    // Close worker
    if (this.worker) {
      this.worker.close()
      this.logger.info('Worker closed')
    }

    this.rooms.clear()
    this.transports.clear()
  }
}

export default new MediasoupService()
