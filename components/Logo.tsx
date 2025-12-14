export const Logo = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 200 150"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    // You can control width/height via className (Tailwind)
  >
    <g style={{ fontFamily: "sans-serif", fontWeight: 800 }}>
      <text x="0" y="95" fontSize="110" fill="#FFC805" letterSpacing="-4">
        CD
      </text>
      <text x="2" y="135" fontSize="42" fill="#0F5FC2" letterSpacing="0">
        VOTING 0
      </text>
    </g>
  </svg>
);
