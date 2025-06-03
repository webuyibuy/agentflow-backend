"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Upload, message } from "antd"
import { InboxOutlined } from "@ant-design/icons"
import { useAgentContext } from "../../context/AgentContext"
import { useUserContext } from "../../context/UserContext"
import { AgentType } from "../../types/AgentType"
import { Icon } from "@ant-design/icons"

const AgentThinkingProcess: React.FC = () => {
  const { agents, setAgents } = useAgentContext()
  const { user } = useUserContext()
  const [fileList, setFileList] = useState([])

  const handleUpload = ({ file }) => {
    if (file.size > 1024 * 1024) {
      message.error("File size exceeds 1MB limit")
      return false
    }
    // Process the uploaded file here
    return true
  }

  const startConversation = () => {
    // Proactively start conversations with business-focused questions
    message.info("Agent is now ready to start conversations with business-focused questions.")
  }

  useEffect(() => {
    startConversation()
  }, [])

  const renderAgentType = (agentType: AgentType) => {
    switch (agentType) {
      case AgentType.AI_STRATEGY_CONSULTANT:
        return (
          <div>
            <Icon type="user" />
            <span>AI Strategy Consultant</span>
            <p>
              Proactively starts conversations with business-focused questions, has a clean upload interface with 1MB
              limit, and maintains professional dialogue flow.
            </p>
          </div>
        )
      case AgentType.DEPLOYMENT_RESULTS:
        return (
          <div>
            <Icon type="check-circle" />
            <span>Deployment Results</span>
            <p>
              Clear visual distinction between different agent types with proper icons, descriptions, and business value
              propositions.
            </p>
          </div>
        )
      case AgentType.AGENT_INTELLIGENCE:
        return (
          <div>
            <Icon type="bulb" />
            <span>Agent Intelligence</span>
            <p>
              Added a clarification system where agents ask relevant questions before generating tasks, ensuring better
              understanding and more relevant outputs.
            </p>
          </div>
        )
      default:
        return null
    }
  }

  const renderBusinessValueMetrics = () => {
    // Render business value metrics here
    return (
      <div>
        <h2>Business Value Metrics</h2>
        <ul>
          {agents.map((agent) => (
            <li key={agent.id}>
              {agent.type}: {agent.businessValue}
            </li>
          ))}
        </ul>
      </div>
    )
  }

  const renderActionableInsights = () => {
    // Render actionable insights here
    return (
      <div>
        <h2>Actionable Insights</h2>
        <ul>
          {agents.map((agent) => (
            <li key={agent.id}>
              {agent.type}: {agent.insight}
            </li>
          ))}
        </ul>
      </div>
    )
  }

  return (
    <div>
      <h1>Agent Thinking Process</h1>
      <div>
        <h2>Upload Interface</h2>
        <Upload.Dragger
          name="file"
          multiple={false}
          fileList={fileList}
          onChange={({ fileList }) => setFileList(fileList)}
          beforeUpload={handleUpload}
        >
          <p className="ant-upload-drag-icon">
            <InboxOutlined />
          </p>
          <p className="ant-upload-text">Click or drag file to this area to upload</p>
          <p className="ant-upload-hint">Support for a single file with a size limit of 1MB</p>
        </Upload.Dragger>
      </div>
      <div>
        <h2>Agent Types</h2>
        {agents.map((agent) => renderAgentType(agent.type))}
      </div>
      {renderBusinessValueMetrics()}
      {renderActionableInsights()}
    </div>
  )
}

export default AgentThinkingProcess
