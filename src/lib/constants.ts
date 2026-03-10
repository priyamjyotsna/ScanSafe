// Debounce timing
export const DEBOUNCE_MS = 400

// OpenAI max tokens per endpoint
export const MAX_TOKENS_DISEASE_SUGGEST = 500
export const MAX_TOKENS_DIET_PLAN = 1000
export const MAX_TOKENS_VERDICT = 300
export const MAX_TOKENS_INGREDIENT_OCR = 500

// localStorage keys
export const STORAGE_KEY_DISEASE = 'dietscan_disease'
export const STORAGE_KEY_DIET_PLAN = 'dietscan_diet_plan'
export const STORAGE_KEY_GUEST_SCANS = 'dietscan_guest_scans'
export const STORAGE_KEY_MIGRATION_PENDING = 'dietscan_migration_pending'
export const STORAGE_KEY_RECENT_DISEASES = 'dietscan_recent_diseases'
export const MAX_RECENT_DISEASES = 5

// Rate limit defaults (requests per window)
export const DEFAULT_RATE_LIMIT_DISEASE_SUGGEST = 30
export const DEFAULT_RATE_LIMIT_DIET_PLAN_GENERATE = 5
export const DEFAULT_RATE_LIMIT_INGREDIENT_OCR = 10
export const DEFAULT_RATE_LIMIT_VERDICT = 20
export const DEFAULT_RATE_LIMIT_WINDOW_MS = 60000

// Disease search
export const MIN_DISEASE_QUERY_LENGTH = 2
export const DISEASE_SUGGESTION_COUNT = 8
