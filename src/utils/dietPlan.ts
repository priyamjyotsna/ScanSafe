import type { DietPlan } from '@/types/diet'

/**
 * Returns a new DietPlan with the item appended to the specified category.
 * Pure function — does not mutate the original plan.
 */
export function addFoodItem(
  plan: DietPlan,
  category: 'avoid' | 'prefer' | 'watch',
  item: string
): DietPlan {
  return {
    ...plan,
    [category]: [...plan[category], item],
  }
}

/**
 * Returns a new DietPlan with the item removed from the specified category.
 * Removes only the first occurrence of the item.
 * Pure function — does not mutate the original plan.
 */
export function removeFoodItem(
  plan: DietPlan,
  category: 'avoid' | 'prefer' | 'watch',
  item: string
): DietPlan {
  const index = plan[category].indexOf(item)
  if (index === -1) return plan
  const updated = [...plan[category]]
  updated.splice(index, 1)
  return {
    ...plan,
    [category]: updated,
  }
}
