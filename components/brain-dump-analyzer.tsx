"use client"

import type React from "react"
import { useState } from "react"
import { Loader2 } from "lucide-react"

interface BrainDumpAnalyzerProps {
  onAnalysisComplete: (data: any) => void
}

const BrainDumpAnalyzer: React.FC<BrainDumpAnalyzerProps> = ({ onAnalysisComplete }) => {
  const [brainDumpText, setBrainDumpText] = useState("")
  const [analysisError, setAnalysisError] = useState<string | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  const handleTextChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setBrainDumpText(event.target.value)
  }

  const processBrainDump = async (text: string) => {
    // Simulate an API call or complex processing
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        try {
          // Simulate parsing the brain dump text
          const lines = text.split("\n")
          const parsedData = {
            applicationName:
              lines
                .find((line) => line.startsWith("Application:"))
                ?.split(":")[1]
                ?.trim() || "",
            databaseHost:
              lines
                .find((line) => line.startsWith("Database Host:"))
                ?.split(":")[1]
                ?.trim() || "",
            databasePort:
              lines
                .find((line) => line.startsWith("Database Port:"))
                ?.split(":")[1]
                ?.trim() || "",
            databaseName:
              lines
                .find((line) => line.startsWith("Database Name:"))
                ?.split(":")[1]
                ?.trim() || "",
            databaseUser:
              lines
                .find((line) => line.startsWith("Database User:"))
                ?.split(":")[1]
                ?.trim() || "",
          }

          if (
            !parsedData.applicationName ||
            !parsedData.databaseHost ||
            !parsedData.databasePort ||
            !parsedData.databaseName ||
            !parsedData.databaseUser
          ) {
            reject(
              new Error(
                "Could not parse all required fields from the brain dump. Please ensure the format is correct.",
              ),
            )
            return
          }

          resolve(parsedData)
        } catch (error: any) {
          reject(new Error("Error parsing brain dump: " + error.message))
        }
      }, 1000) // Simulate processing time
    })
  }

  const handleAnalyze = async () => {
    setAnalysisError(null)
    setIsAnalyzing(true)

    try {
      const result = await processBrainDump(brainDumpText)
      console.log("Analysis Result:", result)
      onAnalysisComplete(result)
      alert("Document analyzed. Results have populated the Manual Setup form for your review.")
    } catch (error: any) {
      console.error("Analysis Error:", error)
      setAnalysisError(error.message)
    } finally {
      setIsAnalyzing(false)
    }
  }

  return (
    <div>
      <textarea
        value={brainDumpText}
        onChange={handleTextChange}
        placeholder="Paste your brain dump here..."
        rows={10}
        cols={50}
        disabled={isAnalyzing}
      />
      <br />
      <button onClick={handleAnalyze} disabled={isAnalyzing}>
        {isAnalyzing ? (
          <>
            Analyzing... <Loader2 className="inline-block animate-spin" size={16} />
          </>
        ) : (
          "Analyze Document"
        )}
      </button>
      {analysisError && <div style={{ color: "red", marginTop: "10px" }}>Error: {analysisError}</div>}
    </div>
  )
}

export default BrainDumpAnalyzer
