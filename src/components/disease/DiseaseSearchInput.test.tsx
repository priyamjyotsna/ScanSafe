import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { DiseaseSearchInput } from './DiseaseSearchInput'

// Mock the useDiseaseSearch hook
const mockSearch = vi.fn()
const mockHookReturn = {
  suggestions: [] as string[],
  loading: false,
  error: null as string | null,
  search: mockSearch,
}

vi.mock('@/hooks/useDiseaseSearch', () => ({
  useDiseaseSearch: () => mockHookReturn,
}))

describe('DiseaseSearchInput', () => {
  const onSelect = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mockHookReturn.suggestions = []
    mockHookReturn.loading = false
    mockHookReturn.error = null
  })

  it('renders the input with label and placeholder', () => {
    render(<DiseaseSearchInput onSelect={onSelect} />)
    expect(screen.getByLabelText('What condition are you managing?')).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/type your condition/i)).toBeInTheDocument()
  })

  it('calls search on input change', () => {
    render(<DiseaseSearchInput onSelect={onSelect} />)
    const input = screen.getByLabelText('What condition are you managing?')
    fireEvent.change(input, { target: { value: 'diabetes' } })
    expect(mockSearch).toHaveBeenCalledWith('diabetes')
  })

  it('shows loading spinner when loading', () => {
    mockHookReturn.loading = true
    render(<DiseaseSearchInput onSelect={onSelect} />)
    const input = screen.getByLabelText('What condition are you managing?')
    fireEvent.change(input, { target: { value: 'di' } })
    expect(screen.getByLabelText('Loading')).toBeInTheDocument()
  })

  it('shows suggestion dropdown when suggestions are available', () => {
    mockHookReturn.suggestions = ['Type 1 Diabetes', 'Type 2 Diabetes']
    render(<DiseaseSearchInput onSelect={onSelect} />)
    const input = screen.getByLabelText('What condition are you managing?')
    fireEvent.change(input, { target: { value: 'diabetes' } })
    expect(screen.getByText('Type 1 Diabetes')).toBeInTheDocument()
    expect(screen.getByText('Type 2 Diabetes')).toBeInTheDocument()
  })

  it('calls onSelect and confirms when a suggestion is clicked', () => {
    mockHookReturn.suggestions = ['Type 1 Diabetes']
    render(<DiseaseSearchInput onSelect={onSelect} />)
    const input = screen.getByLabelText('What condition are you managing?')
    fireEvent.change(input, { target: { value: 'diabetes' } })
    fireEvent.click(screen.getByText('Type 1 Diabetes'))
    expect(onSelect).toHaveBeenCalledWith('Type 1 Diabetes')
    expect(screen.getByLabelText('Confirmed')).toBeInTheDocument()
  })

  it('allows manual submission via Enter key', () => {
    render(<DiseaseSearchInput onSelect={onSelect} />)
    const input = screen.getByLabelText('What condition are you managing?')
    fireEvent.change(input, { target: { value: 'my custom condition' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(onSelect).toHaveBeenCalledWith('my custom condition')
  })

  it('shows error message with retry button', () => {
    mockHookReturn.error = 'Network error. Please try again.'
    render(<DiseaseSearchInput onSelect={onSelect} />)
    const input = screen.getByLabelText('What condition are you managing?')
    fireEvent.change(input, { target: { value: 'diabetes' } })
    expect(screen.getByText('Network error. Please try again.')).toBeInTheDocument()
    expect(screen.getByText('Retry')).toBeInTheDocument()
  })

  it('retries search when retry button is clicked', () => {
    mockHookReturn.error = 'Network error. Please try again.'
    render(<DiseaseSearchInput onSelect={onSelect} />)
    const input = screen.getByLabelText('What condition are you managing?')
    fireEvent.change(input, { target: { value: 'diabetes' } })
    mockSearch.mockClear()
    fireEvent.click(screen.getByText('Retry'))
    expect(mockSearch).toHaveBeenCalledWith('diabetes')
  })

  it('shows hint text when input has text but is not confirmed', () => {
    render(<DiseaseSearchInput onSelect={onSelect} />)
    const input = screen.getByLabelText('What condition are you managing?')
    fireEvent.change(input, { target: { value: 'diabetes' } })
    expect(screen.getByText(/press enter or select a suggestion/i)).toBeInTheDocument()
  })

  it('does not show hint text when confirmed', () => {
    mockHookReturn.suggestions = ['Type 1 Diabetes']
    render(<DiseaseSearchInput onSelect={onSelect} />)
    const input = screen.getByLabelText('What condition are you managing?')
    fireEvent.change(input, { target: { value: 'diabetes' } })
    fireEvent.click(screen.getByText('Type 1 Diabetes'))
    expect(screen.queryByText(/press enter or select a suggestion/i)).not.toBeInTheDocument()
  })
})
