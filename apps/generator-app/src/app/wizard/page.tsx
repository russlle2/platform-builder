import { redirect } from 'next/navigation'

/** Legacy HVAC-only wizard — use Preview Your Business instead */
export default function WizardRedirectPage() {
  redirect('/preview-your-business')
}
