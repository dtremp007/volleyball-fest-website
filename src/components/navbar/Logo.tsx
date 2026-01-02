import React from 'react'
import Image from 'next/image'
import { Media } from '@/payload-types'

export default function Logo({ media }: { media: Media | number | null | undefined }) {
  if (!media || typeof media === 'number') {
    return null
  }

  return (
    <img
      src={media.url ?? ''}
      alt={media.alt ?? ''}
      height={64}
      width={64}
      className="h-16 w-auto"
    />
  )
}
