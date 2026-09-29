import React from 'react'
import { Image } from 'expo-image'

interface ZaloLogoProps {
  size?: number
}

export function ZaloLogo({ size = 32 }: ZaloLogoProps) {
  return (
    <Image
      source={require('../../../assets/images/zalo.svg.webp')}
      style={{ width: size, height: size }}
      contentFit="contain"
      transition={150}
    />
  )
}
