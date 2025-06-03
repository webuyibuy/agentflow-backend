import { Suspense } from "react"
import AdminDashboard from "@/components/admin-dashboard"
import { Loader2 } from "lucide-react"

export default function AdminPage() {
  return (
    <div className="container mx-auto py-8">
      <Suspense
        fallback={
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2">Loading admin dashboard...</span>
          </div>
        }
      >
        <AdminDashboard />
      </Suspense>
    </div>
  )
}
