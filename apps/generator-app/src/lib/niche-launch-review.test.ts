import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { NicheLaunchReview } from '@/components/preview/NicheLaunchReview'
import { getLaunchReviewPages, getNicheLaunchReview } from './niche-launch-review'

describe('practice-specific manual launch review', () => {
  it.each([
    ['private_practice_therapist', ['insurance', 'online visits', 'first session']],
    ['sound_bath', ['bring', 'access', 'sound environment']],
    ['wellness_coach', ['individual or group', 'frequency', 'minimum commitment']],
    ['holistic_medicine', ['methods', 'qualifications', 'first visit']],
    ['aromatherapy', ['ingredients', 'scent sensitivities', 'products']],
  ])('answers practical visitor questions for %s', (niche, expectedTopics) => {
    const review = getNicheLaunchReview(niche as string)
    const text = review.questions.map(({ question, action }) => `${question} ${action}`).join(' ').toLowerCase()
    expect(review.questions).toHaveLength(3)
    for (const topic of expectedTopics) expect(text).toContain(topic)
  })

  it.each([undefined, '', 'retired_niche', '__proto__', 'constructor'])(
    'falls back to useful general guidance for an unavailable practice type: %s',
    (niche) => {
      const review = getNicheLaunchReview(niche)
      expect(review.practiceLabel).toBe('your practice')
      expect(review.questions.some(({ action }) => action.includes('fees'))).toBe(true)
    },
  )
})

describe('preview page shortcuts', () => {
  it('offers only safe, declared pages and preserves nested paths', () => {
    const result = getLaunchReviewPages([
      'index.html', 'pages/about.html', 'services.html', 'contact.html',
      '../contact.html', 'https://example.com/contact.html', 'contact.html?send=1',
      '/contact.html', 'javascript:contact.html', 'booking.html',
    ])
    expect(result).toEqual([
      { page: 'index.html', label: 'Homepage' },
      { page: 'pages/about.html', label: 'About' },
      { page: 'services.html', label: 'Services' },
      { page: 'contact.html', label: 'Contact' },
    ])
  })

  it('does not invent contact or booking capabilities when pages are absent', () => {
    expect(getLaunchReviewPages()).toEqual([])
    expect(getLaunchReviewPages(['services.html'])).toEqual([{ page: 'services.html', label: 'Services' }])
  })

  it('does not mistake a nested index for the homepage or produce duplicate shortcuts', () => {
    expect(getLaunchReviewPages(['contact/index.html', 'index.html', 'index.html', 'Contact.html', 'pages/contact.html']))
      .toEqual([{ page: 'index.html', label: 'Homepage' }, { page: 'Contact.html', label: 'Contact' }])
  })
})

describe('manual review presentation', () => {
  it('keeps manual checks separate from completeness and uses a native keyboard-accessible disclosure', () => {
    const markup = renderToStaticMarkup(createElement(NicheLaunchReview, { niche: 'sound_bath' }))
    expect(markup).toContain('<details')
    expect(markup).toContain('<summary')
    expect(markup).toContain('5 manual checks for sound bath practices')
    expect(markup).toContain('separate from your details-completeness percentage')
    expect(markup).toContain('The preview cannot confirm message delivery or a live booking')
    expect(markup).toContain('If you use a form')
    expect(markup).toContain('If you connect a booking provider')
    expect(markup).toContain('test mode')
    expect(markup).not.toContain('type="checkbox"')
    expect(markup).not.toContain('passed')
  })

  it('shows actionable page buttons only when navigation and a declared destination are available', () => {
    const props = { niche: 'private_practice_therapist', previewPages: ['contact.html'] }
    const readOnly = renderToStaticMarkup(createElement(NicheLaunchReview, props))
    expect(readOnly).not.toContain('<button')
    const withNavigation = renderToStaticMarkup(createElement(NicheLaunchReview, { ...props, onPreviewPage: () => {} }))
    expect(withNavigation).toContain('aria-label="Open contact in preview"')
    expect(withNavigation).not.toContain('Open services in preview')
    expect(withNavigation).toContain('href="/wellness-website-checklist"')
  })
})
