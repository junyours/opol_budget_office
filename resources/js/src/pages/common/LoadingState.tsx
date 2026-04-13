// import React from "react";

// export const LoadingState: React.FC = () => {
//   return (
//     <div className="min-h-screen flex items-center justify-center bg-gray-50 relative">
//       <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
//         <img
//           src="/images/opol.png"
//           alt="Background Logo"
//           className="max-w-[600px] max-h-[600px] object-contain opacity-30 animate-pulse"
//         />
//       </div>
//     </div>
//   );
// };

import React from "react";

const breatheStyle = `
  @keyframes breathe {
    0%, 100% { transform: scale(1); opacity: 0.25; }
    50% { transform: scale(1.08); opacity: 0.35; }
  }
`;

export const LoadingState: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 relative">
      <style>{breatheStyle}</style>
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <img
          src="/images/opol.png"
          alt="Background Logo"
          className="max-w-[600px] max-h-[600px] object-contain"
          style={{ animation: "breathe 3s ease-in-out infinite" }}
        />
      </div>
    </div>
  );
};
