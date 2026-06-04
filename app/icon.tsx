import { ImageResponse } from 'next/og'

export const runtime = 'nodejs'
export const size = {
  width: 192,
  height: 192,
}
export const contentType = 'image/png'

export default function Icon() {
  return (
    new ImageResponse(
      (
        <div
          style={{
            fontSize: 124,
            background: 'linear-gradient(135deg, #7c3aed 0%, #a78bfa 50%, #f5e6ff 100%)',
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontWeight: 'bold',
            position: 'relative',
          }}
        >
          <svg
            viewBox="0 0 200 200"
            width="160"
            height="160"
            xmlns="http://www.w3.org/2000/svg"
            style={{ position: 'absolute' }}
          >
            <defs>
              <radialGradient id="globeGradient" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#87CEEB" />
                <stop offset="100%" stopColor="#4A90E2" />
              </radialGradient>
              <filter id="glow">
                <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            
            {/* Outer golden rotating ring */}
            <circle
              cx="100"
              cy="100"
              r="95"
              fill="none"
              stroke="#FFD700"
              strokeWidth="8"
              strokeDasharray="300"
              opacity="0.8"
              filter="url(#glow)"
              style={{
                animation: 'rotate 8s linear infinite',
              }}
            />
            
            {/* Globe */}
            <circle cx="100" cy="100" r="70" fill="url(#globeGradient)" />
            
            {/* Continents */}
            <ellipse cx="75" cy="85" rx="18" ry="22" fill="#2d5016" opacity="0.7" />
            <ellipse cx="110" cy="95" rx="15" ry="18" fill="#2d5016" opacity="0.7" />
            <ellipse cx="130" cy="110" rx="12" ry="14" fill="#2d5016" opacity="0.7" />
            
            {/* Inner ring (axis) */}
            <circle
              cx="100"
              cy="100"
              r="75"
              fill="none"
              stroke="#C4AF50"
              strokeWidth="3"
              opacity="0.6"
              style={{
                animation: 'rotate-reverse 10s linear infinite',
              }}
            />
          </svg>
          
          <style>{`
            @keyframes rotate {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
            @keyframes rotate-reverse {
              from { transform: rotate(360deg); }
              to { transform: rotate(0deg); }
            }
          `}</style>
        </div>
      ),
      {
        ...size,
      },
    )
  )
}
