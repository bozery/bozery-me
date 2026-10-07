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
    '谢谢你一直陪在我身边。',
    '这一程，有你在旁边打盹，就很安心。',
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
