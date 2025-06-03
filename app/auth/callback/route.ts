import type { EmailOtpType } from "@supabase/supabase-js"
import { type NextRequest, NextResponse } from "next/server"
import { getSupabaseFromServer, getSupabaseAdmin } from "@/lib/supabase/server" // Using server client

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token_hash = searchParams.get("token_hash")
  const type = searchParams.get("type") as EmailOtpType | null
  const next = searchParams.get("next") ?? "/dashboard" // Default redirect to dashboard

  const redirectTo = request.nextUrl.clone()
  redirectTo.pathname = "/login" // Redirect to login on error
  redirectTo.searchParams.delete("token_hash")
  redirectTo.searchParams.delete("type")

  if (token_hash && type) {
    const supabase = getSupabaseFromServer() // Use the version that can set cookies via Route Handler
    const { error, data } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    })

    if (!error && data.session && data.user) {
      // User is verified, session is created.
      // Now, ensure a profile exists.
      const adminSupabase = getSupabaseAdmin() // Use admin client to interact with profiles table
      const { error: profileError } = await adminSupabase.from("profiles").upsert(
        { id: data.user.id, updated_at: new Date().toISOString() },
        { onConflict: "id", ignoreDuplicates: false }, // Ensure updated_at is set even if profile exists
      )

      if (profileError) {
        console.error("Error ensuring profile exists:", profileError)
        redirectTo.searchParams.set("message", "Could not process your sign-in. Profile error.")
        return NextResponse.redirect(redirectTo)
      }

      // Check if display_name is set.
      const { data: profileData, error: getProfileError } = await adminSupabase
        .from("profiles")
        .select("display_name")
        .eq("id", data.user.id)
        .single()

      if (getProfileError && getProfileError.code !== "PGRST116") {
        // PGRST116: "Searched item was not found" - should not happen after upsert
        console.error("Error fetching profile after upsert:", getProfileError)
        // Fallback to dashboard, but ideally handle this more gracefully
        redirectTo.searchParams.set("message", "Error fetching your profile information.")
        return NextResponse.redirect(redirectTo)
      }

      if (!profileData?.display_name) {
        // User needs to set their display name
        redirectTo.pathname = "/onboarding/name"
        // Preserve the original 'next' destination if it was something other than default dashboard
        // This way, after onboarding, they can be sent to their originally intended page.
        if (next && next !== "/dashboard") {
          redirectTo.searchParams.set("onboarding_next", next)
        }
      } else {
        // User has a display name, proceed to original 'next' or dashboard
        redirectTo.pathname = next
      }

      redirectTo.searchParams.delete("next") // Clean up the 'next' param if it was the default /dashboard
      return NextResponse.redirect(redirectTo)
    } else if (error) {
      console.error("OTP Verification Error:", error.message)
      redirectTo.searchParams.set("message", `Error verifying magic link: ${error.message}`)
    } else {
      redirectTo.searchParams.set("message", "Could not verify magic link. Session or user data missing.")
    }
  } else {
    redirectTo.searchParams.set("message", "Invalid magic link. Token or type missing.")
  }

  // return the user to an error page with some instructions
  return NextResponse.redirect(redirectTo)
}
