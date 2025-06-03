"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Calculator, TrendingUp, DollarSign, Clock } from "lucide-react"

interface ROIInputs {
  employees: number
  avgSalary: number
  hoursPerWeek: number
  automationPercentage: number
  agentCostPerMonth: number
  implementationCost: number
}

interface ROIResults {
  annualSavings: number
  paybackPeriod: number
  roi: number
  productivityGain: number
  costReduction: number
}

export function ROICalculator() {
  const [inputs, setInputs] = useState<ROIInputs>({
    employees: 50,
    avgSalary: 75000,
    hoursPerWeek: 40,
    automationPercentage: 30,
    agentCostPerMonth: 500,
    implementationCost: 25000,
  })

  const calculateROI = (): ROIResults => {
    const hourlyRate = inputs.avgSalary / (52 * inputs.hoursPerWeek)
    const hoursAutomatedPerWeek = (inputs.hoursPerWeek * inputs.automationPercentage) / 100
    const weeklyLaborSavings = inputs.employees * hoursAutomatedPerWeek * hourlyRate
    const annualLaborSavings = weeklyLaborSavings * 52
    const annualAgentCost = inputs.agentCostPerMonth * 12
    const annualSavings = annualLaborSavings - annualAgentCost
    const totalInvestment = inputs.implementationCost + annualAgentCost
    const paybackPeriod = totalInvestment / (annualSavings / 12)
    const roi = ((annualSavings - inputs.implementationCost) / inputs.implementationCost) * 100
    const productivityGain = (hoursAutomatedPerWeek / inputs.hoursPerWeek) * 100
    const costReduction = (annualSavings / (inputs.employees * inputs.avgSalary)) * 100

    return {
      annualSavings,
      paybackPeriod,
      roi,
      productivityGain,
      costReduction,
    }
  }

  const results = calculateROI()

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            AgentFlow ROI Calculator
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="employees">Number of Employees</Label>
                <Input
                  id="employees"
                  type="number"
                  value={inputs.employees}
                  onChange={(e) => setInputs({ ...inputs, employees: Number.parseInt(e.target.value) || 0 })}
                />
              </div>

              <div>
                <Label htmlFor="avgSalary">Average Annual Salary ($)</Label>
                <Input
                  id="avgSalary"
                  type="number"
                  value={inputs.avgSalary}
                  onChange={(e) => setInputs({ ...inputs, avgSalary: Number.parseInt(e.target.value) || 0 })}
                />
              </div>

              <div>
                <Label htmlFor="hoursPerWeek">Hours per Week</Label>
                <Input
                  id="hoursPerWeek"
                  type="number"
                  value={inputs.hoursPerWeek}
                  onChange={(e) => setInputs({ ...inputs, hoursPerWeek: Number.parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <Label>Automation Percentage: {inputs.automationPercentage}%</Label>
                <Slider
                  value={[inputs.automationPercentage]}
                  onValueChange={(value) => setInputs({ ...inputs, automationPercentage: value[0] })}
                  max={100}
                  step={5}
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="agentCost">Agent Cost per Month ($)</Label>
                <Input
                  id="agentCost"
                  type="number"
                  value={inputs.agentCostPerMonth}
                  onChange={(e) => setInputs({ ...inputs, agentCostPerMonth: Number.parseInt(e.target.value) || 0 })}
                />
              </div>

              <div>
                <Label htmlFor="implementationCost">Implementation Cost ($)</Label>
                <Input
                  id="implementationCost"
                  type="number"
                  value={inputs.implementationCost}
                  onChange={(e) => setInputs({ ...inputs, implementationCost: Number.parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Annual Savings</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">${results.annualSavings.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Net savings per year</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Payback Period</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{results.paybackPeriod.toFixed(1)} months</div>
            <p className="text-xs text-muted-foreground">Time to break even</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">ROI</CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{results.roi.toFixed(0)}%</div>
            <p className="text-xs text-muted-foreground">Return on investment</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Productivity Gain</CardTitle>
            <TrendingUp className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{results.productivityGain.toFixed(0)}%</div>
            <p className="text-xs text-muted-foreground">Time savings per employee</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Business Impact Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <h4 className="font-semibold text-green-800 mb-2">Cost Savings</h4>
              <p className="text-sm text-green-700">
                By automating {inputs.automationPercentage}% of work for {inputs.employees} employees, you'll save
                approximately <strong>${results.annualSavings.toLocaleString()}</strong> annually in labor costs.
              </p>
            </div>

            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-semibold text-blue-800 mb-2">Time to Value</h4>
              <p className="text-sm text-blue-700">
                Your investment will pay for itself in <strong>{results.paybackPeriod.toFixed(1)} months</strong>, after
                which you'll see pure profit from the automation.
              </p>
            </div>

            <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
              <h4 className="font-semibold text-purple-800 mb-2">Productivity Boost</h4>
              <p className="text-sm text-purple-700">
                Each employee will gain{" "}
                <strong>{((inputs.hoursPerWeek * inputs.automationPercentage) / 100).toFixed(1)} hours per week</strong>
                to focus on higher-value activities, representing a {results.productivityGain.toFixed(0)}% productivity
                increase.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
