import { createServerClient, type CookieOptions } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // Check if we have Supabase configuration
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    console.log("🔄 Middleware: Supabase not configured, allowing access")
    return response
  }

  try {
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: "",
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value: "",
            ...options,
          })
        },
      },
    })

    // Check if user is authenticated
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession()

    if (error) {
      console.error("Middleware auth error:", error.message)
      // Redirect to login on auth error
      return NextResponse.redirect(new URL("/login", request.url))
    }

    // If no session and trying to access protected routes, redirect to login
    if (
      !session &&
      (request.nextUrl.pathname.startsWith("/dashboard") ||
        request.nextUrl.pathname.startsWith("/onboarding") ||
        request.nextUrl.pathname.startsWith("/admin"))
    ) {
      console.log("Middleware: No session, redirecting to login")
      return NextResponse.redirect(new URL("/login", request.url))
    }

    // If authenticated and trying to access login/auth pages, redirect to dashboard
    if (
      session &&
      (request.nextUrl.pathname === "/login" ||
        request.nextUrl.pathname === "/" ||
        request.nextUrl.pathname.startsWith("/auth"))
    ) {
      console.log("Middleware: Authenticated user accessing auth pages, redirecting to dashboard")
      return NextResponse.redirect(new URL("/dashboard", request.url))
    }

    return response
  } catch (error) {
    console.error("Middleware error:", error)
    // On any error, allow the request to proceed
    return response
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
