import { Server } from 'socket.io'
import app from '@adonisjs/core/services/app'
import server from '@adonisjs/core/services/server'
import mediasoupService from '#services/mediasoup_service'

interface SessionData {
  role?: 'guest' | 'obs' | 'admin'
  roomId?: string
}

let currentProgram: string | null = null
const socketRooms = new Map<string, string>()

app.ready(async () => {
  // Initialize mediasoup service
  await mediasoupService.initialize()

  const io = new Server(server.getNodeServer(), {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
    transports: ['websocket', 'polling'],
  })

  io.on('connection', (socket) => {
    console.log(`[WS] Client connected: ${socket.id}`)
    const sessionData: SessionData = {}

    // Get router RTP capabilities
    socket.on('getRouterRtpCapabilities', async (callback) => {
      try {
        const rtpCapabilities = await mediasoupService.getOrCreateDefaultRouter()
        callback({ rtpCapabilities })
      } catch (error) {
        callback({ error: error.message })
      }
    })

    // Guest joins room
    socket.on('joinRoom', (roomId: string) => {
      sessionData.role = 'guest'
      sessionData.roomId = roomId
      socketRooms.set(socket.id, roomId)
      
      socket.join(roomId)
      console.log(`[WS] Guest ${socket.id} joined room: ${roomId}`)
    })

    // OBS joins
    socket.on('joinObs', () => {
      sessionData.role = 'obs'
      socket.join('obs')
      console.log(`[WS] OBS ${socket.id} connected`)

      // Send existing producers if there's an active program
      if (currentProgram) {
        const producers = mediasoupService.getRoomProducers(currentProgram)
        socket.emit('existingProducers', { roomId: currentProgram, producers })
      }
    })

    // Admin joins
    socket.on('joinAdmin', () => {
      sessionData.role = 'admin'
      socket.join('admin')
      console.log(`[WS] Admin ${socket.id} connected`)

      // Send current program info
      const rooms = mediasoupService.getAllRooms()
      socket.emit('roomsList', { rooms, currentProgram })
    })

    // Admin switches program
    socket.on('switchProgram', (roomId: string | null) => {
      if (sessionData.role !== 'admin') {
        socket.emit('error', { message: 'Unauthorized' })
        return
      }

      currentProgram = roomId
      console.log(`[WS] Program switched to: ${roomId}`)

      // Notify OBS about program change
      if (roomId) {
        const producers = mediasoupService.getRoomProducers(roomId)
        io.to('obs').emit('newProgram', { roomId, producers })
      } else {
        io.to('obs').emit('programStopped')
      }

      // Notify admin about successful switch
      io.to('admin').emit('programSwitched', { roomId })
    })

    // Create WebRTC transport
    socket.on('createWebRtcTransport', async (callback) => {
      try {
        let roomId = sessionData.roomId || socketRooms.get(socket.id)

        // For OBS, use current program room
        if (sessionData.role === 'obs' && currentProgram) {
          roomId = currentProgram
        }

        if (!roomId) {
          roomId = 'default'
        }

        const transportOptions = await mediasoupService.createWebRtcTransport(socket.id, roomId)
        callback(transportOptions)
      } catch (error) {
        callback({ error: error.message })
      }
    })

    // Connect WebRTC transport
    socket.on('connectWebRtcTransport', async ({ transportId, dtlsParameters }, callback) => {
      try {
        await mediasoupService.connectTransport(transportId, dtlsParameters)
        callback({ success: true })
      } catch (error) {
        callback({ error: error.message })
      }
    })

    // Produce media
    socket.on('produce', async ({ transportId, kind, rtpParameters, appData }, callback) => {
      try {
        const producerId = await mediasoupService.produce(
          transportId,
          kind,
          rtpParameters,
          { ...appData, socketId: socket.id }
        )
        
        callback({ id: producerId })

        // Notify OBS if this producer is from current program
        const roomId = sessionData.roomId || socketRooms.get(socket.id)
        if (roomId === currentProgram) {
          io.to('obs').emit('newProducer', {
            producerId,
            socketId: socket.id,
            kind,
            roomId,
          })
        }

        // Notify admin about new producer
        io.to('admin').emit('producerAdded', {
          producerId,
          socketId: socket.id,
          kind,
          roomId,
        })
      } catch (error) {
        callback({ error: error.message })
      }
    })

    // Consume media
    socket.on('consume', async ({ producerId, rtpCapabilities }, callback) => {
      try {
        const consumerData = await mediasoupService.consume(
          socket.id, // We'll use socket.id to find transport
          producerId,
          rtpCapabilities
        )

        callback(consumerData)
      } catch (error) {
        callback({ error: error.message })
      }
    })

    // Consume by transport ID (more explicit)
    socket.on('consumeByTransport', async ({ transportId, producerId, rtpCapabilities }, callback) => {
      try {
        // Find the transport data to get socketId
        let socketIdForTransport = null
        const transportData = mediasoupService['transports'].get(transportId)
        if (transportData) {
          socketIdForTransport = transportData.socketId
        }
        
        if (!socketIdForTransport) {
          throw new Error(`Transport not found: ${transportId}`)
        }
        
        const consumerData = await mediasoupService.consume(socketIdForTransport, producerId, rtpCapabilities)
        callback(consumerData)
      } catch (error) {
        callback({ error: error.message })
      }
    })

    // Pause consumer
    socket.on('pauseConsumer', async ({ consumerId }, callback) => {
      try {
        await mediasoupService.pauseConsumer(consumerId)
        callback({ success: true })
      } catch (error) {
        callback({ error: error.message })
      }
    })

    // Resume consumer
    socket.on('resumeConsumer', async ({ consumerId }, callback) => {
      try {
        await mediasoupService.resumeConsumer(consumerId)
        callback({ success: true })
      } catch (error) {
        callback({ error: error.message })
      }
    })

    // Get room stats (admin only)
    socket.on('getRoomStats', (roomId: string, callback) => {
      if (sessionData.role !== 'admin') {
        callback({ error: 'Unauthorized' })
        return
      }

      const stats = mediasoupService.getRoomStats(roomId)
      callback({ stats })
    })

    // Get worker stats (admin only)
    socket.on('getWorkerStats', (callback) => {
      if (sessionData.role !== 'admin') {
        callback({ error: 'Unauthorized' })
        return
      }

      const stats = mediasoupService.getWorkerStats()
      callback({ stats })
    })

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log(`[WS] Client disconnected: ${socket.id}`)
      
      // Cleanup mediasoup resources
      mediasoupService.cleanupSocket(socket.id)
      
      // Remove from tracking maps
      socketRooms.delete(socket.id)

      // Notify others about producer removal if needed
      const roomId = sessionData.roomId
      if (roomId) {
        socket.to(roomId).emit('peerDisconnected', { socketId: socket.id })
        io.to('admin').emit('peerDisconnected', { socketId: socket.id, roomId })
      }
    })

    // Error handling
    socket.on('error', (error) => {
      console.error(`[WS] Socket error from ${socket.id}:`, error)
    })
  })

  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('[WS] Shutting down gracefully...')
    await mediasoupService.shutdown()
    process.exit(0)
  })

  process.on('SIGTERM', async () => {
    console.log('[WS] Shutting down gracefully...')
    await mediasoupService.shutdown()
    process.exit(0)
  })
})