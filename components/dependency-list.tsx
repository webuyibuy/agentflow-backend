"use client"

import type React from "react"
import { useState, useEffect } from "react"

interface Task {
  id: string
  name: string
  dependencies: string[]
}

interface DependencyListProps {
  tasks: Task[]
  onTaskComplete: (taskId: string) => void
}

const DependencyList: React.FC<DependencyListProps> = ({ tasks, onTaskComplete }) => {
  const [completionStates, setCompletionStates] = useState<{ [taskId: string]: boolean }>({})

  useEffect(() => {
    // Initialize completion states based on local storage or default to false
    const initialCompletionStates: { [taskId: string]: boolean } = {}
    tasks.forEach((task) => {
      const storedState = localStorage.getItem(`taskCompletion_${task.id}`)
      initialCompletionStates[task.id] = storedState === "true" || false
    })
    setCompletionStates(initialCompletionStates)
  }, [tasks])

  const handleMarkComplete = (taskId: string) => {
    const newCompletionState = !completionStates[taskId]
    setCompletionStates({ ...completionStates, [taskId]: newCompletionState })
    localStorage.setItem(`taskCompletion_${taskId}`, String(newCompletionState))
    onTaskComplete(taskId)
  }

  return (
    <div>
      {tasks.map((task) => (
        <TaskCard
          key={task.id}
          task={task}
          onComplete={handleMarkComplete}
          completionState={completionStates[task.id]}
        />
      ))}
    </div>
  )
}

interface TaskCardProps {
  task: Task
  onComplete: (taskId: string) => void
  completionState: boolean
}

const TaskCard: React.FC<TaskCardProps> = ({ task, onComplete, completionState }) => {
  return (
    <div style={{ border: "1px solid #ccc", padding: "10px", margin: "5px" }}>
      <h3>{task.name}</h3>
      <p>Dependencies: {task.dependencies.join(", ") || "None"}</p>
      <button onClick={() => onComplete(task.id)} disabled={completionState}>
        {completionState ? "Completed" : "Mark Complete"}
      </button>
    </div>
  )
}

export default DependencyList
