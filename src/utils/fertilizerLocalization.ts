import { FERTILIZER_CATEGORIES } from '../data/fertilizerLibrary'
import type {
  FertilizerCategoryId,
  FertilizerItem,
  PlantStage,
  PlantStageId,
} from '../types'

type Language = 'ru' | 'en'

const STAGE_EN: Record<PlantStageId, { title: string; description: string }> = {
  seedling: { title: 'Germination and rooting', description: 'First roots and the first pair of true leaves' },
  earlyVeg: { title: 'Vegetative growth', description: 'Early active vegetative growth' },
  veg: { title: 'Pre-flowering', description: 'Late vegetative growth and the first signs of flowering' },
  preFlower: { title: 'Early flowering', description: 'Reduced vertical growth and flower development' },
  earlyBloom: { title: 'Flower development', description: 'Flower bulking and reduced vertical growth' },
  midBloom: { title: 'Ripening', description: 'Final flower ripening' },
  lateBloom: { title: 'Flushing', description: 'Preparing the plant for harvest' },
}

export const METHOD_EN: Record<string, string> = {
  hydro: 'Hydroponics',
  coco: 'Coco',
  soil: 'Soil',
  any: 'All growing media',
}

export const getCategoryCopy = (categoryId: FertilizerCategoryId, language: Language) => {
  if (language === 'ru') return FERTILIZER_CATEGORIES.find((category) => category.id === categoryId)
  return categoryId === 'base'
    ? { id: categoryId, title: 'Base nutrients', description: 'Primary nutrients for the growing cycle' }
    : { id: categoryId, title: 'Supplements and stimulants', description: 'Boosters, stimulants and supporting additives' }
}

export const getFertilizerCopy = (item: FertilizerItem, language: Language) => {
  if (language === 'ru') {
    return { shortDescription: item.shortDescription, description: item.description, details: item.details }
  }

  const method = METHOD_EN[item.growMethodId] ?? 'the selected growing medium'
  const category = item.categoryId === 'base' ? 'base nutrient' : 'plant supplement'
  const application = item.application === 'foliar' ? 'foliar application' : 'the nutrient solution'
  return {
    shortDescription: `${category === 'base nutrient' ? 'Base nutrition' : 'Plant supplement'} for ${method.toLowerCase()}`,
    description: `${item.name} by ${item.manufacturer} is a ${category} intended for ${method.toLowerCase()}. Use the stage dosage table below as a reference and confirm the current instructions on the product label before mixing.`,
    details: [
      `Growing method: ${method}`,
      `Application: ${application}`,
      item.components?.length
        ? `Components: ${item.components.map((component) => component.name).join(' and ')}`
        : 'Dosage: shown for each growth stage',
      `Dosage source: ${item.manufacturer} product or application chart`,
    ],
  }
}

export const getStageDisplay = (
  stage: PlantStage,
  fertilizer?: FertilizerItem | null,
  language: Language = 'ru',
) => {
  const label = fertilizer?.stageLabels?.[stage.id]

  if (language === 'en') {
    return {
      ...STAGE_EN[stage.id],
      manufacturerTitle: undefined,
      manufacturerDescription: undefined,
    }
  }

  return {
    title: stage.title,
    description: stage.description,
    manufacturerTitle: label?.title,
    manufacturerDescription: label?.description,
  }
}
