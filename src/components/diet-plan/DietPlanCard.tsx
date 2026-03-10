'use client'

import React, { useState, useRef } from 'react'
import type { DietPlan } from '@/types/diet'
import { Button } from '@/components/ui/Button'
import { FoodChipList } from './FoodChipList'
import { NutrientTargetGrid } from './NutrientTargetGrid'
import { addFoodItem, removeFoodItem } from '@/utils/dietPlan'

export interface DietPlanCardProps {
  plan: DietPlan
  editable: boolean
  onSave: (plan: DietPlan, isCustomized: boolean) => void
}

interface SectionProps {
  title: string
  color: 'red' | 'green' | 'gray'
  icon: React.ReactNode
  defaultOpen?: boolean
  children: React.ReactNode
}

function CollapsibleSection({ title, color, icon, defaultOpen = false, children }: SectionProps) {
  const [open, setOpen] = useState(defaultOpen)
  const colorMap = {
    red: 'text-red-700 bg-red-50 border-red-100',
    green: 'text-emerald-700 bg-emerald-50 border-emerald-100',
    gray: 'text-gray-700 bg-gray-50 border-gray-100',
  }

  return (
    <div className={`overflow-hidden rounded-xl border ${colorMap[color].split(' ')[2]}`}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`flex w-full items-center justify-between px-4 py-3 text-left transition-colors ${colorMap[color].split(' ').slice(0, 2).join(' ')}`}
        aria-expanded={open}
      >
        <span className="flex items-center gap-2 text-sm font-medium">
          {icon}
          {title}
        </span>
        <svg
          className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>
      {open && <div className="bg-white px-4 py-3">{children}</div>}
    </div>
  )
}

export function DietPlanCard({ plan, editable, onSave }: DietPlanCardProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<DietPlan>(plan)
  const modified = useRef(false)

  function handleEdit() {
    setDraft({ ...plan, avoid: [...plan.avoid], prefer: [...plan.prefer], watch: [...plan.watch], nutrients: { ...plan.nutrients } })
    modified.current = false
    setEditing(true)
  }

  function handleConfirm() {
    onSave(draft, modified.current)
    setEditing(false)
  }

  function handleCancel() {
    setDraft(plan)
    modified.current = false
    setEditing(false)
  }

  function addItem(category: 'avoid' | 'prefer' | 'watch') {
    return (item: string) => {
      setDraft((prev) => addFoodItem(prev, category, item))
      modified.current = true
    }
  }

  function removeItem(category: 'avoid' | 'prefer' | 'watch') {
    return (item: string) => {
      setDraft((prev) => removeFoodItem(prev, category, item))
      modified.current = true
    }
  }

  const current = editing ? draft : plan

  return (
    <div className="space-y-3">
      {/* Quick summary always visible */}
      <div className="flex items-center justify-between rounded-2xl border border-gray-100 bg-white px-4 py-3">
        <div className="flex items-center gap-3 text-sm text-gray-600">
          <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
            {current.avoid.length} avoid
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
            {current.prefer.length} recommended
          </span>
        </div>
        {editable && !editing && (
          <Button variant="secondary" onClick={handleEdit} className="text-xs px-3 py-1.5">
            Edit
          </Button>
        )}
        {editing && (
          <div className="flex gap-2">
            <Button variant="secondary" onClick={handleCancel} className="text-xs px-3 py-1.5">Cancel</Button>
            <Button variant="primary" onClick={handleConfirm} className="text-xs px-3 py-1.5">Save</Button>
          </div>
        )}
      </div>

      {/* Collapsible sections */}
      <CollapsibleSection
        title={`Foods to Avoid (${current.avoid.length})`}
        color="red"
        defaultOpen={true}
        icon={<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>}
      >
        <FoodChipList
          items={current.avoid}
          color="red"
          removable={editing}
          onRemove={editing ? removeItem('avoid') : undefined}
          onAdd={editing ? addItem('avoid') : undefined}
        />
      </CollapsibleSection>

      <CollapsibleSection
        title={`Recommended Foods (${current.prefer.length})`}
        color="green"
        defaultOpen={true}
        icon={<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
      >
        <FoodChipList
          items={current.prefer}
          color="green"
          removable={editing}
          onRemove={editing ? removeItem('prefer') : undefined}
          onAdd={editing ? addItem('prefer') : undefined}
        />
      </CollapsibleSection>

      <CollapsibleSection
        title={`Nutrients to Watch (${current.watch.length})`}
        color="gray"
        defaultOpen={false}
        icon={<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
      >
        {editing ? (
          <FoodChipList
            items={current.watch}
            color="gray"
            removable
            onRemove={removeItem('watch')}
            onAdd={addItem('watch')}
          />
        ) : (
          <ul className="list-inside list-disc space-y-1 text-sm text-gray-600">
            {current.watch.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        )}
      </CollapsibleSection>

      <CollapsibleSection
        title="Nutrient Targets"
        color="gray"
        defaultOpen={false}
        icon={<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" /></svg>}
      >
        <NutrientTargetGrid nutrients={current.nutrients} />
      </CollapsibleSection>
    </div>
  )
}
