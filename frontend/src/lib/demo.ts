import { api } from "./api";
import { useQuery } from "./query";

/** Demo sign in chips. They exist only when the server runs in demo mode. */
export function useDemoAccounts(staff: boolean | "all") {
  const meta = useQuery("meta", api.meta);
  const on = meta.data?.demo;
  const pub = useQuery(on && staff !== true ? "demo/public" : null, api.demoAccounts);
  const stf = useQuery(on && staff !== false ? "demo/staff" : null, api.staffDemo);
  if (!on) return null;
  const parts = [staff !== true && pub.data, staff !== false && stf.data].filter(Boolean) as { password: string; accounts: { name: string; email: string; role: string }[] }[];
  if (parts.length === 0) return null;
  return { password: parts[0].password, accounts: parts.flatMap((p) => p.accounts) };
}
