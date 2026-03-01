import { NextResponse } from 'next/server'
import { COLOR_SCHEMES, FONT_VARIATIONS, STRUCTURE_VARIATIONS } from '@/lib/templates/variations'

export async function GET() {
  return NextResponse.json({
    colorSchemes: COLOR_SCHEMES.map(({ id, name }) => ({ id, name })),
    fontVariations: FONT_VARIATIONS.map(({ id, name }) => ({ id, name })),
    structureVariations: STRUCTURE_VARIATIONS.map(({ id, name }) => ({ id, name })),
  })
}
