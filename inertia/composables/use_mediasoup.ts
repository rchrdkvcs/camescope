import { Device } from 'mediasoup-client'
import type { Transport, Producer, Consumer } from 'mediasoup-client/types'
import { socket } from '~/composables/use_socket'

class MediasoupClient {
  private device = new Device()
  private sendTransport: Transport | null = null
  private recvTransport: Transport | null = null
  private producers = new Map<string, Producer>()
  private consumers = new Map<string, Consumer>()
  private isInitialized = false

  async init(): Promise<void> {
    if (this.isInitialized) return

    // Get router capabilities
    const { rtpCapabilities } = await this.socketRequest('getRouterRtpCapabilities')

    // Load device
    await this.device.load({ routerRtpCapabilities: rtpCapabilities })

    this.isInitialized = true
  }

  async joinRoom(roomId: string) {
    socket.emit('joinRoom', roomId)
  }

  async joinObs() {
    socket.emit('joinObs')
  }

  async produce(stream: MediaStream): Promise<Producer> {
    if (!this.sendTransport) {
      await this.createSendTransport()
    }

    const videoTrack = stream.getVideoTracks()[0]
    if (!videoTrack) throw new Error('No video track')

    const producer = await this.sendTransport!.produce({ track: videoTrack })
    this.producers.set(producer.id, producer)

    return producer
  }

  async consume(producerId: string): Promise<{ consumer: Consumer; stream: MediaStream }> {
    // Ensure we have receive transport
    if (!this.recvTransport) {
      await this.createRecvTransport()
    }

    const consumerOptions = await this.socketRequest('consume', {
      producerId,
      rtpCapabilities: this.device.rtpCapabilities,
    })

    const consumer = await this.recvTransport!.consume(consumerOptions)
    this.consumers.set(consumer.id, consumer)

    const stream = new MediaStream([consumer.track])

    return { consumer, stream }
  }

  private async createSendTransport(): Promise<void> {
    const transportOptions = await this.socketRequest('createWebRtcTransport')
    this.sendTransport = this.device.createSendTransport(transportOptions)

    this.sendTransport.on('connect', async ({ dtlsParameters }, callback, errback) => {
      try {
        await this.socketRequest('connectWebRtcTransport', {
          transportId: this.sendTransport!.id,
          dtlsParameters,
        })
        callback()
      } catch (error) {
        errback(error as Error)
      }
    })

    this.sendTransport.on('produce', async ({ kind, rtpParameters }, callback, errback) => {
      try {
        const { id } = await this.socketRequest('produce', {
          transportId: this.sendTransport!.id,
          kind,
          rtpParameters,
        })
        callback({ id })
      } catch (error) {
        errback(error as Error)
      }
    })
  }

  private async createRecvTransport(): Promise<void> {
    const transportOptions = await this.socketRequest('createWebRtcTransport')
    this.recvTransport = this.device.createRecvTransport(transportOptions)

    this.recvTransport.on('connect', async ({ dtlsParameters }, callback, errback) => {
      try {
        await this.socketRequest('connectWebRtcTransport', {
          transportId: this.recvTransport!.id,
          dtlsParameters,
        })
        callback()
      } catch (error) {
        errback(error as Error)
      }
    })
  }

  private socketRequest(event: string, data?: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const callback = (response: any) => {
        if (response.error) {
          reject(new Error(response.error))
        } else {
          resolve(response)
        }
      }

      if (data) {
        socket.emit(event, data, callback)
      } else {
        socket.emit(event, callback)
      }
    })
  }

  // Event handlers
  onNewProducer(callback: (data: any) => void) {
    socket.on('newProducer', callback)
  }

  onNewProgram(callback: (data: any) => void) {
    socket.on('newProgram', callback)
  }

  onExistingProducers(callback: (data: any) => void) {
    socket.on('existingProducers', callback)
  }

  cleanup(): void {
    this.producers.forEach((producer) => producer.close())
    this.consumers.forEach((consumer) => consumer.close())
    this.sendTransport?.close()
    this.recvTransport?.close()

    this.producers.clear()
    this.consumers.clear()
    this.sendTransport = null
    this.recvTransport = null
    this.isInitialized = false
  }

  get ready() {
    return this.isInitialized
  }
}

const mediasoup = new MediasoupClient()
export default mediasoup
