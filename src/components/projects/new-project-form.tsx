"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { formatCurrency, applyGST, getGSTAmount } from "@/utils/formatters"
import { toast } from "sonner"
import { BRANCH_LOCATIONS, CITIES } from "@/lib/branch-locations"
import { getUnitPriceFromSlabs, type VolumeSlab } from "@/lib/rate-card-pricing"

// SVG Icons
const PlusIcon = () => (
  <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
  </svg>
)

const TrashIcon = () => (
  <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
)

const AlertIcon = () => (
  <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
)

const LoaderIcon = () => (
  <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" className="animate-spin">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
)

// Currency display with same size symbol and amount
const Currency = ({ amount, size = 'inherit', color }: { amount: number, size?: string, color?: string }) => (
  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: size, color: color || 'inherit' }}>
    ₹{Math.round(amount).toLocaleString('en-IN')}
  </span>
)

interface CollateralItem { id: string; itemName: string; quantity: number; unitPrice: number; totalPrice: number }
interface POC { id: string; name: string; email: string }
interface RateCardItem { id: string; name: string; defaultPrice: number; volumeSlabs: VolumeSlab[] }

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
    <div>
      <form onSubmit={handleSubmit} noValidate>
        {/* Project Details Card */}
        <div className="card" style={{ marginBottom: '24px' }}>
          <div style={{ padding: '24px' }}>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Project Name <span style={{ color: 'var(--color-error)' }}>*</span></label>
                <input
                  type="text"
                  className={`form-input ${errors.name ? 'border-red-400' : ''}`}
                  value={formData.name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setFormData({ ...formData, name: e.target.value }); setErrors({ ...errors, name: "" }) }}
                  placeholder="Enter project name"
                />
                {errors.name && <p style={{ fontSize: '13px', color: 'var(--color-error)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}><AlertIcon /> {errors.name}</p>}
              </div>

              <div className="form-group">
                <label className="form-label">POC Name <span style={{ color: 'var(--color-error)' }}>*</span></label>
                <select
                  className={`form-select ${errors.pocId ? 'border-red-400' : ''}`}
                  value={formData.pocId}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => { setFormData({ ...formData, pocId: e.target.value }); setErrors({ ...errors, pocId: "" }) }}
                  disabled={isFetching}
                >
                  <option value="">{isFetching ? "Loading..." : "Select POC"}</option>
                  {pocs.map((poc) => (
                    <option key={poc.id} value={poc.id}>{poc.name}</option>
                  ))}
                </select>
                {errors.pocId && <p style={{ fontSize: '13px', color: 'var(--color-error)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}><AlertIcon /> {errors.pocId}</p>}
              </div>

              <div className="form-group">
                <label className="form-label">Location (City) <span style={{ color: 'var(--color-error)' }}>*</span></label>
                <select
                  className={`form-select ${errors.city ? 'border-red-400' : ''}`}
                  value={formData.city}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => { setFormData({ ...formData, city: e.target.value, branch: "" }); setErrors({ ...errors, city: "", branch: "" }) }}
                >
                  <option value="">Select City</option>
                  {CITIES.map((city) => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </select>
                {errors.city && <p style={{ fontSize: '13px', color: 'var(--color-error)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}><AlertIcon /> {errors.city}</p>}
              </div>

              <div className="form-group">
                <label className="form-label">Branch Location <span style={{ color: 'var(--color-error)' }}>*</span></label>
                <select
                  className={`form-select ${errors.branch ? 'border-red-400' : ''}`}
                  value={formData.branch}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => { setFormData({ ...formData, branch: e.target.value }); setErrors({ ...errors, branch: "" }) }}
                  disabled={!formData.city}
                >
                  <option value="">{formData.city ? "Select Branch" : "Select city first"}</option>
                  {cityData?.branches.map((branch: string) => (
                    <option key={branch} value={branch}>{branch}</option>
                  ))}
                </select>
                {errors.branch && <p style={{ fontSize: '13px', color: 'var(--color-error)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}><AlertIcon /> {errors.branch}</p>}
              </div>

              <div className="form-group">
                <label className="form-label">Delivery Date <span style={{ color: 'var(--color-error)' }}>*</span></label>
                <input
                  type="date"
                  min={today}
                  className={`form-input ${errors.deliveryDate ? 'border-red-400' : ''}`}
                  style={{ width: '200px' }}
                  value={formData.deliveryDate}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setFormData({ ...formData, deliveryDate: e.target.value }); setErrors({ ...errors, deliveryDate: "" }) }}
                />
                {errors.deliveryDate && <p style={{ fontSize: '13px', color: 'var(--color-error)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}><AlertIcon /> {errors.deliveryDate}</p>}
              </div>

              <div className="form-group">
                <label className="form-label">State</label>
                <input
                  type="text"
                  readOnly
                  className="form-input"
                  style={{ background: 'var(--gray-100)' }}
                  value={cityData?.state || ''}
                  placeholder="State"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Collaterals Label Outside Card */}
        <div style={{ marginBottom: '8px' }}>
          <label style={{ fontSize: '15px', fontWeight: 700, color: 'var(--gray-700)' }}>Collaterals (Add Multiple Items) <span style={{ color: 'var(--color-error)' }}>*</span></label>
        </div>

        {/* Collaterals Card */}
        <div className="card" style={{ marginBottom: '24px' }}>
          <div style={{ padding: '24px' }}>
            {errors.collaterals && (
              <div style={{ padding: '16px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--color-error)', borderRadius: '10px', color: 'var(--color-error)', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <AlertIcon /> {errors.collaterals}
              </div>
            )}

            {/* Table Header */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1.5fr 1fr auto', gap: '12px', fontSize: '12px', fontWeight: 800, color: 'var(--gray-600)', textTransform: 'uppercase', letterSpacing: '0.5px', padding: '0 8px 8px', borderBottom: '1px solid var(--gray-200)' }}>
              <div>Item</div>
              <div>Quantity</div>
              <div>Unit Price</div>
              <div>Total</div>
              <div></div>
            </div>

            {/* Collateral Rows */}
            {collaterals.map((collateral, index) => (
              <div key={collateral.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1.5fr 1fr auto', gap: '12px', padding: '12px 8px', borderBottom: '1px solid var(--gray-100)', alignItems: 'center' }}>
                <select
                  className="form-select"
                  value={collateral.itemName}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => updateCollateral(collateral.id, "itemName", e.target.value)}
                  disabled={isFetching}
                >
                  <option value="">{isFetching ? "Loading..." : "Select Item"}</option>
                  {rateCards.map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}
                </select>
                <input
                  type="number"
                  min="1"
                  className={`form-input ${errors[`qty_${index}`] ? 'border-red-400' : ''}`}
                  value={collateral.quantity || ""}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateCollateral(collateral.id, "quantity", parseInt(e.target.value) || 0)}
                  placeholder="0"
                />
                <input
                  type="number"
                  step="0.01"
                  className={`form-input ${errors[`price_${index}`] ? 'border-red-400' : ''}`}
                  value={collateral.unitPrice || ""}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateCollateral(collateral.id, "unitPrice", parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                />
                <div style={{ padding: '10px 12px', background: 'var(--gray-100)', borderRadius: '10px', fontFamily: 'var(--font-mono)', fontWeight: 700, textAlign: 'right', color: 'var(--gray-800)' }}>
                  {formatCurrency(collateral.totalPrice)}
                </div>
                {collaterals.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeCollateral(collateral.id)}
                    style={{ width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--gray-400)', borderRadius: '10px', border: 'none', background: 'transparent', cursor: 'pointer' }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-error)'; e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--gray-400)'; e.currentTarget.style.background = 'transparent' }}
                  >
                    <TrashIcon />
                  </button>
                )}
              </div>
            ))}

            {/* Add Button */}
            <button
              type="button"
              onClick={addCollateral}
              disabled={isFetching}
              style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', borderRadius: '10px', background: 'var(--axis-accent)', color: 'white', fontWeight: 700, fontSize: '14px', border: 'none', cursor: 'pointer', boxShadow: 'var(--shadow-md)' }}
            >
              {isFetching ? <><LoaderIcon /> Loading...</> : <><PlusIcon /> Add Another Collateral</>}
            </button>
          </div>
        </div>

        {/* Special Instructions - Matching HTML exactly */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
          <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--gray-700)' }}>Special Instructions</label>
          <textarea
            rows={3}
            value={formData.instructions}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({ ...formData, instructions: e.target.value })}
            placeholder="E.g., Delivery between 9 AM - 5 PM only, Handle with care, Contact POC before dispatch..."
            style={{
              padding: '11px 14px',
              border: '1px solid var(--gray-300)',
              borderRadius: '10px',
              fontSize: '14px',
              fontWeight: 500,
              fontFamily: 'var(--font-sans)',
              outline: 'none',
              width: '100%',
              minHeight: '80px',
              resize: 'vertical'
            }}
          />
        </div>

        {/* Cost Summary with GST Breakdown */}
        <div className="card" style={{ marginBottom: '24px', background: 'rgba(224, 242, 254, 0.3)', border: '1px solid rgba(186, 230, 253, 0.5)' }}>
          <div style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', alignItems: 'center' }}>
              <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--gray-700)' }}>Subtotal (Before GST):</span>
              <Currency amount={subtotal} size="15px" color="var(--gray-800)" />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', alignItems: 'center' }}>
              <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--gray-600)' }}>GST @ 18%:</span>
              <Currency amount={gstAmount} size="14px" color="#0ea5e9" />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '16px', borderTop: '2px solid var(--gray-200)', alignItems: 'center' }}>
              <span style={{ fontSize: '16px', fontWeight: 700, color: 'var(--gray-900)' }}>Total Payable:</span>
              <span style={{ fontSize: '24px', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--axis-primary)' }}>{formatCurrency(totalCost)}</span>
            </div>
            <div style={{ marginTop: '16px', padding: '12px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '10px', textAlign: 'center' }}>
              <p style={{ fontSize: '13px', color: '#1e40af', fontWeight: 500, margin: 0 }}>💡 All prices exclude GST. Final invoice will include 18% GST</p>
            </div>
          </div>
        </div>

        {/* Action Buttons at bottom of form */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button
            type="button"
            onClick={onCancel || (() => router.back())}
            disabled={isLoading}
            className="btn btn-secondary"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            {isLoading ? <><LoaderIcon /> Creating...</> : <><PlusIcon /> Create Project</>}
          </button>
        </div>
      </form>
    </div>
  )
}
