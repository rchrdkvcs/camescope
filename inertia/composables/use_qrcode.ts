import QRCode from 'qrcode'

export const useQRCode = () => {
  const getImageUrl = async (text: string): Promise<string> => {
    try {
      return await QRCode.toDataURL(text, {
        margin: 0,
        scale: 10,
        color: {
          dark: '#ffffff',
          light: '#ffffff00',
        },
      })
    } catch (error) {
      console.error('Erreur lors de la génération du QR code:', error)
      throw error
    }
  }

  return { getImageUrl }
}
