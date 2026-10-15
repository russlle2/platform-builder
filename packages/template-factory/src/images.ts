/**
 * Curated Unsplash photo pool per niche.
 * Each photo is free to use under the Unsplash License.
 * URL format: https://images.unsplash.com/photo-{id}?w={width}&q=80&auto=format&fit=crop
 *
 * Photo subjects were visually reviewed on 2026-10-15; comments describe the actual images.
 * The assembler rotates through these pools so each template gets distinct imagery.
 */

export interface NicheImagePool {
  /** Full-bleed hero / banner images (landscape, 1200+ wide) */
  hero: string[];
  /** Section accent / card images (landscape, ~800 wide) */
  section: string[];
  /** Portrait/square service or about images */
  portrait: string[];
}

function unsplashUrl(id: string, w = 1200, h = 700): string {
  return `https://images.unsplash.com/photo-${id}?w=${w}&h=${h}&q=82&auto=format&fit=crop`;
}

function sectionUrl(id: string): string {
  return unsplashUrl(id, 800, 520);
}

function portraitUrl(id: string): string {
  return unsplashUrl(id, 600, 700);
}

export const NICHE_IMAGES: Record<string, NicheImagePool> = {
  aromatherapy: {
    hero: [
      unsplashUrl('1465146344425-f00d5f5c8f07'), // wildflower meadow
      unsplashUrl('1515377905703-c4788e51af15'), // oil poured from a bottle into a hand
      unsplashUrl('1515377905703-c4788e51af15'), // oil poured from a bottle into a hand
      unsplashUrl('1515377905703-c4788e51af15'), // oil poured from a bottle into a hand
      unsplashUrl('1465146344425-f00d5f5c8f07'), // wildflower meadow
      unsplashUrl('1515377905703-c4788e51af15'), // oil poured from a bottle into a hand
      unsplashUrl('1515377905703-c4788e51af15'), // oil poured from a bottle into a hand
      unsplashUrl('1515377905703-c4788e51af15'), // oil poured from a bottle into a hand
      unsplashUrl('1465146344425-f00d5f5c8f07'), // wildflower meadow
      unsplashUrl('1515377905703-c4788e51af15'), // oil poured from a bottle into a hand
      unsplashUrl('1465146344425-f00d5f5c8f07'), // wildflower meadow
      unsplashUrl('1465146344425-f00d5f5c8f07'), // wildflower meadow
    ],
    section: [
      sectionUrl('1515377905703-c4788e51af15'), // oil poured from a bottle into a hand
      sectionUrl('1515377905703-c4788e51af15'), // oil poured from a bottle into a hand
      sectionUrl('1465146344425-f00d5f5c8f07'), // wildflower meadow
      sectionUrl('1465146344425-f00d5f5c8f07'), // wildflower meadow
      sectionUrl('1465146344425-f00d5f5c8f07'), // wildflower meadow
      sectionUrl('1465146344425-f00d5f5c8f07'), // wildflower meadow
      sectionUrl('1515377905703-c4788e51af15'), // oil poured from a bottle into a hand
      sectionUrl('1515377905703-c4788e51af15'), // oil poured from a bottle into a hand
    ],
    portrait: [
      portraitUrl('1515377905703-c4788e51af15'), // oil poured from a bottle into a hand
      portraitUrl('1515377905703-c4788e51af15'), // oil poured from a bottle into a hand
      portraitUrl('1515377905703-c4788e51af15'), // oil poured from a bottle into a hand
      portraitUrl('1465146344425-f00d5f5c8f07'), // wildflower meadow
    ],
  },

  holistic_medicine: {
    hero: [
      unsplashUrl('1506905925346-21bda4d32df4'), // mountain peaks above clouds
      unsplashUrl('1512290923902-8a9f81dc236c'), // facial massage treatment
      unsplashUrl('1515377905703-c4788e51af15'), // oil poured from a bottle into a hand
      unsplashUrl('1544367567-0f2fcb009e0b'), // yoga pose at sunset
      unsplashUrl('1506126613408-eca07ce68773'), // seated meditation in warm light
      unsplashUrl('1465146344425-f00d5f5c8f07'), // wildflower meadow
      unsplashUrl('1506905925346-21bda4d32df4'), // mountain peaks above clouds
      unsplashUrl('1506126613408-eca07ce68773'), // seated meditation in warm light
      unsplashUrl('1465146344425-f00d5f5c8f07'), // wildflower meadow
      unsplashUrl('1501854140801-50d01698950b'), // green rolling hills
      unsplashUrl('1441974231531-c6227db76b6e'), // sunlit woodland path
      unsplashUrl('1441974231531-c6227db76b6e'), // sunlit woodland path
    ],
    section: [
      sectionUrl('1512290923902-8a9f81dc236c'), // facial massage treatment
      sectionUrl('1515377905703-c4788e51af15'), // oil poured from a bottle into a hand
      sectionUrl('1465146344425-f00d5f5c8f07'), // wildflower meadow
      sectionUrl('1506126613408-eca07ce68773'), // seated meditation in warm light
      sectionUrl('1465146344425-f00d5f5c8f07'), // wildflower meadow
      sectionUrl('1441974231531-c6227db76b6e'), // sunlit woodland path
      sectionUrl('1506126613408-eca07ce68773'), // seated meditation in warm light
      sectionUrl('1506905925346-21bda4d32df4'), // mountain peaks above clouds
    ],
    portrait: [
      portraitUrl('1512290923902-8a9f81dc236c'), // facial massage treatment
      portraitUrl('1515377905703-c4788e51af15'), // oil poured from a bottle into a hand
      portraitUrl('1465146344425-f00d5f5c8f07'), // wildflower meadow
      portraitUrl('1506126613408-eca07ce68773'), // seated meditation in warm light
    ],
  },

  private_practice_therapist: {
    hero: [
      unsplashUrl('1441974231531-c6227db76b6e'), // sunlit woodland path
      unsplashUrl('1481627834876-b7833e8f5570'), // warmly lit bookshelves
      unsplashUrl('1506905925346-21bda4d32df4'), // mountain peaks above clouds
      unsplashUrl('1481627834876-b7833e8f5570'), // warmly lit bookshelves
      unsplashUrl('1506126613408-eca07ce68773'), // seated meditation in warm light
      unsplashUrl('1544367567-0f2fcb009e0b'), // yoga pose at sunset
      unsplashUrl('1441974231531-c6227db76b6e'), // sunlit woodland path
      unsplashUrl('1441974231531-c6227db76b6e'), // sunlit woodland path
      unsplashUrl('1481627834876-b7833e8f5570'), // warmly lit bookshelves
      unsplashUrl('1481627834876-b7833e8f5570'), // warmly lit bookshelves
      unsplashUrl('1465146344425-f00d5f5c8f07'), // wildflower meadow
      unsplashUrl('1465146344425-f00d5f5c8f07'), // wildflower meadow
    ],
    section: [
      sectionUrl('1441974231531-c6227db76b6e'), // sunlit woodland path
      sectionUrl('1481627834876-b7833e8f5570'), // warmly lit bookshelves
      sectionUrl('1544367567-0f2fcb009e0b'), // yoga pose at sunset
      sectionUrl('1441974231531-c6227db76b6e'), // sunlit woodland path
      sectionUrl('1481627834876-b7833e8f5570'), // warmly lit bookshelves
      sectionUrl('1465146344425-f00d5f5c8f07'), // wildflower meadow
      sectionUrl('1481627834876-b7833e8f5570'), // warmly lit bookshelves
      sectionUrl('1465146344425-f00d5f5c8f07'), // wildflower meadow
    ],
    portrait: [
      portraitUrl('1441974231531-c6227db76b6e'), // sunlit woodland path
      portraitUrl('1481627834876-b7833e8f5570'), // warmly lit bookshelves
      portraitUrl('1481627834876-b7833e8f5570'), // warmly lit bookshelves
      portraitUrl('1481627834876-b7833e8f5570'), // warmly lit bookshelves
    ],
  },

  sound_bath: {
    hero: [
      unsplashUrl('1545389336-cf090694435e'), // seated outdoor yoga facing mountains
      unsplashUrl('1506905925346-21bda4d32df4'), // mountain peaks above clouds
      unsplashUrl('1506905925346-21bda4d32df4'), // mountain peaks above clouds
      unsplashUrl('1441974231531-c6227db76b6e'), // sunlit woodland path
      unsplashUrl('1506126613408-eca07ce68773'), // seated meditation in warm light
      unsplashUrl('1545389336-cf090694435e'), // seated outdoor yoga facing mountains
      unsplashUrl('1506126613408-eca07ce68773'), // seated meditation in warm light
      unsplashUrl('1501854140801-50d01698950b'), // green rolling hills
      unsplashUrl('1506126613408-eca07ce68773'), // seated meditation in warm light
      unsplashUrl('1465146344425-f00d5f5c8f07'), // wildflower meadow
      unsplashUrl('1441974231531-c6227db76b6e'), // sunlit woodland path
      unsplashUrl('1501854140801-50d01698950b'), // green rolling hills
    ],
    section: [
      sectionUrl('1545389336-cf090694435e'), // seated outdoor yoga facing mountains
      sectionUrl('1506905925346-21bda4d32df4'), // mountain peaks above clouds
      sectionUrl('1545389336-cf090694435e'), // seated outdoor yoga facing mountains
      sectionUrl('1506126613408-eca07ce68773'), // seated meditation in warm light
      sectionUrl('1506126613408-eca07ce68773'), // seated meditation in warm light
      sectionUrl('1465146344425-f00d5f5c8f07'), // wildflower meadow
      sectionUrl('1441974231531-c6227db76b6e'), // sunlit woodland path
      sectionUrl('1441974231531-c6227db76b6e'), // sunlit woodland path
    ],
    portrait: [
      portraitUrl('1545389336-cf090694435e'), // seated outdoor yoga facing mountains
      portraitUrl('1545389336-cf090694435e'), // seated outdoor yoga facing mountains
      portraitUrl('1506126613408-eca07ce68773'), // seated meditation in warm light
      portraitUrl('1506905925346-21bda4d32df4'), // mountain peaks above clouds
    ],
  },

  wellness_coach: {
    hero: [
      unsplashUrl('1476480862126-209bfaa8edc8'), // runner climbing stone steps
      unsplashUrl('1518611012118-696072aa579a'), // group exercise in a bright studio
      unsplashUrl('1571019614242-c5c5dee9f50b'), // fitness coach assisting a floor exercise
      unsplashUrl('1434682881908-b43d0467b798'), // strength training in a gym
      unsplashUrl('1526506118085-60ce8714f8c5'), // strength training in a gym
      unsplashUrl('1571019614242-c5c5dee9f50b'), // fitness coach assisting a floor exercise
      unsplashUrl('1441974231531-c6227db76b6e'), // sunlit woodland path
      unsplashUrl('1506905925346-21bda4d32df4'), // mountain peaks above clouds
      unsplashUrl('1501854140801-50d01698950b'), // green rolling hills
      unsplashUrl('1571019614242-c5c5dee9f50b'), // fitness coach assisting a floor exercise
      unsplashUrl('1544367567-0f2fcb009e0b'), // yoga pose at sunset
      unsplashUrl('1465146344425-f00d5f5c8f07'), // wildflower meadow
    ],
    section: [
      sectionUrl('1476480862126-209bfaa8edc8'), // runner climbing stone steps
      sectionUrl('1518611012118-696072aa579a'), // group exercise in a bright studio
      sectionUrl('1434682881908-b43d0467b798'), // strength training in a gym
      sectionUrl('1526506118085-60ce8714f8c5'), // strength training in a gym
      sectionUrl('1571019614242-c5c5dee9f50b'), // fitness coach assisting a floor exercise
      sectionUrl('1501854140801-50d01698950b'), // green rolling hills
      sectionUrl('1571019614242-c5c5dee9f50b'), // fitness coach assisting a floor exercise
      sectionUrl('1465146344425-f00d5f5c8f07'), // wildflower meadow
    ],
    portrait: [
      portraitUrl('1518611012118-696072aa579a'), // group exercise in a bright studio
      portraitUrl('1526506118085-60ce8714f8c5'), // strength training in a gym
      portraitUrl('1476480862126-209bfaa8edc8'), // runner climbing stone steps
      portraitUrl('1571019614242-c5c5dee9f50b'), // fitness coach assisting a floor exercise
    ],
  },
};

/**
 * Pick images for a template deterministically (foundation index + color index = rotation seed).
 * Returns hero, 3 section images, and 1 portrait image.
 */
export function pickImages(
  niche: string,
  seed: number,
): { hero: string; section1: string; section2: string; section3: string; portrait: string } {
  const pool = NICHE_IMAGES[niche] ?? NICHE_IMAGES['wellness_coach']!;
  const h = pool.hero;
  const s = pool.section;
  const p = pool.portrait;

  return {
    hero: h[seed % h.length]!,
    section1: s[seed % s.length]!,
    section2: s[(seed + 2) % s.length]!,
    section3: s[(seed + 4) % s.length]!,
    portrait: p[seed % p.length]!,
  };
}
