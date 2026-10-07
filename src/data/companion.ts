/**
 * The little cat that sleeps on the rear seat of the About scene.
 * Clicking it wakes it up and opens a thank-you card.
 */
export const companion = {
  /** How the card addresses him. Leave empty to show only the heading. */
  name: 'aqp',
  heading: '特别鸣谢',
  /** Each string is one paragraph on the card. */
  message: [
    '在无限的旅程中仍有猫陪伴。',
  ],
  /** Fur, back stripes, belly, inner-ear/nose, eye and collar colours. */
  colors: {
    fur: '#8e979a',
    stripes: '#596367',
    belly: '#f1efe8',
    accent: '#e7b2ad',
    eyes: '#7fb8a4',
    collar: '#3f8584',
  },
};

export type Companion = typeof companion;

/** The stuffed beagle lying next to the cat; it stands for the site's owner. */
export const buddy = {
  /** Tan coat, dark saddle, white markings, ears, blush, nose, tongue and collar colours. */
  colors: {
    tan: '#c4874c',
    saddle: '#3b322d',
    white: '#f3eee4',
    ear: '#9b6034',
    accent: '#e7b2ad',
    nose: '#2a2422',
    tongue: '#e58b8b',
    collar: '#c8553d',
  },
};

export type Buddy = typeof buddy;
