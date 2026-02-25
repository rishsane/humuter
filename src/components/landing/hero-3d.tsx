'use client';

export function Hero3D() {
  return (
    <div className="relative flex items-center justify-center" style={{ perspective: '800px' }}>
      {/* Floating 3D Cube */}
      <div className="cube-wrapper">
        <div className="cube">
          {/* Front */}
          <div className="cube-face cube-front">
            <div className="face-inner">
              <svg width="40" height="40" viewBox="0 0 20 20" fill="none">
                <rect x="3" y="3" width="5" height="5" rx="1" fill="#f97316" />
                <rect x="12" y="3" width="5" height="5" rx="1" fill="#f97316" />
                <rect x="3" y="12" width="5" height="5" rx="1" fill="#f97316" />
                <rect x="12" y="12" width="5" height="5" rx="1" fill="#f97316" />
              </svg>
            </div>
          </div>
          {/* Back */}
          <div className="cube-face cube-back">
            <div className="face-inner">
              <div className="h-8 w-8 border-2 border-orange-500" />
            </div>
          </div>
          {/* Right */}
          <div className="cube-face cube-right">
            <div className="face-inner">
              <div className="grid grid-cols-2 gap-1">
                <div className="h-3 w-3 bg-orange-500" />
                <div className="h-3 w-3 bg-neutral-300" />
                <div className="h-3 w-3 bg-neutral-300" />
                <div className="h-3 w-3 bg-orange-500" />
              </div>
            </div>
          </div>
          {/* Left */}
          <div className="cube-face cube-left">
            <div className="face-inner">
              <div className="h-10 w-10 rounded-full border-2 border-orange-500" />
            </div>
          </div>
          {/* Top */}
          <div className="cube-face cube-top">
            <div className="face-inner">
              <div className="h-6 w-6 rotate-45 bg-orange-500" />
            </div>
          </div>
          {/* Bottom */}
          <div className="cube-face cube-bottom">
            <div className="face-inner">
              <div className="h-6 w-6 rotate-45 border-2 border-orange-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Floating orbit rings */}
      <div className="orbit-ring orbit-ring-1" />
      <div className="orbit-ring orbit-ring-2" />

      {/* Small floating dots */}
      <div className="floating-dot dot-1" />
      <div className="floating-dot dot-2" />
      <div className="floating-dot dot-3" />

      <style jsx>{`
        .cube-wrapper {
          width: 140px;
          height: 140px;
          animation: float 6s ease-in-out infinite;
        }

        .cube {
          width: 100%;
          height: 100%;
          position: relative;
          transform-style: preserve-3d;
          animation: rotate 20s linear infinite;
        }

        .cube-face {
          position: absolute;
          width: 140px;
          height: 140px;
          border: 1px solid #e5e5e5;
          background: rgba(255, 255, 255, 0.92);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .face-inner {
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .cube-front  { transform: translateZ(70px); }
        .cube-back   { transform: rotateY(180deg) translateZ(70px); }
        .cube-right  { transform: rotateY(90deg) translateZ(70px); }
        .cube-left   { transform: rotateY(-90deg) translateZ(70px); }
        .cube-top    { transform: rotateX(90deg) translateZ(70px); }
        .cube-bottom { transform: rotateX(-90deg) translateZ(70px); }

        .orbit-ring {
          position: absolute;
          border: 1px solid #e5e5e5;
          border-radius: 50%;
        }

        .orbit-ring-1 {
          width: 240px;
          height: 240px;
          animation: spin 15s linear infinite;
        }

        .orbit-ring-2 {
          width: 300px;
          height: 300px;
          animation: spin 25s linear infinite reverse;
          border-style: dashed;
          border-color: #d4d4d4;
        }

        .floating-dot {
          position: absolute;
          border-radius: 0;
          background: #f97316;
        }

        .dot-1 {
          width: 6px;
          height: 6px;
          top: 10%;
          right: 15%;
          animation: float 4s ease-in-out infinite;
        }

        .dot-2 {
          width: 4px;
          height: 4px;
          bottom: 20%;
          left: 10%;
          animation: float 5s ease-in-out infinite 1s;
        }

        .dot-3 {
          width: 8px;
          height: 8px;
          top: 60%;
          right: 5%;
          animation: float 6s ease-in-out infinite 2s;
          background: transparent;
          border: 1px solid #f97316;
        }

        @keyframes rotate {
          from { transform: rotateX(-15deg) rotateY(0deg); }
          to   { transform: rotateX(-15deg) rotateY(360deg); }
        }

        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50%      { transform: translateY(-20px); }
        }

        @keyframes spin {
          from { transform: rotateX(70deg) rotateZ(0deg); }
          to   { transform: rotateX(70deg) rotateZ(360deg); }
        }
      `}</style>
    </div>
  );
}
