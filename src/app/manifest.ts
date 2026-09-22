import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Furkan Meclisi — Hatim Takip',
    short_name: 'Furkan Meclisi',
    description: 'Günlük cüz okuma takip uygulaması',
    start_url: '/',
    display: 'standalone',
    background_color: '#f8fafc',
    theme_color: '#059669',
    orientation: 'portrait',
    icons: [
      {
        src: '/apple-icon',
        sizes: '180x180',
        type: 'image/png',
      },
    ],
  }
}
