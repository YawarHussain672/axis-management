"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Trash2, AlertCircle, Loader2, Save, X } from "lucide-react"
import { formatCurrency, applyGST, getGSTAmount } from "@/utils/formatters"
import { toast } from "sonner"
import { getUnitPriceFromSlabs, type VolumeSlab } from "@/lib/rate-card-pricing"
import { BRANCH_LOCATIONS, CITIES } from "@/lib/branch-locations"

interface CollateralItem { id: string; itemName: string; quantity: number; unitPrice: number; totalPrice: number }
interface POC { id: string; name: string }
interface RateCardItem { id: string; name: string; defaultPrice: number; volumeSlabs: VolumeSlab[] }
interface Project {
  id: string
  name: string
  pocId: string
  location: string
  state: string
  branch: string
  deliveryDate: string | null
  instructions: string | null
  collaterals: CollateralItem[]
}

interface EditProjectDialogProps {
  project: Project | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function EditProjectDialog({ project, open, onOpenChange, onSuccess }: EditProjectDialogProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [isFetching, setIsFetching] = useState(false)
  const [pocs, setPocs] = useState<POC[]>([])
  const [rateCards, setRateCards] = useState<RateCardItem[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formData, setFormData] = useState({
    name: "",
    pocId: "",
    city: "",
    branch: "",
    deliveryDate: "",
    instructions: "",
  })
  const [collaterals, setCollaterals] = useState<CollateralItem[]>([])

  const today = new Date().toISOString().split("T")[0]

  // Load form data when dialog opens
  useEffect(() => {
    if (!open || !project) return

    async function loadData() {
      if (!project) return
      setIsFetching(true)
      try {
        const [teamRes, rateRes] = await Promise.all([
          fetch("/api/team-list"),
          fetch("/api/rate-card-list"),
        ])

        if (teamRes.ok) {
          const team = await teamRes.json()
          setPocs(team.map((u: { id: string; name: string }) => ({ id: u.id, name: u.name })))
        }
        if (rateRes.ok) {
          setRateCards(await rateRes.json())
        }

        // Set form data from project
        setFormData({
          name: project.name || "",
          pocId: project.pocId || "",
          city: project.location || "",
          branch: project.branch || "",
          deliveryDate: project.deliveryDate ? project.deliveryDate.split("T")[0] : "",
          instructions: project.instructions || "",
        })
        setCollaterals(project.collaterals?.map((c: CollateralItem) => ({ ...c })) || [])
      } catch {
        toast.error("Failed to load form data")
      } finally {
        setIsFetching(false)
      }
    }

    loadData()
  }, [open, project])

  const selectedCity = formData.city
  const cityData = selectedCity ? BRANCH_LOCATIONS[selectedCity] : null
  const availableBranches = cityData?.branches || []

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!formData.name.trim() || formData.name.trim().length < 3) errs.name = "Project name must be at least 3 characters"
    if (!formData.pocId) errs.pocId = "Please select a POC"
    if (!formData.city) errs.city = "Please select a city"
    if (!formData.branch) errs.branch = "Please select a branch"
    if (!formData.deliveryDate) errs.deliveryDate = "Delivery date is required"
    const validCollaterals = collaterals.filter((c) => c.itemName && c.quantity > 0)
    if (validCollaterals.length === 0) errs.collaterals = "Add at least one collateral"
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const addCollateral = () => {
    setCollaterals([...collaterals, { id: Math.random().toString(36).substr(2, 9), itemName: "", quantity: 0, unitPrice: 0, totalPrice: 0 }])
  }

  const removeCollateral = (cid: string) => {
    if (collaterals.length > 1) setCollaterals(collaterals.filter((c) => c.id !== cid))
  }

  const updateCollateral = (cid: string, field: keyof CollateralItem, value: string | number) => {
    setCollaterals(collaterals.map((c) => {
      if (c.id !== cid) return c
      const updated = { ...c, [field]: value }
      if (field === "itemName") {
        const item = rateCards.find((i) => i.name === value)
        if (item) updated.unitPrice = getUnitPriceFromSlabs(item.volumeSlabs, updated.quantity || 1) ?? item.defaultPrice
      }
      if (field === "quantity") {
        const item = rateCards.find((i) => i.name === updated.itemName)
        if (item) updated.unitPrice = getUnitPriceFromSlabs(item.volumeSlabs, Number(value)) ?? item.defaultPrice
      }
      updated.totalPrice = updated.quantity * updated.unitPrice
      return updated
    }))
  }

  const subtotal = collaterals.reduce((sum, c) => sum + c.totalPrice, 0)
  const gstAmount = getGSTAmount(subtotal)
  const totalCost = applyGST(subtotal)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) { toast.error("Please fix the errors before saving"); return }
    if (!project) return

    setIsLoading(true)
    try {
      const state = cityData?.state || ""

      const res = await fetch(`/api/projects/${project.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          pocId: formData.pocId,
          location: formData.city,
          state,
          branch: formData.branch,
          deliveryDate: formData.deliveryDate,
          instructions: formData.instructions,
          collaterals: collaterals.filter((c) => c.itemName && c.quantity > 0),
          totalCost: subtotal,
        }),
      })

      if (res.ok) {
        toast.success("Project updated successfully!")
        onOpenChange(false)
        onSuccess?.()
        router.refresh()
      } else {
        const text = await res.text()
        let errorMsg = "Failed to update project"
        try {
          const data = JSON.parse(text)
          errorMsg = data.error || errorMsg
        } catch { }
        toast.error(errorMsg)
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Network error. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  if (!project) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl font-bold text-slate-900">
            Edit Project
          </DialogTitle>
        </DialogHeader>

        {isFetching ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin text-[#003c71] mx-auto mb-3" />
              <p className="text-slate-500 text-sm">Loading project data...</p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6" noValidate>
            {/* Project Details */}
            <div className="space-y-4">
              <h3 className="font-bold text-lg text-slate-800 border-b pb-2">Project Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold">Project Name <span className="text-red-500">*</span></Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => { setFormData({ ...formData, name: e.target.value }); setErrors({ ...errors, name: "" }) }}
                    className={errors.name ? "border-red-400" : ""}
                  />
                  {errors.name && <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle className="h-3 w-3" />{errors.name}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold">POC <span className="text-red-500">*</span></Label>
                  <Select value={formData.pocId} onValueChange={(v) => { setFormData({ ...formData, pocId: v }); setErrors({ ...errors, pocId: "" }) }}>
                    <SelectTrigger className={errors.pocId ? "border-red-400" : ""}>
                      <SelectValue placeholder="Select POC" />
                    </SelectTrigger>
                    <SelectContent>{pocs.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                  </Select>
                  {errors.pocId && <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle className="h-3 w-3" />{errors.pocId}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold">City <span className="text-red-500">*</span></Label>
                  <Select value={formData.city} onValueChange={(v) => { setFormData({ ...formData, city: v, branch: "" }); setErrors({ ...errors, city: "" }) }}>
                    <SelectTrigger className={errors.city ? "border-red-400" : ""}>
                      <SelectValue placeholder="Select city" />
                    </SelectTrigger>
                    <SelectContent>
                      {CITIES.map((city) => (
                        <SelectItem key={city} value={city}>{city}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.city && <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle className="h-3 w-3" />{errors.city}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold">Branch <span className="text-red-500">*</span></Label>
                  <Select value={formData.branch} onValueChange={(v) => { setFormData({ ...formData, branch: v }); setErrors({ ...errors, branch: "" }) }} disabled={!formData.city}>
                    <SelectTrigger className={errors.branch ? "border-red-400" : ""}>
                      <SelectValue placeholder={formData.city ? "Select branch" : "Select city first"} />
                    </SelectTrigger>
                    <SelectContent>
                      {availableBranches.map((branch) => (
                        <SelectItem key={branch} value={branch}>{branch}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.branch && <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle className="h-3 w-3" />{errors.branch}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold">Delivery Date <span className="text-red-500">*</span></Label>
                  <Input
                    type="date"
                    min={today}
                    value={formData.deliveryDate}
                    onChange={(e) => { setFormData({ ...formData, deliveryDate: e.target.value }); setErrors({ ...errors, deliveryDate: "" }) }}
                    className={errors.deliveryDate ? "border-red-400" : ""}
                  />
                  {errors.deliveryDate && <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle className="h-3 w-3" />{errors.deliveryDate}</p>}
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <Label className="text-sm font-semibold">Special Instructions <span className="text-slate-400 font-normal">(optional)</span></Label>
                  <Textarea
                    value={formData.instructions}
                    onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                    rows={2}
                    maxLength={1000}
                  />
                  <p className="text-xs text-slate-400 text-right">{formData.instructions.length}/1000</p>
                </div>
              </div>
            </div>

            {/* Collaterals */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b pb-2">
                <h3 className="font-bold text-lg text-slate-800">Collaterals</h3>
                <Button type="button" onClick={addCollateral} variant="outline" size="sm" className="gap-1">
                  <Plus className="h-3.5 w-3.5" /> Add Item
                </Button>
              </div>

              {errors.collaterals && (
                <div className="flex items-center gap-2 p-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                  <AlertCircle className="h-4 w-4 shrink-0" />{errors.collaterals}
                </div>
              )}

              <div className="space-y-2 max-h-60 overflow-y-auto">
                {collaterals.map((c) => (
                  <div key={c.id} className="grid grid-cols-1 md:grid-cols-5 gap-2 p-3 border border-slate-200 rounded-lg bg-slate-50/50">
                    <div className="space-y-1 md:col-span-2">
                      <Label className="text-sm font-semibold text-slate-700">Item</Label>
                      <Select value={c.itemName} onValueChange={(v) => updateCollateral(c.id, "itemName", v)}>
                        <SelectTrigger className="h-9"><SelectValue placeholder="Select item" /></SelectTrigger>
                        <SelectContent>{rateCards.map((i) => <SelectItem key={i.id} value={i.name}>{i.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-sm font-semibold text-slate-700">Qty</Label>
                      <Input type="number" min="1" className="h-9" value={c.quantity || ""} onChange={(e) => updateCollateral(c.id, "quantity", parseInt(e.target.value) || 0)} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-sm font-semibold text-slate-700">Unit Price</Label>
                      <Input type="number" step="0.01" min="0.01" className="h-9" value={c.unitPrice || ""} onChange={(e) => updateCollateral(c.id, "unitPrice", parseFloat(e.target.value) || 0)} />
                    </div>
                    <div className="flex items-end gap-1">
                      <div className="flex-1 space-y-1">
                        <Label className="text-sm font-semibold text-slate-700">Subtotal</Label>
                        <Input value={formatCurrency(c.totalPrice)} disabled className="h-9 bg-white font-mono text-sm" />
                      </div>
                      {collaterals.length > 1 && (
                        <Button type="button" variant="ghost" size="icon" className="h-9 w-9 text-red-500 hover:bg-red-50 shrink-0" onClick={() => removeCollateral(c.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Cost Summary */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2 bg-slate-50">
                  <span className="text-base font-semibold text-slate-700">Subtotal</span>
                  <span className="font-mono font-semibold text-slate-800">{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex items-center justify-between px-4 py-2 border-t border-slate-200 bg-slate-50">
                  <span className="text-base font-semibold text-slate-700">GST @ 18%</span>
                  <span className="font-mono font-semibold text-amber-600">+ {formatCurrency(gstAmount)}</span>
                </div>
                <div className="flex items-center justify-between px-4 py-3 bg-[#003c71] text-white">
                  <div>
                    <p className="font-bold text-base">Total Amount</p>
                    <p className="text-blue-200 text-xs">Inclusive of 18% GST</p>
                  </div>
                  <span className="text-xl font-extrabold font-mono">{formatCurrency(totalCost)}</span>
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
                <X className="h-4 w-4 mr-1" /> Cancel
              </Button>
              <Button type="submit" className="gap-2 bg-[#003c71] hover:bg-[#002a52]" disabled={isLoading}>
                {isLoading ? <><Loader2 className="h-4 w-4 animate-spin" />Saving...</> : <><Save className="h-4 w-4" />Save Changes</>}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
