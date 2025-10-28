"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";

interface PendingUser {
  id: number;
  email: string;
  referenceCode: string;
  createdAt: string;
}

interface Client {
  id: number;
  name: string;
  surname: string;
  phoneNumber: string | null;
  userId: number | null;
}

export default function PendingClientsPage() {
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [existingClients, setExistingClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [referenceCode, setReferenceCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // Fetch pending users
  useEffect(() => {
    fetchPendingUsers();
  }, []);

  // Fetch existing clients
  useEffect(() => {
    fetchExistingClients();
  }, []);

  const fetchPendingUsers = async () => {
    try {
      const response = await fetch("/api/pending-clients");
      const data = await response.json();
      setPendingUsers(data.users || []);
    } catch (error) {
      console.error("Error fetching pending users:", error);
    }
  };

  const fetchExistingClients = async () => {
    try {
      const response = await fetch("/api/clients");
      const data = await response.json();
      setExistingClients(data.clients || []);
    } catch (error) {
      console.error("Error fetching clients:", error);
    }
  };

  const handleMatch = async () => {
    if (!selectedClient || !referenceCode) {
      setMessage("Please select a client and enter a reference code");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/pending-clients/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          referenceCode,
          clientId: selectedClient.id,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage("✅ Client matched and approved successfully!");
        setReferenceCode("");
        setSelectedClient(null);
        // Refresh lists
        fetchPendingUsers();
        fetchExistingClients();
      } else {
        setMessage(`❌ Error: ${data.error}`);
      }
    } catch (error) {
      setMessage("❌ Failed to match client");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Pending Client Approvals
        </h1>
        <p className="text-gray-600">
          Approve new client registrations by matching them with existing
          clients
        </p>
      </div>

      {/* Message */}
      {message && (
        <div
          className={`mb-6 p-4 rounded-lg ${
            message.includes("✅")
              ? "bg-green-100 text-green-800 border border-green-200"
              : "bg-red-100 text-red-800 border border-red-200"
          }`}
        >
          {message}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Pending users waiting for approval */}
        <section>
          <h2 className="text-xl font-semibold mb-4">
            Waiting for Approval ({pendingUsers.length})
          </h2>

          {pendingUsers.length === 0 ? (
            <div className="bg-gray-50 p-6 rounded-lg text-center">
              <p className="text-gray-500">No pending approvals</p>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Reference Code
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Registered
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {pendingUsers.map((user) => (
                    <tr key={user.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {user.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {user.referenceCode}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(user.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Match form */}
        <section>
          <h2 className="text-xl font-semibold mb-4">
            Match with Existing Client
          </h2>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Existing Client
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={selectedClient?.id || ""}
                  onChange={(e) => {
                    const client = existingClients.find(
                      (c) => c.id === parseInt(e.target.value)
                    );
                    setSelectedClient(client || null);
                  }}
                >
                  <option value="">Select existing client...</option>
                  {existingClients
                    .filter((c) => !c.userId) // Only show unlinked clients
                    .map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.name} {client.surname} -{" "}
                        {client.phoneNumber || "No phone"}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reference Code
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter reference code (e.g., REF-A1B2C3)"
                  value={referenceCode}
                  onChange={(e) =>
                    setReferenceCode(e.target.value.toUpperCase())
                  }
                />
              </div>

              <button
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleMatch}
                disabled={!selectedClient || !referenceCode || loading}
              >
                {loading ? "Processing..." : "Confirm Match & Approve"}
              </button>
            </div>
          </div>
        </section>
      </div>

      {/* Navigation */}
      <div className="mt-8 text-center">
        <Link
          href="/clients"
          className="text-blue-600 hover:text-blue-800 font-medium"
        >
          ← Back to Clients
        </Link>
      </div>
    </div>
  );
}

