import type { FertilizerItem } from '../types'
import { ADVANCED_NUTRIENTS_FERTILIZERS } from './fertilizers/advancedNutrients'
import { HIGHROOTS_FERTILIZERS } from './fertilizers/highRoots'
import { RASTEA_FERTILIZERS } from './fertilizers/rastea'
import { SIMPLEX_FERTILIZERS } from './fertilizers/simplex'
import {
  ADVANCED_NUTRIENTS_STAGE_LABELS,
  TA_STAGE_LABELS,
} from './fertilizers/shared'
import { TERRA_AQUATICA_FERTILIZERS } from './fertilizers/terraAquatica'

export {
  DEFAULT_FERTILIZERS,
  EMPTY_STAGE_DOSAGES,
  FERTILIZER_CATEGORIES,
  GROW_METHODS,
  PLANT_STAGES,
} from './fertilizers/shared'

export const FERTILIZER_LIBRARY: FertilizerItem[] = [
  ...SIMPLEX_FERTILIZERS,
  ...TERRA_AQUATICA_FERTILIZERS.map((fertilizer) => ({
    ...fertilizer,
    stageLabels: TA_STAGE_LABELS,
  })),
  ...ADVANCED_NUTRIENTS_FERTILIZERS.map((fertilizer) => ({
    ...fertilizer,
    stageLabels: ADVANCED_NUTRIENTS_STAGE_LABELS,
  })),
  ...RASTEA_FERTILIZERS,
  ...HIGHROOTS_FERTILIZERS,
]
