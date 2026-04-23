"use client"

import { useState, useEffect, useCallback } from "react"
import { redirect } from "next/navigation"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { formatCurrency } from "@/utils/formatters"
import { jsPDF } from "jspdf"
import autoTable from "jspdf-autotable"
import {
  BarChart3,
  TrendingUp,
  MapPin,
  Package,
  IndianRupee,
  FolderKanban,
  CheckCircle,
  Clock,
  Building2,
  Download,
  ChevronDown,
} from "lucide-react"
import { SpendByLocationChart } from "@/components/analytics/spend-by-location-chart"
import { StatusBreakdownChart } from "@/components/analytics/status-breakdown-chart"
import { MonthlyTrendChart } from "@/components/analytics/monthly-trend-chart"
import { TopCollateralsChart } from "@/components/analytics/top-collaterals-chart"

interface StatusSummary {
  status: string
  _count: { id: number }
  _sum: { totalCost: number }
}

interface LocationSummary {
  location: string
  _count: { id: number }
  _sum: { totalCost: number }
}

interface CollateralSummary {
  itemName: string
  _count: { id: number }
  _sum: { totalPrice: number; quantity: number }
}

interface MonthlyProjectSummary {
  month: string
  count: number
  spend: number
}

interface BranchPerformance {
  branch: string
  campaigns: number
  leads_generated: number
  conversions: number
  marketing_spend: number
}

interface AnalyticsData {
  totalProjects: number
  deliveredProjects: number
  totalSpend: number
  avgProjectCost: number
  deliveryRate: number
  projectsByStatus: StatusSummary[]
  projectsByLocation: LocationSummary[]
  collateralStats: CollateralSummary[]
  monthlyProjects: MonthlyProjectSummary[]
  branchData: BranchPerformance[]
  totalLeadsGenerated: number
  totalLeadsConverted: number
  conversionRate: number
  avgCPL: number
  avgCPA: number
}

type AutoTableJsPDF = jsPDF & {
  lastAutoTable: { finalY: number }
}

export default function AnalyticsPage() {
  const { data: session, status } = useSession()
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [branchFilter, setBranchFilter] = useState("all")

  const fetchAnalyticsData = useCallback(async () => {
    if (status !== "authenticated" || session?.user.role !== "ADMIN") return

    try {
      const res = await fetch("/api/analytics")
      if (res.ok) {
        const analyticsData = await res.json()
        setData(analyticsData)
      }
    } catch {
      // Silently handle network errors - component will show loading state
      console.log("Analytics fetch retry pending...")
    } finally {
      setLoading(false)
    }
  }, [session?.user.role, status])

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void fetchAnalyticsData()
    }, 0)

    return () => window.clearTimeout(timeout)
  }, [fetchAnalyticsData])

  if (status === "unauthenticated") redirect("/login")
  if (status === "authenticated" && session.user.role !== "ADMIN") redirect("/dashboard")

  const filteredBranchData = data?.branchData.filter((branch) => {
    const leads = branch.leads_generated || 0
    const conversions = branch.conversions || 0
    const conversionRate = leads > 0 ? (conversions / leads) * 100 : 0

    switch (branchFilter) {
      case "top":
        return branch.campaigns > 0 && conversionRate >= 10
      case "attention":
        return branch.campaigns > 0 && (conversionRate < 10 || leads === 0)
      default:
        return true
    }
  }) ?? []

  const exportBranchData = () => {
    if (!data?.branchData) return

    const doc = new jsPDF()
    const date = new Date().toLocaleDateString("en-IN")

    // Title
    doc.setFontSize(18)
    doc.text("Branch-Level Performance Report", 14, 20)
    doc.setFontSize(10)
    doc.text(`Generated: ${date}`, 14, 28)

    // Table data
    const tableData = data.branchData.map((branch) => {
      const leads = Number(branch.leads_generated) || 0
      const conversions = Number(branch.conversions) || 0
      const campaigns = Number(branch.campaigns) || 0
      const spend = branch.marketing_spend || 0
      const conversionRate = leads > 0 ? ((conversions / leads) * 100).toFixed(1) + "%" : "0.0%"
      const cpl = leads > 0 ? "Rs. " + Math.round(spend / leads) : "Rs. 0"
      const cpa = conversions > 0 ? "Rs. " + Math.round(spend / conversions) : "N/A"

      return [
        branch.branch,
        campaigns.toString(),
        leads.toString(),
        conversions.toString(),
        conversionRate,
        "Rs. " + Math.round(spend).toLocaleString(),
        cpl,
        cpa
      ]
    })

    autoTable(doc, {
      head: [["Branch", "Campaigns", "Leads", "Conversions", "Conv. Rate", "Spend", "CPL", "CPA"]],
      body: tableData,
      startY: 35,
      styles: { fontSize: 9, cellPadding: 2 },
      headStyles: { fillColor: [0, 60, 113], textColor: 255 },
      alternateRowStyles: { fillColor: [245, 245, 245] },
    })

    doc.save(`branch-performance-${new Date().toISOString().split("T")[0]}.pdf`)
  }

  const exportFullReport = () => {
    if (!data) return

    const doc = new jsPDF()
    const reportDate = new Date().toLocaleDateString("en-IN")

    // Title
    doc.setFontSize(20)
    doc.setTextColor(0, 60, 113)
    doc.text("Axis Max Life - Analytics Report", 14, 20)
    doc.setFontSize(10)
    doc.setTextColor(100, 100, 100)
    doc.text(`Generated: ${reportDate}`, 14, 28)

    let currentY = 35

    // Overview Metrics Table
    doc.setFontSize(14)
    doc.setTextColor(0, 60, 113)
    doc.text("Overview Metrics", 14, currentY)
    currentY += 8

    const overviewData = [
      ["Total Projects", data.totalProjects.toString()],
      ["Total Spend", `Rs. ${data.totalSpend.toLocaleString()}`],
      ["Total Leads Generated", data.totalLeadsGenerated.toString()],
      ["Total Leads Converted", data.totalLeadsConverted.toString()],
      ["Conversion Rate", `${data.conversionRate.toFixed(1)}%`],
      ["Avg Cost Per Lead", `Rs. ${data.avgCPL}`],
      ["Avg Cost Per Acquisition", `Rs. ${data.avgCPA}`],
    ]

    autoTable(doc, {
      body: overviewData,
      startY: currentY,
      styles: { fontSize: 10, cellPadding: 3 },
      columnStyles: { 0: { fontStyle: "bold" } },
      alternateRowStyles: { fillColor: [245, 245, 245] },
    })

    currentY = (doc as AutoTableJsPDF).lastAutoTable.finalY + 15

    // Monthly Trends Table
    if (currentY > 250) { doc.addPage(); currentY = 20 }
    doc.setFontSize(14)
    doc.setTextColor(0, 60, 113)
    doc.text("Monthly Trends", 14, currentY)
    currentY += 8

    const monthlyData = data.monthlyProjects.map((m: { month: string; count: number; spend: number }) => [
      m.month,
      m.count.toString(),
      `Rs. ${m.spend.toLocaleString()}`,
    ])

    autoTable(doc, {
      head: [["Month", "Projects", "Spend"]],
      body: monthlyData,
      startY: currentY,
      styles: { fontSize: 9, cellPadding: 2 },
      headStyles: { fillColor: [0, 60, 113], textColor: 255 },
      alternateRowStyles: { fillColor: [245, 245, 245] },
    })

    currentY = (doc as AutoTableJsPDF).lastAutoTable.finalY + 15

    // Status Breakdown Table
    if (currentY > 250) { doc.addPage(); currentY = 20 }
    doc.setFontSize(14)
    doc.setTextColor(0, 60, 113)
    doc.text("Project Status Breakdown", 14, currentY)
    currentY += 8

    const statusData = data.projectsByStatus.map((s: { status: string; _count: { id: number }; _sum: { totalCost: number } }) => [
      s.status,
      s._count.id.toString(),
      `Rs. ${(s._sum.totalCost || 0).toLocaleString()}`,
    ])

    autoTable(doc, {
      head: [["Status", "Count", "Spend"]],
      body: statusData,
      startY: currentY,
      styles: { fontSize: 9, cellPadding: 2 },
      headStyles: { fillColor: [0, 60, 113], textColor: 255 },
      alternateRowStyles: { fillColor: [245, 245, 245] },
    })

    currentY = (doc as AutoTableJsPDF).lastAutoTable.finalY + 15

    // Branch Performance Table
    doc.addPage()
    currentY = 20
    doc.setFontSize(14)
    doc.setTextColor(0, 60, 113)
    doc.text("Branch-Level Performance", 14, currentY)
    currentY += 8

    const branchData = data.branchData.map((b) => {
      const leads = Number(b.leads_generated) || 0
      const conversions = Number(b.conversions) || 0
      const campaigns = Number(b.campaigns) || 0
      const spend = b.marketing_spend || 0
      const conversionRate = leads > 0 ? ((conversions / leads) * 100).toFixed(1) + "%" : "0.0%"
      const cpl = leads > 0 ? Math.round(spend / leads) : 0
      const cpa = conversions > 0 ? Math.round(spend / conversions) : 0

      return [
        b.branch,
        campaigns.toString(),
        leads.toString(),
        conversions.toString(),
        conversionRate,
        `Rs. ${Math.round(spend).toLocaleString()}`,
        cpl ? `Rs. ${cpl}` : "Rs. 0",
        cpa ? `Rs. ${cpa}` : "N/A",
      ]
    })

    autoTable(doc, {
      head: [["Branch", "Campaigns", "Leads", "Conversions", "Conv. Rate", "Spend", "CPL", "CPA"]],
      body: branchData,
      startY: currentY,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [0, 60, 113], textColor: 255 },
      alternateRowStyles: { fillColor: [245, 245, 245] },
    })

    doc.save(`axis-max-life-analytics-report-${new Date().toISOString().split("T")[0]}.pdf`)
  }

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin h-8 w-8 border-4 border-[#003c71] border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900">Analytics & Reports</h1>
          <p className="text-gray-600 mt-1">Insights into print operations, spend, and performance</p>
        </div>
        <Button
          onClick={exportFullReport}
          className="gap-2 bg-[#003c71] hover:bg-[#002a52]"
        >
          <Download className="h-4 w-4" />
          Export Report
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="hover:shadow-lg transition-all hover:-translate-y-1">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-bold text-gray-500 uppercase tracking-wider">Total Projects</p>
              <div className="p-2 rounded-lg bg-cyan-100 text-cyan-700"><FolderKanban className="h-5 w-5" /></div>
            </div>
            <p className="text-3xl font-extrabold text-gray-900">{data.totalProjects}</p>
            <p className="text-sm text-gray-500 mt-1">All time</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-lg transition-all hover:-translate-y-1">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-bold text-gray-500 uppercase tracking-wider">Total Spend</p>
              <div className="p-2 rounded-lg bg-green-100 text-green-700"><IndianRupee className="h-5 w-5" /></div>
            </div>
            <p className="text-3xl font-extrabold text-gray-900">{formatCurrency(data.totalSpend)}</p>
            <p className="text-sm text-gray-500 mt-1">Across all projects</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-lg transition-all hover:-translate-y-1">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-bold text-gray-500 uppercase tracking-wider">Delivery Rate</p>
              <div className="p-2 rounded-lg bg-green-100 text-green-700"><CheckCircle className="h-5 w-5" /></div>
            </div>
            <p className="text-3xl font-extrabold text-gray-900">{data.deliveryRate}%</p>
            <p className="text-sm text-gray-500 mt-1">{data.deliveredProjects} delivered</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-lg transition-all hover:-translate-y-1">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-bold text-gray-500 uppercase tracking-wider">Avg Project Cost</p>
              <div className="p-2 rounded-lg bg-amber-100 text-amber-700"><TrendingUp className="h-5 w-5" /></div>
            </div>
            <p className="text-3xl font-extrabold text-gray-900">{formatCurrency(data.avgProjectCost)}</p>
            <p className="text-sm text-gray-500 mt-1">Per project</p>
          </CardContent>
        </Card>
      </div>

      {/* Marketing ROI Cards */}
      {data.totalLeadsGenerated > 0 && (
        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-3">Marketing ROI</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-blue-100 bg-blue-50/50">
              <CardContent className="p-6">
                <p className="text-sm font-bold text-blue-600 uppercase tracking-wider mb-2">Total Leads</p>
                <p className="text-3xl font-extrabold text-blue-900">{data.totalLeadsGenerated.toLocaleString("en-IN")}</p>
                <p className="text-sm text-blue-600 mt-1">Generated across campaigns</p>
              </CardContent>
            </Card>
            <Card className="border-green-100 bg-green-50/50">
              <CardContent className="p-6">
                <p className="text-sm font-bold text-green-600 uppercase tracking-wider mb-2">Conversions</p>
                <p className="text-3xl font-extrabold text-green-900">{data.totalLeadsConverted.toLocaleString("en-IN")}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm text-green-600">Conversion rate:</span>
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold backdrop-blur-sm border ${data.conversionRate >= 15
                    ? 'bg-green-500/20 text-green-700 border-green-500/30 shadow-sm shadow-green-500/10' :
                    data.conversionRate >= 5
                      ? 'bg-amber-500/20 text-amber-700 border-amber-500/30 shadow-sm shadow-amber-500/10' :
                      'bg-red-500/20 text-red-700 border-red-500/30 shadow-sm shadow-red-500/10'
                    } `}>
                    <span className={`w-2 h-2 rounded-full ${data.conversionRate >= 15 ? 'bg-green-500' :
                      data.conversionRate >= 5 ? 'bg-amber-500' : 'bg-red-500'
                      } `} />
                    {data.conversionRate.toFixed(1)}%
                  </span>
                </div>
              </CardContent>
            </Card>
            <Card className="border-amber-100 bg-amber-50/50">
              <CardContent className="p-6">
                <p className="text-sm font-bold text-amber-600 uppercase tracking-wider mb-2">Avg CPL</p>
                <p className="text-3xl font-extrabold text-amber-900">{formatCurrency(data.avgCPL)}</p>
                <p className="text-sm text-amber-600 mt-1">Cost per lead</p>
              </CardContent>
            </Card>
            <Card className="border-purple-100 bg-purple-50/50">
              <CardContent className="p-6">
                <p className="text-sm font-bold text-purple-600 uppercase tracking-wider mb-2">Avg CPA</p>
                <p className="text-3xl font-extrabold text-purple-900">{formatCurrency(data.avgCPA)}</p>
                <p className="text-sm text-purple-600 mt-1">Cost per acquisition</p>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-[#003c71]" />
              Monthly Project Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <MonthlyTrendChart
              data={data.monthlyProjects.map((m: { month: string; count: number; spend: number }) => ({
                month: m.month,
                count: Number(m.count),
                spend: Number(m.spend) || 0,
              }))}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-[#003c71]" />
              Project Status Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <StatusBreakdownChart
              data={data.projectsByStatus.map((s: { status: string; _count: { id: number }; _sum: { totalCost: number } }) => ({
                status: s.status,
                count: s._count.id,
                spend: s._sum.totalCost || 0,
              }))}
            />
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-[#003c71]" />
              Spend by Location
            </CardTitle>
          </CardHeader>
          <CardContent>
            <SpendByLocationChart
              data={data.projectsByLocation.map((l) => ({
                location: l.location,
                count: l._count.id,
                spend: l._sum.totalCost || 0,
              }))}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-[#003c71]" />
              Top Collaterals by Spend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <TopCollateralsChart
              data={data.collateralStats.map((c) => ({
                itemName: c.itemName,
                count: c._count.id,
                spend: c._sum.totalPrice || 0,
                quantity: c._sum.quantity || 0,
              }))}
            />
          </CardContent>
        </Card>
      </div>

      {/* Branch-Level Performance Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-[#003c71]" />
              Branch-Level Performance
            </CardTitle>
            <div className="flex items-center gap-3">
              {/* Filter Dropdown */}
              <div className="relative">
                <select
                  value={branchFilter}
                  onChange={(e) => setBranchFilter(e.target.value)}
                  className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-10 text-sm font-medium text-gray-700 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-[#003c71] focus:border-transparent cursor-pointer"
                >
                  <option value="all">All Branches</option>
                  <option value="top">Top Performer</option>
                  <option value="attention">Need Attention</option>
                </select>
                <ChevronDown className="h-4 w-4 text-gray-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              {/* Export Button */}
              <button
                onClick={exportBranchData}
                className="flex items-center gap-2 bg-[#003c71] hover:bg-[#002a52] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                <Download className="h-4 w-4" />
                Export Data
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="text-left px-4 py-3 font-bold text-gray-600 uppercase text-xs tracking-wider">Branch Location</th>
                  <th className="text-right px-4 py-3 font-bold text-gray-600 uppercase text-xs tracking-wider">Campaigns</th>
                  <th className="text-right px-4 py-3 font-bold text-gray-600 uppercase text-xs tracking-wider">Leads Generated</th>
                  <th className="text-right px-4 py-3 font-bold text-gray-600 uppercase text-xs tracking-wider">Conversions</th>
                  <th className="text-right px-4 py-3 font-bold text-gray-600 uppercase text-xs tracking-wider">Conversion Rate</th>
                  <th className="text-right px-4 py-3 font-bold text-gray-600 uppercase text-xs tracking-wider">Marketing Spend</th>
                  <th className="text-right px-4 py-3 font-bold text-gray-600 uppercase text-xs tracking-wider">CPL</th>
                  <th className="text-right px-4 py-3 font-bold text-gray-600 uppercase text-xs tracking-wider">CPA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredBranchData.map((branch) => {
                  const leads = Number(branch.leads_generated) || 0
                  const conversions = Number(branch.conversions) || 0
                  const campaigns = Number(branch.campaigns) || 0
                  const spend = branch.marketing_spend || 0
                  const conversionRate = leads > 0 ? (conversions / leads) * 100 : 0
                  const cpl = leads > 0 ? spend / leads : 0
                  const cpa = conversions > 0 ? spend / conversions : 0

                  return (
                    <tr key={branch.branch} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-semibold">
                        {branch.branch}
                      </td>
                      <td className="px-4 py-3 text-right font-mono">{campaigns}</td>
                      <td className="px-4 py-3 text-right font-mono">{leads}</td>
                      <td className="px-4 py-3 text-right font-mono">{conversions}</td>
                      <td className="px-4 py-3 text-right">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold backdrop-blur-sm border ${conversionRate >= 15
                          ? 'bg-green-500/15 text-green-700 border-green-500/25 shadow-sm shadow-green-500/10' :
                          conversionRate >= 5
                            ? 'bg-amber-500/15 text-amber-700 border-amber-500/25 shadow-sm shadow-amber-500/10' :
                            'bg-red-500/15 text-red-700 border-red-500/25 shadow-sm shadow-red-500/10'
                          } `}>
                          <span className={`w-1.5 h-1.5 rounded-full ${conversionRate >= 15 ? 'bg-green-500' :
                            conversionRate >= 5 ? 'bg-amber-500' : 'bg-red-500'
                            } `} />
                          {conversionRate.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-semibold text-[#003c71]">
                        {formatCurrency(spend)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono">{formatCurrency(cpl)}</td>
                      <td className="px-4 py-3 text-right font-mono">
                        {cpa > 0 ? formatCurrency(cpa) : 'N/A'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
