import { NextResponse } from "next/server"
import { ProductionDeploymentChecker } from "@/lib/production-deployment-checker"

export async function GET() {
  try {
    const checker = ProductionDeploymentChecker.getInstance()
    const report = await checker.performDeploymentChecks()

    return NextResponse.json({
      status: "ok",
      deployment: report,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        message: error instanceof Error ? error.message : "Health check failed",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}
