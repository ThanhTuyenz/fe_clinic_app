import Svg, { G, Path, Rect, Text as SvgText } from 'react-native-svg'

interface VietQrLogoProps {
  width?: number
  height?: number
  className?: string
}

export function VietQrLogo({ width = 115, height = 34, className }: VietQrLogoProps) {
  return (
    <Svg viewBox="0 0 115 34" width={width} height={height} fill="none" className={className}>
      {/* VietQR Frame icon */}
      <G transform="translate(1, 1)">
        {/* Top-left corner */}
        <Path d="M0 8V2a2 2 0 0 1 2-2h7v3.5H3.5V8H0z" fill="#005BAA" />
        {/* Top-right corner */}
        <Path d="M23 0h7a2 2 0 0 1 2 2v6h-3.5V3.5H23V0z" fill="#EA1D25" />
        {/* Bottom-left corner */}
        <Path d="M0 24v6a2 2 0 0 0 2 2h7v-3.5H3.5V24H0z" fill="#005BAA" />
        {/* Bottom-right corner */}
        <Path d="M32 24v6a2 2 0 0 1-2 2h-7v-3.5h5.5V24H32z" fill="#EA1D25" />
        {/* Inner QR squares */}
        <Rect x="5.5" y="5.5" width="7" height="7" rx="1.5" fill="#005BAA" />
        <Rect x="19.5" y="5.5" width="7" height="7" rx="1.5" fill="#EA1D25" />
        <Rect x="5.5" y="19.5" width="7" height="7" rx="1.5" fill="#005BAA" />
        <Rect x="19.5" y="19.5" width="4.5" height="4.5" rx="1" fill="#EA1D25" />
      </G>
      {/* Viet text */}
      <SvgText
        x="38"
        y="24"
        fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
        fontSize="20"
        fontWeight="900"
        fill="#005BAA"
        letterSpacing="-0.5"
      >
        Viet
      </SvgText>
      {/* QR text */}
      <SvgText
        x="80"
        y="24"
        fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
        fontSize="20"
        fontWeight="900"
        fill="#EA1D25"
        letterSpacing="-0.5"
      >
        QR
      </SvgText>
    </Svg>
  )
}

