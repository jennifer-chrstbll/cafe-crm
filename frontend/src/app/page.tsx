"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { homeFor, useAuth } from "@/contexts/AuthContext";
import { FullPageLoader } from "@/components/app/states";

export default function Home() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (!isLoading) router.replace(user ? homeFor(user) : "/login");
  }, [user, isLoading, router]);
  return <FullPageLoader />;
}
