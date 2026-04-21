"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { MapPin, ExternalLink, Truck, Calendar, Package, Copy, CheckCircle2 } from "lucide-react"
import { formatDate } from "@/utils/formatters"
import { toast } from "sonner"

interface TrackButtonProps {
  courier: string
  trackingId: string
  dispatchDate: Date | null
  expectedDelivery: Date | null
  actualDelivery: Date | null
}

// Direct tracking URLs for each courier — lands on the actual tracking result page
function getTrackingUrl(courier: string, trackingId: string): { url: string; label: string } {
  const c = courier.toLowerCase()

  if (c.includes("blue dart") || c.includes("bluedart")) {
    return {
      url: `https://www.bluedart.com/web/guest/trackdartresult?trackFor=0&trackNo=${trackingId}`,
      label: "Blue Dart",
    }
  }
  if (c.includes("dtdc")) {
    return {
      url: `https://www.dtdc.in/tracking.asp?Ttype=awb&TNo=${trackingId}`,
      label: "DTDC",
    }
  }
  if (c.includes("fedex")) {
    return {
      url: `https://www.fedex.com/fedextrack/?trknbr=${trackingId}`,
      label: "FedEx",
    }
  }
  if (c.includes("delhivery")) {
    return {
      url: `https://www.delhivery.com/track/package/${trackingId}`,
      label: "Delhivery",
    }
  }
  if (c.includes("ekart") || c.includes("flipkart")) {
    return {
      url: `https://ekartlogistics.com/shipmenttrack/${trackingId}`,
      label: "Ekart",
    }
  }
  if (c.includes("xpressbees")) {
    return {
      url: `https://www.xpressbees.com/shipment/tracking?awbNo=${trackingId}`,
      label: "XpressBees",
    }
  }
  if (c.includes("shadowfax")) {
    return {
      url: `https://tracker.shadowfax.in/?awb=${trackingId}`,
      label: "Shadowfax",
    }
  }
  if (c.includes("ecom") || c.includes("ecom express")) {
    return {
      url: `https://ecomexpress.in/tracking/?awb_field=${trackingId}`,
      label: "Ecom Express",
    }
  }
  if (c.includes("india post") || c.includes("speed post")) {
    return {
      url: `https://www.indiapost.gov.in/_layouts/15/dop.portal.tracking/trackconsignment.aspx`,
      label: "India Post",
    }
  }
  // Fallback — Google search with courier name + tracking ID
  return {
    url: `https://www.google.com/search?q=${encodeURIComponent(courier)}+tracking+${encodeURIComponent(trackingId)}`,
    label: courier,
  }
}

export function TrackButton({ courier, trackingId, dispatchDate, expectedDelivery, actualDelivery }: TrackButtonProps) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  const { url, label } = getTrackingUrl(courier, trackingId)

  const copyTrackingId = () => {
    navigator.clipboard.writeText(trackingId)
    setCopied(true)
    toast.success("Tracking ID copied!")
    setTimeout(() => setCopied(false), 2000)
  }

  const isDelivered = !!actualDelivery

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <MapPin className="h-4 w-4" />
          Track
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-blue-600" />
            Track Shipment
          </DialogTitle>
          <DialogDescription>Live tracking via {label}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Courier & Tracking ID */}
          <div className="p-4 bg-slate-50 rounded-xl space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-500">Courier</span>
              <span className="font-semibold text-slate-900">{courier}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-500">Tracking ID</span>
              <div className="flex items-center gap-2">
                <span className="font-mono font-semibold text-slate-900">{trackingId}</span>
                <button onClick={copyTrackingId} className="text-slate-400 hover:text-slate-700 transition-colors">
                  {copied ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div className="space-y-1">
            <h4 className="text-sm font-semibold text-slate-700 mb-3">Shipment Timeline</h4>

            <div className="relative pl-6">
              <div className="absolute left-2 top-2 bottom-2 w-0.5 bg-slate-200" />

              {/* Dispatched */}
              <div className="relative mb-4">
                <div className="absolute -left-4 top-1 w-4 h-4 rounded-full bg-blue-500 border-2 border-white shadow" />
                <div className="bg-blue-50 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-blue-600" />
                    <p className="text-sm font-semibold text-blue-900">Dispatched</p>
                  </div>
                  <p className="text-xs text-blue-600 mt-0.5">{dispatchDate ? formatDate(dispatchDate) : "—"}</p>
                </div>
              </div>

              {/* Expected Delivery */}
              <div className="relative mb-4">
                <div className={`absolute -left-4 top-1 w-4 h-4 rounded-full border-2 border-white shadow ${isDelivered ? "bg-green-500" : "bg-amber-400"}`} />
                <div className={`rounded-lg p-3 ${isDelivered ? "bg-green-50" : "bg-amber-50"}`}>
                  <div className="flex items-center gap-2">
                    <Calendar className={`h-4 w-4 ${isDelivered ? "text-green-600" : "text-amber-600"}`} />
                    <p className={`text-sm font-semibold ${isDelivered ? "text-green-900" : "text-amber-900"}`}>
                      Expected Delivery
                    </p>
                  </div>
                  <p className={`text-xs mt-0.5 ${isDelivered ? "text-green-600" : "text-amber-600"}`}>
                    {expectedDelivery ? formatDate(expectedDelivery) : "TBD"}
                  </p>
                </div>
              </div>

              {/* Delivered */}
              <div className="relative">
                <div className={`absolute -left-4 top-1 w-4 h-4 rounded-full border-2 border-white shadow ${isDelivered ? "bg-green-600" : "bg-slate-200"}`} />
                <div className={`rounded-lg p-3 ${isDelivered ? "bg-green-100" : "bg-slate-50"}`}>
                  <div className="flex items-center gap-2">
                    <MapPin className={`h-4 w-4 ${isDelivered ? "text-green-700" : "text-slate-400"}`} />
                    <p className={`text-sm font-semibold ${isDelivered ? "text-green-900" : "text-slate-400"}`}>
                      {isDelivered ? "Delivered ✓" : "Awaiting Delivery"}
                    </p>
                  </div>
                  {isDelivered && (
                    <p className="text-xs text-green-700 mt-0.5">{formatDate(actualDelivery!)}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Track on courier website */}
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-[#003c71] hover:bg-[#002a52] text-white font-semibold rounded-xl transition-colors"
          >
            <ExternalLink className="h-4 w-4" />
            Track on {label} Website
          </a>
          <p className="text-xs text-center text-slate-400">
            Opens the official {label} tracking page with your AWB number
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
