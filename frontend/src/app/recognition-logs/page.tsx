"use client";

import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import api from "@/services/api";
import { RecognitionLog } from "@/types";
import { format } from "date-fns";

export default function RecognitionLogsPage() {
  const [logs, setLogs] = useState<RecognitionLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLogs() {
      try {
        const response = await api.get("/recognition-logs");
        setLogs(response.data);
      } catch (error) {
        console.error("Failed to fetch recognition logs", error);
      } finally {
        setLoading(false);
      }
    }
    fetchLogs();
  }, []);

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight text-primary">Recognition Logs</h1>
        </div>

        <div className="rounded-md border border-border bg-card overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Camera</TableHead>
                <TableHead>Recognized</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    Loading logs...
                  </TableCell>
                </TableRow>
              ) : logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    No recognition logs found.
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => (
                  <TableRow key={log.log_id}>
                    <TableCell>{format(new Date(log.created_at), "dd MMM HH:mm:ss")}</TableCell>
                    <TableCell className="font-medium">
                      {log.customer_name || "Unknown"}
                    </TableCell>
                    <TableCell>
                      {log.similarity_score !== null ? log.similarity_score.toFixed(3) : "-"}
                    </TableCell>
                    <TableCell>{log.camera_id || "Main"}</TableCell>
                    <TableCell>
                      {log.recognized ? (
                        <Badge variant="outline" className="bg-success/10 text-success border-success/20">YES</Badge>
                      ) : (
                        <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">NO</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </DashboardLayout>
  );
}
