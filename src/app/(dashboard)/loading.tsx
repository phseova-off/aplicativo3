import { PageLoader } from '@/shared/components/ui/LoadingSpinner'

export default function DashboardLoading() {
  return (
    <div className="flex h-[60vh] w-full items-center justify-center">
      <PageLoader />
    </div>
  )
}
