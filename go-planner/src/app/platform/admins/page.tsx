import { asc } from "drizzle-orm";
import { db } from "@/core/db";
import { platformAdmins } from "@/core/db/schema";
import { requirePlatformAdmin } from "../guard";

export default async function PlatformAdminsPage() {
  const me = await requirePlatformAdmin();

  const rows = await db
    .select()
    .from(platformAdmins)
    .orderBy(asc(platformAdmins.createdAt));

  return (
    <div>
      <h1 className="text-xl font-bold text-brand-navy">
        Administradores da plataforma
      </h1>
      <p className="mt-1 text-sm text-gray-500">
        Staff com acesso à área de plataforma. O provisionamento é por allowlist
        de emails (<code className="text-xs">PLATFORM_ADMIN_EMAILS</code>): quem
        está na lista é ativado no primeiro acesso.
      </p>

      <ul className="mt-5 divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white">
        {rows.length === 0 ? (
          <li className="p-4 text-sm text-gray-500">
            Ainda não há administradores de plataforma.
          </li>
        ) : (
          rows.map((a) => (
            <li key={a.id} className="flex items-center justify-between p-4">
              <div>
                <div className="text-sm font-medium text-brand-navy">
                  {a.name ?? a.email}
                  {a.authUserId === me.authUserId && (
                    <span className="ml-2 text-xs text-gray-400">(tu)</span>
                  )}
                </div>
                <div className="text-xs text-gray-400">{a.email}</div>
              </div>
              <span
                className={
                  a.role === "owner"
                    ? "text-xs font-medium text-brand-purple"
                    : "text-xs font-medium text-gray-500"
                }
              >
                {a.role === "owner" ? "Owner" : "Admin"}
              </span>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
