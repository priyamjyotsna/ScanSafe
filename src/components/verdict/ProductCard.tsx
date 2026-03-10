'use client'

import React from 'react'
import { Card } from '@/components/ui/Card'

export interface ProductCardProps {
  name: string
  brand: string
}

export function ProductCard({ name, brand }: ProductCardProps) {
  return (
    <Card>
      <h3 className="text-lg font-semibold text-gray-900">{name}</h3>
      <p className="mt-1 text-sm text-gray-500">{brand}</p>
    </Card>
  )
}
