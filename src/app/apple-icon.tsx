import { ImageResponse } from 'next/og'

export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        background: 'linear-gradient(135deg, #059669, #047857)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px',
      }}
    >
      <div style={{ color: 'white', fontSize: 72, fontWeight: 'bold', letterSpacing: '-3px', lineHeight: 1 }}>
        FM
      </div>
      <div style={{ color: '#a7f3d0', fontSize: 20, letterSpacing: '2px' }}>
        HATİM
      </div>
    </div>,
    { ...size }
  )
}
