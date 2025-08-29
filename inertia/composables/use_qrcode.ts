import QRCode from 'qrcode'

export const useQRCode = () => {
  const getImageUrl = async (text: string): Promise<string> => {
    try {
      return await QRCode.toDataURL(text, {
        margin: 2,
        scale: 10,
        color: {
          dark: '#000',
          light: '#fff',
        },
      })
    } catch (error) {
      console.error('Erreur lors de la génération du QR code:', error)
      throw error
    }
  }

  return { getImageUrl }
}
