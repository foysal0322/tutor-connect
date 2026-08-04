"use client";

import { useState, useMemo } from "react";
import { UAParser } from "ua-parser-js";
import {
  format,
  subDays,
  startOfMonth,
  startOfYear,
} from "date-fns";
import {
  Download,
  RefreshCw,
  Calendar as CalendarIcon,
  Clock,
  Users,
  Activity,
  BarChart3,
  ChevronDown,
  MonitorSmartphone,
  MousePointerClick,
  Zap,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { KPI } from "@/components/ui/KPI";
import { PageHeader } from "@/components/ui/PageHeader";
import { Toolbar } from "@/components/ui/Toolbar";
import DataGrid, { type ColumnDef } from "@/components/ui/DataGrid";

interface RawVisitorLog {
  id: string;
  ip: string | null;
  userAgent: string | null;
  path: string | null;
  createdAt: Date;
}

interface ParsedVisitorLog extends RawVisitorLog {
  browser: string;
  os: string;
  device: string;
  timestamp: number;
}

const COLORS = [
  "#6366f1",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#06b6d4",
];

export default function DashboardClient({
  initialLogs,
}: {
  initialLogs: RawVisitorLog[];
}) {
  const [logs, setLogs] = useState<RawVisitorLog[]>(initialLogs);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Date Range State
  const [dateRange, setDateRange] = useState<{
    start: Date | null;
    end: Date | null;
  }>({ start: subDays(new Date(), 7), end: new Date() });
  const [presetOpen, setPresetOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch latest logs
  const refreshLogs = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch("/api/admin/visitors/raw");
      if (res.ok) {
        const data = await res.json();
        setLogs(
          data.logs.map((l: any) => ({
            ...l,
            createdAt: new Date(l.createdAt),
          })),
        );
      }
    } catch (e) {
      console.error(e);
    }
    setIsRefreshing(false);
  };

  // 1. Parse all raw logs and ignore admin paths
  const parsedLogs = useMemo<ParsedVisitorLog[]>(() => {
    return logs
      .filter((log) => {
        const path = log.path || "";
        return !path.startsWith("/admin") && !path.startsWith("/api/admin");
      })
      .map((log) => {
        const parser = new UAParser(log.userAgent || "");
        const device = parser.getDevice();
        const deviceType =
          device.type ||
          (parser.getOS().name === "iOS" || parser.getOS().name === "Android"
            ? "mobile"
            : "desktop");

        return {
          ...log,
          browser: parser.getBrowser().name || "Unknown",
          os: parser.getOS().name || "Unknown",
          device:
            deviceType === "mobile"
              ? "Mobile"
              : deviceType === "tablet"
                ? "Tablet"
                : "Desktop",
          timestamp: new Date(log.createdAt).getTime(),
        };
      });
  }, [logs]);

  // 2. Filter by Date Range and Search
  const filteredLogs = useMemo(() => {
    return parsedLogs.filter((log) => {
      // Date filter
      if (dateRange.start && dateRange.end) {
        if (log.createdAt < dateRange.start || log.createdAt > dateRange.end)
          return false;
      }

      // Search filter
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        if (
          !(
            log.path?.toLowerCase().includes(term) ||
            log.ip?.toLowerCase().includes(term) ||
            log.userAgent?.toLowerCase().includes(term)
          )
        ) {
          return false;
        }
      }

      return true;
    });
  }, [parsedLogs, dateRange, searchTerm]);

  // 3. Compute KPI Metrics
  const metrics = useMemo(() => {
    const totalVisitors = filteredLogs.length;
    const uniqueIps = new Set(filteredLogs.map((l) => l.ip));
    const uniqueVisitors = uniqueIps.size;

    // Group by IP for bounce rate and session duration
    const ipGroups: Record<string, ParsedVisitorLog[]> = {};
    filteredLogs.forEach((log) => {
      const key = log.ip || "unknown";
      if (!ipGroups[key]) ipGroups[key] = [];
      ipGroups[key].push(log);
    });

    let bounces = 0;
    let totalDurationMs = 0;
    let durationCount = 0;

    Object.values(ipGroups).forEach((group) => {
      if (group.length === 1) {
        bounces++;
      } else {
        const times = group.map((g) => g.timestamp);
        const max = Math.max(...times);
        const min = Math.min(...times);
        if (max - min > 0 && max - min < 1000 * 60 * 60 * 4) {
          totalDurationMs += max - min;
          durationCount++;
        }
      }
    });

    const bounceRate =
      uniqueVisitors > 0 ? (bounces / uniqueVisitors) * 100 : 0;
    const avgSessionSeconds =
      durationCount > 0 ? totalDurationMs / durationCount / 1000 : 0;

    const formatDuration = (seconds: number) => {
      if (seconds < 60) return `${Math.floor(seconds)}s`;
      const m = Math.floor(seconds / 60);
      const s = Math.floor(seconds % 60);
      return `${m}m ${s}s`;
    };

    const activeThreshold =
      filteredLogs.length > 0
        ? Math.max(...filteredLogs.map((l) => l.timestamp)) - 5 * 60 * 1000
        : 0;

    return {
      totalVisitors,
      uniqueVisitors,
      bounceRate: bounceRate.toFixed(1) + "%",
      avgSession: formatDuration(avgSessionSeconds),
      activeNow: parsedLogs.filter((l) => l.timestamp > activeThreshold).length,
    };
  }, [filteredLogs, parsedLogs]);

  // 4. Compute Chart Data
  const chartData = useMemo(() => {
    const trendMap: Record<string, Set<string>> = {};
    filteredLogs.forEach((log) => {
      const day = format(log.createdAt, "MMM dd");
      if (!trendMap[day]) trendMap[day] = new Set();
      if (log.ip) trendMap[day].add(log.ip);
    });
    const trend = Object.keys(trendMap).map((key) => ({
      date: key,
      visitors: trendMap[key].size,
    }));
    trend.sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );

    const deviceMap: Record<string, number> = {};
    const browserMap: Record<string, number> = {};
    const pageMap: Record<string, number> = {};

    const uniqueIpsInPeriod = new Set<string>();

    filteredLogs.forEach((log) => {
      const path = log.path || "/";
      pageMap[path] = (pageMap[path] || 0) + 1;

      if (log.ip && !uniqueIpsInPeriod.has(log.ip)) {
        uniqueIpsInPeriod.add(log.ip);
        deviceMap[log.device] = (deviceMap[log.device] || 0) + 1;
        browserMap[log.browser] = (browserMap[log.browser] || 0) + 1;
      }
    });

    const formatPie = (map: Record<string, number>) =>
      Object.keys(map)
        .map((k) => ({ name: k, value: map[k] }))
        .sort((a, b) => b.value - a.value);

    return {
      trend,
      device: formatPie(deviceMap),
      browser: formatPie(browserMap).slice(0, 5),
      pages: formatPie(pageMap).slice(0, 7),
    };
  }, [filteredLogs]);

  const handleExport = () => {
    const csvRows = [
      ["Date", "IP", "Path", "Device", "OS", "Browser", "User Agent"],
      ...filteredLogs.map((l) => [
        l.createdAt.toISOString(),
        l.ip || "",
        l.path || "",
        l.device,
        l.os,
        l.browser,
        `"${(l.userAgent || "").replace(/"/g, '""')}"`,
      ]),
    ];

    const blob = new Blob([csvRows.map((e) => e.join(",")).join("\n")], {
      type: "text/csv",
    });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `visitor-logs-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
  };

  const applyPreset = (preset: string) => {
    const now = new Date();
    let start = new Date();
    let end = new Date();

    switch (preset) {
      case "today":
        start.setHours(0, 0, 0, 0);
        break;
      case "yesterday":
        start = subDays(now, 1);
        start.setHours(0, 0, 0, 0);
        end = subDays(now, 1);
        end.setHours(23, 59, 59, 999);
        break;
      case "7days":
        start = subDays(now, 7);
        break;
      case "30days":
        start = subDays(now, 30);
        break;
      case "thisMonth":
        start = startOfMonth(now);
        break;
      case "thisYear":
        start = startOfYear(now);
        break;
      default:
        break;
    }
    setDateRange({ start, end });
    setPresetOpen(false);
  };

  // DataGrid column defs for the visitor logs table.
  const columns: ColumnDef<ParsedVisitorLog>[] = useMemo(
    () => [
      {
        header: "Date & Time",
        accessorKey: "createdAt",
        sortable: true,
        cell: (log) => (
          <div>
            <div style={{ fontWeight: 500 }}>
              {format(log.createdAt, "MMM d, yyyy")}
            </div>
            <div style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>
              {format(log.createdAt, "HH:mm:ss")}
            </div>
          </div>
        ),
      },
      {
        header: "IP Address",
        accessorKey: "ip",
        sortable: true,
        cell: (log) => (
          <span style={{ fontFamily: "monospace", color: "var(--primary)" }}>
            {log.ip || "Unknown"}
          </span>
        ),
      },
      {
        header: "Page Path",
        accessorKey: "path",
        sortable: true,
        cell: (log) => log.path || "/",
      },
      {
        header: "Device",
        accessorKey: "device",
        sortable: true,
        cell: (log) => (
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <MonitorSmartphone size={16} color="var(--text-muted)" aria-hidden="true" />
            {log.device}
          </div>
        ),
      },
      {
        header: "Browser / OS",
        accessorKey: "browser",
        cell: (log) => (
          <div>
            <div>{log.browser}</div>
            <div style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>
              {log.os}
            </div>
          </div>
        ),
      },
    ],
    [],
  );

  const presetLabel = (() => {
    if (!dateRange.start || !dateRange.end) return "Select range";
    return `${format(dateRange.start, "MMM d, yyyy")} - ${format(dateRange.end, "MMM d, yyyy")}`;
  })();

  return (
    <div style={{ padding: "0 0 var(--space-6) 0", width: "100%" }}>
      <PageHeader
        icon={<Activity size={18} aria-hidden="true" />}
        title="Visitor Analytics"
        subtitle="Real-time insights and traffic analysis"
        actions={
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            {/* Date Picker Dropdown */}
            <div style={{ position: "relative" }}>
              <button
                type="button"
                onClick={() => setPresetOpen(!presetOpen)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "0.6rem 1rem",
                  background: "var(--card-bg)",
                  border: "1px solid var(--border-color)",
                  borderRadius: "8px",
                  cursor: "pointer",
                  color: "var(--text-main)",
                  fontWeight: 500,
                }}
              >
                <CalendarIcon size={16} color="var(--text-muted)" aria-hidden="true" />
                {presetLabel}
                <ChevronDown size={16} aria-hidden="true" />
              </button>

              {presetOpen && (
                <div
                  style={{
                    position: "absolute",
                    top: "110%",
                    right: 0,
                    background: "var(--card-bg)",
                    border: "1px solid var(--border-color)",
                    borderRadius: "8px",
                    boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
                    zIndex: 50,
                    minWidth: "200px",
                    overflow: "hidden",
                  }}
                >
                  {[
                    "today",
                    "yesterday",
                    "7days",
                    "30days",
                    "thisMonth",
                    "thisYear",
                  ].map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => applyPreset(p)}
                      style={{
                        display: "block",
                        width: "100%",
                        padding: "0.75rem 1rem",
                        textAlign: "left",
                        background: "transparent",
                        border: "none",
                        borderBottom: "1px solid var(--border-color)",
                        cursor: "pointer",
                        color: "var(--text-main)",
                        fontSize: "0.9rem",
                      }}
                      onMouseOver={(e) =>
                        (e.currentTarget.style.background = "var(--bg-color)")
                      }
                      onMouseOut={(e) =>
                        (e.currentTarget.style.background = "transparent")
                      }
                    >
                      {p === "today"
                        ? "Today"
                        : p === "yesterday"
                          ? "Yesterday"
                          : p === "7days"
                            ? "Last 7 Days"
                            : p === "30days"
                              ? "Last 30 Days"
                              : p === "thisMonth"
                                ? "This Month"
                                : "This Year"}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={refreshLogs}
              disabled={isRefreshing}
              aria-label="Refresh visitor logs"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "40px",
                height: "40px",
                background: "var(--card-bg)",
                border: "1px solid var(--border-color)",
                borderRadius: "8px",
                cursor: "pointer",
                color: "var(--text-main)",
              }}
            >
              <RefreshCw size={18} className={isRefreshing ? "spin" : ""} aria-hidden="true" />
            </button>

            <button
              type="button"
              onClick={handleExport}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.6rem 1rem",
                background: "var(--text-main)",
                color: "var(--bg-color)",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                fontWeight: 500,
              }}
            >
              <Download size={16} aria-hidden="true" /> Export
            </button>
          </div>
        }
      />

      {/* COMPACT KPI TILES */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "var(--space-3)",
          marginBottom: "var(--space-5)",
        }}
      >
        <KPI
          label="Page Views"
          value={metrics.totalVisitors.toLocaleString()}
          icon={<MousePointerClick size={16} aria-hidden="true" />}
          tone="primary"
          variant="accent"
        />
        <KPI
          label="Unique Visitors"
          value={metrics.uniqueVisitors.toLocaleString()}
          icon={<Users size={16} aria-hidden="true" />}
          tone="success"
          variant="accent"
        />
        <KPI
          label="Avg Session"
          value={metrics.avgSession}
          icon={<Clock size={16} aria-hidden="true" />}
          tone="accent"
          variant="accent"
        />
        <KPI
          label="Bounce Rate"
          value={metrics.bounceRate}
          icon={<BarChart3 size={16} aria-hidden="true" />}
          tone="danger"
          variant="accent"
        />
        <KPI
          label="Active Right Now"
          value={metrics.activeNow.toLocaleString()}
          icon={<Zap size={16} aria-hidden="true" />}
          tone="primary"
          variant="accent"
          hint="Last 5 minutes"
        />
      </div>

      {/* CHARTS ROW 1 — Traffic Overview */}
      <div
        style={{
          background: "var(--card-bg)",
          padding: "var(--space-4)",
          borderRadius: "var(--radius-lg)",
          border: "1px solid var(--border-color)",
          boxShadow: "var(--shadow-sm)",
          height: "400px",
          marginBottom: "var(--space-4)",
        }}
      >
        <h3
          style={{
            margin: "0 0 var(--space-3) 0",
            fontSize: "1.1rem",
            color: "var(--text-main)",
          }}
        >
          Traffic Overview
        </h3>
        <ResponsiveContainer width="100%" height="90%">
          <AreaChart
            data={chartData.trend}
            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
          >
            <defs>
              <linearGradient id="colorVisits" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
            <XAxis
              dataKey="date"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: "var(--text-muted)" }}
              dy={10}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: "var(--text-muted)" }}
            />
            <RechartsTooltip
              contentStyle={{
                borderRadius: "8px",
                border: "1px solid var(--border-color)",
                boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
              }}
            />
            <Area
              type="monotone"
              dataKey="visitors"
              stroke="var(--primary)"
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#colorVisits)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* CHARTS ROW 2 */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: "var(--space-4)",
          marginBottom: "var(--space-5)",
        }}
      >
        <div
          style={{
            background: "var(--card-bg)",
            padding: "var(--space-4)",
            borderRadius: "var(--radius-lg)",
            border: "1px solid var(--border-color)",
            boxShadow: "var(--shadow-sm)",
            height: "350px",
          }}
        >
          <h3
            style={{
              margin: "0 0 var(--space-3) 0",
              fontSize: "1.1rem",
              color: "var(--text-main)",
            }}
          >
            Top Pages
          </h3>
          <ResponsiveContainer width="100%" height="85%">
            <BarChart
              data={chartData.pages}
              layout="vertical"
              margin={{ top: 0, right: 30, left: 20, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border-color)" />
              <XAxis type="number" hide />
              <YAxis
                dataKey="name"
                type="category"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: "var(--text-muted)" }}
                width={100}
              />
              <RechartsTooltip cursor={{ fill: "var(--bg-color)" }} contentStyle={{ borderRadius: "8px" }} />
              <Bar dataKey="value" fill="var(--primary)" radius={[0, 4, 4, 0]}>
                {chartData.pages.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div
          style={{
            background: "var(--card-bg)",
            padding: "var(--space-4)",
            borderRadius: "var(--radius-lg)",
            border: "1px solid var(--border-color)",
            boxShadow: "var(--shadow-sm)",
            height: "350px",
          }}
        >
          <h3
            style={{
              margin: "0 0 var(--space-3) 0",
              fontSize: "1.1rem",
              color: "var(--text-main)",
            }}
          >
            Device Distribution
          </h3>
          <ResponsiveContainer width="100%" height="85%">
            <PieChart>
              <Pie
                data={chartData.device}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={5}
                dataKey="value"
              >
                {chartData.device.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <RechartsTooltip contentStyle={{ borderRadius: "8px" }} />
              <Legend verticalAlign="bottom" height={36} iconType="circle" />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div
          style={{
            background: "var(--card-bg)",
            padding: "var(--space-4)",
            borderRadius: "var(--radius-lg)",
            border: "1px solid var(--border-color)",
            boxShadow: "var(--shadow-sm)",
            height: "350px",
          }}
        >
          <h3
            style={{
              margin: "0 0 var(--space-3) 0",
              fontSize: "1.1rem",
              color: "var(--text-main)",
            }}
          >
            Browser Usage
          </h3>
          <ResponsiveContainer width="100%" height="85%">
            <PieChart>
              <Pie
                data={chartData.browser}
                cx="50%"
                cy="50%"
                innerRadius={0}
                outerRadius={100}
                dataKey="value"
              >
                {chartData.browser.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                ))}
              </Pie>
              <RechartsTooltip contentStyle={{ borderRadius: "8px" }} />
              <Legend verticalAlign="bottom" height={36} iconType="circle" />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* VISITOR LOGS — DataGrid */}
      <div
        style={{
          background: "var(--card-bg)",
          borderRadius: "var(--radius-lg)",
          border: "1px solid var(--border-color)",
          boxShadow: "var(--shadow-sm)",
          overflow: "hidden",
        }}
      >
        <Toolbar
          search={
            <input
              type="text"
              placeholder="Search IPs or paths..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              aria-label="Search visitor logs"
              style={{
                padding: "0.5rem 0.75rem",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border-color)",
                background: "var(--bg-color)",
                fontSize: "0.875rem",
                minWidth: "240px",
                color: "var(--text-main)",
              }}
            />
          }
          actions={
            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
              {filteredLogs.length} matching {filteredLogs.length === 1 ? "visit" : "visits"}
            </span>
          }
        />
        <DataGrid
          data={filteredLogs}
          columns={columns}
          getRowId={(log) => log.id}
          searchable={false}
          itemsPerPage={10}
          emptyMessage="No visitors found matching your criteria."
        />
      </div>
    </div>
  );
}
