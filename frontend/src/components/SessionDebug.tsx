"use client";

import { useSession } from "next-auth/react";

export default function SessionDebug() {
  const session = useSession();
  return null;
}
