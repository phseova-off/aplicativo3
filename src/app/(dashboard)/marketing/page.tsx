import { redirect } from 'next/navigation'

// The main marketing feature lives at /marketing/cronograma
export default function MarketingPage() {
  redirect('/marketing/cronograma')
}
