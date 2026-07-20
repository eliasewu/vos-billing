"use client";

import { useEffect, useState } from "react";
import {
  Users,
  Plus,
  Edit2,
  Trash2,
  X,
  Search,
  RefreshCw,
} from "lucide-react";

interface Customer {
  id: number;
  customer_name: string;
  customer_type: number;
  status: number;
  balance: number;
  credit: number;
  contact_name: string;
  contact_phone: string;
  contact_email: string;
  create_time: string;
  remark: string;
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "0" | "1">("all");
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    customer_name: "",
    customer_type: 0,
    status: 1,
    balance: 0,
    credit: 0,
    contact_name: "",
    contact_phone: "",
    contact_email: "",
    remark: "",
  });

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/vos/customers");
      const data = await res.json();
      setCustomers(data.customers || []);
      if (data.error) setError(data.error);
    } catch {
      setError("Failed to fetch customers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const url = editingCustomer
        ? `/api/vos/customers/${editingCustomer.id}`
        : "/api/vos/customers";
      const method = editingCustomer ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setShowModal(false);
        setEditingCustomer(null);
        fetchCustomers();
      }
    } catch {
      setError("Failed to save customer");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this customer?")) return;

    try {
      const res = await fetch(`/api/vos/customers/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        fetchCustomers();
      }
    } catch {
      setError("Failed to delete customer");
    }
  };

  const openEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setForm({
      customer_name: customer.customer_name,
      customer_type: customer.customer_type,
      status: customer.status,
      balance: customer.balance,
      credit: customer.credit,
      contact_name: customer.contact_name || "",
      contact_phone: customer.contact_phone || "",
      contact_email: customer.contact_email || "",
      remark: customer.remark || "",
    });
    setShowModal(true);
  };

  const openAdd = () => {
    setEditingCustomer(null);
    setForm({
      customer_name: "",
      customer_type: 0,
      status: 1,
      balance: 0,
      credit: 0,
      contact_name: "",
      contact_phone: "",
      contact_email: "",
      remark: "",
    });
    setShowModal(true);
  };

  const filtered = customers.filter((c) => {
    const matchesSearch = c.customer_name
      .toLowerCase()
      .includes(search.toLowerCase());
    const matchesType =
      typeFilter === "all" || c.customer_type === parseInt(typeFilter);
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-50 flex items-center gap-2">
            <Users className="w-6 h-6 text-brand-400" />
            Customers
          </h1>
          <p className="text-surface-400 text-sm mt-1">
            Manage customer accounts (General & Clearing)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchCustomers}
            className="p-2 rounded-lg bg-surface-800 border border-surface-700 text-surface-400 hover:text-surface-50"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-surface-50 rounded-lg text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            Add Customer
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search customers..."
            className="w-full pl-10 pr-4 py-2 bg-surface-900 border border-surface-700 rounded-lg text-sm text-surface-50 focus:outline-none focus:border-brand-500"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as "all" | "0" | "1")}
          className="px-4 py-2 bg-surface-900 border border-surface-700 rounded-lg text-sm text-surface-50 focus:outline-none"
        >
          <option value="all">All Types</option>
          <option value="0">General (Client)</option>
          <option value="1">Clearing (Supplier)</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-surface-900 border border-surface-700/50 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-800/50 border-b border-surface-700/50">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-surface-400">
                  ID
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-surface-400">
                  Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-surface-400">
                  Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-surface-400">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-surface-400">
                  Balance
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-surface-400">
                  Credit
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-surface-400">
                  Contact
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-surface-400">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-800">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center">
                    <div className="flex items-center justify-center">
                      <div className="w-6 h-6 border-2 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" />
                    </div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-surface-500">
                    No customers found
                  </td>
                </tr>
              ) : (
                filtered.map((c) => (
                  <tr key={c.id} className="hover:bg-surface-800/30">
                    <td className="px-4 py-3 font-mono text-surface-400">
                      {c.id}
                    </td>
                    <td className="px-4 py-3 text-surface-50 font-medium">
                      {c.customer_name}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-medium ${
                          c.customer_type === 0
                            ? "bg-blue-500/10 text-blue-400"
                            : "bg-purple-500/10 text-purple-400"
                        }`}
                      >
                        {c.customer_type === 0 ? "General" : "Clearing"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-medium ${
                          c.status === 1
                            ? "bg-emerald-500/10 text-emerald-400"
                            : "bg-red-500/10 text-red-400"
                        }`}
                      >
                        {c.status === 1 ? "Active" : "Disabled"}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-emerald-400">
                      ${(Number(c.balance)||0).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 font-mono text-surface-300">
                      ${(Number(c.credit)||0).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-surface-300 text-xs">
                      {c.contact_email || c.contact_phone || "-"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEdit(c)}
                          className="p-1.5 rounded hover:bg-surface-700 text-surface-400 hover:text-surface-50"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(c.id)}
                          className="p-1.5 rounded hover:bg-red-500/10 text-surface-400 hover:text-red-400"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-surface-900 border border-surface-700 rounded-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-surface-50">
                {editingCustomer ? "Edit Customer" : "Add Customer"}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-surface-400 hover:text-surface-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-surface-400 mb-1">
                  Customer Name *
                </label>
                <input
                  value={form.customer_name}
                  onChange={(e) =>
                    setForm({ ...form, customer_name: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-sm text-surface-50 focus:outline-none focus:border-brand-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-surface-400 mb-1">
                    Type
                  </label>
                  <select
                    value={form.customer_type}
                    onChange={(e) =>
                      setForm({ ...form, customer_type: parseInt(e.target.value) })
                    }
                    className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-sm text-surface-50 focus:outline-none"
                  >
                    <option value={0}>General (Client)</option>
                    <option value={1}>Clearing (Supplier)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-surface-400 mb-1">
                    Status
                  </label>
                  <select
                    value={form.status}
                    onChange={(e) =>
                      setForm({ ...form, status: parseInt(e.target.value) })
                    }
                    className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-sm text-surface-50 focus:outline-none"
                  >
                    <option value={1}>Active</option>
                    <option value={0}>Disabled</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-surface-400 mb-1">
                    Balance
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.balance}
                    onChange={(e) =>
                      setForm({ ...form, balance: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-sm text-surface-50 focus:outline-none focus:border-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-surface-400 mb-1">
                    Credit Limit
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.credit}
                    onChange={(e) =>
                      setForm({ ...form, credit: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-sm text-surface-50 focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-surface-400 mb-1">
                  Contact Name
                </label>
                <input
                  value={form.contact_name}
                  onChange={(e) =>
                    setForm({ ...form, contact_name: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-sm text-surface-50 focus:outline-none focus:border-brand-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-surface-400 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={form.contact_email}
                    onChange={(e) =>
                      setForm({ ...form, contact_email: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-sm text-surface-50 focus:outline-none focus:border-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-surface-400 mb-1">
                    Phone
                  </label>
                  <input
                    value={form.contact_phone}
                    onChange={(e) =>
                      setForm({ ...form, contact_phone: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-sm text-surface-50 focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-surface-400 mb-1">
                  Remark
                </label>
                <textarea
                  value={form.remark}
                  onChange={(e) => setForm({ ...form, remark: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-sm text-surface-50 focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2 border border-surface-700 text-surface-300 rounded-lg text-sm hover:bg-surface-800"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!form.customer_name || saving}
                className="flex-1 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-surface-50 rounded-lg text-sm font-medium disabled:opacity-50"
              >
                {saving ? "Saving..." : editingCustomer ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
