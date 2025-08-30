import env from '#start/env'

interface CloudflareCredentials {
  iceServers: {
    urls: string[]
    username?: string
    credential?: string
  }
}

class CloudflareService {
  private credentials: CloudflareCredentials | null = null
  private lastFetch = 0
  private readonly CACHE_DURATION = 3600000 // 1 hour

  async getIceServers(): Promise<Array<CloudflareCredentials['iceServers']>> {
    const now = Date.now()

    // Use cached credentials if still valid
    if (this.credentials && now - this.lastFetch < this.CACHE_DURATION) {
      return [this.credentials.iceServers]
    }

    try {
      const response = await fetch(
        `https://rtc.live.cloudflare.com/v1/turn/keys/${env.get('CLOUDFLARE_TURN_KEY_ID')}/credentials/generate`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${env.get('CLOUDFLARE_API_TOKEN')}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ttl: 3600,
          }),
        }
      )

      if (!response.ok) {
        throw new Error(`Cloudflare API error: ${response.status}`)
      }

      const data: any = await response.json()

      this.credentials = data

      this.lastFetch = now
      // Return as array since RTCPeerConnection expects an array of ice servers
      return [this.credentials!.iceServers]
    } catch (error) {
      console.error('Failed to fetch Cloudflare TURN credentials:', error)

      // Fallback to public STUN servers
      return [
        { urls: ['stun:stun.l.google.com:19302'] },
        { urls: ['stun:stun1.l.google.com:19302'] },
      ]
    }
  }
}

export default new CloudflareService()
