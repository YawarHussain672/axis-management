"use client"

import { NewProjectForm } from "@/components/projects/new-project-form"

export default function NewProjectPage() {
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Create New Project</h1>
        <p className="text-slate-500 text-sm mt-1">Fill in the details below to raise a new print project request</p>
      </div>
      <NewProjectForm />
    </div>
  )
}
