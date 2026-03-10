'use client'

export interface CameraViewfinderProps {
  active: boolean
}

export function CameraViewfinder({ active }: CameraViewfinderProps) {
  if (!active) return null

  return (
    <div
      className="pointer-events-none absolute inset-0 flex items-center justify-center"
      aria-hidden="true"
      data-testid="camera-viewfinder"
    >
      {/* Semi-transparent overlay */}
      <div className="absolute inset-0 bg-black/50" />

      {/* Transparent scanning area cutout */}
      <div className="relative z-10 h-56 w-72">
        {/* Clear center */}
        <div className="absolute inset-0 rounded-lg border-2 border-white/80 bg-transparent shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]" />

        {/* Corner accents */}
        <div className="absolute left-0 top-0 h-6 w-6 rounded-tl-lg border-l-4 border-t-4 border-white" />
        <div className="absolute right-0 top-0 h-6 w-6 rounded-tr-lg border-r-4 border-t-4 border-white" />
        <div className="absolute bottom-0 left-0 h-6 w-6 rounded-bl-lg border-b-4 border-l-4 border-white" />
        <div className="absolute bottom-0 right-0 h-6 w-6 rounded-br-lg border-b-4 border-r-4 border-white" />
      </div>

      {/* Instruction text */}
      <p className="absolute bottom-8 z-10 text-center text-sm font-medium text-white/90">
        Position barcode within the frame
      </p>
    </div>
  )
}
