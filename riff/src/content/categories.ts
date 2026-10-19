import type { Category, Mode } from '../types'

export const CATEGORIES: Category[] = [
  { id: 'climate-science', label: 'Climate Science & Basics', everyday: false, blurb: 'How the climate system works, and the numbers that matter.' },
  { id: 'global-policy', label: 'Global Climate Policy & COP', everyday: false, blurb: 'The UN process, the Paris Agreement, and what countries promised.' },
  { id: 'india-policy', label: "India's Climate Policy & Missions", everyday: false, blurb: 'India’s targets, missions, and national institutions.' },
  { id: 'air-quality', label: 'Air Quality & Pollution', everyday: true, blurb: 'Smog, AQI, stubble burning, and what clears the air.' },
  { id: 'water', label: 'Water, Rivers & Groundwater', everyday: true, blurb: 'Rivers, aquifers, scarcity, and water quality.' },
  { id: 'forests-biodiversity', label: 'Forests, Wildlife & Biodiversity', everyday: true, blurb: 'Forests, wetlands, species, and why they matter.' },
  { id: 'waste', label: 'Waste & Circular Economy', everyday: true, blurb: 'Segregation, plastic, landfills, and reuse.' },
  { id: 'energy', label: 'Energy & Renewables', everyday: true, blurb: 'Solar, wind, grids, coal, and the shift to clean power.' },
  { id: 'oceans-coasts', label: 'Oceans, Coasts & Climate Disasters', everyday: false, blurb: 'Sea level, cyclones, floods, and coastal resilience.' },
  { id: 'food-agriculture', label: 'Food, Agriculture & Land', everyday: true, blurb: 'Farming, food systems, soil, and climate-ready crops.' },
  { id: 'cities-transport', label: 'Cities, Transport & Health', everyday: true, blurb: 'Urban heat, mobility, buildings, and climate and health.' },
  { id: 'everyday-action', label: 'Everyday Climate Action', everyday: true, blurb: 'What individuals and communities can actually do.' },
]

export const CATEGORY_LABELS: string[] = CATEGORIES.map((c) => c.label)

const LABEL_TO_CATEGORY = new Map(CATEGORIES.map((c) => [c.label, c]))

export function categoryByLabel(label: string): Category | undefined {
  return LABEL_TO_CATEGORY.get(label)
}

export function defaultModeForCategory(label: string): Mode {
  const c = categoryByLabel(label)
  if (!c) return 'off-the-cuff'
  return c.everyday ? 'off-the-cuff' : 'deep-research'
}

export const ALL_CATEGORIES = 'all'
