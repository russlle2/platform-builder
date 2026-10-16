import type { AnchorHTMLAttributes } from 'react'

// The fixture exercises the real showcase while keeping Next's router out of
// this isolated browser mount. Navigation destinations are ordinary anchors.
export default function Link(props: AnchorHTMLAttributes<HTMLAnchorElement>) {
  return <a {...props} />
}
