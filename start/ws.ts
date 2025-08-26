import { Server } from 'socket.io'
import app from '@adonisjs/core/services/app'
import server from '@adonisjs/core/services/server'

let sessions: Record<string, string[]> = {} // roomId -> guests
let currentProgram: string | null = null

app.ready(() => {
  const io = new Server(server.getNodeServer(), {
    cors: { origin: '*' },
  })

  io.on('connection', (socket) => {
    console.log('[SIGNAL] connected', socket.id)

    // Guest joins a room
    socket.on('joinRoom', (roomId: string) => {
      sessions[roomId] = sessions[roomId] || []
      if (!sessions[roomId].includes(socket.id)) sessions[roomId].push(socket.id)
      socket.data.role = 'guest'
      socket.data.roomId = roomId
      console.log('[SIGNAL] guest', socket.id, 'joined', roomId)

      if (currentProgram === roomId) {
        io.to('obs').emit('newGuest', socket.id)
      }
    })

    // OBS joins
    socket.on('joinObs', () => {
      socket.join('obs')
      socket.data.role = 'obs'
      socket.data.roomId = null
      console.log('[SIGNAL] OBS connected', socket.id)

      const guests = currentProgram ? sessions[currentProgram] || [] : []
      socket.emit('switchProgram', currentProgram, guests)
    })

    // Admin switches program
    socket.on('switchProgram', (roomId: string | null) => {
      currentProgram = roomId
      console.log('[SIGNAL] program switched to', currentProgram)
      const guests = currentProgram ? sessions[currentProgram] || [] : []
      io.to('obs').emit('switchProgram', currentProgram, guests)
    })

    // Offer from OBS -> Guest
    socket.on('offer', ({ to, sdp }) => {
      io.to(to).emit('offer', { from: socket.id, sdp })
    })

    // Answer from Guest -> OBS
    socket.on('answer', ({ to, sdp }) => {
      io.to(to).emit('answer', { from: socket.id, sdp })
    })

    // ICE candidate relay
    socket.on('ice-candidate', ({ to, candidate }) => {
      // console.log('[SIGNAL] ICE candidate relay from', socket.id, 'to', to, 'type:', candidate?.type) // Trop verbeux
      io.to(to).emit('ice-candidate', { from: socket.id, candidate })
    })

    // disconnect cleanup
    socket.on('disconnect', () => {
      const roomId = socket.data.roomId
      if (roomId && sessions[roomId]) {
        sessions[roomId] = sessions[roomId].filter((id) => id !== socket.id)
        io.to('obs').emit('guestLeft', socket.id)
      }
      console.log('[SIGNAL] disconnected', socket.id)
    })
  })
})
