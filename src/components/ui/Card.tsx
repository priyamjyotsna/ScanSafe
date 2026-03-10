'use client'

import React from 'react'

export interface CardProps {
  children: React.ReactNode
  className?: string
}

export function Card({ children, className = '' }: CardProps) {
  return (
    <div className={`rounded-2xl border border-gray-100 bg-white p-5 ${className}`}>
      {children}
    </div>
  )
}
