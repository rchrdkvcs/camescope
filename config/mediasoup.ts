import { WorkerLogLevel, WorkerLogTag } from 'mediasoup/types'
import env from '#start/env'

export default {
  // Configuration Worker
  worker: {
    rtcMinPort: 10000,
    rtcMaxPort: 10100,
    logLevel: 'warn' as WorkerLogLevel,
    logTags: [
      'info',
      'ice',
      'dtls',
      'rtp',
      'srtp',
      'rtcp',
      'rtx',
      'bwe',
      'score',
      'simulcast',
      'svc',
      'sctp',
    ] as WorkerLogTag[],
  },

  // Configuration Router - Codecs supportés
  router: {
    mediaCodecs: [
      {
        kind: 'audio' as const,
        mimeType: 'audio/opus',
        clockRate: 48000,
        channels: 2,
      },
      {
        kind: 'video' as const,
        mimeType: 'video/VP8',
        clockRate: 90000,
        parameters: {
          'x-google-start-bitrate': 1000,
        },
      },
      {
        kind: 'video' as const,
        mimeType: 'video/VP9',
        clockRate: 90000,
        parameters: {
          'profile-id': 2,
          'x-google-start-bitrate': 1000,
        },
      },
      {
        kind: 'video' as const,
        mimeType: 'video/h264',
        clockRate: 90000,
        parameters: {
          'packetization-mode': 1,
          'profile-level-id': '4d0032',
          'level-asymmetry-allowed': 1,
          'x-google-start-bitrate': 1000,
        },
      },
      {
        kind: 'video' as const,
        mimeType: 'video/h264',
        clockRate: 90000,
        parameters: {
          'packetization-mode': 1,
          'profile-level-id': '42e01f',
          'level-asymmetry-allowed': 1,
          'x-google-start-bitrate': 1000,
        },
      },
    ],
  },

  // Configuration WebRTC Transport
  webRtcTransport: {
    listenIps: [
      {
        ip: '0.0.0.0',
        announcedIp: env.get('MEDIASOUP_ANNOUNCED_IP'),
      },
    ],
    maxIncomingBitrate: 1500000,
    initialAvailableOutgoingBitrate: 1000000,
    minimumAvailableOutgoingBitrate: 600000,
    maxSctpMessageSize: 262144,
    enableUdp: true,
    enableTcp: true,
    preferUdp: true,
  },
}
