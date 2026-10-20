import type { Metadata } from "next";
import { AddressesManager } from "@/components/account/AddressesManager";
import { getDb } from "@/db/client";
import { listAddresses } from "@/server/account/addresses";
import { requireAccountUser } from "@/server/auth/page-guard";

export const metadata: Metadata = { title: "My addresses" };

export default async function AddressesRoute() {
  const user = await requireAccountUser();
  return <AddressesManager initial={listAddresses(getDb(), user.id)} />;
}
