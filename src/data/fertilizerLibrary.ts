import type {
  FertilizerCategory,
  FertilizerItem,
  FertilizerStageLabel,
  FertilizerSolutionTarget,
  FertilizerStageDosage,
  GrowMethod,
  PlantStage,
} from '../types'

export const PLANT_STAGES: PlantStage[] = [
  {
    id: 'seedling',
    title: 'Проращивание и укоренение',
    description: 'Проявление первой пары листьев',
  },
  {
    id: 'earlyVeg',
    title: 'Вегетативный рост',
    description: 'Набор зеленой массы растения',
  },
  {
    id: 'veg',
    title: 'Предцвет',
    description: 'Набор зеленой массы растения, начало образования соцветий',
  },
  {
    id: 'preFlower',
    title: 'Начало цветения',
    description: 'Замедление роста растения, развитие соцветий',
  },
  {
    id: 'earlyBloom',
    title: 'Развитие цветков',
    description: 'Уплотнение соцветий, остановка вертикального роста растения',
  },
  {
    id: 'midBloom',
    title: 'Созревание',
    description: 'Остановка роста соцветий',
  },
  {
    id: 'lateBloom',
    title: 'Промывка',
    description: 'Подготовка к сбору урожая',
  },
]

export const GROW_METHODS: GrowMethod[] = [
  { id: 'hydro', title: 'Гидропоника' },
  { id: 'coco', title: 'Кокос' },
  { id: 'soil', title: 'Земля' },
]

const parseDosageAmount = (amount: number | string | null) => {
  if (amount === null) return null
  if (typeof amount === 'number') return Number.isFinite(amount) ? amount : null

  const values = amount
    .replace(',', '.')
    .split('-')
    .map((value) => Number.parseFloat(value.trim()))
    .filter((value) => Number.isFinite(value))

  if (values.length === 0) return null
  if (values.length === 1) return values[0]
  return (values[0] + values[1]) / 2
}

type DosageInput = number | string | null | {
  amount: number | string | null
  label?: string
}

const getDosageAmount = (input: DosageInput) =>
  input && typeof input === 'object' ? input.amount : input

const getDosageLabel = (input: DosageInput, amountMlPerLiter: number | null) => {
  if (input && typeof input === 'object') return input.label
  return typeof input === 'string' && amountMlPerLiter !== null ? input : undefined
}

const dose = (amount: number | string | null, label: string): DosageInput => ({ amount, label })

const getNumericValues = (value: string | number | null | undefined) => {
  if (value === null || value === undefined) return []
  if (typeof value === 'number') return Number.isFinite(value) ? [value] : []
  return [...value.replace(',', '.').matchAll(/\d+(?:\.\d+)?/g)]
    .map(([match]) => Number.parseFloat(match))
    .filter((number) => Number.isFinite(number))
}

const formatCompactNumber = (value: number) => {
  const rounded = Number(value.toFixed(2))
  return Number.isInteger(rounded) ? String(rounded) : String(rounded)
}

const mergeRangeValue = (first: string | null, second: string | null) => {
  if (!first) return second
  if (!second || first === second) return first

  const values = [...getNumericValues(first), ...getNumericValues(second)]
  if (values.length === 0) return first

  const min = Math.min(...values)
  const max = Math.max(...values)
  return min === max ? formatCompactNumber(min) : `${formatCompactNumber(min)}-${formatCompactNumber(max)}`
}

const mergeDosageInput = (first: DosageInput, second: DosageInput): DosageInput => {
  if (first === null) return second
  if (second === null) return first

  const firstAmount = getDosageAmount(first)
  const secondAmount = getDosageAmount(second)
  const firstLabel = getDosageLabel(first, parseDosageAmount(firstAmount))
  const secondLabel = getDosageLabel(second, parseDosageAmount(secondAmount))
  const firstSource = firstLabel ?? firstAmount
  const secondSource = secondLabel ?? secondAmount
  const values = [...getNumericValues(firstSource), ...getNumericValues(secondSource)]

  if (values.length === 0) return first

  const min = Math.min(...values)
  const max = Math.max(...values)
  const amount = min === max ? formatCompactNumber(min) : `${formatCompactNumber(min)}-${formatCompactNumber(max)}`
  const unit = /(?:г|g|gr)\s*\/\s*(?:л|l)/i.test(`${firstLabel ?? ''} ${secondLabel ?? ''}`) ? ' г/л' : ''

  return unit ? dose(amount, `${amount}${unit}`) : amount
}

const dosageSchedule = (amounts: DosageInput[]): FertilizerStageDosage[] =>
  PLANT_STAGES.map((stage, index) => {
    const input = amounts[index] ?? null
    const amount = getDosageAmount(input)
    const amountMlPerLiter = parseDosageAmount(amount)

    return {
      stageId: stage.id,
      amountMlPerLiter,
      amountLabel: getDosageLabel(input, amountMlPerLiter),
    }
  })

const solutionTargetSchedule = (
  phRanges: Array<string | null>,
  ecRanges: Array<string | null>,
): FertilizerSolutionTarget[] =>
  PLANT_STAGES.map((stage, index) => ({
    stageId: stage.id,
    phRange: phRanges[index] ?? null,
    ecRange: ecRanges[index] ?? null,
  }))

const taDosageSchedule = (amounts: DosageInput[]): FertilizerStageDosage[] =>
  dosageSchedule([
    mergeDosageInput(amounts[0] ?? null, amounts[1] ?? null),
    amounts[2] ?? null,
    amounts[3] ?? null,
    amounts[4] ?? null,
    amounts[4] ?? null,
    amounts[5] ?? null,
    amounts[6] ?? null,
  ])

const taSolutionTargetSchedule = (
  phRanges: Array<string | null>,
  ecRanges: Array<string | null>,
): FertilizerSolutionTarget[] =>
  solutionTargetSchedule(
    [
      mergeRangeValue(phRanges[0] ?? null, phRanges[1] ?? null),
      phRanges[2] ?? null,
      phRanges[3] ?? null,
      phRanges[4] ?? null,
      phRanges[4] ?? null,
      phRanges[5] ?? null,
      phRanges[6] ?? null,
    ],
    [
      mergeRangeValue(ecRanges[0] ?? null, ecRanges[1] ?? null),
      ecRanges[2] ?? null,
      ecRanges[3] ?? null,
      ecRanges[4] ?? null,
      ecRanges[4] ?? null,
      ecRanges[5] ?? null,
      ecRanges[6] ?? null,
    ],
  )

export const EMPTY_STAGE_DOSAGES = dosageSchedule([null, null, null, null, null, null, null])

const SIMPLEX_STARTUP_TARGETS = solutionTargetSchedule(
  ['6.5', '6.5', '6.5', null, null, null, null],
  ['0.5-0.6', '0.6-1.1', '1.1-1.4', null, null, null, null],
)

const PH_PERFECT_TARGETS = solutionTargetSchedule(
  ['5.5-6.3', '5.5-6.3', '5.5-6.3', '5.5-6.3', '5.5-6.3', '5.5-6.3', null],
  [null, null, null, null, null, null, null],
)

const SIMPLEX_HYDRO_TARGETS = solutionTargetSchedule(
  ['5.5-5.9', '5.5-5.9', '5.5-5.9', '6.0-6.5', '6.0-6.5', '6.0-6.5', '6.0-6.5'],
  ['0.4-0.6', '0.9-1.3', '1.5-1.9', '1.8-2.4', '1.8-2.2', '1.5-1.7', '0.8-0.9'],
)

const SIMPLEX_COCO_TARGETS = solutionTargetSchedule(
  ['5.5-5.9', '5.5-5.9', '5.5-5.9', '6.0-6.5', '6.0-6.5', '6.0-6.5', '6.0-6.5'],
  ['0.6-0.8', '0.9-1.3', '1.5-1.9', '1.8-2.4', '1.8-2.3', '1.5-2.0', '0.8-0.9'],
)

const SIMPLEX_TERRA_TARGETS = solutionTargetSchedule(
  ['5.8-6.5', '5.8-6.5', '5.8-6.5', '6.0-6.8', '6.0-6.8', '6.0-6.8', '6.0-6.8'],
  ['0.4-0.6', '0.8-1.2', '1.5-1.9', '1.6-2.0', '1.7-2.2', '1.2-1.8', '0.8-0.9'],
)

const TA_HYDRO_COCO_TARGETS = taSolutionTargetSchedule(
  ['5.5-6.5', '5.5-6.5', '5.5-6.5', '6.4-6.8', '6.4-6.8', '6.4-6.8', null],
  ['0.3-0.6', '0.8-1.2', '1.3-1.8', '1.8-2.0', '1.4-2.2', '1.4-2.6', null],
)

const TA_SOIL_TARGETS = taSolutionTargetSchedule(
  ['5.5-6.5', '5.5-6.5', '5.5-6.5', '6.4-6.8', '6.4-6.8', '6.4-6.8', null],
  ['0.2-0.5', '0.6-1.0', '1.1-1.6', '1.4-1.8', '1.3-1.7', '1.3-2.0', null],
)

const TA_DRY_HYDRO_COCO_TARGETS = taSolutionTargetSchedule(
  ['5.5-6.5', '5.5-6.5', '5.5-6.5', '6.4-6.8', '6.4-6.8', '6.4-6.8', null],
  ['0.2-0.4', '0.6-1.0', '1.3-1.8', '1.6-1.9', '1.8-2.2', '1.4-2.6', null],
)

const TA_DRY_SOIL_TARGETS = taSolutionTargetSchedule(
  ['5.5-6.5', '5.5-6.5', '5.5-6.5', '6.4-6.8', '6.4-6.8', '6.4-6.8', null],
  ['0.1-0.4', '0.6-1.0', '1.0-1.4', '1.2-1.6', '1.3-1.7', '1.3-2.0', null],
)

const TA_STAGE_LABELS: Partial<Record<PlantStage['id'], FertilizerStageLabel>> = {
  seedling: {
    title: '1st roots / 1st true leaves',
    description: 'Первые корни и первая пара настоящих листьев',
  },
  earlyVeg: {
    title: 'Growing',
    description: 'Вегетативный рост',
  },
  veg: {
    title: 'Preflowering',
    description: 'Предцвет',
  },
  preFlower: {
    title: 'Flowering',
    description: 'Начало цветения',
  },
  earlyBloom: {
    title: 'Flowering',
    description: 'Развитие цветков',
  },
  midBloom: {
    title: 'Ripening',
    description: 'Созревание',
  },
  lateBloom: {
    title: 'Cleaning',
    description: 'Промывка',
  },
}

const ADVANCED_NUTRIENTS_STAGE_LABELS: Partial<Record<PlantStage['id'], FertilizerStageLabel>> = {
  seedling: {
    title: 'Grow W1',
    description: 'Advanced Nutrients Master Recipe, grow cycle week 1',
  },
  earlyVeg: {
    title: 'Grow W2',
    description: 'Advanced Nutrients Master Recipe, grow cycle week 2',
  },
  veg: {
    title: 'Grow W3-W4',
    description: 'Advanced Nutrients Master Recipe, grow cycle weeks 3-4',
  },
  preFlower: {
    title: 'Bloom W1-W2',
    description: 'Advanced Nutrients Master Recipe, bloom cycle weeks 1-2',
  },
  earlyBloom: {
    title: 'Bloom W3-W4',
    description: 'Advanced Nutrients Master Recipe, bloom cycle weeks 3-4',
  },
  midBloom: {
    title: 'Bloom W5-W7',
    description: 'Advanced Nutrients Master Recipe, bloom cycle weeks 5-7',
  },
  lateBloom: {
    title: 'Flush',
    description: 'Advanced Nutrients nutrient-free flush period',
  },
}

const AN_ROOT_EXPANDER_STAGE_DOSAGES = dosageSchedule([2, 2, null, 2, null, null, null])
const AN_FULL_CYCLE_2ML_STAGE_DOSAGES = dosageSchedule([2, 2, 2, 2, 2, 2, null])
const AN_BLOOM_2ML_STAGE_DOSAGES = dosageSchedule([null, null, null, 2, 2, 2, null])

const RASTEA_STAGE_LABELS: Partial<Record<PlantStage['id'], FertilizerStageLabel>> = {
  seedling: {
    title: 'Рассада',
    description: 'Старт рассады после проращивания',
  },
  earlyVeg: {
    title: 'Вегетация 18/6, 2-4',
    description: 'Первые недели активной вегетации',
  },
  veg: {
    title: 'Вегетация 18/6, 4+',
    description: 'Поздняя вегетация перед переводом на цветение',
  },
  preFlower: {
    title: 'Цветение 12/12, 1-2',
    description: 'Переход на цветение и первые завязи',
  },
  earlyBloom: {
    title: 'Цветение 12/12, 3-4',
    description: 'Развитие цветков и подключение PK Classic',
  },
  midBloom: {
    title: 'Цветение 12/12, 5-7',
    description: 'Основная фаза набора и созревания',
  },
  lateBloom: {
    title: 'Последняя',
    description: 'Промывка чистой водой',
  },
}

const RASTEA_HYDRO_TARGETS = solutionTargetSchedule(
  ['5.2', '5.2', '5.2', '5.5', '5.5-5.8', '5.8', '5.9'],
  ['<0.8', '<1.5', '<1.8', '2.2-2.3', '2.4-2.6', '2.8', null],
)

const RASTEA_COCO_TARGETS = solutionTargetSchedule(
  ['5.8', '5.8', '5.8', '6.0', '6.0', '6.0', '6.0'],
  ['<0.8', '<1.5', '<1.8', '2.2-2.3', '2.4-2.6', '2.8', null],
)

const RASTEA_SOIL_TARGETS = solutionTargetSchedule(
  ['6.1', '6.1', '6.1', '6.5', '6.5', '6.5', '6.5'],
  ['<0.8', '<1.5', '<1.8', '2.2-2.3', '2.4-2.6', '2.8', null],
)

const RASTEA_TARGETS_BY_METHOD = {
  hydro: RASTEA_HYDRO_TARGETS,
  coco: RASTEA_COCO_TARGETS,
  soil: RASTEA_SOIL_TARGETS,
}

const RASTEA_METHOD_TITLES = {
  hydro: 'Hydro',
  coco: 'Coco',
  soil: 'Soil',
}

const RASTEA_VEGA_STAGE_DOSAGES = dosageSchedule([1, 2, 4, null, null, null, null])
const RASTEA_FLORES_STAGE_DOSAGES = dosageSchedule([null, null, null, 4, 4, 4, null])

export const FERTILIZER_CATEGORIES: FertilizerCategory[] = [
  {
    id: 'base',
    title: 'База',
    description: 'Базовые удобрения для основного питания',
  },
  {
    id: 'boosters',
    title: 'Добавки и стимуляторы',
    description: 'Стимуляторы, бустеры и вспомогательные добавки',
  },
]

export const DEFAULT_FERTILIZERS: FertilizerItem[] = []

const SIMPLEX_FERTILIZERS: FertilizerItem[] = [
  {
    id: 'simplex-startup',
    categoryId: 'base',
    manufacturer: 'Simplex',
    growMethodId: 'any',
    name: 'СтартАп',
    shortDescription: 'База для проращивания, укоренения и веги',
    description: 'Стартовое питание для самых ранних этапов: проращивание, укоренение и переход к активной вегетации. Помогает мягко дать растению базовые элементы без перегруза раствора, поэтому подходит для рассады, клонов и молодых растений. После выхода на уверенную вегу его обычно заменяют основной базой под выбранный метод выращивания.',
    details: [
      'Применение: питательный раствор',
    ],
    stageDosages: dosageSchedule(['0.5-1.0', '1.0-3.0', '3.0-4.0', null, null, null, null]),
    solutionTargets: SIMPLEX_STARTUP_TARGETS,
    source: 'library',
  },
  {
    id: 'simplex-hydro-vega-ab',
    categoryId: 'base',
    manufacturer: 'Simplex',
    growMethodId: 'hydro',
    name: 'ГидроВега A+B',
    shortDescription: 'Двухкомпонентная база Hydro для веги и предцвета',
    description: 'Основная двухкомпонентная база для гидропоники на вегетации и предцвете. Компоненты A и B работают парой и вносятся в равных пропорциях, чтобы раствор оставался сбалансированным по макро- и микроэлементам. Используй эту базу до перехода на цветение, затем переключайся на Hydro Bloom A+B.',
    details: [
      'Метод выращивания: гидропоника',
      'Применение: добавлять компоненты A и B в равных пропорциях',
      'Дозировка в таблице указана для каждого компонента отдельно',
      'Источник дозировок: Simplex, таблица применения "Продвинутый уровень"',
    ],
    stageDosages: dosageSchedule([0.5, '0.5-1.0', '1.0-1.5', null, null, null, null]),
    solutionTargets: SIMPLEX_HYDRO_TARGETS,
    source: 'library',
  },
  {
    id: 'simplex-hydro-bloom-ab',
    categoryId: 'base',
    manufacturer: 'Simplex',
    growMethodId: 'hydro',
    name: 'ГидроБлум A+B',
    shortDescription: 'Двухкомпонентная база Hydro для цветения',
    description: 'Цветочная двухкомпонентная база для гидропонных систем. Поддерживает растение после перехода на цветение, когда акцент питания смещается в сторону формирования соцветий и созревания. Компоненты A и B добавляются равными частями, а дозировка в таблице указана для каждого компонента отдельно.',
    details: [
      'Метод выращивания: гидропоника',
      'Применение: добавлять компоненты A и B в равных пропорциях',
      'Дозировка в таблице указана для каждого компонента отдельно',
      'Источник дозировок: Simplex, таблица применения "Продвинутый уровень"',
    ],
    stageDosages: dosageSchedule([null, null, null, '1.5-2.0', '1.5-2.0', 1, null]),
    solutionTargets: SIMPLEX_HYDRO_TARGETS,
    source: 'library',
  },
  {
    id: 'simplex-coco-ab',
    categoryId: 'base',
    manufacturer: 'Simplex',
    growMethodId: 'coco',
    name: 'Кокос A+B',
    shortDescription: 'Двухкомпонентная база Coco на весь цикл',
    description: 'Основная двухкомпонентная база для кокосового субстрата на весь цикл. Формула рассчитана на особенности кокоса, где важно стабильно закрывать потребности растения и не забывать про кальций/магний. Компоненты A и B используются вместе в равных долях, дозировка в таблице указана на каждый компонент.',
    details: [
      'Метод выращивания: кокос',
      'Применение: добавлять компоненты A и B в равных пропорциях',
      'Дозировка в таблице указана для каждого компонента отдельно',
      'Источник дозировок: Simplex, таблица применения "Продвинутый уровень"',
    ],
    stageDosages: dosageSchedule([0.5, '0.5-1.0', '1.0-1.5', '1.5-2.0', '1.5-2.0', '1.0-1.5', null]),
    solutionTargets: SIMPLEX_COCO_TARGETS,
    source: 'library',
  },
  {
    id: 'simplex-terra-vega',
    categoryId: 'base',
    manufacturer: 'Simplex',
    growMethodId: 'soil',
    name: 'ТерраВега',
    shortDescription: 'База Terra для веги и предцвета',
    description: 'Базовое питание для земли и почвосмесей на вегетации и предцвете. Подходит для обычного полива в грунте, когда субстрат сам частично буферит питание и не требует гидропонной точности. Используй его до старта активного цветения, затем переходи на Terra Bloom.',
    details: [
      'Метод выращивания: земля и почвосмеси',
      'Применение: любой способ полива',
      'Источник дозировок: Simplex, таблица применения "Продвинутый уровень"',
    ],
    stageDosages: dosageSchedule([null, '0.5-1.0', '1.5-2.0', null, null, null, null]),
    solutionTargets: SIMPLEX_TERRA_TARGETS,
    source: 'library',
  },
  {
    id: 'simplex-terra-bloom',
    categoryId: 'base',
    manufacturer: 'Simplex',
    growMethodId: 'soil',
    name: 'ТерраБлум',
    shortDescription: 'База Terra для цветения и плодоношения',
    description: 'Базовое питание для земли и почвосмесей на период цветения и созревания. Закрывает основные потребности растения после перехода на генеративную фазу, когда вегетативная база уже не подходит по балансу. Лучше использовать как основную базу для грунта, а стимуляторы добавлять поверх нее по необходимости.',
    details: [
      'Метод выращивания: земля и почвосмеси',
      'Применение: любой способ полива',
      'Источник дозировок: Simplex, таблица применения "Продвинутый уровень"',
    ],
    stageDosages: dosageSchedule([null, null, null, '2.0-2.5', '2.5-3.5', '1.0-2.0', null]),
    solutionTargets: SIMPLEX_TERRA_TARGETS,
    source: 'library',
  },
  {
    id: 'simplex-seaforce',
    categoryId: 'boosters',
    manufacturer: 'Simplex',
    growMethodId: 'any',
    name: 'СиФорс',
    shortDescription: 'Органический биостимулятор широкого цикла',
    description: 'Органический биостимулятор широкого применения для поддержки растения почти на всем цикле. Может помогать мягче проходить стрессовые периоды, поддерживать корневую активность и общий тонус растения. Удобен как универсальная добавка к основной базе, особенно когда нужна не жесткая минеральная подкормка, а поддержка жизненных процессов.',
    details: [
      'Методы выращивания: грунт, почвосмеси, субстраты и гидропоника кроме аэропоники',
      'Применение: добавление в питательный раствор',
      'Источник дозировок: Simplex, таблица применения "Продвинутый уровень"',
      'Для Hydro используется отдельная дозировка из таблицы Hydro "Продвинутый уровень"',
    ],
    stageDosages: dosageSchedule([0.5, '1.0-2.0', '2.0-3.0', '1.5-2.5', '1.0-1.5', '0.5-1.0', 0.5]),
    methodStageDosages: {
      hydro: dosageSchedule([0.5, 0.5, 1, 1, 0.5, 0.5, 0.5]),
    },
    source: 'library',
  },
  {
    id: 'simplex-pkboost',
    categoryId: 'boosters',
    manufacturer: 'Simplex',
    growMethodId: 'any',
    name: 'ПКБуст',
    shortDescription: 'PK 0-8-9 для фосфорного окна',
    description: 'PK-добавка для короткого фосфорно-калийного окна в начале цветения. Ее задача не заменить базовое питание, а дать акцент на элементы, связанные с закладкой и развитием цветков. Используй аккуратно: избыток PK легко перегружает раствор и может конфликтовать с общей схемой питания.',
    details: [
      'Методы выращивания: грунт, почвосмеси и гидропоника',
      'Применение: добавление в питательный раствор',
      'NPK: 0-8-9',
    ],
    stageDosages: dosageSchedule([null, null, null, '0.5-1.0', null, null, null]),
    source: 'library',
  },
  {
    id: 'simplex-calmag-plus',
    categoryId: 'boosters',
    manufacturer: 'Simplex',
    growMethodId: 'any',
    name: 'КалМаг Плюс',
    shortDescription: 'Кальций и магний для мягкой или осмотической воды',
    description: 'Добавка кальция и магния для мягкой, осмотической или нестабильной воды. Помогает закрывать типичные дефициты Ca/Mg, особенно в гидропонике, кокосе и при интенсивном свете. Если исходная вода уже достаточно минерализована, добавка может быть лишней, поэтому лучше ориентироваться на EC воды и состояние растения.',
    details: [
      'Методы выращивания: закрытый грунт и гидропонные системы',
      'Применение: добавление в питательный раствор',
      'Применять только при мягкой или осмотической воде; при EC воды 0.4-0.6 мСм/см обычно не требуется',
    ],
    stageDosages: dosageSchedule(['0.5-1.0', '0.5-1.0', '1.0-1.5', '1.0-1.5', '1.0-1.5', '1.0-1.5', null]),
    source: 'library',
  },
  {
    id: 'simplex-silicx',
    categoryId: 'boosters',
    manufacturer: 'Simplex',
    growMethodId: 'any',
    name: 'СилИкс',
    shortDescription: 'Кремниевая добавка для прочности и стрессоустойчивости',
    description: 'Кремниевая добавка для укрепления тканей, поддержки стеблей и повышения устойчивости к стрессу. Из-за щелочной природы ее важно добавлять в раствор первой, тщательно перемешивать и только потом вносить остальные компоненты. Особенно полезна в активной веге, предцвете и начале цветения, когда растение быстро набирает массу.',
    details: [
      'Методы выращивания: закрытый грунт, гидропоника и кокос',
      'Применение: добавление в питательный раствор первым компонентом',
      'NPK: 0-0-4, SiO2 11%',
    ],
    stageDosages: dosageSchedule([null, '0.1-0.25', '0.25-0.5', '0.25-0.5', '0.25-0.5', null, null]),
    source: 'library',
  },
  {
    id: 'simplex-taste',
    categoryId: 'boosters',
    manufacturer: 'Simplex',
    growMethodId: 'any',
    name: 'Вкус',
    shortDescription: 'Сахара и фульвокислоты для вкуса и промывки',
    description: 'Добавка для грунта, почвосмесей и кокоса, ориентированная на вкус, аромат и финальное качество урожая. Ее используют ближе к цветению и созреванию, когда важны не только масса, но и накопление вторичных метаболитов. Для гидропоники производитель не рекомендует этот препарат, поэтому в рецепте он исключается отдельным правилом для Hydro.',
    details: [
      'Методы выращивания: грунт, почвосмеси и кокос',
      'Применение: добавление в питательный раствор',
      'Официальная таблица: не рекомендуется использовать в гидропонике любого типа',
    ],
    excludedGrowMethodIds: ['hydro'],
    stageDosages: dosageSchedule([null, null, '0.5-1.0', '0.5-1.0', '1.0-2.0', '1.5-2.0', '1.5-2.0']),
    source: 'library',
  },
  {
    id: 'simplex-fulvicgold',
    categoryId: 'boosters',
    manufacturer: 'Simplex',
    growMethodId: 'any',
    name: 'ФульвикГолд',
    shortDescription: 'Фульвокислоты для метаболизма и транспорта питания',
    description: 'Фульвокислотная добавка для поддержки обмена веществ и транспорта питания. Может помогать растению лучше использовать элементы из раствора и мягче реагировать на изменения схемы. Хорошо ложится как вспомогательный стимулятор на веге, предцвете и цветении, но не заменяет базовое питание.',
    details: [
      'Методы выращивания: грунт, почвосмеси и гидропоника',
      'Применение: добавление в питательный раствор',
    ],
    stageDosages: dosageSchedule([null, '2.0-3.0', '2.0-3.0', '2.0-3.0', '2.0-3.0', '2.0-3.0', null]),
    source: 'library',
  },
  {
    id: 'simplex-aromapunch',
    categoryId: 'boosters',
    manufacturer: 'Simplex',
    growMethodId: 'any',
    name: 'АромаПанч',
    shortDescription: 'Калийная добавка для аромата и терпенов',
    description: 'Калийная добавка, ориентированная на аромат, вкус и терпеновый профиль. Используется на цветении и ближе к финалу, когда растение уже сформировало основу урожая и работает над качеством. В гидропонных системах особенно важно следить за чистотой раствора и регулярной заменой воды.',
    details: [
      'Методы выращивания: грунт, почвосмеси и гидропоника',
      'Применение: добавление в питательный раствор',
      'NPK: 0-0-5',
      'В DWC производитель рекомендует менять раствор каждые 5-10 дней',
    ],
    stageDosages: dosageSchedule([null, 0.5, 1, '1.0-1.5', '1.5-2.0', '1.5-2.0', 3]),
    source: 'library',
  },
  {
    id: 'simplex-vega',
    categoryId: 'boosters',
    manufacturer: 'Simplex',
    growMethodId: 'any',
    name: 'Вега',
    shortDescription: 'Листовой стимулятор вегетации и предцвета',
    description: 'Листовой стимулятор для вегетации и предцвета. Применяется по листу, когда нужно поддержать фотосинтез, зеленую массу и общее состояние растения без прямого увеличения корневой подкормки. Особенно полезен при признаках ослабления или хлороза, но не должен заменять корректную базовую схему.',
    details: [
      'Методы выращивания: открытый и закрытый грунт, почвосмеси и гидропоника',
      'Применение: по листу один раз в неделю',
      'Ослабленные хлорозом растения можно обрабатывать раствором 2 мл/л несколько раз в неделю',
    ],
    stageDosages: dosageSchedule([null, '1.0-2.0', '1.0-2.0', null, null, null, null]),
    application: 'foliar',
    foliarDose: '1-2 капли/100мл',
    source: 'library',
  },
  {
    id: 'simplex-mass',
    categoryId: 'boosters',
    manufacturer: 'Simplex',
    growMethodId: 'any',
    name: 'Масса',
    shortDescription: 'Листовой стимулятор массы соцветий',
    description: 'Листовой стимулятор для периода формирования соцветий. Используется точечно на предцвете и раннем/среднем цветении, когда растение активно строит цветочную массу. Не стоит применять слишком часто: это именно стимулятор, а не ежедневная добавка в базовый раствор.',
    details: [
      'Методы выращивания: открытый и закрытый грунт, почвосмеси и гидропоника',
      'Применение: по листу',
      'Не использовать чаще чем через 1-2 недели после последней обработки',
    ],
    stageDosages: dosageSchedule([null, null, '0.25-0.5', '0.25-0.5', '0.25-0.5', null, null]),
    application: 'foliar',
    foliarDose: '1-2 капли/300мл',
    source: 'library',
  },
  {
    id: 'simplex-power',
    categoryId: 'boosters',
    manufacturer: 'Simplex',
    growMethodId: 'any',
    name: 'Сила',
    shortDescription: 'Листовой стимулятор иммунитета и смол',
    description: 'Листовой стимулятор для поддержки иммунитета, метаболизма и смолообразования на цветении. Подходит как редкое точечное воздействие, когда растение уже находится в генеративной фазе. Из-за активного характера обработки лучше выдерживать паузы между применениями и не смешивать с лишними стресс-факторами.',
    details: [
      'Методы выращивания: открытый и закрытый грунт, почвосмеси и гидропоника',
      'Применение: только по листу',
      'Не использовать чаще чем через 2-3 недели после последней обработки',
    ],
    stageDosages: dosageSchedule([null, null, null, '1.0-2.0', '1.0-2.0', '1.0-2.0', null]),
    application: 'foliar',
    foliarDose: '1-2 капли/100мл',
    source: 'library',
  },
  {
    id: 'simplex-seedx',
    categoryId: 'boosters',
    manufacturer: 'Simplex',
    growMethodId: 'any',
    name: 'СидИкс',
    shortDescription: 'Активатор проращивания семян',
    description: 'Средство для старта семян и подготовки среды проращивания. Используется не как обычная стадийная подкормка, а как помощник на самом первом этапе: замачивание семян, смачивание пробок или агроваты. После появления уверенной рассады его роль заканчивается, дальше нужна стартовая или базовая схема питания.',
    details: [
      'Методы использования: проращивание в растворе или смачивание среды проращивания',
      'Время замачивания по инструкции: 24-48 часов в темном месте',
    ],
    stageDosages: dosageSchedule([1.5, null, null, null, null, null, null]),
    source: 'library',
  },
  {
    id: 'simplex-vitas',
    categoryId: 'boosters',
    manufacturer: 'Simplex',
    growMethodId: 'any',
    name: 'ВитаС',
    shortDescription: 'Витамины и аминокислоты для всех стадий',
    description: 'Концентрированный витаминно-аминокислотный стимулятор для поддержки растения в стрессовые или активные периоды. Используется малыми дозами, поэтому его легко передозировать, если относиться как к обычной добавке. Подходит для мягкой поддержки на разных стадиях, особенно после пересадки, нагрузки или смены условий.',
    details: [
      'Методы выращивания: универсальное применение',
      'Не использовать чаще чем через 1-2 недели после последнего применения; в гидропонике и аэропонике вносить при каждой смене раствора',
    ],
    stageDosages: dosageSchedule([0.05, 0.1, 0.1, 0.1, 0.1, 0.05, null]),
    source: 'library',
  },
]

const TERRA_AQUATICA_FERTILIZERS: FertilizerItem[] = [
  {
    id: 'ta-tripart-hydro-coco',
    categoryId: 'base',
    manufacturer: 'GHE T.A.',
    growMethodId: 'any',
    excludedGrowMethodIds: ['soil'],
    name: 'TriPart',
    shortDescription: 'Трехкомпонентная минеральная база Hydro/Coco',
    description: 'Гибкая трехкомпонентная система Terra Aquatica для гидропоники и кокоса. Grow отвечает за структурное и вегетативное развитие, Micro дает микроэлементы и часть макроэлементов, Bloom смещает питание к корням, цветению и плодоношению. Система удобна тем, что пропорции меняются по стадиям, а не заставляют растение жить на одной постоянной формуле.',
    details: [
      'Методы выращивания: гидропоника и кокос',
      'Компоненты: Grow, Micro, Bloom',
      'Micro выпускается в версиях Soft Water и Hard Water под жесткость воды',
      'Источник дозировок: Terra Aquatica, application chart 2025, Hydro/Coco',
    ],
    stageDosages: EMPTY_STAGE_DOSAGES,
    components: [
      {
        id: 'grow',
        name: 'TriPart Grow',
        stageDosages: taDosageSchedule([0.5, 1, 1.8, 2, 0.8, null, null]),
      },
      {
        id: 'micro',
        name: 'TriPart Micro',
        stageDosages: taDosageSchedule([0.5, 1, 1.2, 2, 1.6, null, null]),
      },
      {
        id: 'bloom',
        name: 'TriPart Bloom',
        stageDosages: taDosageSchedule([0.5, 1, 0.6, 1.5, 2.4, null, null]),
      },
    ],
    solutionTargets: TA_HYDRO_COCO_TARGETS,
    source: 'library',
  },
  {
    id: 'ta-tripart-soil',
    categoryId: 'base',
    manufacturer: 'GHE T.A.',
    growMethodId: 'soil',
    name: 'TriPart Soil',
    shortDescription: 'Трехкомпонентная минеральная база Soil',
    description: 'Почвенная схема TriPart с более мягкой минерализацией, чем в Hydro/Coco. Она сохраняет гибкость трех бутылок, но дозировки адаптированы под субстрат, который сам буферит часть питания. Подходит, когда нужна точная минеральная база в земле без перехода на органическую линейку.',
    details: [
      'Метод выращивания: земля',
      'Компоненты: Grow, Micro, Bloom',
      'Источник дозировок: Terra Aquatica, application chart 2025, Soil',
    ],
    stageDosages: EMPTY_STAGE_DOSAGES,
    components: [
      {
        id: 'grow',
        name: 'TriPart Grow',
        stageDosages: taDosageSchedule([0.2, 0.6, 1.5, 1.5, 0.7, null, null]),
      },
      {
        id: 'micro',
        name: 'TriPart Micro',
        stageDosages: taDosageSchedule([0.2, 0.6, 1, 1.5, 1.4, null, null]),
      },
      {
        id: 'bloom',
        name: 'TriPart Bloom',
        stageDosages: taDosageSchedule([0.2, 0.6, 0.5, 1, 2.1, null, null]),
      },
    ],
    solutionTargets: TA_SOIL_TARGETS,
    source: 'library',
  },
  {
    id: 'ta-dualpart-hydro-coco',
    categoryId: 'base',
    manufacturer: 'GHE T.A.',
    growMethodId: 'any',
    excludedGrowMethodIds: ['soil'],
    name: 'DualPart',
    shortDescription: 'Двухкомпонентная минеральная база Hydro/Coco',
    description: 'Двухкомпонентная минеральная база для быстрых культур, где пропорции Grow и Bloom меняются по фазам. На ранних этапах оба компонента дают мягкий старт, на росте увеличивается Grow, а на цветении акцент переходит на Bloom. Производитель отмечает наличие биоактиваторов для общего здоровья растения и усвоения питания.',
    details: [
      'Методы выращивания: гидропоника и кокос',
      'Компоненты: Grow и Bloom',
      'Источник дозировок: Terra Aquatica, application chart 2025, Hydro/Coco',
    ],
    stageDosages: EMPTY_STAGE_DOSAGES,
    components: [
      {
        id: 'grow',
        name: 'DualPart Grow',
        stageDosages: taDosageSchedule([0.5, 1.5, 3, 3, 1.5, null, null]),
      },
      {
        id: 'bloom',
        name: 'DualPart Bloom',
        stageDosages: taDosageSchedule([0.5, 1, 1, 2.5, 3, null, null]),
      },
    ],
    solutionTargets: TA_HYDRO_COCO_TARGETS,
    source: 'library',
  },
  {
    id: 'ta-dualpart-soil',
    categoryId: 'base',
    manufacturer: 'GHE T.A.',
    growMethodId: 'soil',
    name: 'DualPart Soil',
    shortDescription: 'Двухкомпонентная минеральная база Soil',
    description: 'Почвенная схема DualPart для тех случаев, когда хочется простоты двух бутылок без потери смены пропорций по стадиям. В росте Grow идет выше Bloom, а к цветению Bloom становится ведущим компонентом. Дозировки ниже Hydro/Coco, потому что земля участвует в буферизации раствора.',
    details: [
      'Метод выращивания: земля',
      'Компоненты: Grow и Bloom',
      'Источник дозировок: Terra Aquatica, application chart 2025, Soil',
    ],
    stageDosages: EMPTY_STAGE_DOSAGES,
    components: [
      {
        id: 'grow',
        name: 'DualPart Grow',
        stageDosages: taDosageSchedule([0.3, 1, 2.5, 2, 1, null, null]),
      },
      {
        id: 'bloom',
        name: 'DualPart Bloom',
        stageDosages: taDosageSchedule([0.3, 0.5, 0.5, 2, 3, null, null]),
      },
    ],
    solutionTargets: TA_SOIL_TARGETS,
    source: 'library',
  },
  {
    id: 'ta-dualpart-coco',
    categoryId: 'base',
    manufacturer: 'GHE T.A.',
    growMethodId: 'coco',
    name: 'DualPart Coco',
    shortDescription: 'Двухкомпонентная база для кокоса без PK и Cal/Mag',
    description: 'Специализированная двухкомпонентная база для кокосового субстрата. В отличие от обычной схемы DualPart, она уже богата кальцием и магнием и не требует обязательных PK или Cal/Mag-добавок по заявлению производителя. Подходит для полного цикла в кокосе, где важно стабильно закрывать потребности субстрата.',
    details: [
      'Метод выращивания: кокос',
      'Компоненты: Coco Grow и Coco Bloom',
      'Источник дозировок: Terra Aquatica, application chart 2025, Coco',
    ],
    stageDosages: EMPTY_STAGE_DOSAGES,
    components: [
      {
        id: 'grow',
        name: 'DualPart Coco Grow',
        stageDosages: taDosageSchedule([0.5, 1, 2.5, 3, 1.5, null, null]),
      },
      {
        id: 'bloom',
        name: 'DualPart Coco Bloom',
        stageDosages: taDosageSchedule([0.5, 1, 1, 2, 3, null, null]),
      },
    ],
    solutionTargets: TA_HYDRO_COCO_TARGETS,
    source: 'library',
  },
  {
    id: 'ta-novamax-hydro-coco',
    categoryId: 'base',
    manufacturer: 'GHE T.A.',
    growMethodId: 'any',
    excludedGrowMethodIds: ['soil'],
    name: 'NovaMax',
    shortDescription: 'Концентрированная однокомпонентная база по фазам',
    description: 'Концентрированная жидкая база с отдельной бутылкой для роста и отдельной для цветения. NovaMax совмещает силу сухого концентрата с удобством жидкого удобрения: в каждой фазе используется один основной компонент. Подходит для гидропоники и кокоса, когда нужна простая, но плотная минеральная схема.',
    details: [
      'Методы выращивания: гидропоника и кокос',
      'Компоненты по фазам: Grow на росте, Bloom на цветении',
      'Источник дозировок: Terra Aquatica, application chart 2025, Hydro/Coco',
    ],
    stageDosages: EMPTY_STAGE_DOSAGES,
    components: [
      {
        id: 'grow',
        name: 'NovaMax Grow',
        stageDosages: taDosageSchedule([0.3, 1, 1.5, 1, null, null, null]),
      },
      {
        id: 'bloom',
        name: 'NovaMax Bloom',
        stageDosages: taDosageSchedule([null, null, null, 1, 2.5, null, null]),
      },
    ],
    solutionTargets: TA_HYDRO_COCO_TARGETS,
    source: 'library',
  },
  {
    id: 'ta-novamax-soil',
    categoryId: 'base',
    manufacturer: 'GHE T.A.',
    growMethodId: 'soil',
    name: 'NovaMax Soil',
    shortDescription: 'Концентрированная база NovaMax для земли',
    description: 'Почвенная схема NovaMax с более низкими дозировками, чем Hydro/Coco. Grow используется на старте и росте, Bloom подключается с предцвета и цветения. Хороший вариант для земли, когда нужна минимальная линейка без постоянного смешивания трех компонентов.',
    details: [
      'Метод выращивания: земля',
      'Компоненты по фазам: Grow и Bloom',
      'Источник дозировок: Terra Aquatica, application chart 2025, Soil',
    ],
    stageDosages: EMPTY_STAGE_DOSAGES,
    components: [
      {
        id: 'grow',
        name: 'NovaMax Grow',
        stageDosages: taDosageSchedule([0.1, 0.8, 1.2, 0.8, null, null, null]),
      },
      {
        id: 'bloom',
        name: 'NovaMax Bloom',
        stageDosages: taDosageSchedule([null, null, null, 0.8, 2, null, null]),
      },
    ],
    solutionTargets: TA_SOIL_TARGETS,
    source: 'library',
  },
  {
    id: 'ta-drypart-hydro-coco',
    categoryId: 'base',
    manufacturer: 'GHE T.A.',
    growMethodId: 'any',
    excludedGrowMethodIds: ['soil'],
    name: 'DryPart',
    shortDescription: 'Порошковая минеральная база Hydro/Coco',
    description: 'Сухая порошковая база Terra Aquatica для гидропоники и кокоса. Grow и Bloom растворяются в воде и используются по фазам, а сухой формат удобен для хранения, перевозки и наружного выращивания. Производитель отмечает, что формула подходит для разных типов воды и помогает удерживать pH после корректировки.',
    details: [
      'Методы выращивания: гидропоника и кокос',
      'Единицы дозировки: г/л',
      'Источник дозировок: Terra Aquatica, application chart 2025, Hydro/Coco',
    ],
    stageDosages: EMPTY_STAGE_DOSAGES,
    components: [
      {
        id: 'grow',
        name: 'DryPart Grow',
        stageDosages: taDosageSchedule([
          dose(0.2, '0.2 г/л'),
          dose(0.7, '0.7 г/л'),
          dose(1.3, '1.3 г/л'),
          dose(0.8, '0.8 г/л'),
          null,
          null,
          null,
        ]),
      },
      {
        id: 'bloom',
        name: 'DryPart Bloom',
        stageDosages: taDosageSchedule([null, null, null, dose(0.8, '0.8 г/л'), dose(1.8, '1.8 г/л'), null, null]),
      },
    ],
    solutionTargets: TA_DRY_HYDRO_COCO_TARGETS,
    source: 'library',
  },
  {
    id: 'ta-drypart-soil',
    categoryId: 'base',
    manufacturer: 'GHE T.A.',
    growMethodId: 'soil',
    name: 'DryPart Soil',
    shortDescription: 'Порошковая минеральная база Soil',
    description: 'Почвенная версия схемы DryPart с дозировками в граммах на литр. Она сохраняет удобство сухого концентрата, но учитывает более низкую потребность почвы в прямой минерализации раствора. Используется как Grow на росте и Bloom на цветении.',
    details: [
      'Метод выращивания: земля',
      'Единицы дозировки: г/л',
      'Источник дозировок: Terra Aquatica, application chart 2025, Soil',
    ],
    stageDosages: EMPTY_STAGE_DOSAGES,
    components: [
      {
        id: 'grow',
        name: 'DryPart Grow',
        stageDosages: taDosageSchedule([
          dose(0.15, '0.15 г/л'),
          dose(0.6, '0.6 г/л'),
          dose(0.9, '0.9 г/л'),
          dose(0.6, '0.6 г/л'),
          null,
          null,
          null,
        ]),
      },
      {
        id: 'bloom',
        name: 'DryPart Bloom',
        stageDosages: taDosageSchedule([null, null, null, dose(0.6, '0.6 г/л'), dose(1.3, '1.3 г/л'), null, null]),
      },
    ],
    solutionTargets: TA_DRY_SOIL_TARGETS,
    source: 'library',
  },
  {
    id: 'ta-pro-organic',
    categoryId: 'base',
    manufacturer: 'GHE T.A.',
    growMethodId: 'any',
    name: 'Pro Organic',
    shortDescription: 'Органическая жидкая база полного цикла',
    description: 'Органическая жидкая база Terra Aquatica для биопоники, кокоса и земли. Grow и Bloom работают как самостоятельное питание на весь цикл, поддерживая корневую зону через взаимодействие с бактериями. Линейка подходит для ручного, автоматического и капельного полива, если система совместима с органическим питанием.',
    details: [
      'Методы выращивания: биопоника, кокос и земля',
      'Подходит для органического земледелия по регламентам EU 2018/848 и 2021/1165',
      'Для Pro Organic с RO/очень мягкой водой производитель рекомендует Calcium Magnesium Supplement',
      'Источник дозировок: Terra Aquatica, application chart 2025',
    ],
    stageDosages: EMPTY_STAGE_DOSAGES,
    components: [
      {
        id: 'grow',
        name: 'Pro Organic Grow',
        stageDosages: taDosageSchedule([0.25, 0.5, 2, 1, null, null, null]),
      },
      {
        id: 'bloom',
        name: 'Pro Organic Bloom',
        stageDosages: taDosageSchedule([0.25, 0.5, null, 1, 2, 2, null]),
      },
    ],
    source: 'library',
  },
  {
    id: 'ta-organic-drypart',
    categoryId: 'base',
    manufacturer: 'GHE T.A.',
    growMethodId: 'any',
    name: 'Organic DryPart',
    shortDescription: 'Растворимая органическая порошковая база',
    description: 'Полностью растворимая веганская порошковая база для органического выращивания. Grow поддерживает активную вегетацию, Bloom работает на цветении и плодоношении, а сухой формат дает быстрый эффект для растения и более долгую работу в субстрате. Подходит для почвы, кокоса и биопоники.',
    details: [
      'Методы выращивания: биопоника, кокос и земля',
      'Единицы дозировки: г/л',
      'Подходит для органического земледелия',
      'Источник дозировок: Terra Aquatica, application chart 2025',
    ],
    stageDosages: EMPTY_STAGE_DOSAGES,
    methodStageDosages: {
      soil: EMPTY_STAGE_DOSAGES,
    },
    components: [
      {
        id: 'grow',
        name: 'Organic DryPart Grow',
        stageDosages: taDosageSchedule([
          dose(0.25, '0.25 г/л'),
          dose(0.5, '0.5 г/л'),
          dose(1, '0.8-1.2 г/л'),
          dose(0.6, '0.6 г/л'),
          null,
          null,
          null,
        ]),
        methodStageDosages: {
          soil: taDosageSchedule([
            dose(0.2, '0.2 г/л'),
            dose(0.4, '0.4 г/л'),
            dose(0.85, '0.7-1 г/л'),
            dose(0.5, '0.5 г/л'),
            null,
            null,
            null,
          ]),
        },
      },
      {
        id: 'bloom',
        name: 'Organic DryPart Bloom',
        stageDosages: taDosageSchedule([null, null, null, dose(0.6, '0.6 г/л'), dose(1.1, '1-1.2 г/л'), dose(1.2, '1.2 г/л'), null]),
        methodStageDosages: {
          soil: taDosageSchedule([null, null, null, dose(0.5, '0.5 г/л'), dose(0.9, '0.8-1 г/л'), dose(1, '1 г/л'), null]),
        },
      },
    ],
    source: 'library',
  },
  {
    id: 'ta-permabloom',
    categoryId: 'base',
    manufacturer: 'GHE T.A.',
    growMethodId: 'any',
    name: 'PermaBloom',
    shortDescription: 'Минеральная база для непрерывного плодоношения',
    description: 'Минеральная формула для культур, которые непрерывно цветут и плодоносят: перцы, томаты, огурцы и похожие растения. PermaBloom рассчитан на улучшение вкуса, урожайности и питательной ценности, хорошо подходит для капельного и автоматического полива, кокоса и земли. По каталогу он всегда используется вместе с TriPart Micro.',
    details: [
      'Методы выращивания: гидропоника, кокос и земля',
      'Использовать вместе с TriPart Micro',
      'Каталог дает описание продукта, отдельной стадийной таблицы в предоставленном PDF нет',
    ],
    stageDosages: EMPTY_STAGE_DOSAGES,
    source: 'library',
  },
  {
    id: 'ta-aquaponic-mix',
    categoryId: 'base',
    manufacturer: 'GHE T.A.',
    growMethodId: 'hydro',
    name: 'Aquaponic Mix',
    shortDescription: 'Органическое питание для аквапоники',
    description: 'Удобрение для аквапонных систем, которое дополняет питание от минерализации рыбных отходов и не нарушает баланс водоема. Формула с органическим веществом и адаптированными микроэлементами питает растения, поддерживает полезные микроорганизмы и помогает стабилизировать аквапонную экосистему.',
    details: [
      'Метод выращивания: аквапоника',
      'Совместим с разными видами рыб и типов аквапонных культур',
      'Каталог дает описание продукта, отдельной стадийной таблицы в предоставленном PDF нет',
    ],
    stageDosages: EMPTY_STAGE_DOSAGES,
    source: 'library',
  },
  {
    id: 'ta-finalpart',
    categoryId: 'boosters',
    manufacturer: 'GHE T.A.',
    growMethodId: 'any',
    name: 'FinalPart',
    shortDescription: 'Финишное питание и стимулятор созревания',
    description: 'Финишный продукт Terra Aquatica для периода перед сбором урожая. Он ускоряет созревание, помогает растению усилить защитные реакции и метаболизировать остатки питания, что может улучшать вкус урожая. Производитель также позиционирует его как решение для ускорения поздних сортов или спасения урожая при рисках холода, влажности или патогенов.',
    details: [
      'Применение: финальные 10-20 дней перед сбором',
      'Для Hydro/Coco: 5 мл/л; для Soil: 4 мл/л',
      'Источник дозировок: Terra Aquatica, application chart 2025',
    ],
    stageDosages: taDosageSchedule([null, null, null, null, null, 5, null]),
    methodStageDosages: {
      soil: taDosageSchedule([null, null, null, null, null, 4, null]),
    },
    source: 'library',
  },
  {
    id: 'ta-hyperbloom',
    categoryId: 'boosters',
    manufacturer: 'GHE T.A.',
    growMethodId: 'any',
    name: 'HyperBloom',
    shortDescription: 'Порошковый PK-бустер позднего цветения',
    description: 'Концентрированная порошковая добавка позднего цветения с фосфором и калием. HyperBloom ускоряет созревание, поддерживает цветение и плодоношение, помогает раскрывать вкус и активные компоненты урожая. Совместим с разными режимами питания и средами выращивания.',
    details: [
      'Методы выращивания: гидропоника, кокос и земля',
      'Для Hydro/Coco: 2 г/л; для Soil: 1.5 г/л',
      'Источник дозировок: Terra Aquatica, application chart 2025',
    ],
    stageDosages: taDosageSchedule([null, null, null, null, null, dose(2, '2 г/л'), null]),
    methodStageDosages: {
      soil: taDosageSchedule([null, null, null, null, null, dose(1.5, '1.5 г/л'), null]),
    },
    source: 'library',
  },
  {
    id: 'ta-flashclean',
    categoryId: 'boosters',
    manufacturer: 'GHE T.A.',
    growMethodId: 'any',
    name: 'FlashClean',
    shortDescription: 'Очистка субстрата и систем от солевых накоплений',
    description: 'Раствор для промывки субстратов и обслуживания систем полива. FlashClean растворяет накопленные соли, помогает восстановить баланс питания, снижает риск засорения капельниц и поддерживает финальную фазу при совместном применении с FinalPart. Не является кислотой и не насыщает систему магнием или синтетическими ферментами.',
    details: [
      'Методы выращивания: все субстраты и системы',
      'Применение: регулярная очистка и финальная промывка',
      'Источник дозировок: Terra Aquatica, application chart 2025',
    ],
    stageDosages: taDosageSchedule([null, null, null, null, null, null, 2]),
    source: 'library',
  },
  {
    id: 'ta-calcium-magnesium',
    categoryId: 'boosters',
    manufacturer: 'GHE T.A.',
    growMethodId: 'any',
    name: 'Calcium Magnesium',
    shortDescription: 'Кальций и магний для быстрых культур и мягкой воды',
    description: 'Чистая и хорошо растворимая добавка кальция и магния для профилактики дефицитов, краевого некроза и проблем интенсивного выращивания. Особенно полезна с органической линейкой Terra Aquatica на кокосе, при мягкой или осмотической воде, а также под LED-светом, где может возрастать потребность в кальции.',
    details: [
      'Методы выращивания: гидропоника, кокос и земля',
      'Не требуется как обязательная добавка к полным минеральным базам Terra Aquatica',
      'Каталог дает описание продукта, отдельной стадийной таблицы в предоставленном PDF нет',
    ],
    stageDosages: EMPTY_STAGE_DOSAGES,
    source: 'library',
  },
  {
    id: 'ta-oligo-spectrum',
    categoryId: 'boosters',
    manufacturer: 'GHE T.A.',
    growMethodId: 'any',
    name: 'Oligo Spectrum',
    shortDescription: 'Хелатные микроэлементы для коррекции раствора',
    description: 'Концентрированный комплекс микро- и субмикроэлементов в хелатной форме с органическим стабилизатором pH. Используется для обогащения дефицитного или нестабильного раствора, балансировки питания и аквапоники. Производитель отдельно предупреждает не применять его вместе с полными сбалансированными удобрениями Terra Aquatica.',
    details: [
      'Методы выращивания: гидропоника, кокос, земля и листовое применение',
      'Не использовать вместе с полными базовыми удобрениями Terra Aquatica',
      'Каталог дает описание продукта, отдельной стадийной таблицы в предоставленном PDF нет',
    ],
    stageDosages: EMPTY_STAGE_DOSAGES,
    source: 'library',
  },
  {
    id: 'ta-humic',
    categoryId: 'boosters',
    manufacturer: 'GHE T.A.',
    growMethodId: 'any',
    name: 'Humic',
    shortDescription: 'Гуминовые кислоты для почвы и питания',
    description: 'Премиальные гуминовые кислоты из возобновляемого сырья. Humic усиливает действие удобрений, поддерживает микробную активность, улучшает структуру бедной почвы, удержание питания и экономию воды. В таблице применяется как альтернатива Fulvic в органических схемах и добавках.',
    details: [
      'Методы выращивания: гидропоника, кокос, земля и листовое применение',
      'В таблицах часто стоит как альтернатива Fulvic',
      'Источник дозировок: Terra Aquatica, application chart 2025',
    ],
    stageDosages: taDosageSchedule([3, 4, 4, 4, null, null, null]),
    source: 'library',
  },
  {
    id: 'ta-fulvic',
    categoryId: 'boosters',
    manufacturer: 'GHE T.A.',
    growMethodId: 'any',
    name: 'Fulvic',
    shortDescription: 'Фульвокислоты для усвоения минералов и тонуса',
    description: 'Фульвокислотный тоник для повышения способности растения усваивать минералы. По каталогу он поддерживает развитие корней, силу растения, устойчивость к болезням, аромат, содержание эфирных масел и урожайность. Хорошо ложится как универсальная добавка к минеральным и органическим схемам.',
    details: [
      'Методы выращивания: гидропоника, кокос, земля и листовое применение',
      'В таблицах часто стоит как альтернатива Humic',
      'Источник дозировок: Terra Aquatica, application chart 2025',
    ],
    stageDosages: taDosageSchedule([2, 2, 2, 2, null, null, null]),
    source: 'library',
  },
  {
    id: 'ta-seaweed',
    categoryId: 'boosters',
    manufacturer: 'GHE T.A.',
    growMethodId: 'any',
    name: 'Seaweed',
    shortDescription: 'Морские водоросли для предцвета и цветения',
    description: 'Натуральный биостимулятор из холодно-прессованных водорослей Ascophyllum nodosum. Поддерживает корневой и листовой рост, помогает формировать более плотное цветение и крупные цветы/плоды. При листовом применении стимулирует развитие бутонов и может сокращать междоузлия на росте и предцвете.',
    details: [
      'Методы выращивания: гидропоника, кокос, земля и листовое применение',
      'Подходит для любых программ питания',
      'Источник дозировок: Terra Aquatica, application chart 2025',
    ],
    stageDosages: taDosageSchedule([null, 5, 5, 5, 5, null, null]),
    application: 'root',
    source: 'library',
  },
  {
    id: 'ta-urtimax',
    categoryId: 'boosters',
    manufacturer: 'GHE T.A.',
    growMethodId: 'any',
    name: 'Urtimax',
    shortDescription: 'Органический экстракт крапивы для роста и защиты',
    description: 'Органический крапивный пурин с кремнием, железом, азотом, калием, магнием, микроэлементами и ферментами. Urtimax стимулирует рост, помогает при хлорозе и минеральных дефицитах, повышает устойчивость к вредителям и болезням. В таблице применяется на раннем и активном росте.',
    details: [
      'Методы выращивания: гидропоника, кокос, земля и листовое применение',
      'Источник дозировок: Terra Aquatica, application chart 2025',
    ],
    stageDosages: taDosageSchedule([null, 30, 30, 30, null, null, null]),
    source: 'library',
  },
  {
    id: 'ta-root-booster',
    categoryId: 'boosters',
    manufacturer: 'GHE T.A.',
    growMethodId: 'any',
    name: 'Root Booster',
    shortDescription: 'Стимулятор корней без синтетических гормонов',
    description: 'Натуральный стимулятор развития корневой системы для молодого и взрослого растения. Помогает формировать здоровые корни, улучшает способность к поглощению питания и может использоваться для замачивания семян перед посадкой. По назначению близок к Pro Roots, но работает в другой концентрации.',
    details: [
      'Методы выращивания: гидропоника, кокос, земля и листовое применение',
      'В таблице указан как альтернатива Pro Roots',
      'Источник дозировок: Terra Aquatica, application chart 2025',
    ],
    stageDosages: taDosageSchedule([5, 3, null, null, null, null, null]),
    source: 'library',
  },
  {
    id: 'ta-pro-roots',
    categoryId: 'boosters',
    manufacturer: 'GHE T.A.',
    growMethodId: 'any',
    name: 'Pro Roots',
    shortDescription: 'Концентрированный органический стимулятор корней',
    description: 'Концентрированный органический биостимулятор корней. Ускоряет развитие боковых корней, укрепляет корневой чехлик и повышает устойчивость к грибам и плесени на ранних стадиях. По назначению близок к Root Booster, но применяется в гораздо меньшей дозировке.',
    details: [
      'Методы выращивания: гидропоника, кокос, земля и листовое применение',
      'В таблице указан как альтернатива Root Booster',
      'Источник дозировок: Terra Aquatica, application chart 2025',
    ],
    stageDosages: taDosageSchedule([0.2, 0.2, null, null, null, null, null]),
    source: 'library',
  },
  {
    id: 'ta-bloom-booster',
    categoryId: 'boosters',
    manufacturer: 'GHE T.A.',
    growMethodId: 'any',
    name: 'Bloom Booster',
    shortDescription: 'Органический стимулятор цветения',
    description: 'Натуральный стимулятор цветения без синтетических гормонов. Усиливает метаболическую активность и минеральное поглощение через биостимуляторы и биологические транспортные активаторы, помогая растению раскрывать генетический потенциал. По назначению близок к Pro Bloom, но используется в другой концентрации.',
    details: [
      'Методы выращивания: гидропоника, кокос, земля и листовое применение',
      'В таблице указан как альтернатива Pro Bloom',
      'Источник дозировок: Terra Aquatica, application chart 2025',
    ],
    stageDosages: taDosageSchedule([null, null, null, 5, 5, 5, null]),
    source: 'library',
  },
  {
    id: 'ta-pro-bloom',
    categoryId: 'boosters',
    manufacturer: 'GHE T.A.',
    growMethodId: 'any',
    name: 'Pro Bloom',
    shortDescription: 'Концентрированный стимулятор роста и цветения',
    description: 'Концентрированный натуральный стимулятор, который производитель описывает как усилитель роста и цветения. Повышает усвоение кальция, активирует микробную жизнь, стимулирует естественную защиту растения и поддерживает объем и качество урожая. По назначению близок к Bloom Booster, но применяется в малой дозировке.',
    details: [
      'Методы выращивания: гидропоника, кокос, земля и листовое применение',
      'В таблице указан как альтернатива Bloom Booster',
      'Источник дозировок: Terra Aquatica, application chart 2025',
    ],
    stageDosages: taDosageSchedule([null, null, null, 0.2, 0.2, 0.2, null]),
    source: 'library',
  },
  {
    id: 'ta-silicate',
    categoryId: 'boosters',
    manufacturer: 'GHE T.A.',
    growMethodId: 'any',
    name: 'Silicate',
    shortDescription: 'Кремний и минералы для прочности и pH/EC-стабильности',
    description: 'Натуральная форма кремния, которая проникает в клетки и помогает защищать растение от болезней, насекомых и стрессов. Silicate оптимизирует доступность питания, стабилизирует pH и EC, снижает стресс и дает дополнительный набор микроэлементов. С полезными микроорганизмами его лучше применять по листу или локально у корневой шейки, чтобы не тормозить заселение субстрата.',
    details: [
      'Методы выращивания: гидропоника, кокос, земля и листовое применение',
      'Единица дозировки в таблице: 4 г/10л',
      'На цветении по листу использовать только первые две недели',
      'Источник дозировок: Terra Aquatica, application chart 2025',
    ],
    stageDosages: taDosageSchedule([null, dose(0.4, '4 г/10л'), dose(0.4, '4 г/10л'), dose(0.4, '4 г/10л'), dose(0.4, '4 г/10л'), null, null]),
    source: 'library',
  },
  {
    id: 'ta-trikologic-streptologic',
    categoryId: 'boosters',
    manufacturer: 'GHE T.A.',
    growMethodId: 'any',
    name: 'TrikoLogic / StreptoLogic',
    shortDescription: 'Полезные микроорганизмы для корней и субстрата',
    description: 'Микробиологические добавки Terra Aquatica для органических и биологических схем. TrikoLogic основан на Trichoderma harzianum и помогает разлагать органику, высвобождать минеральные соли и подавлять патогены в субстрате. StreptoLogic применяют с появления корневой системы или перед жарой: он поддерживает стрессоустойчивость, корни и защиту от патогенных бактерий.',
    details: [
      'Методы выращивания: гидропоника, кокос и земля',
      'Подходит для органического земледелия',
      'Источник дозировок: Terra Aquatica, application chart 2025',
    ],
    stageDosages: taDosageSchedule([dose(0.1, '0.1 г/л'), null, dose(0.1, '0.1 г/л'), null, null, null, null]),
    source: 'library',
  },
  {
    id: 'ta-protect',
    categoryId: 'boosters',
    manufacturer: 'GHE T.A.',
    growMethodId: 'any',
    name: 'Protect',
    shortDescription: 'Листовая защита и активатор иммунитета',
    description: 'Концентрат натуральных экстрактов и эфирных масел для иммунитета и защиты от насекомых и патогенов. Protect применяется по листу, укрепляет естественные защитные реакции и оставляет на поверхности листа защитную и отпугивающую пленку. В таблице спреев используется на раннем росте, веге и предцвете.',
    details: [
      'Применение: листовой спрей',
      'Избегать применения во время цветения',
      'EC листовых растворов держать ниже 0.6 мСм/см',
      'Источник дозировок: Terra Aquatica, application chart 2025',
    ],
    stageDosages: taDosageSchedule([null, 5, 5, 5, null, null, null]),
    application: 'foliar',
    source: 'library',
  },
]

const ADVANCED_NUTRIENTS_FERTILIZERS: FertilizerItem[] = [
  {
    id: 'an-ph-perfect-sensi',
    categoryId: 'base',
    manufacturer: 'Advanced Nutrients',
    growMethodId: 'any',
    excludedGrowMethodIds: ['coco'],
    name: 'pH Perfect Sensi Grow & Bloom',
    shortDescription: 'Двухкомпонентная pH Perfect база для Hydro/Soil',
    description: 'Фазовая двухкомпонентная база Advanced Nutrients: Grow A/B работает на росте, Bloom A/B подключается на цветении. Линейка рассчитана на стабильное питание с технологией pH Perfect, которая помогает удерживать раствор в рабочем диапазоне pH без постоянной ручной корректировки.',
    details: [
      'Методы выращивания: гидропоника и земля',
      'Компоненты: Sensi Grow A/B и Sensi Bloom A/B',
      'Источник дозировок: Advanced Nutrients pH Perfect Sensi Master Recipe, Global mL/L',
    ],
    stageDosages: EMPTY_STAGE_DOSAGES,
    components: [
      {
        id: 'grow-a',
        name: 'Sensi Grow A',
        stageDosages: dosageSchedule([1, 2, '3-4', null, null, null, null]),
      },
      {
        id: 'grow-b',
        name: 'Sensi Grow B',
        stageDosages: dosageSchedule([1, 2, '3-4', null, null, null, null]),
      },
      {
        id: 'bloom-a',
        name: 'Sensi Bloom A',
        stageDosages: dosageSchedule([null, null, null, 4, 4, 4, null]),
      },
      {
        id: 'bloom-b',
        name: 'Sensi Bloom B',
        stageDosages: dosageSchedule([null, null, null, 4, 4, 4, null]),
      },
    ],
    solutionTargets: PH_PERFECT_TARGETS,
    source: 'library',
  },
  {
    id: 'an-ph-perfect-sensi-coco',
    categoryId: 'base',
    manufacturer: 'Advanced Nutrients',
    growMethodId: 'coco',
    name: 'pH Perfect Sensi Coco Grow & Bloom',
    shortDescription: 'Двухкомпонентная pH Perfect база для кокоса',
    description: 'Кокосовая версия Sensi с отдельными компонентами Grow A/B и Bloom A/B. Формула адаптирована под особенности coco coir: производитель выделяет поддержку кальция, магния и хелатного железа, чтобы снизить риск типичных кокосовых дефицитов.',
    details: [
      'Метод выращивания: кокос',
      'Компоненты: Sensi Coco Grow A/B и Sensi Coco Bloom A/B',
      'Источник дозировок: Advanced Nutrients pH Perfect Sensi Coco Master Recipe, Global mL/L',
    ],
    stageDosages: EMPTY_STAGE_DOSAGES,
    components: [
      {
        id: 'grow-a',
        name: 'Sensi Coco Grow A',
        stageDosages: dosageSchedule([1, 2, '3-4', null, null, null, null]),
      },
      {
        id: 'grow-b',
        name: 'Sensi Coco Grow B',
        stageDosages: dosageSchedule([1, 2, '3-4', null, null, null, null]),
      },
      {
        id: 'bloom-a',
        name: 'Sensi Coco Bloom A',
        stageDosages: dosageSchedule([null, null, null, 4, 4, 4, null]),
      },
      {
        id: 'bloom-b',
        name: 'Sensi Coco Bloom B',
        stageDosages: dosageSchedule([null, null, null, 4, 4, 4, null]),
      },
    ],
    solutionTargets: PH_PERFECT_TARGETS,
    source: 'library',
  },
  {
    id: 'an-ph-perfect-connoisseur',
    categoryId: 'base',
    manufacturer: 'Advanced Nutrients',
    growMethodId: 'any',
    excludedGrowMethodIds: ['coco'],
    name: 'pH Perfect Connoisseur Grow & Bloom',
    shortDescription: 'Премиальная двухкомпонентная pH Perfect база',
    description: 'Премиальная база Advanced Nutrients для полного цикла: Connoisseur Grow A/B используется на росте, Connoisseur Bloom A/B на цветении. Линейка делает акцент на широком наборе макро-, вторичных и микроэлементов, а также на хелатных формах для стабильного усвоения.',
    details: [
      'Методы выращивания: гидропоника и земля',
      'Компоненты: Connoisseur Grow A/B и Connoisseur Bloom A/B',
      'Источник дозировок: Advanced Nutrients pH Perfect Connoisseur Master Recipe, Global mL/L',
    ],
    stageDosages: EMPTY_STAGE_DOSAGES,
    components: [
      {
        id: 'grow-a',
        name: 'Connoisseur Grow A',
        stageDosages: dosageSchedule([1, 2, '3-4', null, null, null, null]),
      },
      {
        id: 'grow-b',
        name: 'Connoisseur Grow B',
        stageDosages: dosageSchedule([1, 2, '3-4', null, null, null, null]),
      },
      {
        id: 'bloom-a',
        name: 'Connoisseur Bloom A',
        stageDosages: dosageSchedule([null, null, null, 4, 4, 4, null]),
      },
      {
        id: 'bloom-b',
        name: 'Connoisseur Bloom B',
        stageDosages: dosageSchedule([null, null, null, 4, 4, 4, null]),
      },
    ],
    solutionTargets: PH_PERFECT_TARGETS,
    source: 'library',
  },
  {
    id: 'an-ph-perfect-connoisseur-coco',
    categoryId: 'base',
    manufacturer: 'Advanced Nutrients',
    growMethodId: 'coco',
    name: 'pH Perfect Connoisseur Coco Grow & Bloom',
    shortDescription: 'Премиальная pH Perfect база для кокоса',
    description: 'Кокосовая версия Connoisseur с фазовой схемой Grow A/B и Bloom A/B. Она сохраняет pH Perfect-подход, но адаптирует питание под кокосовый субстрат, где особенно важны кальций, магний и стабильность микроэлементов.',
    details: [
      'Метод выращивания: кокос',
      'Компоненты: Connoisseur Coco Grow A/B и Connoisseur Coco Bloom A/B',
      'Источник дозировок: Advanced Nutrients pH Perfect Connoisseur Coco Master Recipe, Global mL/L',
    ],
    stageDosages: EMPTY_STAGE_DOSAGES,
    components: [
      {
        id: 'grow-a',
        name: 'Connoisseur Coco Grow A',
        stageDosages: dosageSchedule([1, 2, '3-4', null, null, null, null]),
      },
      {
        id: 'grow-b',
        name: 'Connoisseur Coco Grow B',
        stageDosages: dosageSchedule([1, 2, '3-4', null, null, null, null]),
      },
      {
        id: 'bloom-a',
        name: 'Connoisseur Coco Bloom A',
        stageDosages: dosageSchedule([null, null, null, 4, 4, 4, null]),
      },
      {
        id: 'bloom-b',
        name: 'Connoisseur Coco Bloom B',
        stageDosages: dosageSchedule([null, null, null, 4, 4, 4, null]),
      },
    ],
    solutionTargets: PH_PERFECT_TARGETS,
    source: 'library',
  },
  {
    id: 'an-ph-perfect-grow-micro-bloom',
    categoryId: 'base',
    manufacturer: 'Advanced Nutrients',
    growMethodId: 'any',
    name: 'pH Perfect Grow Micro Bloom',
    shortDescription: 'Трехкомпонентная pH Perfect база полного цикла',
    description: 'Трехкомпонентная база Grow, Micro, Bloom для тех, кто хочет управлять пропорциями питания на всем цикле. В master-рецепте все три компонента используются и на росте, и на цветении: дозировка растет по неделям grow, затем держится на цветении до периода промывки.',
    details: [
      'Методы выращивания: универсальная liquid-схема',
      'Компоненты: Grow, Micro, Bloom',
      'Источник дозировок: Advanced Nutrients pH Perfect Grow Micro Bloom Master Recipe, Global mL/L',
    ],
    stageDosages: EMPTY_STAGE_DOSAGES,
    components: [
      {
        id: 'grow',
        name: 'pH Perfect Grow',
        stageDosages: dosageSchedule([1, 2, '3-4', 4, 4, 4, null]),
      },
      {
        id: 'micro',
        name: 'pH Perfect Micro',
        stageDosages: dosageSchedule([1, 2, '3-4', 4, 4, 4, null]),
      },
      {
        id: 'bloom',
        name: 'pH Perfect Bloom',
        stageDosages: dosageSchedule([1, 2, '3-4', 4, 4, 4, null]),
      },
    ],
    solutionTargets: PH_PERFECT_TARGETS,
    source: 'library',
  },
  {
    id: 'an-voodoo-juice',
    categoryId: 'boosters',
    manufacturer: 'Advanced Nutrients',
    growMethodId: 'any',
    name: 'Voodoo Juice',
    shortDescription: 'Бактериальный стимулятор корневой зоны',
    description: 'Корневой биостимулятор Advanced Nutrients с комплексом полезных Bacillus-штаммов. В master-рецепте он используется короткими окнами в начале роста и начале цветения, когда растение активно наращивает или перестраивает корневую систему.',
    details: [
      'Группа производителя: Root Mass Expanders',
      'Окна применения: Grow W1-W2 и Bloom W1-W2',
      'Источник дозировок: Advanced Nutrients liquid Master Recipe, Global mL/L',
    ],
    stageDosages: AN_ROOT_EXPANDER_STAGE_DOSAGES,
    source: 'library',
  },
  {
    id: 'an-tarantula',
    categoryId: 'boosters',
    manufacturer: 'Advanced Nutrients',
    growMethodId: 'any',
    name: 'Tarantula',
    shortDescription: 'Биодобавка для насыщенной корневой зоны',
    description: 'Биоудобрение для корневой зоны, рассчитанное на заселение субстрата полезными микроорганизмами. В master-рецепте применяется вместе с другими root expanders на ранних окнах роста и цветения.',
    details: [
      'Группа производителя: Root Mass Expanders',
      'Окна применения: Grow W1-W2 и Bloom W1-W2',
      'Источник дозировок: Advanced Nutrients liquid Master Recipe, Global mL/L',
    ],
    stageDosages: AN_ROOT_EXPANDER_STAGE_DOSAGES,
    source: 'library',
  },
  {
    id: 'an-piranha',
    categoryId: 'boosters',
    manufacturer: 'Advanced Nutrients',
    growMethodId: 'any',
    name: 'Piranha',
    shortDescription: 'Грибная поддержка корней и ризосферы',
    description: 'Root expander на основе полезных грибов для поддержания активной ризосферы. По master-рецепту Piranha работает в паре с Voodoo Juice и Tarantula в начале вегетации и в начале цветения.',
    details: [
      'Группа производителя: Root Mass Expanders',
      'Окна применения: Grow W1-W2 и Bloom W1-W2',
      'Источник дозировок: Advanced Nutrients liquid Master Recipe, Global mL/L',
    ],
    stageDosages: AN_ROOT_EXPANDER_STAGE_DOSAGES,
    source: 'library',
  },
  {
    id: 'an-rhino-skin',
    categoryId: 'boosters',
    manufacturer: 'Advanced Nutrients',
    growMethodId: 'any',
    name: 'Rhino Skin',
    shortDescription: 'Калийный силикат для прочности стеблей',
    description: 'Кремниевая добавка для укрепления тканей и поддержки структуры растения под тяжелым цветением. В master-рецепте Rhino Skin идет почти весь активный цикл до промывки.',
    details: [
      'Группа производителя: Bud Potency & Stalk Strengtheners',
      'Окна применения: Grow W1-W4 и Bloom W1-W7',
      'Источник дозировок: Advanced Nutrients liquid Master Recipe, Global mL/L',
    ],
    stageDosages: AN_FULL_CYCLE_2ML_STAGE_DOSAGES,
    source: 'library',
  },
  {
    id: 'an-b-52',
    categoryId: 'boosters',
    manufacturer: 'Advanced Nutrients',
    growMethodId: 'any',
    name: 'B-52',
    shortDescription: 'B-витамины, kelp и поддержка от стресса',
    description: 'Биостимулятор с B-витаминным комплексом, kelp и питательными компонентами для устойчивости и общего тонуса. В master-рецепте B-52 идет на росте и в средней части цветения.',
    details: [
      'Группа производителя: Bud Potency & Stalk Strengtheners',
      'Окна применения: Grow W1-W4 и Bloom W3-W7',
      'Источник дозировок: Advanced Nutrients liquid Master Recipe, Global mL/L',
    ],
    stageDosages: dosageSchedule([2, 2, 2, null, 2, 2, null]),
    source: 'library',
  },
  {
    id: 'an-sensizym',
    categoryId: 'boosters',
    manufacturer: 'Advanced Nutrients',
    growMethodId: 'any',
    name: 'Sensizym',
    shortDescription: 'Ферменты для чистой и активной корневой среды',
    description: 'Ферментный кондиционер субстрата, который помогает перерабатывать органические остатки в зоне корней. В master-рецепте Sensizym идет на протяжении почти всего цикла как фоновая поддержка среды.',
    details: [
      'Группа производителя: Grow Medium Conditioners',
      'Окна применения: Grow W1-W4 и Bloom W1-W7',
      'Источник дозировок: Advanced Nutrients liquid Master Recipe, Global mL/L',
    ],
    stageDosages: AN_FULL_CYCLE_2ML_STAGE_DOSAGES,
    source: 'library',
  },
  {
    id: 'an-bud-candy',
    categoryId: 'boosters',
    manufacturer: 'Advanced Nutrients',
    growMethodId: 'any',
    name: 'Bud Candy',
    shortDescription: 'Углеводы и магний для аромата цветения',
    description: 'Добавка для поддержки цветения, вкуса и аромата через углеводный профиль и магний. В master-рецепте Bud Candy используется почти весь цикл до промывки как мягкая фоновая добавка.',
    details: [
      'Группа производителя: Bud Taste & Terpene Enhancement',
      'Окна применения: Grow W1-W4 и Bloom W1-W7',
      'Источник дозировок: Advanced Nutrients liquid Master Recipe, Global mL/L',
    ],
    stageDosages: AN_FULL_CYCLE_2ML_STAGE_DOSAGES,
    source: 'library',
  },
  {
    id: 'an-bud-factor-x',
    categoryId: 'boosters',
    manufacturer: 'Advanced Nutrients',
    growMethodId: 'any',
    name: 'Bud Factor X',
    shortDescription: 'Стимулятор качества и насыщенности соцветий',
    description: 'Биостимулятор для поддержки плотных, ароматных и насыщенных цветков. В master-рецепте Bud Factor X используется с начала цветения и до последней продуктивной недели перед flush.',
    details: [
      'Группа производителя: Bud Potency & Stalk Strengtheners',
      'Окна применения: Bloom W1-W7',
      'Источник дозировок: Advanced Nutrients liquid Master Recipe, Global mL/L',
    ],
    stageDosages: AN_BLOOM_2ML_STAGE_DOSAGES,
    source: 'library',
  },
  {
    id: 'an-nirvana',
    categoryId: 'boosters',
    manufacturer: 'Advanced Nutrients',
    growMethodId: 'any',
    name: 'Nirvana',
    shortDescription: 'Биостимулятор для середины цветения',
    description: 'Добавка для поддержки растения в фазе активного набора цветков. В master-рецепте Nirvana включается не с первого дня bloom, а с Bloom W3, когда растение уже вошло в стабильное цветение.',
    details: [
      'Группа производителя: Bigger Buds',
      'Окна применения: Bloom W3-W7',
      'Источник дозировок: Advanced Nutrients liquid Master Recipe, Global mL/L',
    ],
    stageDosages: dosageSchedule([null, null, null, null, 2, 2, null]),
    source: 'library',
  },
  {
    id: 'an-bud-ignitor',
    categoryId: 'boosters',
    manufacturer: 'Advanced Nutrients',
    growMethodId: 'any',
    name: 'Bud Ignitor',
    shortDescription: 'Стартовый усилитель начала цветения',
    description: 'Ранний bloom-стимулятор для момента перехода на цветение. По master-рецепту Bud Ignitor применяется только в Bloom W1-W2, чтобы поддержать закладку соцветий в самом начале фазы.',
    details: [
      'Группа производителя: Bigger Buds',
      'Окна применения: Bloom W1-W2',
      'Источник дозировок: Advanced Nutrients liquid Master Recipe, Global mL/L',
    ],
    stageDosages: dosageSchedule([null, null, null, 2, null, null, null]),
    source: 'library',
  },
  {
    id: 'an-big-bud',
    categoryId: 'boosters',
    manufacturer: 'Advanced Nutrients',
    growMethodId: 'any',
    excludedGrowMethodIds: ['coco'],
    name: 'Big Bud',
    shortDescription: 'PK-бустер для набора массы соцветий',
    description: 'Классический bloom booster Advanced Nutrients для продуктивной середины цветения. В master-рецепте Big Bud идет после стартового окна Bud Ignitor и до позднего усиления Overdrive.',
    details: [
      'Группа производителя: Bigger Buds',
      'Окна применения: Bloom W2-W5',
      'Для кокоса в master-рецептах используется отдельный Big Bud Coco',
      'Источник дозировок: Advanced Nutrients liquid Master Recipe, Global mL/L',
    ],
    stageDosages: dosageSchedule([null, null, null, 2, 2, 2, null]),
    source: 'library',
  },
  {
    id: 'an-big-bud-coco',
    categoryId: 'boosters',
    manufacturer: 'Advanced Nutrients',
    growMethodId: 'coco',
    name: 'Big Bud Coco',
    shortDescription: 'PK-бустер для цветения в кокосе',
    description: 'Кокосовая версия Big Bud для bloom-фазы, адаптированная под особенности coco coir. В master-рецептах Sensi Coco и Connoisseur Coco она заменяет обычный Big Bud в средней части цветения.',
    details: [
      'Метод выращивания: кокос',
      'Группа производителя: Coco Bigger Buds',
      'Окна применения: Bloom W2-W5',
      'Источник дозировок: Advanced Nutrients liquid Master Recipe, Global mL/L',
    ],
    stageDosages: dosageSchedule([null, null, null, 2, 2, 2, null]),
    source: 'library',
  },
  {
    id: 'an-overdrive',
    categoryId: 'boosters',
    manufacturer: 'Advanced Nutrients',
    growMethodId: 'any',
    name: 'Overdrive',
    shortDescription: 'Поздний bloom booster перед промывкой',
    description: 'Позднецветочный бустер для последних продуктивных недель перед flush. В master-рецепте Overdrive включается после окна Big Bud, когда растение уже набрало основную массу и доходит до финиша.',
    details: [
      'Группа производителя: Bigger Buds',
      'Окна применения: Bloom W6-W7',
      'Источник дозировок: Advanced Nutrients liquid Master Recipe, Global mL/L',
    ],
    stageDosages: dosageSchedule([null, null, null, null, null, 2, null]),
    source: 'library',
  },
  {
    id: 'an-flawless-finish',
    categoryId: 'boosters',
    manufacturer: 'Advanced Nutrients',
    growMethodId: 'any',
    name: 'Flawless Finish',
    shortDescription: 'Финишная добавка для периода промывки',
    description: 'Финишная добавка для nutrient-free flush периода перед сбором. В master-рецепте Flawless Finish не используется на активном питании, а идет отдельной дозой только в последнюю фазу промывки.',
    details: [
      'Группа производителя: Bud Taste & Terpene Enhancement',
      'Окно применения: Flush',
      'Источник дозировок: Advanced Nutrients liquid Master Recipe, Global mL/L',
    ],
    stageDosages: dosageSchedule([null, null, null, null, null, null, 2]),
    source: 'library',
  },
]

const HIGHROOTS_FERTILIZERS: FertilizerItem[] = [
  {
    id: 'highroots-fish',
    categoryId: 'boosters',
    manufacturer: 'HighRoots',
    growMethodId: 'any',
    name: 'FISH',
    shortDescription: 'Органическая добавка для активного роста',
    description: 'Органическая добавка HighRoots для активного роста и общего развития растения. Подходит для полива или обработки по листу в период, когда растение активно набирает зеленую массу и корневую силу. Лучше использовать отдельно от других добавок HighRoots в день применения, чтобы не перегружать раствор.',
    details: [
      'Методы выращивания: универсальное применение',
      'Применение: полив или опрыскивание по листу',
      'Не смешивать с MUSHROOM или SPIDER в одном растворе',
    ],
    stageDosages: dosageSchedule([2, 2, 2, 2, 2, null, null]),
    source: 'library',
  },
  {
    id: 'highroots-mushroom',
    categoryId: 'boosters',
    manufacturer: 'HighRoots',
    growMethodId: 'any',
    name: 'MUSHROOM',
    shortDescription: 'Органическая добавка для питания',
    description: 'Органическая добавка HighRoots для усиления питания и поддержки обменных процессов. Хорошо подходит как вспомогательная подкормка на активных стадиях, когда растению нужно больше ресурсов для развития. Используй отдельно от FISH и SPIDER в одном растворе, чередуя препараты по дням или поливам.',
    details: [
      'Методы выращивания: универсальное применение',
      'Применение: полив или опрыскивание по листу',
      'Не смешивать с FISH или SPIDER в одном растворе',
    ],
    stageDosages: dosageSchedule([2, 2, 2, 2, 2, null, null]),
    source: 'library',
  },
  {
    id: 'highroots-spider',
    categoryId: 'boosters',
    manufacturer: 'HighRoots',
    growMethodId: 'any',
    name: 'SPIDER',
    shortDescription: 'Органическая добавка для защиты',
    description: 'Органическая добавка HighRoots для защиты и повышения устойчивости растения. Ее логично применять в периоды активного роста, после стрессов или как профилактическую поддержку. Не смешивай с FISH и MUSHROOM в одном растворе, чтобы сохранить предсказуемость схемы и не перегружать растение.',
    details: [
      'Методы выращивания: универсальное применение',
      'Применение: полив или опрыскивание по листу',
      'Не смешивать с FISH или MUSHROOM в одном растворе',
    ],
    stageDosages: dosageSchedule([2, 2, 2, 2, 2, null, null]),
    source: 'library',
  },
]

const RASTEA_FERTILIZERS: FertilizerItem[] = [
  ...(['hydro', 'coco', 'soil'] as const).map<FertilizerItem>((method) => ({
    id: `rastea-eco-hydro-vega-${method}`,
    categoryId: 'base',
    manufacturer: 'Rastea',
    growMethodId: method,
    name: `ECO-Hydro VEGA A&B ${RASTEA_METHOD_TITLES[method]}`,
    shortDescription: 'Двухкомпонентная база Rastea для вегетации',
    description: 'Минеральная двухкомпонентная база Rastea для рассады и вегетации. Компоненты A и B используются вместе в равных пропорциях, а дозировка в таблице указана для каждого компонента отдельно. Линейка подходит для гидропоники, кокоса и земли, поэтому в DripCalc база разделена по методу выращивания, чтобы pH-цели оставались точными.',
    details: [
      `Метод выращивания: ${RASTEA_METHOD_TITLES[method]}`,
      'Компоненты: VEGA A и VEGA B',
      'Дозировка в таблице указана для каждого компонента отдельно',
      'На земле производитель рекомендует 50% от указанной дозы базовых удобрений',
      'Источник дозировок: Rastea Classic, карта кормления',
    ],
    stageDosages: EMPTY_STAGE_DOSAGES,
    components: [
      {
        id: 'vega-a',
        name: 'VEGA A',
        stageDosages: RASTEA_VEGA_STAGE_DOSAGES,
      },
      {
        id: 'vega-b',
        name: 'VEGA B',
        stageDosages: RASTEA_VEGA_STAGE_DOSAGES,
      },
    ],
    solutionTargets: RASTEA_TARGETS_BY_METHOD[method],
    stageLabels: RASTEA_STAGE_LABELS,
    source: 'library',
  })),
  ...(['hydro', 'coco', 'soil'] as const).map<FertilizerItem>((method) => ({
    id: `rastea-eco-hydro-flores-${method}`,
    categoryId: 'base',
    manufacturer: 'Rastea',
    growMethodId: method,
    name: `ECO-Hydro FLORES A&B ${RASTEA_METHOD_TITLES[method]}`,
    shortDescription: 'Двухкомпонентная база Rastea для цветения',
    description: 'Цветочная двухкомпонентная база Rastea для перехода на 12/12, формирования завязей и созревания. FLORES A&B работает как основное питание на цветении, а PK Classic и BIO-стимуляторы добавляются поверх нее по карте кормления. Карточка разделена по методу выращивания только ради корректных pH-целей в рецепте.',
    details: [
      `Метод выращивания: ${RASTEA_METHOD_TITLES[method]}`,
      'Компоненты: FLORES A и FLORES B',
      'Дозировка в таблице указана для каждого компонента отдельно',
      'На земле производитель рекомендует 50% от указанной дозы базовых удобрений',
      'В колонке 8+ карта кормления оставляет 4 мл/л, но стадия DripCalc "Промывка" соответствует последней колонке с чистой водой',
      'Источник дозировок: Rastea Classic, карта кормления',
    ],
    stageDosages: EMPTY_STAGE_DOSAGES,
    components: [
      {
        id: 'flores-a',
        name: 'FLORES A',
        stageDosages: RASTEA_FLORES_STAGE_DOSAGES,
      },
      {
        id: 'flores-b',
        name: 'FLORES B',
        stageDosages: RASTEA_FLORES_STAGE_DOSAGES,
      },
    ],
    solutionTargets: RASTEA_TARGETS_BY_METHOD[method],
    stageLabels: RASTEA_STAGE_LABELS,
    source: 'library',
  })),
  {
    id: 'rastea-eco-hydro-pk-classic',
    categoryId: 'boosters',
    manufacturer: 'Rastea',
    growMethodId: 'any',
    name: 'ECO-Hydro PK Classic',
    shortDescription: 'PK-добавка Rastea для середины цветения',
    description: 'Фосфорно-калийная добавка Rastea для цветения. Используется вместе с ECO-Hydro FLORES A&B в период, когда растению нужен дополнительный акцент на плотность и развитие соцветий. В карте кормления PK Classic появляется с середины цветения, а на промывке заменяется чистой водой.',
    details: [
      'Методы выращивания: гидро, аэро, кокос, земля',
      'Официальная карточка товара: до 3 мл/л',
      'В карте кормления: 2 мл/л на 4 неделе цветения, 3 мл/л на 5-7 неделе, 2 мл/л в колонке 8+',
      'Источник дозировок: Rastea Classic, карта кормления',
    ],
    stageDosages: dosageSchedule([null, null, null, null, 2, 3, null]),
    stageLabels: RASTEA_STAGE_LABELS,
    source: 'library',
  },
  {
    id: 'rastea-bio-energy-spell',
    categoryId: 'boosters',
    manufacturer: 'Rastea',
    growMethodId: 'any',
    name: 'BIO-Energy Spell',
    shortDescription: 'Органический стимулятор метаболизма на весь цикл',
    description: 'Универсальный органический стимулятор Rastea на основе гуминовых и фульвокислот, аминокислот, витаминов и растительных экстрактов. Он поддерживает обмен веществ, усвоение питания и стрессоустойчивость от раннего старта до цветения. В DripCalc капельная доза проращивания сохранена в деталях, а стадийная таблица начинается с рассады.',
    details: [
      'Методы выращивания: гидро, аэро, кокос, земля',
      'Проращивание: 1 капля/л',
      'Официальная карточка товара: от 1 капли до 3 мл/л',
      'В карте кормления: 1 мл/л на рассаде, 2 мл/л на ранней веге, 3 мл/л с поздней веги до 8+ цветения',
      'Источник дозировок: Rastea Classic, карта кормления',
    ],
    stageDosages: dosageSchedule([1, 2, 3, 3, 3, 3, null]),
    stageLabels: RASTEA_STAGE_LABELS,
    source: 'library',
  },
  {
    id: 'rastea-bio-care-roots',
    categoryId: 'boosters',
    manufacturer: 'Rastea',
    growMethodId: 'any',
    name: 'BIO-Care Roots',
    shortDescription: 'Корневой стимулятор для рассады и вегетации',
    description: 'Корневой стимулятор Rastea для увеличения массы корней и поддержки прикорневой зоны. Логичен на старте, при укоренении, ранней веге и пересадке, когда растению важнее всего быстро восстановить и расширить корневую систему. На цветении по карте кормления не применяется.',
    details: [
      'Методы выращивания: гидро, аэро, кокос, земля',
      'Официальная карточка товара: 3 капли/л',
      'Карта кормления: 1 мл/л на рассаде и вегетации',
      'Дополнительно: 1 мл при пересадке из одного горшка в другой',
      'Источник дозировок: Rastea Classic, карта кормления',
    ],
    stageDosages: dosageSchedule([1, 1, 1, null, null, null, null]),
    stageLabels: RASTEA_STAGE_LABELS,
    source: 'library',
  },
  {
    id: 'rastea-bio-spray-shield',
    categoryId: 'boosters',
    manufacturer: 'Rastea',
    growMethodId: 'any',
    name: 'BIO-Spray Shield',
    shortDescription: 'Листовой стимулятор и стресс-защита',
    description: 'Листовой стимулятор Rastea для поддержки естественной защиты растения и устойчивости к стрессу. Применяется по листу на рассаде, вегетации и в начале цветения, а не как обычная корневая добавка в бак. В рецепте он вынесен в листовые добавки, чтобы не смешивать его с питательным раствором.',
    details: [
      'Методы выращивания: гидро, аэро, кокос, земля',
      'Применение: по листу 1 мл/л раз в 5 дней',
      'При стрессе: 2 мл/л',
      'Источник дозировок: Rastea Classic, карта кормления',
    ],
    stageDosages: dosageSchedule([1, 1, 1, 1, null, null, null]),
    stageLabels: RASTEA_STAGE_LABELS,
    application: 'foliar',
    foliarDose: '1 мл/л раз в 5 дней; при стрессе 2 мл/л',
    source: 'library',
  },
  {
    id: 'rastea-bio-bloom-booster',
    categoryId: 'boosters',
    manufacturer: 'Rastea',
    growMethodId: 'any',
    name: 'BIO-Bloom Booster',
    shortDescription: 'Стимулятор цветения и завязей',
    description: 'Стимулятор цветения Rastea на растительных экстрактах и вытяжках. Используется на всей активной стадии цветения для поддержки завязей, газообмена, сахаров и общего качества урожая. На промывке по схеме DripCalc не добавляется, потому что последняя стадия соответствует чистой воде.',
    details: [
      'Методы выращивания: гидро, аэро, кокос, земля',
      'Официальная карточка товара: 3 капли/л',
      'Карта кормления: 1 мл/л на цветении, включая колонку 8+ перед финальной промывкой',
      'Источник дозировок: Rastea Classic, карта кормления',
    ],
    stageDosages: dosageSchedule([null, null, null, 1, 1, 1, null]),
    stageLabels: RASTEA_STAGE_LABELS,
    source: 'library',
  },
  {
    id: 'rastea-ro-protomineral',
    categoryId: 'boosters',
    manufacturer: 'Rastea',
    growMethodId: 'any',
    name: 'RO Protomineral',
    shortDescription: 'Кремний и минералы для раствора или субстрата',
    description: 'Минеральная добавка Rastea Organic на основе ископаемых панцирей протоводорослей. Используется как источник кремния, кальция, железа, цинка и как пористая среда для полезной микрофлоры. Дозировка зависит от метода: для земли и кокоса это внесение в субстрат, для гидро - добавка при смене раствора.',
    details: [
      'Методы выращивания: гидро, аэро, кокос, земля',
      'Земля/кокос: 2 ст. ложки на 10 л субстрата при первом замесе',
      'Гидро: 1 ст. ложка на 10 л раствора при смене раствора',
      'Источник дозировок: Rastea Classic, карта кормления и карточка RO Protomineral',
    ],
    stageDosages: dosageSchedule([
      dose(null, '2 ст. ложки/10 л субстрата или 1 ст. ложка/10 л раствора'),
      null,
      null,
      null,
      null,
      null,
      null,
    ]),
    stageLabels: RASTEA_STAGE_LABELS,
    source: 'library',
  },
]

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
