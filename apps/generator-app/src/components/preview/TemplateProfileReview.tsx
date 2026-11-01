'use client'

import { useId } from 'react'
import { profileFieldLabel, type ProfileField, type ProfileIssue } from '@/lib/template-profile-review'

export function TemplateProfileReview({ fields, values, issues, onChange }: {
  fields: ProfileField[]
  values: Record<string, string>
  issues: ProfileIssue[]
  onChange: (name: string, value: string) => void
}) {
  return <div className="mt-5">
    <p className="text-sm text-slate-300">This design uses the following details in its text and contact links. Complete them, then review the updated preview. You can also keep exploring to choose another design.</p>
    <div className="mt-4 grid gap-4 sm:grid-cols-2">
      {fields.map((field) => <ProfileInput key={field.name} field={field} value={values[field.name] || ''}
        issue={issues.find((issue) => issue.name === field.name)?.message}
        onChange={(value) => onChange(field.name, value)} />)}
    </div>
  </div>
}

function ProfileInput({ field, value, issue, onChange }: {
  field: ProfileField
  value: string
  issue?: string
  onChange: (value: string) => void
}) {
  const id = useId()
  // URL values may be a supported relative page path, so native URL validation
  // would disagree with the renderer. The shared review validates on submit.
  const type = field.type === 'tel' ? 'tel' : field.type === 'email' ? 'email' : 'text'
  return <div>
    <label htmlFor={id} className="mb-2 block text-sm font-semibold text-slate-200">{profileFieldLabel(field)} <span aria-hidden="true">*</span></label>
    <input id={id} name={field.name} type={type} required autoComplete="off" maxLength={5000} value={value}
      onChange={(event) => onChange(event.target.value)} aria-invalid={Boolean(issue)}
      aria-describedby={issue ? `${id}-error` : undefined}
      className="w-full rounded-lg border border-white/20 bg-white/10 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-cyan-400" />
    {issue && <p id={`${id}-error`} role="alert" className="mt-1 text-sm text-red-400">{issue}</p>}
  </div>
}
