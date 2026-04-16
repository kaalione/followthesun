import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'FollowTheSun — Hitta sol i Stockholm';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #F7F6F3 0%, #FFD060 50%, #F5A623 100%)',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            marginBottom: '24px',
          }}
        >
          <span style={{ fontSize: '80px' }}>☀️</span>
          <span
            style={{
              fontSize: '72px',
              fontWeight: 800,
              color: '#1A1A1A',
              letterSpacing: '-2px',
            }}
          >
            FollowTheSun
          </span>
        </div>
        <p
          style={{
            fontSize: '32px',
            color: '#2D3748',
            margin: 0,
            textAlign: 'center',
            maxWidth: '700px',
          }}
        >
          Hitta uteserveringar med sol i Stockholm — just nu
        </p>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginTop: '40px',
            background: 'rgba(255,255,255,0.7)',
            borderRadius: '16px',
            padding: '12px 24px',
          }}
        >
          <span style={{ fontSize: '20px', color: '#6B7280' }}>
            723 uteserveringar &middot; Realtid skuggberäkning &middot; Gratis
          </span>
        </div>
      </div>
    ),
    { ...size }
  );
}
