import { redirect } from 'next/navigation'

/** Legacy HVAC niche URL — redirect to home */
export default function HvacRedirectPage() {
  redirect('/')
}
