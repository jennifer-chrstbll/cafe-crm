"use client";

import { useCallback, useState } from "react";
import api from "@/services/api";
import { DeviceCommand } from "@/types";

/**
 * Send a command to the UNO Q / Raspberry Pi and wait for its answer
 * (POST /devices/commands, then poll GET /devices/commands/[id] every 0.8 s).
 * The server fails a command the device did not answer within 30 s.
 */
export function useDeviceCommand() {
  const [busy, setBusy] = useState<string | null>(null);
  const run = useCallback(async (device_id: string, command: string, payload?: Record<string, unknown>) => {
    setBusy(`${device_id}:${command}`);
    try {
      const r = await api.post<{ command_id: string }>("/devices/commands", { device_id, command, payload });
      const started = Date.now();
      for (;;) {
        await new Promise((res) => setTimeout(res, 800));
        const s = await api.get<DeviceCommand>(`/devices/commands/${r.data.command_id}`);
        if (s.data.status === "DONE" || s.data.status === "FAILED") return s.data;
        if (Date.now() - started > 40_000) {
          return { ...s.data, status: "FAILED", message: "Perangkat tidak menjawab." } as DeviceCommand;
        }
      }
    } finally {
      setBusy(null);
    }
  }, []);
  return { run, busy };
}
