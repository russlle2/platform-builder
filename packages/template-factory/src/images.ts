/**
 * Curated Unsplash photo pool per niche.
 * Each photo is free to use under the Unsplash License.
 * URL format: https://images.unsplash.com/photo-{id}?w={width}&q=80&auto=format&fit=crop
 *
 * Images are chosen for aesthetic, motivational, and niche-appropriate feel.
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
      unsplashUrl('1544947950-fa07a98d237f'), // lavender field
      unsplashUrl('1600857062241-98e5dba7f025'), // essential oils bottles
      unsplashUrl('1571781565322-c0c2c51f3a55'), // aromatherapy amber bottles
      unsplashUrl('1528360983277-13d401cdc186'), // candles and herbs spa
      unsplashUrl('1493926338654-2e31f06dd329'), // botanical dried flowers
      unsplashUrl('1560343776-97da84e29ef3'), // essential oil drops
      unsplashUrl('1620912189865-1e8a33da4949'), // spa botanicals flat lay
      unsplashUrl('1595351475754-8a3de3e19e53'), // scent ritual oils
      unsplashUrl('1597482620948-a20b3f9b5f85'), // lavender and oils
      unsplashUrl('1558618666-fcd25c85cd64'), // rose petals essential oil
      unsplashUrl('1542838132-92c53300491e'), // herbal plants greenhouse
      unsplashUrl('1465146344425-f00d5f5c8f07'), // wildflower meadow warm
    ],
    section: [
      sectionUrl('1571781565322-c0c2c51f3a55'),
      sectionUrl('1528360983277-13d401cdc186'),
      sectionUrl('1493926338654-2e31f06dd329'),
      sectionUrl('1542838132-92c53300491e'),
      sectionUrl('1465146344425-f00d5f5c8f07'),
      sectionUrl('1544947950-fa07a98d237f'),
      sectionUrl('1620912189865-1e8a33da4949'),
      sectionUrl('1558618666-fcd25c85cd64'),
    ],
    portrait: [
      portraitUrl('1598452963314-b09f397a5c48'), // practitioner portrait warm
      portraitUrl('1571781565322-c0c2c51f3a55'),
      portraitUrl('1528360983277-13d401cdc186'),
      portraitUrl('1493926338654-2e31f06dd329'),
    ],
  },

  holistic_medicine: {
    hero: [
      unsplashUrl('1506905925346-21bda4d32df4'), // mountain lake serene
      unsplashUrl('1512290923902-8a9f81dc236c'), // herbs on wooden table
      unsplashUrl('1515377905703-c4788e51af15'), // plants window light
      unsplashUrl('1544367567-0f2fcb009e0b'), // forest path healing
      unsplashUrl('1531901599143-df5010ab9438'), // meditation nature
      unsplashUrl('1495774538485-5a8b57a26e41'), // herbal tea warm
      unsplashUrl('1508179719682-dbc62681c355'), // calm water ripple
      unsplashUrl('1506126613408-eca07ce68773'), // meditation beach sunrise
      unsplashUrl('1472745433479-4556f54be559'), // healing herbs collection
      unsplashUrl('1501854140801-50d01698950b'), // green nature path
      unsplashUrl('1519125323398-675f0ddb6308'), // warm sunrise forest
      unsplashUrl('1441974231531-c6227db76b6e'), // peaceful woodland
    ],
    section: [
      sectionUrl('1512290923902-8a9f81dc236c'),
      sectionUrl('1515377905703-c4788e51af15'),
      sectionUrl('1495774538485-5a8b57a26e41'),
      sectionUrl('1506126613408-eca07ce68773'),
      sectionUrl('1472745433479-4556f54be559'),
      sectionUrl('1441974231531-c6227db76b6e'),
      sectionUrl('1531901599143-df5010ab9438'),
      sectionUrl('1508179719682-dbc62681c355'),
    ],
    portrait: [
      portraitUrl('1512290923902-8a9f81dc236c'),
      portraitUrl('1515377905703-c4788e51af15'),
      portraitUrl('1495774538485-5a8b57a26e41'),
      portraitUrl('1531901599143-df5010ab9438'),
    ],
  },

  private_practice_therapist: {
    hero: [
      unsplashUrl('1551818255-e6e10975bc17'), // calm window morning light
      unsplashUrl('1584438784894-089d6a62b8fa'), // peaceful therapy room
      unsplashUrl('1506905925346-21bda4d32df4'), // serene lake calm
      unsplashUrl('1481627834876-b7833e8f5570'), // soft books and light
      unsplashUrl('1531901599143-df5010ab9438'), // meditation nature path
      unsplashUrl('1544367567-0f2fcb009e0b'), // peaceful forest walk
      unsplashUrl('1519125323398-675f0ddb6308'), // soft warm sunrise
      unsplashUrl('1441974231531-c6227db76b6e'), // gentle woodland
      unsplashUrl('1499028344343-cd173ffc68a3'), // warm calm interior
      unsplashUrl('1491897895223-198aa80d9abb'), // cozy reading corner
      unsplashUrl('1490818387583-1baba5e638af'), // calm nature flowers
      unsplashUrl('1465146344425-f00d5f5c8f07'), // meadow light serene
    ],
    section: [
      sectionUrl('1551818255-e6e10975bc17'),
      sectionUrl('1481627834876-b7833e8f5570'),
      sectionUrl('1544367567-0f2fcb009e0b'),
      sectionUrl('1519125323398-675f0ddb6308'),
      sectionUrl('1499028344343-cd173ffc68a3'),
      sectionUrl('1490818387583-1baba5e638af'),
      sectionUrl('1491897895223-198aa80d9abb'),
      sectionUrl('1465146344425-f00d5f5c8f07'),
    ],
    portrait: [
      portraitUrl('1551818255-e6e10975bc17'),
      portraitUrl('1499028344343-cd173ffc68a3'),
      portraitUrl('1481627834876-b7833e8f5570'),
      portraitUrl('1491897895223-198aa80d9abb'),
    ],
  },

  sound_bath: {
    hero: [
      unsplashUrl('1545389336-cf090694435e'), // tibetan singing bowls
      unsplashUrl('1506905925346-21bda4d32df4'), // mountain serenity
      unsplashUrl('1508179719682-dbc62681c355'), // water ripple sound
      unsplashUrl('1519125323398-675f0ddb6308'), // sunrise glow warm
      unsplashUrl('1531901599143-df5010ab9438'), // meditative nature
      unsplashUrl('1544161515-4ab6ce6db874'), // crystals light refraction
      unsplashUrl('1506126613408-eca07ce68773'), // meditation sunrise
      unsplashUrl('1477959858617-67f85cf4f1df'), // city calm lights bokeh
      unsplashUrl('1504701954957-2010ec3bcec1'), // peaceful candlelight
      unsplashUrl('1465146344425-f00d5f5c8f07'), // meadow light peaceful
      unsplashUrl('1441974231531-c6227db76b6e'), // forest soft light
      unsplashUrl('1501854140801-50d01698950b'), // nature green healing
    ],
    section: [
      sectionUrl('1545389336-cf090694435e'),
      sectionUrl('1508179719682-dbc62681c355'),
      sectionUrl('1544161515-4ab6ce6db874'),
      sectionUrl('1506126613408-eca07ce68773'),
      sectionUrl('1504701954957-2010ec3bcec1'),
      sectionUrl('1465146344425-f00d5f5c8f07'),
      sectionUrl('1441974231531-c6227db76b6e'),
      sectionUrl('1519125323398-675f0ddb6308'),
    ],
    portrait: [
      portraitUrl('1545389336-cf090694435e'),
      portraitUrl('1544161515-4ab6ce6db874'),
      portraitUrl('1504701954957-2010ec3bcec1'),
      portraitUrl('1508179719682-dbc62681c355'),
    ],
  },

  wellness_coach: {
    hero: [
      unsplashUrl('1476480862126-209bfaa8edc8'), // running trail nature
      unsplashUrl('1518611012118-696072aa579a'), // yoga outdoor sunrise
      unsplashUrl('1571019614242-c5c5dee9f50b'), // outdoor fitness morning
      unsplashUrl('1434682881908-b43d0467b798'), // hiking summit motivation
      unsplashUrl('1526506118085-60ce8714f8c5'), // group yoga outdoor
      unsplashUrl('1514672013381-7b09ce28aab9'), // morning sunrise health
      unsplashUrl('1519125323398-675f0ddb6308'), // sunrise motivation
      unsplashUrl('1506905925346-21bda4d32df4'), // mountain peak success
      unsplashUrl('1501854140801-50d01698950b'), // green nature vitality
      unsplashUrl('1559963110-71b394e2d507'), // active lifestyle strength
      unsplashUrl('1544367567-0f2fcb009e0b'), // trail walk nature energy
      unsplashUrl('1465146344425-f00d5f5c8f07'), // open field freedom
    ],
    section: [
      sectionUrl('1476480862126-209bfaa8edc8'),
      sectionUrl('1518611012118-696072aa579a'),
      sectionUrl('1434682881908-b43d0467b798'),
      sectionUrl('1526506118085-60ce8714f8c5'),
      sectionUrl('1514672013381-7b09ce28aab9'),
      sectionUrl('1501854140801-50d01698950b'),
      sectionUrl('1559963110-71b394e2d507'),
      sectionUrl('1465146344425-f00d5f5c8f07'),
    ],
    portrait: [
      portraitUrl('1518611012118-696072aa579a'),
      portraitUrl('1526506118085-60ce8714f8c5'),
      portraitUrl('1476480862126-209bfaa8edc8'),
      portraitUrl('1559963110-71b394e2d507'),
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
