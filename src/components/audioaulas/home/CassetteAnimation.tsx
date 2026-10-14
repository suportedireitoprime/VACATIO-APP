import React from 'react';

const CassetteAnimation = () => {
  return (
    <div className="cassette-container w-full h-full flex items-center justify-center relative bg-[#151515] overflow-hidden">
      {/* Glow background behind cassette */}
      <div className="absolute inset-0 bg-primary/20 blur-[60px] rounded-full scale-110 animate-pulse-slow pointer-events-none" />

      <style>{`
        .cassette-wrapper {
          transform: scale(var(--cassette-scale, 0.45));
          transform-origin: center center;
          display: flex;
          align-items: center;
          justify-content: center;
          animation: float-cassette 6s ease-in-out infinite;
        }

        @media (min-width: 640px) {
          .cassette-wrapper { --cassette-scale: 0.6; }
        }
        @media (min-width: 1024px) {
          .cassette-wrapper { --cassette-scale: 0.8; }
        }

        .c-card {
          width: 300px;
          height: 200px;
          background: linear-gradient(145deg, #2a2a2a, #1a1a1a);
          border-radius: 12px;
          box-shadow: 
            rgba(0, 0, 0, 0.8) 0px 20px 30px, 
            rgba(0, 0, 0, 0.6) 0px 10px 15px -5px, 
            rgba(255, 255, 255, 0.05) 0px 1px 0px inset,
            rgba(0, 0, 0, 0.5) 0px -4px 0px inset;
          border: 1px solid #333;
        }

        .c-ups {
          display: flex;
        }

        .c-screw1, .c-screw2, .c-screw3, .c-screw4, .c-screw5 {
          display: flex;
          color: #444;
          background: linear-gradient(145deg, #d0d0d0, #a0a0a0);
          height: 0.8em;
          width: 0.8em;
          border-radius: 50%;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          box-shadow: inset 1px 1px 2px rgba(255,255,255,0.8), inset -1px -1px 2px rgba(0,0,0,0.5), 1px 1px 2px rgba(0,0,0,0.8);
          font-weight: bold;
        }

        .c-screw1 { margin: 0.6em; }
        .c-screw2 { margin-top: 0.6em; margin-left: 15.6em; }
        .c-screw3 { margin-top: -1.3em; margin-left: 0.6em; }
        .c-screw4 { margin-top: -1.3em; margin-left: 16.2em; }
        .c-screw5 { left: 4.25em; top: -0.5em; position: relative; }

        .c-card1 {
          width: 230px;
          height: 115px;
          margin-top: 0.3em;
          margin-left: 2.18em;
          background: linear-gradient(to bottom, #FFFDD0, #e6e4b8);
          clip-path: polygon(4% 0, 96% 0, 100% 10%, 100% 100%, 0 100%, 0 10%);
          border-radius: 6px;
          box-shadow: inset 0 2px 4px rgba(0,0,0,0.1);
        }

        .c-line1 {
          position: relative;
          width: 200px;
          height: 2px;
          background-color: rgba(0,0,0,0.15);
          top: 1em;
          left: 0.8em;
        }

        .c-line2 {
          position: relative;
          width: 200px;
          height: 2px;
          background-color: rgba(0,0,0,0.15);
          top: 2em;
          left: 0.8em;
        }

        .c-yl {
          display: flex;
          width: 228px;
          height: 50px;
          background: linear-gradient(to right, rgb(242, 188, 0), rgb(255, 210, 50));
          margin-top: 2.5em;
          margin-left: 0.06em;
          box-shadow: 0 -2px 5px rgba(0,0,0,0.05);
        }

        .c-roll {
          width: 8em;
          height: 2em;
          margin-left: 3em;
          border-radius: 15px;
          background: #111;
          display: flex;
          box-shadow: inset 0 3px 8px rgba(0,0,0,0.9), 0 1px 1px rgba(255,255,255,0.3);
          overflow: hidden;
        }

        .c-tape {
          width: 3.2em;
          height: 1.5em;
          position: relative;
          left: 0.8em;
          background: linear-gradient(to right, #2a2a2a, #1a1a1a, #2a2a2a);
          margin-top: 0.25em;
          border-radius: 2px;
          box-shadow: inset 0 1px 2px rgba(0,0,0,1);
          animation: tape-vibrate 0.1s infinite alternate linear;
        }

        .c-s_wheel, .c-e_wheel {
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          top: 0.215em;
          width: 1.55em;
          height: 1.55em;
          background-color: #222;
          border: 2px dashed #fff;
          box-shadow: 0 0 0 3px #fff, inset 0 0 5px rgba(0,0,0,0.8);
          border-radius: 50%;
          animation: run-cassette 2.5s infinite linear;
        }
        
        .c-s_wheel { left: 0.15em; }
        .c-e_wheel { left: 1.7em; }

        .c-num {
          margin-left: 1.5em;
          align-self: center;
          color: rgba(0,0,0,0.7);
          font-family: 'Courier New', monospace;
          font-weight: 900;
          font-size: 18px;
          margin-top: 0;
          margin-bottom: 0;
          letter-spacing: 1px;
        }

        .c-or {
          display: flex;
          width: 230px;
          height: 20px;
          background: linear-gradient(to right, rgb(241, 90, 37), rgb(255, 110, 60));
          margin-top: 0.3em;
          margin-left: 0em;
          border-bottom-left-radius: 5px;
          border-bottom-right-radius: 5px;
          align-items: center;
          justify-content: center;
          box-shadow: inset 0 2px 4px rgba(0,0,0,0.1);
        }

        .c-time {
          font-size: 0.65em;
          color: rgba(255,255,255,0.9);
          font-weight: 800;
          margin: 0;
          font-family: 'Courier New', Courier, monospace;
          letter-spacing: 1px;
        }

        .c-card2_main {
          filter: drop-shadow(0px 8px 12px rgba(0, 0, 0, 0.7));
          position: relative;
          z-index: 10;
        }

        .c-card2 {
          width: 160px;
          height: 52px;
          margin-top: -2px;
          margin-left: 4.3em;
          background: linear-gradient(180deg, #333, #222);
          clip-path: polygon(12% 0%, 88% 0%, 100% 100%, 0% 100%);
          border-top: 1px solid rgba(255,255,255,0.1);
        }

        .c-c1, .c-c2 {
          position: relative;
          width: 0.6em;
          height: 0.6em;
          background: radial-gradient(circle at 30% 30%, #555, #111);
          border-radius: 50%;
          font-size: 16px;
          box-shadow: inset 1px 1px 2px rgba(0,0,0,0.8);
        }

        .c-c1 { left: 1.5em; top: 1.8em; }
        .c-c2 { left: 7.7em; top: -0.2em; }

        .c-t1, .c-t2 {
          position: relative;
          width: 0.6em;
          height: 0.6em;
          background: radial-gradient(circle at 30% 30%, #444, #111);
          border-radius: 2px;
          font-size: 16px;
          box-shadow: inset 1px 1px 2px rgba(0,0,0,0.8);
        }

        .c-t1 { left: 3.2em; top: 0.8em; }
        .c-t2 { left: 6em; top: -0.2em; }

        @keyframes run-cassette {
          100% { transform: rotate(360deg); }
        }
        
        @keyframes float-cassette {
          0%, 100% { transform: scale(var(--cassette-scale, 0.45)) translateY(0px) rotate(0deg); }
          25% { transform: scale(var(--cassette-scale, 0.45)) translateY(-6px) rotate(1deg); }
          50% { transform: scale(var(--cassette-scale, 0.45)) translateY(-10px) rotate(0deg); }
          75% { transform: scale(var(--cassette-scale, 0.45)) translateY(-6px) rotate(-1deg); }
        }

        @keyframes tape-vibrate {
          0% { transform: translateY(0px); opacity: 0.8; }
          100% { transform: translateY(0.5px); opacity: 1; }
        }
        
        @keyframes pulse-slow {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.6; }
        }
        .animate-pulse-slow {
          animation: pulse-slow 3s ease-in-out infinite;
        }
      `}</style>

      <div className="cassette-wrapper">
        <div className="c-card">
          <div className="c-ups">
            <div className="c-screw1">+</div>
            <div className="c-screw2">+</div>
          </div>
          <div className="c-card1">
            <div className="c-line1" />
            <div className="c-line2" />
            <div className="c-yl">
              <div className="c-roll">
                <div className="c-s_wheel" />
                <div className="c-tape" />
                <div className="c-e_wheel" />
              </div>
              <p className="c-num">90</p>
            </div>
            <div className="c-or">
              <p className="c-time">2×30min</p>
            </div>
          </div>
          <div className="c-card2_main">
            <div className="c-card2">
              <div className="c-c1" />
              <div className="c-t1" />
              <div className="c-screw5">+</div>
              <div className="c-t2" />
              <div className="c-c2" />
            </div>
          </div>
          <div className="c-downs">
            <div className="c-screw3">+</div>
            <div className="c-screw4">+</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CassetteAnimation;
