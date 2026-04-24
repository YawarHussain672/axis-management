"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

// Match HTML reference exactly - simplified fields
interface Project {
  id: string
  name: string
  pocId: string
  location: string
  state: string
  deliveryDate: string | null
  status: string
  material?: string
  quantity?: number
  collaterals?: { id: string; itemName: string; quantity: number; unitPrice: number; totalPrice: number }[]
  dispatch?: {
    courier: string
    trackingId: string
  } | null
}

interface POC { id: string; name: string }

interface EditProjectDialogProps {
  project: Project | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
  isAdmin?: boolean
}

// Match HTML reference status values exactly
const PROJECT_STATUSES = [
  { value: "requested", label: "Requested" },
  { value: "approved", label: "Approved" },
  { value: "printing", label: "Printing" },
  { value: "dispatched", label: "Dispatched" },
  { value: "delivered", label: "Delivered" },
]

// Match HTML reference locations
const LOCATIONS = ["Mumbai", "Delhi", "Bangalore", "Chennai", "Pune", "Hyderabad", "Kolkata", "Noida", "Gurgaon"]

// Match HTML reference couriers
const COURIERS = [
  { value: "-", label: "Not assigned" },
  { value: "Delhivery", label: "Delhivery" },
  { value: "BlueDart", label: "BlueDart" },
  { value: "DTDC", label: "DTDC" },
  { value: "FedEx", label: "FedEx" },
]

export function EditProjectDialog({ project, open, onOpenChange, onSuccess, isAdmin = false }: EditProjectDialogProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [isFetching, setIsFetching] = useState(false)
  const [pocs, setPocs] = useState<POC[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Match HTML reference form fields exactly
  const [formData, setFormData] = useState({
    name: "",
    pocId: "",
    location: "",
    status: "",
    material: "",
    quantity: "",
    courier: "",
    deliveryDate: "",
  })

  const today = new Date().toISOString().split("T")[0]

  // Load form data when dialog opens
  useEffect(() => {
    if (!open || !project) return

    async function loadData() {
      if (!project) return
      setIsFetching(true)
      try {
        const teamRes = await fetch("/api/team-list")
        if (teamRes.ok) {
          const team = await teamRes.json()
          setPocs(team.map((u: { id: string; name: string }) => ({ id: u.id, name: u.name })))
        }

        // Set form data from project - match HTML reference exactly
        setFormData({
          name: project.name || "",
          pocId: project.pocId || "",
          location: project.location || "",
          // Convert status to lowercase to match HTML reference
          status: project.status?.toLowerCase() || "requested",
          // Get material from first collateral or empty
          material: project.material || project.collaterals?.[0]?.itemName || "",
          // Get quantity from first collateral or empty
          quantity: project.quantity?.toString() || project.collaterals?.[0]?.quantity?.toString() || "",
          // Courier with "-" as default (Not assigned)
          courier: project.dispatch?.courier || "-",
          deliveryDate: project.deliveryDate ? project.deliveryDate.split("T")[0] : "",
        })
      } catch {
        toast.error("Failed to load form data")
      } finally {
        setIsFetching(false)
      }
    }

    loadData()
  }, [open, project])

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!formData.name.trim() || formData.name.trim().length < 3) errs.name = "Project name must be at least 3 characters"
    if (!formData.pocId) errs.pocId = "Please select a POC"
    if (!formData.location) errs.location = "Please select a location"
    if (!formData.status) errs.status = "Please select a status"
    if (!formData.deliveryDate) errs.deliveryDate = "Delivery date is required"
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) { toast.error("Please fix the errors before saving"); return }
    if (!project) return

    setIsLoading(true)
    try {
      // Create collateral from simple material/quantity fields (matching HTML reference)
      const collateral = formData.material ? [{
        itemName: formData.material,
        quantity: parseInt(formData.quantity) || 1,
      }] : undefined

      const res = await fetch(`/api/projects/${project.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          pocId: formData.pocId,
          location: formData.location,
          deliveryDate: formData.deliveryDate,
          // Status is visible to all (matching HTML reference)
          status: formData.status.toUpperCase(),
          // Simple material/quantity (matching HTML reference)
          material: formData.material,
          quantity: parseInt(formData.quantity) || 0,
          collaterals: collateral,
          // Courier with "Not assigned" option (matching HTML reference)
          ...(formData.courier && formData.courier !== "-" ? {
            dispatch: {
              courier: formData.courier,
              trackingId: "",
            }
          } : {}),
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

  if (!project || !open) return null

  return (
    <div className="modal-overlay" onClick={(e) => {
      if (e.target === e.currentTarget) onOpenChange(false)
    }}>
      <div className="modal" style={{ maxWidth: '900px' }} onClick={(e) => e.stopPropagation()}>
        {/* Modal Header - Matching HTML exactly */}
        <div className="modal-header">
          <div>
            <h2 className="modal-title">Edit Project</h2>
            <p className="modal-subtitle">{project.id} • {project.name}</p>
          </div>
          <button className="modal-close" onClick={() => onOpenChange(false)}>
            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body">
          {isFetching ? (
            <div style={{ textAlign: 'center', padding: '48px' }}>
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3" style={{ color: '#003c71' }} />
              <p style={{ color: '#64748b', fontSize: '14px' }}>Loading project data...</p>
            </div>
          ) : (
            <form id="editProjectForm" onSubmit={handleSubmit} noValidate>
              {/* Form Grid - Matching HTML form-grid class */}
              <div className="form-grid">
                {/* Project Name */}
                <div className="form-group">
                  <label className="form-label">Project Name *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.name}
                    onChange={(e) => { setFormData({ ...formData, name: e.target.value }); setErrors({ ...errors, name: "" }) }}
                    style={errors.name ? { borderColor: '#ef4444' } : {}}
                  />
                  {errors.name && <p style={{ fontSize: '12px', color: '#ef4444', marginTop: '4px' }}>{errors.name}</p>}
                </div>

                {/* POC Name */}
                <div className="form-group">
                  <label className="form-label">POC Name *</label>
                  <select
                    className="form-select"
                    value={formData.pocId}
                    onChange={(e) => { setFormData({ ...formData, pocId: e.target.value }); setErrors({ ...errors, pocId: "" }) }}
                    style={errors.pocId ? { borderColor: '#ef4444' } : {}}
                  >
                    <option value="">Select POC</option>
                    {pocs.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                  {errors.pocId && <p style={{ fontSize: '12px', color: '#ef4444', marginTop: '4px' }}>{errors.pocId}</p>}
                </div>

                {/* Location */}
                <div className="form-group">
                  <label className="form-label">Location *</label>
                  <select
                    className="form-select"
                    value={formData.location}
                    onChange={(e) => { setFormData({ ...formData, location: e.target.value }); setErrors({ ...errors, location: "" }) }}
                    style={errors.location ? { borderColor: '#ef4444' } : {}}
                  >
                    <option value="">Select Location</option>
                    {LOCATIONS.map((loc) => (
                      <option key={loc} value={loc}>{loc}</option>
                    ))}
                  </select>
                  {errors.location && <p style={{ fontSize: '12px', color: '#ef4444', marginTop: '4px' }}>{errors.location}</p>}
                </div>

                {/* Status - Visible to ALL like HTML reference */}
                <div className="form-group">
                  <label className="form-label">Status *</label>
                  <select
                    className="form-select"
                    value={formData.status}
                    onChange={(e) => { setFormData({ ...formData, status: e.target.value }); setErrors({ ...errors, status: "" }) }}
                    style={errors.status ? { borderColor: '#ef4444' } : {}}
                  >
                    {PROJECT_STATUSES.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                  {errors.status && <p style={{ fontSize: '12px', color: '#ef4444', marginTop: '4px' }}>{errors.status}</p>}
                </div>

                {/* Material - Simple text like HTML */}
                <div className="form-group">
                  <label className="form-label">Material</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.material}
                    onChange={(e) => setFormData({ ...formData, material: e.target.value })}
                    placeholder="e.g., Standee, Poster, One Pager"
                  />
                </div>

                {/* Quantity - Simple number like HTML */}
                <div className="form-group">
                  <label className="form-label">Quantity</label>
                  <input
                    type="number"
                    className="form-input"
                    min="1"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  />
                </div>

                {/* Courier with "Not assigned" like HTML */}
                <div className="form-group">
                  <label className="form-label">Courier</label>
                  <select
                    className="form-select"
                    value={formData.courier}
                    onChange={(e) => setFormData({ ...formData, courier: e.target.value })}
                  >
                    {COURIERS.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>

                {/* Delivery Date */}
                <div className="form-group">
                  <label className="form-label">Delivery Date</label>
                  <input
                    type="date"
                    className="form-input"
                    min={today}
                    value={formData.deliveryDate}
                    onChange={(e) => { setFormData({ ...formData, deliveryDate: e.target.value }); setErrors({ ...errors, deliveryDate: "" }) }}
                    style={errors.deliveryDate ? { borderColor: '#ef4444' } : {}}
                  />
                  {errors.deliveryDate && <p style={{ fontSize: '12px', color: '#ef4444', marginTop: '4px' }}>{errors.deliveryDate}</p>}
                </div>
              </div>
            </form>
          )}
        </div>

        {/* Modal Footer - Matching HTML exactly */}
        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => document.getElementById('editProjectForm')?.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }))}
            disabled={isLoading}
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            {isLoading ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</>
            ) : (
              <>
                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
