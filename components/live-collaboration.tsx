"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Users, Eye, Edit, MessageCircle } from "lucide-react"

interface ActiveUser {
  user_id: string
  user_email: string
  user_name: string
  page: string
  action: "viewing" | "editing"
  last_seen: string
}

interface LiveComment {
  id: string
  user_id: string
  user_name: string
  content: string
  resource_type: string
  resource_id: string
  created_at: string
}

export function LiveCollaboration({ resourceType, resourceId }: { resourceType: string; resourceId: string }) {
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([])
  const [liveComments, setLiveComments] = useState<LiveComment[]>([])
  const [newComment, setNewComment] = useState("")
  const supabase = createClient()

  useEffect(() => {
    // Subscribe to active users
    const usersChannel = supabase
      .channel(`active-users-${resourceType}-${resourceId}`)
      .on("presence", { event: "sync" }, () => {
        const state = usersChannel.presenceState()
        const users = Object.values(state).flat() as ActiveUser[]
        setActiveUsers(users)
      })
      .subscribe()

    // Subscribe to live comments
    const commentsChannel = supabase
      .channel(`comments-${resourceType}-${resourceId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "live_comments",
          filter: `resource_type=eq.${resourceType},resource_id=eq.${resourceId}`,
        },
        (payload) => {
          setLiveComments((prev) => [payload.new as LiveComment, ...prev])
        },
      )
      .subscribe()

    // Track user presence
    usersChannel.track({
      user_id: "current-user-id",
      user_email: "user@example.com",
      user_name: "Current User",
      page: `${resourceType}/${resourceId}`,
      action: "viewing",
      last_seen: new Date().toISOString(),
    })

    return () => {
      supabase.removeChannel(usersChannel)
      supabase.removeChannel(commentsChannel)
    }
  }, [resourceType, resourceId])

  const addComment = async () => {
    if (!newComment.trim()) return

    const { error } = await supabase.from("live_comments").insert({
      user_id: "current-user-id",
      user_name: "Current User",
      content: newComment,
      resource_type: resourceType,
      resource_id: resourceId,
    })

    if (!error) {
      setNewComment("")
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Active Users ({activeUsers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {activeUsers.map((user) => (
              <div key={user.user_id} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                <Avatar className="h-6 w-6">
                  <AvatarFallback>{user.user_name.charAt(0)}</AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium">{user.user_name}</span>
                <Badge variant={user.action === "editing" ? "default" : "secondary"} className="text-xs">
                  {user.action === "editing" ? <Edit className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Live Comments
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment..."
                className="flex-1 px-3 py-2 border rounded-md"
                onKeyPress={(e) => e.key === "Enter" && addComment()}
              />
              <button onClick={addComment} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                Send
              </button>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto">
              {liveComments.map((comment) => (
                <div key={comment.id} className="flex gap-2 p-2 bg-gray-50 rounded-lg">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback>{comment.user_name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{comment.user_name}</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(comment.created_at).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-sm">{comment.content}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
