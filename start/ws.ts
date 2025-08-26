// start/socket.ts
import { Server } from 'socket.io'
import app from '@adonisjs/core/services/app'
import server from '@adonisjs/core/services/server'

app.ready(() => {
  const io = new Server(server.getNodeServer(), {
    cors: { origin: '*' },
  })

  io.on('connection', (socket) => {
    console.log('Socket connecté', socket.id)

    socket.on('join', (roomId) => {
      socket.join(roomId)
      console.log(`${socket.id} a rejoint la room ${roomId}`)
    })

    socket.on('offer', ({ roomId, offer }) => {
      socket.to(roomId).emit('offer', { sender: socket.id, offer })
    })

    socket.on('answer', ({ roomId, answer }) => {
      socket.to(roomId).emit('answer', { sender: socket.id, answer })
    })

    socket.on('ice-candidate', ({ roomId, candidate }) => {
      socket.to(roomId).emit('ice-candidate', { sender: socket.id, candidate })
    })
  })
})
