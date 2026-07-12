"use client";

import { useEffect, useState } from "react";

import { apiFetch } from "@/lib/api";

interface AdminUser {
  id: string;
  email: string | null;
  displayName: string | null;
  roles: string[];
  status: string;
  createdAt: string;
}

interface RoleSummary {
  id: string;
  name: string;
  description: string | null;
}

export default function UsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [roles, setRoles] = useState<RoleSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiFetch<AdminUser[]>("/admin/users"),
      apiFetch<RoleSummary[]>("/admin/roles"),
    ])
      .then(([userList, roleList]) => {
        setUsers(userList);
        setRoles(roleList);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  async function assignRole(userId: string, roleName: string) {
    try {
      const updated = await apiFetch<AdminUser>(`/admin/users/${userId}/roles`, {
        method: "PATCH",
        body: JSON.stringify({ roleNames: [roleName] }),
      });
      setUsers((prev) => prev.map((user) => (user.id === userId ? updated : user)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to assign role");
    }
  }

  if (loading) {
    return <p className="text-neutral-500">Loading users…</p>;
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-display font-bold">Users & Roles</h1>
      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      <div className="mb-8">
        <h2 className="mb-3 text-lg font-semibold">Roles</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {roles.map((role) => (
            <div key={role.id} className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
              <p className="font-medium">{role.name}</p>
              <p className="text-sm text-neutral-500">{role.description}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-800">
        <table className="min-w-full text-sm">
          <thead className="bg-neutral-50 dark:bg-neutral-900">
            <tr>
              <th className="px-4 py-3 text-left font-semibold">User</th>
              <th className="px-4 py-3 text-left font-semibold">Status</th>
              <th className="px-4 py-3 text-left font-semibold">Roles</th>
              <th className="px-4 py-3 text-left font-semibold">Assign role</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-t border-neutral-200 dark:border-neutral-800">
                <td className="px-4 py-3">
                  <p className="font-medium">{user.displayName ?? "—"}</p>
                  <p className="text-neutral-500">{user.email ?? user.id}</p>
                </td>
                <td className="px-4 py-3">{user.status}</td>
                <td className="px-4 py-3">{user.roles.join(", ") || "—"}</td>
                <td className="px-4 py-3">
                  <select
                    className="rounded border border-neutral-300 px-2 py-1 dark:border-neutral-700 dark:bg-neutral-900"
                    defaultValue=""
                    onChange={(e) => {
                      if (e.target.value) void assignRole(user.id, e.target.value);
                    }}
                  >
                    <option value="" disabled>
                      Select role
                    </option>
                    {roles.map((role) => (
                      <option key={role.id} value={role.name}>
                        {role.name}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
