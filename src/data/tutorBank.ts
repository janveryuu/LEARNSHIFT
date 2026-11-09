import type { LText } from '@/i18n/useT';

import type { MisconceptionId } from './questions';

export type BankEntry = {
  /** One line naming the exact mistake. */
  what: LText;
  steps: LText[];
  example: LText;
  example2: LText;
  simpler: LText[];
  check: { prompt: string; options: string[]; answer: number };
};

type Known = Exclude<MisconceptionId, 'unknown'>;

/**
 * Teacher-vetted explanations keyed by misconception. In production this is
 * the retrieval corpus the grounded tutor cites; here it is the whole tutor.
 */
export const TUTOR_BANK: Record<Known, BankEntry> = {
  'frac-add-across': {
    what: { en: 'You added the tops and the bottoms.', fil: 'Pinagsama mo ang itaas at ang ibaba.' },
    steps: [
      {
        en: 'The bottom number is the size of each piece. Halves and thirds are different sizes.',
        fil: 'Ang ibaba ay laki ng bawat piraso. Magkaiba ang laki ng halves at thirds.',
      },
      { en: 'Cut both into sixths: 1/2 = 3/6 and 1/3 = 2/6.', fil: 'Hatiin pareho sa sixths: 1/2 = 3/6 at 1/3 = 2/6.' },
      { en: 'Now add only the tops: 3/6 + 2/6 = 5/6.', fil: 'Ngayon itaas lang ang pagsamahin: 3/6 + 2/6 = 5/6.' },
    ],
    example: { en: '1/4 + 1/2 → 1/4 + 2/4 = 3/4', fil: '1/4 + 1/2 → 1/4 + 2/4 = 3/4' },
    example2: {
      en: 'Half a pizza plus a third is 5 of 6 slices, not 2 of 5.',
      fil: 'Kalahating pizza at ikatlo ay 5 sa 6 na hiwa, hindi 2 sa 5.',
    },
    simpler: [
      { en: 'Pieces must match before you add.', fil: 'Dapat magkapareho ang piraso bago pagsamahin.' },
      { en: 'Keep the bottom. Add the tops.', fil: 'Panatilihin ang ibaba. Itaas ang pagsamahin.' },
    ],
    check: { prompt: '1/3 + 1/6 = ?', options: ['2/9', '1/2', '2/6'], answer: 1 },
  },
  'frac-compare-denominator': {
    what: { en: 'A bigger bottom number means smaller pieces.', fil: 'Mas malaking ibaba, mas maliit na piraso.' },
    steps: [
      { en: '1/3 means cut into 3. 1/4 means cut into 4.', fil: 'Ang 1/3 ay hinati sa 3. Ang 1/4 ay hinati sa 4.' },
      { en: 'More cuts make each slice smaller.', fil: 'Mas maraming hati, mas maliit ang bawat hiwa.' },
      { en: 'So 1/3 is bigger than 1/4.', fil: 'Kaya mas malaki ang 1/3 kaysa 1/4.' },
    ],
    example: { en: '1/2 of a cake beats 1/8 of it.', fil: 'Mas malaki ang 1/2 ng cake kaysa 1/8.' },
    example2: {
      en: 'Share one pandesal with 2 friends or with 7. Which share is bigger?',
      fil: 'Hatiin ang pandesal sa 2 o sa 7 kaibigan. Alin ang mas malaking parte?',
    },
    simpler: [{ en: 'More people sharing, smaller share.', fil: 'Mas maraming kahati, mas maliit ang parte.' }],
    check: { prompt: 'Bigger: 1/5 or 1/9?', options: ['1/5', '1/9'], answer: 0 },
  },
  'frac-no-common': {
    what: { en: 'You added tops before the pieces matched.', fil: 'Pinagsama mo ang itaas bago magtugma ang piraso.' },
    steps: [
      { en: 'Thirds and sixths are different sizes.', fil: 'Magkaiba ang laki ng thirds at sixths.' },
      { en: 'Turn 2/3 into sixths: 2/3 = 4/6.', fil: 'Gawing sixths ang 2/3: 2/3 = 4/6.' },
      { en: '4/6 + 1/6 = 5/6.', fil: '4/6 + 1/6 = 5/6.' },
    ],
    example: { en: '1/2 + 1/4 → 2/4 + 1/4 = 3/4', fil: '1/2 + 1/4 → 2/4 + 1/4 = 3/4' },
    example2: {
      en: '2 halves of a ruler plus 1 quarter: 3 quarters.',
      fil: '2 kalahati ng ruler at 1 kapat: 3 kapat.',
    },
    simpler: [{ en: 'Match the bottoms, then add.', fil: 'Itugma ang ibaba, saka pagsamahin.' }],
    check: { prompt: '1/2 + 1/6 = ?', options: ['2/8', '2/3', '2/6'], answer: 1 },
  },
  'frac-divide-noflip': {
    what: {
      en: 'You divided straight across. Flip the second fraction and multiply.',
      fil: 'Diretso mong hinati. Baligtarin ang ikalawa at i-multiply.',
    },
    steps: [
      { en: 'Ask: how many halves fit in 3/4?', fil: 'Itanong: ilang kalahati ang kasya sa 3/4?' },
      { en: 'Dividing by 1/2 = multiplying by 2/1.', fil: 'Ang hatiin sa 1/2 = i-multiply sa 2/1.' },
      { en: '3/4 × 2 = 6/4 = 3/2.', fil: '3/4 × 2 = 6/4 = 3/2.' },
    ],
    example: { en: '1 ÷ 1/4 = 4. Four quarters fit in one.', fil: '1 ÷ 1/4 = 4. Apat na kapat ang kasya sa isa.' },
    example2: {
      en: '2 liters into 1/2-liter bottles fills 4 bottles.',
      fil: '2 litro sa 1/2-litrong bote: 4 na bote.',
    },
    simpler: [{ en: 'Keep, change, flip.', fil: 'Panatilihin, palitan, baligtarin.' }],
    check: { prompt: '1/2 ÷ 1/4 = ?', options: ['1/8', '2', '1/2'], answer: 1 },
  },
  'alg-unlike': {
    what: { en: 'You combined an x term with a plain number.', fil: 'Pinagsama mo ang x term at numero lang.' },
    steps: [
      { en: '3x means three x’s. 2 means just two ones.', fil: 'Ang 3x ay tatlong x. Ang 2 ay dalawang isa lang.' },
      {
        en: 'Only like terms combine: x with x, numbers with numbers.',
        fil: 'Magkapareho lang ang pinagsasama: x sa x, numero sa numero.',
      },
      { en: 'So 3x + 2 stays 3x + 2.', fil: 'Kaya mananatiling 3x + 2 ang 3x + 2.' },
    ],
    example: { en: '4x + 3 + x = 5x + 3', fil: '4x + 3 + x = 5x + 3' },
    example2: { en: '3 mangoes + 2 pesos is not 5 mango-pesos.', fil: 'Ang 3 mangga + 2 piso ay hindi 5 mangga-piso.' },
    simpler: [{ en: 'x’s with x’s. Numbers with numbers.', fil: 'x sa x. Numero sa numero.' }],
    check: { prompt: '2x + 5 + x = ?', options: ['8x', '3x + 5', '7x'], answer: 1 },
  },
  'alg-distribute': {
    what: { en: 'The 2 only multiplied the first term.', fil: 'Ang unang term lang ang na-multiply ng 2.' },
    steps: [
      { en: '2(x + 3) means two groups of (x + 3).', fil: 'Ang 2(x + 3) ay dalawang grupo ng (x + 3).' },
      { en: 'Each group has an x and a 3.', fil: 'May x at 3 ang bawat grupo.' },
      { en: 'So 2x + 6.', fil: 'Kaya 2x + 6.' },
    ],
    example: { en: '3(x + 2) = 3x + 6', fil: '3(x + 2) = 3x + 6' },
    example2: {
      en: '2 bags, each with 1 pen and 3 clips: 2 pens, 6 clips.',
      fil: '2 bag, bawat isa may 1 ballpen at 3 clip: 2 ballpen, 6 clip.',
    },
    simpler: [{ en: 'Multiply everything in the brackets.', fil: 'I-multiply ang lahat ng nasa loob.' }],
    check: { prompt: '4(x + 1) = ?', options: ['4x + 1', '4x + 4', 'x + 4'], answer: 1 },
  },
  'int-sign': {
    what: { en: 'A minus sign flipped the wrong way.', fil: 'Nabaligtad ang minus sign.' },
    steps: [
      {
        en: 'Picture a number line. Plus walks right, minus walks left.',
        fil: 'Isipin ang number line. Pakanan ang plus, pakaliwa ang minus.',
      },
      { en: 'Minus a negative turns around: walk right.', fil: 'Ang minus ng negative ay umiikot: pakanan.' },
      { en: '5 − (−2) = 5 + 2 = 7.', fil: '5 − (−2) = 5 + 2 = 7.' },
    ],
    example: { en: '−3 + 7: start at −3, walk 7 right, land on 4.', fil: '−3 + 7: mula −3, 7 hakbang pakanan, sa 4.' },
    example2: { en: 'Erasing a ₱2 debt leaves you ₱2 richer.', fil: 'Kapag binura ang ₱2 na utang, ₱2 ang dagdag mo.' },
    simpler: [{ en: 'Two minus signs side by side make a plus.', fil: 'Dalawang minus na magkatabi ay plus.' }],
    check: { prompt: '3 − (−4) = ?', options: ['−1', '7', '−7'], answer: 1 },
  },
  'int-mult-sign': {
    what: { en: 'Negative times negative is positive.', fil: 'Positive ang negative times negative.' },
    steps: [
      { en: 'Multiply the numbers: 4 × 3 = 12.', fil: 'I-multiply ang numero: 4 × 3 = 12.' },
      { en: 'Count the negatives: two.', fil: 'Bilangin ang negative: dalawa.' },
      { en: 'Even count → positive. So 12.', fil: 'Even ang bilang → positive. Kaya 12.' },
    ],
    example: { en: '(−2) × (−5) = 10', fil: '(−2) × (−5) = 10' },
    example2: {
      en: 'Rewinding a video of someone walking backward shows them walking forward.',
      fil: 'Kapag ni-rewind ang video ng taong umaatras, mukhang pasulong siya.',
    },
    simpler: [{ en: 'Same signs → plus.', fil: 'Parehong sign → plus.' }],
    check: { prompt: '(−6) × (−2) = ?', options: ['−12', '12', '−8'], answer: 1 },
  },
  'lin-move-sign': {
    what: {
      en: 'A term crossed the = sign without changing its sign.',
      fil: 'Lumipat ang term sa kabila ng = nang hindi nagbago ang sign.',
    },
    steps: [
      {
        en: 'An equation is a balance. Do the same to both sides.',
        fil: 'Timbangan ang equation. Gawin ang pareho sa magkabila.',
      },
      { en: 'x + 5 = 12: take 5 from both sides.', fil: 'x + 5 = 12: bawasan ng 5 ang magkabila.' },
      { en: 'x = 12 − 5 = 7.', fil: 'x = 12 − 5 = 7.' },
    ],
    example: { en: 'x − 4 = 10 → x = 10 + 4 = 14', fil: 'x − 4 = 10 → x = 10 + 4 = 14' },
    example2: {
      en: 'Remove 5 marbles from each pan and the scale stays even.',
      fil: 'Alisin ang 5 holen sa bawat panig, pantay pa rin.',
    },
    simpler: [{ en: 'Undo plus with minus.', fil: 'I-undo ang plus gamit ang minus.' }],
    check: { prompt: 'x + 9 = 15. x = ?', options: ['24', '6', '−6'], answer: 1 },
  },
  'lin-frac-coef': {
    what: {
      en: 'You divided again instead of undoing the divide. This is a fractions slip.',
      fil: 'Hinati mo ulit sa halip na i-undo. Fractions ang ugat nito.',
    },
    steps: [
      { en: 'x/3 means x cut into 3 parts.', fil: 'Ang x/3 ay x na hinati sa 3.' },
      { en: 'Undo “÷ 3” with “× 3” on both sides.', fil: 'I-undo ang “÷ 3” gamit ang “× 3” sa magkabila.' },
      { en: 'x = 4 × 3 = 12.', fil: 'x = 4 × 3 = 12.' },
    ],
    example: { en: 'x/5 = 2 → x = 10', fil: 'x/5 = 2 → x = 10' },
    example2: {
      en: 'A third of the class is 4 students. The class has 12.',
      fil: 'Ang ikatlo ng klase ay 4. 12 ang buong klase.',
    },
    simpler: [{ en: 'Divide is undone by times.', fil: 'Times ang pang-undo ng divide.' }],
    check: { prompt: 'x/2 = 7. x = ?', options: ['7/2', '14', '9'], answer: 1 },
  },
  'lin-divide-one-side': {
    what: { en: 'You stopped at 2x = 8. One more step.', fil: 'Huminto ka sa 2x = 8. Isa pang hakbang.' },
    steps: [
      { en: '2x + 3 = 11 → 2x = 8.', fil: '2x + 3 = 11 → 2x = 8.' },
      { en: '2x means 2 times x.', fil: 'Ang 2x ay 2 times x.' },
      { en: 'Divide both sides by 2: x = 4.', fil: 'Hatiin sa 2 ang magkabila: x = 4.' },
    ],
    example: { en: '3x − 1 = 14 → 3x = 15 → x = 5', fil: '3x − 1 = 14 → 3x = 15 → x = 5' },
    example2: {
      en: 'Two equal bags weigh 8 kg. One bag weighs 4 kg.',
      fil: '8 kg ang dalawang magkaparehong bag. 4 kg ang isa.',
    },
    simpler: [{ en: 'Finish with x alone.', fil: 'Tapusin nang mag-isa ang x.' }],
    check: { prompt: '4x = 20. x = ?', options: ['16', '5', '80'], answer: 1 },
  },
  'dec-place': {
    what: { en: 'The decimal points weren’t lined up.', fil: 'Hindi nakahanay ang decimal point.' },
    steps: [
      {
        en: 'Write 0.5 as 0.50 so both have two places.',
        fil: 'Isulat ang 0.5 bilang 0.50 para parehong dalawang place.',
      },
      { en: 'Line up the points.', fil: 'Ihanay ang mga point.' },
      { en: '0.50 + 0.25 = 0.75.', fil: '0.50 + 0.25 = 0.75.' },
    ],
    example: { en: '1.2 + 0.35 = 1.20 + 0.35 = 1.55', fil: '1.2 + 0.35 = 1.20 + 0.35 = 1.55' },
    example2: { en: '₱0.50 and ₱0.25 make ₱0.75, not ₱0.30.', fil: 'Ang ₱0.50 at ₱0.25 ay ₱0.75, hindi ₱0.30.' },
    simpler: [{ en: 'Points on top of points.', fil: 'Point sa ibabaw ng point.' }],
    check: { prompt: '0.4 + 0.15 = ?', options: ['0.19', '0.55', '0.415'], answer: 1 },
  },
  'ratio-order': {
    what: {
      en: 'The ratio is flipped. Keep the order asked.',
      fil: 'Baligtad ang ratio. Sundin ang ayos na tinanong.',
    },
    steps: [
      { en: '“Girls to boys” means girls first.', fil: 'Ang “babae sa lalaki” ay babae muna.' },
      { en: '12 : 18.', fil: '12 : 18.' },
      { en: 'Divide both by 6: 2 : 3.', fil: 'Hatiin pareho sa 6: 2 : 3.' },
    ],
    example: { en: 'Cats to dogs, 4 cats and 8 dogs → 1 : 2', fil: 'Pusa sa aso, 4 pusa at 8 aso → 1 : 2' },
    example2: {
      en: 'Rice to water 1 : 2 is not the same as 2 : 1.',
      fil: 'Hindi pareho ang bigas sa tubig na 1 : 2 at 2 : 1.',
    },
    simpler: [{ en: 'First word, first number.', fil: 'Unang salita, unang numero.' }],
    check: { prompt: '6 red, 9 blue. Red to blue?', options: ['3:2', '2:3', '6:15'], answer: 1 },
  },
  'geo-area-perimeter': {
    what: {
      en: 'That’s area. The question asks for the distance around.',
      fil: 'Area iyan. Ang tanong ay ang layo paikot.',
    },
    steps: [
      { en: 'Perimeter = walk around the edge.', fil: 'Perimeter = lakarin ang gilid.' },
      { en: 'Area = squares that fill the inside.', fil: 'Area = parisukat na pumupuno sa loob.' },
      { en: 'Square of side 5: 5 + 5 + 5 + 5 = 20 cm.', fil: 'Parisukat na 5 ang gilid: 5 + 5 + 5 + 5 = 20 cm.' },
    ],
    example: { en: '3 × 4 rectangle: perimeter 14, area 12', fil: '3 × 4 na parihaba: perimeter 14, area 12' },
    example2: { en: 'Fence = perimeter. Tiles = area.', fil: 'Bakod = perimeter. Tiles = area.' },
    simpler: [{ en: 'Around vs inside.', fil: 'Paikot vs loob.' }],
    check: { prompt: 'Square, side 3. Perimeter?', options: ['9', '12', '6'], answer: 1 },
  },
  'meas-unit': {
    what: { en: 'The unit conversion used the wrong number.', fil: 'Mali ang numerong ginamit sa pag-convert.' },
    steps: [
      {
        en: 'Check the rule: 1 m = 100 cm, 1 h = 60 min.',
        fil: 'Tingnan ang tuntunin: 1 m = 100 cm, 1 oras = 60 min.',
      },
      { en: 'Big unit → small unit: multiply.', fil: 'Malaking unit → maliit: i-multiply.' },
      { en: 'Small unit → big unit: divide.', fil: 'Maliit na unit → malaki: hatiin.' },
    ],
    example: { en: '90 min ÷ 60 = 1.5 h', fil: '90 min ÷ 60 = 1.5 oras' },
    example2: { en: '2.5 m × 100 = 250 cm', fil: '2.5 m × 100 = 250 cm' },
    simpler: [{ en: 'Know the rule, then times or divide.', fil: 'Alamin ang tuntunin, saka times o hatiin.' }],
    check: { prompt: '120 min = ? h', options: ['1.2', '2', '12'], answer: 1 },
  },
  'stat-median-sort': {
    what: {
      en: 'The list wasn’t sorted before finding the middle.',
      fil: 'Hindi muna inayos ang listahan bago hanapin ang gitna.',
    },
    steps: [
      { en: 'Sort: 3, 4, 5, 7, 9.', fil: 'Ayusin: 3, 4, 5, 7, 9.' },
      { en: 'Find the middle position.', fil: 'Hanapin ang gitnang puwesto.' },
      { en: 'The middle value is 5.', fil: '5 ang nasa gitna.' },
    ],
    example: { en: '8, 2, 6 → 2, 6, 8 → median 6', fil: '8, 2, 6 → 2, 6, 8 → median 6' },
    example2: {
      en: 'Line up by height, then pick the middle student.',
      fil: 'Ihanay ayon sa tangkad, saka piliin ang nasa gitna.',
    },
    simpler: [{ en: 'Sort first, then middle.', fil: 'Ayusin muna, saka gitna.' }],
    check: { prompt: 'Median of 9, 1, 5?', options: ['1', '5', '9'], answer: 1 },
  },
  'stat-mean-median': {
    what: { en: 'That’s the mean. The question asks for the median.', fil: 'Mean iyan. Median ang tinatanong.' },
    steps: [
      { en: 'Mean = add all, divide by how many.', fil: 'Mean = pagsamahin, hatiin sa dami.' },
      { en: 'Median = the middle value after sorting.', fil: 'Median = ang gitna pagkatapos ayusin.' },
      { en: 'Sorted 3, 4, 5, 7, 9 → median 5.', fil: 'Inayos na 3, 4, 5, 7, 9 → median 5.' },
    ],
    example: { en: '1, 2, 9: mean 4, median 2', fil: '1, 2, 9: mean 4, median 2' },
    example2: {
      en: 'Median ignores one huge number. Mean doesn’t.',
      fil: 'Hindi apektado ang median ng isang napakalaking numero. Ang mean, oo.',
    },
    simpler: [{ en: 'Median = middle. Mean = share equally.', fil: 'Median = gitna. Mean = hatian nang pantay.' }],
    check: { prompt: 'Median of 2, 4, 30?', options: ['12', '4', '30'], answer: 1 },
  },
};
