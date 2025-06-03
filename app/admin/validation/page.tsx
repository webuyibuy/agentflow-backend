import BusinessLogicTester from "@/components/business-logic-tester"

export default function ValidationPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Business Logic Validation</h1>
        <p className="text-gray-600 mt-2">Comprehensive testing suite for all application functionalities</p>
      </div>

      <BusinessLogicTester />
    </div>
  )
}
