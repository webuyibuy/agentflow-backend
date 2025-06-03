"use client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge as ShadBadge } from "@/components/ui/badge"
import { type Badge as UserBadgeType } from "@/lib/gamification-types"
import { badges as allBadgesConfig, getNextBadge } from "@/lib/gamification-client"
import { Check, Lock, Star } from "lucide-react"
import { Progress } from "@/components/ui/progress"

interface BadgeShowcaseProps {
  currentXp: number
  earnedBadges: UserBadgeType[]
}

export default function BadgeShowcase({ currentXp = 0, earnedBadges = [] }: BadgeShowcaseProps) {
  // Ensure we have valid badge configuration
  if (!allBadgesConfig || !Array.isArray(allBadgesConfig) || allBadgesConfig.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Your Badges & Achievements</CardTitle>
          <CardDescription>Badge system is currently unavailable.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Unable to load badge information at this time.</p>
        </CardContent>
      </Card>
    )
  }

  const earnedBadgeNames = earnedBadges.map((b) => b.name)
  const nextBadgeToEarn = getNextBadge(currentXp)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Badges & Achievements</CardTitle>
        <CardDescription>Track your progress and see what you can unlock next. Current XP: {currentXp}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {allBadgesConfig
          .slice() // Create a copy to sort
          .sort((a, b) => a.threshold - b.threshold) // Display from lowest to highest threshold
          .map((badge) => {
            const isEarned = earnedBadgeNames.includes(badge.name)
            const BadgeIcon = badge.icon
            let progressToThisBadge = 0
            let xpNeededForThis = badge.threshold
            let xpCurrentlyTowardsThis = currentXp

            if (!isEarned) {
              // Find the previous badge to calculate progress from that point
              const sortedBadges = [...allBadgesConfig].sort((a, b) => a.threshold - b.threshold)
              const currentBadgeIndex = sortedBadges.findIndex((b) => b.threshold === badge.threshold)
              const previousBadge = currentBadgeIndex > 0 ? sortedBadges[currentBadgeIndex - 1] : null

              const startingXpForThisBadge = previousBadge ? previousBadge.threshold : 0
              xpCurrentlyTowardsThis = Math.max(0, currentXp - startingXpForThisBadge)
              xpNeededForThis = badge.threshold - startingXpForThisBadge
              progressToThisBadge = xpNeededForThis > 0 ? (xpCurrentlyTowardsThis / xpNeededForThis) * 100 : 0
              if (progressToThisBadge < 0) progressToThisBadge = 0
              if (progressToThisBadge > 100) progressToThisBadge = 100
            }

            return (
              <div
                key={badge.name}
                className={`p-4 border rounded-lg flex items-center gap-4 transition-all duration-300 ${
                  isEarned
                    ? "bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-700"
                    : "bg-gray-50 dark:bg-gray-800/50"
                }`}
              >
                <div
                  className={`p-2 rounded-full ${
                    isEarned ? badge.colorClasses.split(" ")[0] : "bg-gray-200 dark:bg-gray-700"
                  }`}
                >
                  <BadgeIcon
                    className={`h-8 w-8 ${
                      isEarned ? badge.colorClasses.split(" ")[1] : "text-gray-500 dark:text-gray-400"
                    }`}
                  />
                </div>
                <div className="flex-grow">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">{badge.name}</h3>
                    {isEarned ? (
                      <ShadBadge variant="outline" className={badge.colorClasses}>
                        <Check className="mr-1.5 h-4 w-4" /> Earned
                      </ShadBadge>
                    ) : (
                      <ShadBadge variant="outline">
                        <Lock className="mr-1.5 h-4 w-4" /> Locked
                      </ShadBadge>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{badge.description}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-500">Requires: {badge.threshold} XP</p>
                  {!isEarned && (
                    <div className="mt-2">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-muted-foreground">Progress</span>
                        <span className="font-medium">
                          {Math.max(0, xpCurrentlyTowardsThis)} / {xpNeededForThis} XP
                        </span>
                      </div>
                      <Progress value={progressToThisBadge} className="h-1.5" />
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        {earnedBadges.length === allBadgesConfig.length && (
          <div className="text-center py-4">
            <Star className="h-10 w-10 text-yellow-400 mx-auto mb-2" />
            <p className="font-semibold text-lg text-green-600 dark:text-green-400">
              Congratulations! You've earned all available badges!
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
