'use client'

import React from 'react'

export function MedicalDisclaimer() {
  return (
    <div
      role="alert"
      className="flex gap-2.5 rounded-xl border border-amber-200/60 bg-amber-50/50 p-3"
    >
      <svg
        className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-500"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
        />
      </svg>
      <p className="text-xs leading-relaxed text-amber-700">
        This is not medical advice. Always consult your doctor before making dietary changes based on your condition.
      </p>
    </div>
  )
}
