
import React, { useState } from 'react'
import { MetricCard } from '@/components/ui/metric-card'
import { DashboardGrid } from '@/components/ui/dashboard-grid'
import { FormField } from '@/components/ui/form-field'
import { FormSection } from '@/components/ui/form-section'
import { DataTable } from '@/components/ui/data-table'
import { Modal, ConfirmModal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ColumnDef } from '@tanstack/react-table'
import { ArrowUpDown, Users, DollarSign, Activity, CreditCard } from 'lucide-react'

interface User {
  id: string
  name: string
  email: string
  role: string
  status: 'active' | 'inactive'
}

const sampleData: User[] = [
  { id: '1', name: 'John Doe', email: 'john@example.com', role: 'Admin', status: 'active' },
  { id: '2', name: 'Jane Smith', email: 'jane@example.com', role: 'User', status: 'active' },
  { id: '3', name: 'Mike Johnson', email: 'mike@example.com', role: 'User', status: 'inactive' }
]

const columns: ColumnDef<User>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Name
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    )
  },
  {
    accessorKey: "email",
    header: "Email"
  },
  {
    accessorKey: "role", 
    header: "Role"
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.getValue("status") as string
      return (
        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
          status === 'active' 
            ? 'bg-green-100 text-green-800' 
            : 'bg-red-100 text-red-800'
        }`}>
          {status}
        </span>
      )
    }
  }
]

export default function ComponentShowcase() {
  const [modalOpen, setModalOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: ''
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    if (!formData.name) newErrors.name = 'Name is required'
    if (!formData.email) newErrors.email = 'Email is required'
    if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = () => {
    if (validateForm()) {
      console.log('Form submitted:', formData)
      setModalOpen(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold">UI Components Showcase</h1>
        <p className="text-muted-foreground">Phase 1.6 Core UI Components</p>
      </div>

      {/* Dashboard Metrics */}
      <section>
        <h2 className="text-2xl font-semibold mb-4">Dashboard Metrics</h2>
        <DashboardGrid columns={4}>
          <MetricCard
            title="Total Users"
            value={2847}
            change={{ value: 12, period: "last month" }}
            icon={<Users />}
          />
          <MetricCard
            title="Revenue"
            value={45290}
            change={{ value: -3, period: "last month" }}
            icon={<DollarSign />}
            format="currency"
          />
          <MetricCard
            title="Active Sessions"
            value={1240}
            change={{ value: 8, period: "last hour" }}
            icon={<Activity />}
          />
          <MetricCard
            title="Conversion Rate"
            value={3.2}
            change={{ value: 0, period: "last week" }}
            icon={<CreditCard />}
            format="percentage"
          />
        </DashboardGrid>
      </section>

      {/* Data Table */}
      <section>
        <h2 className="text-2xl font-semibold mb-4">Data Table</h2>
        <Card>
          <CardHeader>
            <CardTitle>Users</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={columns}
              data={sampleData}
              searchPlaceholder="Search users..."
              onRowClick={(user) => console.log('Clicked user:', user)}
            />
          </CardContent>
        </Card>
      </section>

      {/* Modal System */}
      <section>
        <h2 className="text-2xl font-semibold mb-4">Modal System</h2>
        <div className="space-x-4">
          <Button onClick={() => setModalOpen(true)}>
            Open Form Modal
          </Button>
          <Button 
            variant="destructive"
            onClick={() => setConfirmOpen(true)}
          >
            Delete Action
          </Button>
        </div>

        <Modal
          open={modalOpen}
          onOpenChange={setModalOpen}
          title="User Information"
          description="Please fill out the form below"
          size="md"
        >
          <FormSection title="Contact Details">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                label="Full Name"
                name="name"
                value={formData.name}
                onChange={(value) => setFormData(prev => ({ ...prev, name: value }))}
                error={errors.name}
                required
              />
              <FormField
                label="Email Address"
                name="email"
                type="email"
                value={formData.email}
                onChange={(value) => setFormData(prev => ({ ...prev, email: value }))}
                error={errors.email}
                required
              />
            </div>
            <FormField
              label="Message"
              name="message"
              type="textarea"
              value={formData.message}
              onChange={(value) => setFormData(prev => ({ ...prev, message: value }))}
              description="Optional message or comments"
            />
          </FormSection>
          
          <div className="flex justify-end space-x-4 mt-6">
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>
              Submit
            </Button>
          </div>
        </Modal>

        <ConfirmModal
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          title="Delete Confirmation"
          description="Are you sure you want to delete this item? This action cannot be undone."
          confirmText="Delete"
          variant="destructive"
          onConfirm={() => console.log('Item deleted')}
        />
      </section>
    </div>
  )
}
