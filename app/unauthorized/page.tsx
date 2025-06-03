import { Button } from "@/components/ui/button"
import { ShieldAlert, ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function UnauthorizedPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <div className="text-center max-w-md">
        <ShieldAlert className="h-16 w-16 text-red-500 mx-auto mb-6" />
        <h1 className="text-3xl font-bold mb-2">Access Denied</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          You don't have permission to access this page. Please contact your administrator if you believe this is an
          error.
        </p>
        <div className="flex justify-center">
          <Button asChild>
            <Link href="/dashboard">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Return to Dashboard
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
