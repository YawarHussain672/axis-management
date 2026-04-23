"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Save, Trash2, Loader2, Receipt } from "lucide-react"
import { toast } from "sonner"

type VolumeSlab = { slab: string; price: number }
interface RateCardItem { id: string; itemName: string; specification: string; volumeSlabs: unknown; active: boolean }

interface RateCardClientProps { initialItems: RateCardItem[] }

export function RateCardClient({ initialItems }: RateCardClientProps) {
  const router = useRouter()
  const [items, setItems] = useState(initialItems)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState<string | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [addLoading, setAddLoading] = useState(false)
  const [newItem, setNewItem] = useState({ itemName: "", specification: "", slabs: [{ slab: "", price: 0 }] })

  const getSlabs = (item: RateCardItem) => item.volumeSlabs as VolumeSlab[]

  const updateSlab = (itemId: string, slabIdx: number, price: number) => {
    setItems(items.map((item) => {
      if (item.id !== itemId) return item
      const slabs = [...getSlabs(item)]
      slabs[slabIdx] = { ...slabs[slabIdx], price }
      return { ...item, volumeSlabs: slabs }
    }))
    setEditingId(itemId)
  }

  const saveItem = async (item: RateCardItem) => {
    setSaving(item.id)
    try {
      const res = await fetch(`/api/rate-card/${item.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ volumeSlabs: getSlabs(item) }),
      })
      if (res.ok) {
        toast.success(`${item.itemName} pricing saved!`)
        setEditingId(null)
        router.refresh()
      } else {
        toast.error("Failed to save")
      }
    } catch {
      toast.error("Something went wrong")
    } finally {
      setSaving(null)
    }
  }

  const deleteItem = async (id: string, name: string) => {
    if (!confirm(`Remove "${name}" from rate card?`)) return
    setSaving(id)
    try {
      const res = await fetch(`/api/rate-card/${id}`, { method: "DELETE" })
      if (res.ok) {
        toast.success(`${name} removed`)
        setItems(items.filter((i) => i.id !== id))
      } else {
        toast.error("Failed to remove")
      }
    } catch {
      toast.error("Something went wrong")
    } finally {
      setSaving(null)
    }
  }

  const addNewItem = async () => {
    setAddLoading(true)
    try {
      const res = await fetch("/api/rate-card", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemName: newItem.itemName, specification: newItem.specification, volumeSlabs: newItem.slabs }),
      })
      if (res.ok) {
        const created = await res.json()
        setItems([...items, created])
        toast.success("Item added!")
        setAddOpen(false)
        setNewItem({ itemName: "", specification: "", slabs: [{ slab: "", price: 0 }] })
        router.refresh()
      } else {
        const d = await res.json()
        toast.error(d.error || "Failed")
      }
    } catch {
      toast.error("Something went wrong")
    } finally {
      setAddLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900">Rate Card</h1>
          <p className="text-gray-500 mt-1">Manage pricing for all print collaterals</p>
        </div>
        <Button className="gap-2 bg-[#003c71] hover:bg-[#002a52]" onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4" /> Add Item
        </Button>
      </div>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50/80 hover:bg-gray-50">
                <TableHead className="font-bold text-gray-500 uppercase text-xs tracking-wider w-10">#</TableHead>
                <TableHead className="font-bold text-gray-500 uppercase text-xs tracking-wider">Item</TableHead>
                <TableHead className="font-bold text-gray-500 uppercase text-xs tracking-wider">Specification</TableHead>
                <TableHead className="font-bold text-gray-500 uppercase text-xs tracking-wider">Volume Slabs & Pricing (₹)</TableHead>
                <TableHead className="font-bold text-gray-500 uppercase text-xs tracking-wider w-28">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item, index) => (
                <TableRow key={item.id} className={`hover:bg-gray-50/50 ${editingId === item.id ? "bg-amber-50/30" : ""}`}>
                  <TableCell className="font-mono text-gray-400 text-sm">{index + 1}</TableCell>
                  <TableCell className="font-semibold text-gray-900">{item.itemName}</TableCell>
                  <TableCell className="text-sm text-gray-500 max-w-[200px]">{item.specification}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-2">
                      {getSlabs(item).map((slab, idx) => (
                        <div key={idx} className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 px-2.5 py-1.5 rounded-lg text-sm">
                          <span className="text-gray-400 text-xs font-medium">{slab.slab}:</span>
                          <span className="text-gray-300">₹</span>
                          <Input
                            type="number"
                            defaultValue={slab.price}
                            step="0.01"
                            className="w-20 h-6 text-sm font-mono border-0 bg-transparent p-0 focus-visible:ring-0"
                            onChange={(e) => updateSlab(item.id, idx, parseFloat(e.target.value) || 0)}
                          />
                        </div>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {editingId === item.id && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-green-600 hover:bg-green-50"
                          onClick={() => saveItem(item)}
                          disabled={saving === item.id}
                        >
                          {saving === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-500 hover:bg-red-50"
                        onClick={() => deleteItem(item.id, item.itemName)}
                        disabled={saving === item.id}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-16 text-gray-400">
                    <Receipt className="h-12 w-12 mx-auto mb-3 text-gray-200" />
                    <p className="font-medium">No rate card items</p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Add Rate Card Item</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Item Name</Label>
              <Input value={newItem.itemName} onChange={(e) => setNewItem({ ...newItem, itemName: e.target.value })} placeholder="e.g. Flier" />
            </div>
            <div className="space-y-1.5">
              <Label>Specification</Label>
              <Input value={newItem.specification} onChange={(e) => setNewItem({ ...newItem, specification: e.target.value })} placeholder="e.g. A4, 90 GSM, 4+4 color" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Volume Slabs</Label>
                <Button type="button" variant="outline" size="sm" onClick={() => setNewItem({ ...newItem, slabs: [...newItem.slabs, { slab: "", price: 0 }] })}>
                  <Plus className="h-3 w-3 mr-1" /> Add Slab
                </Button>
              </div>
              {newItem.slabs.map((slab, idx) => (
                <div key={idx} className="flex gap-2">
                  <Input placeholder="Volume (e.g. 1000)" value={slab.slab} onChange={(e) => { const s = [...newItem.slabs]; s[idx].slab = e.target.value; setNewItem({ ...newItem, slabs: s }) }} />
                  <Input type="number" placeholder="Price ₹" value={slab.price || ""} onChange={(e) => { const s = [...newItem.slabs]; s[idx].price = parseFloat(e.target.value) || 0; setNewItem({ ...newItem, slabs: s }) }} />
                  {newItem.slabs.length > 1 && (
                    <Button type="button" variant="ghost" size="icon" className="text-red-500 shrink-0" onClick={() => setNewItem({ ...newItem, slabs: newItem.slabs.filter((_, i) => i !== idx) })}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button className="bg-[#003c71] hover:bg-[#002a52]" onClick={addNewItem} disabled={addLoading}>
              {addLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add Item"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
