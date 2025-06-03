import { NextResponse } from "next/server"
import { BusinessLogicValidator } from "@/lib/business-logic-validator"

export async function GET() {
  try {
    const validator = new BusinessLogicValidator()
    const results = await validator.validateAll()
    const summary = validator.getSummary()

    return NextResponse.json({
      success: true,
      summary,
      results,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Business logic validation error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}
