import { ImageResponse } from 'next/og';

export const alt = 'SNHU Course Prerequisites Tool';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function Image() {
    return new ImageResponse(
        (
            <div
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    width: '100%',
                    height: '100%',
                    padding: '64px',
                    background: 'linear-gradient(135deg, #001d59 0%, #003087 100%)',
                    color: '#ffffff',
                    fontFamily: 'system-ui, sans-serif',
                }}
            >
                <div
                    style={{
                        fontSize: 48,
                        fontWeight: 700,
                        letterSpacing: '-0.02em',
                        marginBottom: 24,
                    }}
                >
                    SNHU Course Prerequisites Tool
                </div>
                <div
                    style={{
                        fontSize: 28,
                        fontWeight: 400,
                        color: '#b4c5ff',
                        maxWidth: '85%',
                        lineHeight: 1.4,
                    }}
                >
                    Map SNHU degree paths and explore course prerequisite dependency graphs.
                </div>
            </div>
        ),
        { ...size }
    );
}
