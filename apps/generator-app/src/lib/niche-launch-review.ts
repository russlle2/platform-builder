import { isSafePreviewPage } from '@/lib/template-preview-security'

export interface LaunchReviewQuestion {
  question: string
  action: string
}

export interface NicheLaunchReview {
  practiceLabel: string
  questions: readonly LaunchReviewQuestion[]
}

const REVIEWS = {
  private_practice_therapist: {
    practiceLabel: 'therapy practices',
    questions: [
      {
        question: 'What happens in a first session?',
        action: 'Explain who you work with, session length, and what a first conversation involves. Describe your approach in plain language without promising a particular outcome.',
      },
      {
        question: 'What are the fees and insurance arrangements?',
        action: 'State your fees or how to ask about them, whether you accept insurance or offer private-pay sessions, and your cancellation policy. Mention reimbursement paperwork only if you provide it.',
      },
      {
        question: 'Can I meet online, and where can you work with me?',
        action: 'If you offer online visits, explain how they work and which locations you can serve. Use your actual professional title and qualifications, and say how visitors can ask about access needs.',
      },
    ],
  },
  sound_bath: {
    practiceLabel: 'sound bath practices',
    questions: [
      {
        question: 'What should I expect and bring?',
        action: 'Describe the session length, group or private format, arrival time, and what participants should bring. Say whether mats, blankets, or other equipment are provided.',
      },
      {
        question: 'Can I participate comfortably?',
        action: 'Describe seating or lying-down options, step-free access where available, and the sound environment. Give visitors a way to ask about sensory or access needs before attending.',
      },
      {
        question: 'What does a session cost, and what if plans change?',
        action: 'Show your session price or a way to request it, how places are reserved, and your cancellation policy. Explain your facilitation experience without claiming medical effects.',
      },
    ],
  },
  wellness_coach: {
    practiceLabel: 'coaching practices',
    questions: [
      {
        question: 'Who is this coaching for?',
        action: 'Name the goals or situations you support and explain the scope of your coaching. Describe relevant training accurately and avoid guaranteed results or implying medical care you do not provide.',
      },
      {
        question: 'How does the coaching work?',
        action: 'Explain whether you offer individual or group sessions, online or in-person meetings, their length and frequency, and any support between sessions. List only formats you actually offer.',
      },
      {
        question: 'What am I committing to?',
        action: 'Describe the first conversation, fees or how to request them, what any package includes, and cancellation terms. State any minimum commitment before someone enquires.',
      },
    ],
  },
  holistic_medicine: {
    practiceLabel: 'holistic practices',
    questions: [
      {
        question: 'Which methods do you actually offer?',
        action: 'Name your methods and describe what happens during a visit in everyday language. Explain the scope of your services without presenting hoped-for benefits as established outcomes.',
      },
      {
        question: 'Who will I see, and what are their qualifications?',
        action: 'Give the practitioner’s name, accurate professional title, and relevant qualifications. Make it clear which services they are qualified to provide; include registration details only when applicable and current.',
      },
      {
        question: 'How do I prepare for the first visit?',
        action: 'Explain the visit length, format, fees or how to request them, and any preparation you actually require. Provide a way to ask private questions without putting health histories into a public enquiry form.',
      },
    ],
  },
  aromatherapy: {
    practiceLabel: 'aromatherapy practices',
    questions: [
      {
        question: 'What does an aromatherapy session involve?',
        action: 'Describe the methods and products you actually use, the session format, and its length. State your relevant training accurately without implying medical qualifications or guaranteed effects.',
      },
      {
        question: 'How can I ask about ingredients or scent sensitivities?',
        action: 'Explain how visitors can ask about ingredients, scent sensitivities, preferences, or access needs before a visit. Keep sensitive health details out of a public enquiry form.',
      },
      {
        question: 'What is included in the price?',
        action: 'State your fees or how to request them, whether any products are included, and your cancellation policy. Mention take-home products or follow-up only when you offer them.',
      },
    ],
  },
} satisfies Record<string, NicheLaunchReview>

const GENERAL_REVIEW: NicheLaunchReview = {
  practiceLabel: 'your practice',
  questions: [
    { question: 'Who do you help, and how?', action: 'Describe the services you actually offer and who they are for. Explain your approach without promising results.' },
    { question: 'What happens at the first appointment?', action: 'Explain the first appointment and fees, or how to ask about them, where relevant. Say whether meetings are online or in person and what preparation is needed.' },
    { question: 'What should someone know before enquiring?', action: 'Explain how to ask about access needs, where you can serve clients, and any cancellation or package terms that apply.' },
  ],
}

export function getNicheLaunchReview(niche?: string): NicheLaunchReview {
  return niche && Object.prototype.hasOwnProperty.call(REVIEWS, niche)
    ? REVIEWS[niche as keyof typeof REVIEWS]
    : GENERAL_REVIEW
}

/** Page names are navigation hints, not evidence of working forms or bookings. */
export function getLaunchReviewPages(pages: readonly string[] = []): { page: string; label: string }[] {
  const safePages = pages.filter(isSafePreviewPage)
  const destinations = [
    { label: 'Homepage', names: ['index.html'] },
    { label: 'About', names: ['about.html', 'about-us.html', 'team.html'] },
    { label: 'Services', names: ['services.html', 'programs.html'] },
    { label: 'Contact', names: ['contact.html', 'contact-us.html'] },
  ]
  return destinations.flatMap(({ label, names }) => {
    const page = safePages.find((candidate) => names.includes(
      label === 'Homepage' ? candidate.toLowerCase() : candidate.split('/').at(-1)!.toLowerCase(),
    ))
    return page ? [{ page, label }] : []
  })
}
