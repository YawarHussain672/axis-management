"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Trash2, AlertCircle, Loader2 } from "lucide-react"
import { formatCurrency, applyGST, getGSTAmount } from "@/utils/formatters"
import { toast } from "sonner"
import { BRANCH_LOCATIONS, CITIES } from "@/lib/branch-locations"

interface CollateralItem { id: string; itemName: string; quantity: number; unitPrice: number; totalPrice: number }
interface POC { id: string; name: string; email: string }
interface RateCardItem { id: string; name: string; defaultPrice: number }

interface NewProjectFormProps {
  onSuccess?: () => void
  onCancel?: () => void
}

export function NewProjectForm({ onSuccess, onCancel }: NewProjectFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [isFetching, setIsFetching] = useState(true)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [pocs, setPocs] = useState<POC[]>([])
  const [rateCards, setRateCards] = useState<RateCardItem[]>([])
  const [formData, setFormData] = useState({
    name: "", pocId: "", city: "", branch: "", deliveryDate: "", instructions: "",
  })
  const [collaterals, setCollaterals] = useState<CollateralItem[]>([
    { id: "1", itemName: "", quantity: 0, unitPrice: 0, totalPrice: 0 },
  ])

  const today = new Date().toISOString().split("T")[0]

  // Fetch form data on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch("/api/projects/form-data")
        if (res.ok) {
          const data = await res.json()
          setPocs(data.pocs)
          setRateCards(data.rateCards)
        }
      } catch {
        toast.error("Failed to load form data")
      } finally {
        setIsFetching(false)
      }
    }
    fetchData()
  }, [])

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!formData.name.trim() || formData.name.trim().length < 3) errs.name = "Project name must be at least 3 characters"
    if (!formData.pocId) errs.pocId = "Please select a POC"
    if (!formData.city) errs.city = "Please select a city"
    if (!formData.branch) errs.branch = "Please select a branch"
    if (!formData.deliveryDate) errs.deliveryDate = "Delivery date is required"
    else if (new Date(formData.deliveryDate) <= new Date()) errs.deliveryDate = "Delivery date must be in the future"
    const validCollaterals = collaterals.filter((c) => c.itemName && c.quantity > 0)
    if (validCollaterals.length === 0) errs.collaterals = "Add at least one collateral with quantity"
    collaterals.forEach((c, i) => {
      if (c.itemName && c.quantity <= 0) errs[`qty_${i}`] = "Quantity must be greater than 0"
      if (c.itemName && c.unitPrice <= 0) errs[`price_${i}`] = "Unit price must be greater than 0"
    })
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const addCollateral = () => {
    setCollaterals([...collaterals, { id: Math.random().toString(36).substr(2, 9), itemName: "", quantity: 0, unitPrice: 0, totalPrice: 0 }])
  }

  const removeCollateral = (id: string) => {
    if (collaterals.length > 1) setCollaterals(collaterals.filter((c) => c.id !== id))
  }

  const updateCollateral = (id: string, field: keyof CollateralItem, value: string | number) => {
    setCollaterals(collaterals.map((c) => {
      if (c.id !== id) return c
      const updated = { ...c, [field]: value }
      if (field === "itemName") {
        const item = rateCards.find((i) => i.name === value)
        if (item) updated.unitPrice = item.defaultPrice
      }
      updated.totalPrice = updated.quantity * updated.unitPrice
      return updated
    }))
  }

  const cityData = formData.city ? BRANCH_LOCATIONS[formData.city] : null
  const subtotal = collaterals.reduce((sum, c) => sum + c.totalPrice, 0)
  const gstAmount = getGSTAmount(subtotal)
  const totalCost = applyGST(subtotal)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) {
      // Scroll to first error
      const firstError = document.querySelector('[class*="border-red-400"]')
      if (firstError) {
        firstError.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
      return
    }
    setIsLoading(true)
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          pocId: formData.pocId,
          location: formData.city,
          branch: formData.branch,
          state: cityData?.state || "",
          deliveryDate: formData.deliveryDate,
          instructions: formData.instructions,
          collaterals: collaterals.filter((c) => c.itemName && c.quantity > 0),
          totalCost: subtotal,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success("Project created successfully!")
        if (onSuccess) {
          onSuccess()
        } else {
          router.push(`/projects/${data.id}`)
          router.refresh()
        }
      } else {
        toast.error(data.error || "Failed to create project")
        if (data.details?.fieldErrors) {
          const fieldErrs: Record<string, string> = {}
          Object.entries(data.details.fieldErrors).forEach(([k, v]) => { fieldErrs[k] = (v as string[])[0] })
          setErrors(fieldErrs)
        }
      }
    } catch {
      toast.error("Network error. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <form onSubmit={handleSubmit} className="space-y-6" noValidate>
        {/* Project Details Section */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-base font-semibold text-slate-800">Project Name <span className="text-red-500">*</span></Label>
              <Input
                value={formData.name}
                onChange={(e) => { setFormData({ ...formData, name: e.target.value }); setErrors({ ...errors, name: "" }) }}
                placeholder="Enter project name"
                className={`h-12 rounded-lg text-base ${errors.name ? "border-red-400" : "border-slate-300"}`}
              />
              {errors.name && <p className="text-sm text-red-600 font-semibold flex items-center gap-1.5 bg-red-50 px-2 py-1 rounded"><AlertCircle className="h-4 w-4" />{errors.name}</p>}
            </div>

            <div className="space-y-2">
              <Label className="text-base font-semibold text-slate-800">POC Name <span className="text-red-500">*</span></Label>
              <Select value={formData.pocId} onValueChange={(v) => { setFormData({ ...formData, pocId: v }); setErrors({ ...errors, pocId: "" }) }} disabled={isFetching}>
                <SelectTrigger className={`h-12 rounded-lg text-base ${errors.pocId ? "border-red-400" : "border-slate-300"} ${isFetching ? "bg-slate-100 animate-pulse" : ""}`}>
                  <SelectValue placeholder={isFetching ? "Loading..." : "Select POC"} />
                </SelectTrigger>
                <SelectContent>
                  {pocs.map((poc) => (
                    <SelectItem key={poc.id} value={poc.id}>{poc.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.pocId && <p className="text-sm text-red-600 font-semibold flex items-center gap-1.5 bg-red-50 px-2 py-1 rounded"><AlertCircle className="h-4 w-4" />{errors.pocId}</p>}
            </div>

            <div className="space-y-2">
              <Label className="text-base font-semibold text-slate-800">City <span className="text-red-500">*</span></Label>
              <Select value={formData.city} onValueChange={(v) => { setFormData({ ...formData, city: v, branch: "" }); setErrors({ ...errors, city: "", branch: "" }) }}>
                <SelectTrigger className={`h-12 rounded-lg text-base ${errors.city ? "border-red-400" : "border-slate-300"}`}>
                  <SelectValue placeholder="Select City" />
                </SelectTrigger>
                <SelectContent>
                  {CITIES.map((city) => (
                    <SelectItem key={city} value={city}>{city}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.city && <p className="text-sm text-red-600 font-semibold flex items-center gap-1.5 bg-red-50 px-2 py-1 rounded"><AlertCircle className="h-4 w-4" />{errors.city}</p>}
            </div>

            <div className="space-y-2">
              <Label className="text-base font-semibold text-slate-800">Branch <span className="text-red-500">*</span></Label>
              <Select value={formData.branch} onValueChange={(v) => { setFormData({ ...formData, branch: v }); setErrors({ ...errors, branch: "" }) }} disabled={!formData.city}>
                <SelectTrigger className={`h-12 rounded-lg text-base ${errors.branch ? "border-red-400" : "border-slate-300"}`}>
                  <SelectValue placeholder={formData.city ? "Select Branch" : "Select city first"} />
                </SelectTrigger>
                <SelectContent>
                  {cityData?.branches.map((branch: string) => (
                    <SelectItem key={branch} value={branch}>{branch}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.branch && <p className="text-sm text-red-600 font-semibold flex items-center gap-1.5 bg-red-50 px-2 py-1 rounded"><AlertCircle className="h-4 w-4" />{errors.branch}</p>}
            </div>

            <div className="space-y-2">
              <Label className="text-base font-semibold text-slate-800">Delivery Date <span className="text-red-500">*</span></Label>
              <Input
                type="date"
                min={today}
                value={formData.deliveryDate}
                onChange={(e) => { setFormData({ ...formData, deliveryDate: e.target.value }); setErrors({ ...errors, deliveryDate: "" }) }}
                className={`h-12 rounded-lg text-base ${errors.deliveryDate ? "border-red-400" : "border-slate-300"}`}
              />
              {errors.deliveryDate && <p className="text-sm text-red-600 font-semibold flex items-center gap-1.5 bg-red-50 px-2 py-1 rounded"><AlertCircle className="h-4 w-4" />{errors.deliveryDate}</p>}
            </div>
          </div>
        </div>

        {/* Collaterals Section */}
        <div className="space-y-4">
          <Label className="text-base font-semibold text-slate-800">Collaterals (Add Multiple Items) <span className="text-red-500">*</span></Label>

          {errors.collaterals && (
            <div className="p-4 bg-red-50 border-2 border-red-300 rounded-lg text-base font-bold text-red-700 flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              {errors.collaterals}
            </div>
          )}

          {/* Table Header */}
          <div className="grid grid-cols-12 gap-3 text-sm font-bold text-slate-600 px-1">
            <div className="col-span-4">Item</div>
            <div className="col-span-2">Quantity</div>
            <div className="col-span-3">Unit Price</div>
            <div className="col-span-2">Total</div>
            <div className="col-span-1"></div>
          </div>

          {/* Collateral Rows */}
          {collaterals.map((collateral, index) => (
            <div key={collateral.id} className="grid grid-cols-12 gap-3 items-start">
              <div className="col-span-4">
                <Select value={collateral.itemName} onValueChange={(v) => updateCollateral(collateral.id, "itemName", v)} disabled={isFetching}>
                  <SelectTrigger className={`h-11 rounded-lg border-slate-300 text-base ${isFetching ? "bg-slate-100 animate-pulse" : ""}`}>
                    <SelectValue placeholder={isFetching ? "Loading..." : "Select Item"} />
                  </SelectTrigger>
                  <SelectContent>
                    {rateCards.map((item) => <SelectItem key={item.id} value={item.name}>{item.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Input
                  type="number"
                  min="1"
                  value={collateral.quantity || ""}
                  onChange={(e) => updateCollateral(collateral.id, "quantity", parseInt(e.target.value) || 0)}
                  placeholder="0"
                  className={`h-11 rounded-lg text-base ${errors[`qty_${index}`] ? "border-red-400" : "border-slate-300"}`}
                />
              </div>
              <div className="col-span-3">
                <Input
                  type="number"
                  step="0.01"
                  value={collateral.unitPrice || ""}
                  onChange={(e) => updateCollateral(collateral.id, "unitPrice", parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className={`h-11 rounded-lg text-base ${errors[`price_${index}`] ? "border-red-400" : "border-slate-300"}`}
                />
              </div>
              <div className="col-span-2">
                <div className="h-11 flex items-center justify-end px-3 bg-slate-100 rounded-lg font-mono text-base font-bold text-slate-800">
                  {formatCurrency(collateral.totalPrice)}
                </div>
              </div>
              <div className="col-span-1 flex justify-center">
                {collaterals.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeCollateral(collateral.id)}
                    className="h-11 w-11 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                )}
              </div>
            </div>
          ))}

          {/* Cyan Add Button */}
          <button
            type="button"
            onClick={addCollateral}
            disabled={isFetching}
            className="flex items-center gap-2 h-10 px-5 rounded-lg bg-cyan-500 hover:bg-cyan-600 disabled:bg-cyan-300 text-white font-semibold text-base shadow-md shadow-cyan-500/25 transition-all"
          >
            {isFetching ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Loading...
              </>
            ) : (
              <>
                <Plus className="h-5 w-5" /> Add Another Collateral
              </>
            )}
          </button>
        </div>

        {/* Special Instructions */}
        <div className="space-y-2">
          <Label className="text-base font-semibold text-slate-800">Special Instructions</Label>
          <Textarea
            value={formData.instructions}
            onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
            placeholder="Any special requirements..."
            rows={2}
            className="rounded-lg border-slate-300 text-base resize-none"
          />
        </div>

        {/* Cost Summary */}
        <div className="bg-slate-50 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-base font-medium text-slate-600">Subtotal (Before GST):</span>
            <span className="font-mono text-lg font-bold text-slate-800">{formatCurrency(subtotal)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-base font-medium text-slate-600">GST @ 18%:</span>
            <span className="font-mono text-lg font-bold text-slate-800">{formatCurrency(gstAmount)}</span>
          </div>
          <div className="flex items-center justify-between pt-4 border-t-2 border-slate-200">
            <span className="text-lg font-bold text-slate-800">Total Payable:</span>
            <span className="font-mono text-3xl font-extrabold text-[#003c71]">{formatCurrency(totalCost)}</span>
          </div>
          <div className="flex items-start gap-2 pt-2">
            <span className="text-lg">💡</span>
            <p className="text-sm text-slate-500">All prices exclude GST. Final invoice will include 18% GST</p>
          </div>
        </div>

        {/* Action Buttons - Right Aligned */}
        <div className="flex items-center justify-end gap-3 pt-4">
          <button
            type="button"
            onClick={onCancel || (() => router.back())}
            disabled={isLoading}
            className="h-11 px-8 rounded-lg border-2 border-slate-300 text-slate-700 font-semibold text-base hover:bg-slate-50 hover:border-slate-400 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="h-11 px-8 rounded-lg bg-[#003c71] text-white font-semibold text-base shadow-lg shadow-[#003c71]/25 hover:bg-[#002a52] transition-colors disabled:opacity-50"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                Creating...
              </span>
            ) : (
              "Create Project"
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
