'use client';

import { useState, useMemo, useEffect } from 'react';
import { UAParser } from 'ua-parser-js';
import { format, subDays, startOfMonth, subMonths, startOfYear, isWithinInterval } from 'date-fns';
import { Download, RefreshCw, Calendar as CalendarIcon, Clock, Users, Activity, BarChart3, ChevronDown, MonitorSmartphone, MousePointerClick, Zap } from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, Legend
} from 'recharts';
import styles from '../../dashboard.module.css';

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

export default function DashboardClient({ initialLogs }: { initialLogs: RawVisitorLog[] }) {
  const [logs, setLogs] = useState<RawVisitorLog[]>(initialLogs);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Date Range State
  const [dateRange, setDateRange] = useState<{ start: Date | null, end: Date | null }>({ start: subDays(new Date(), 7), end: new Date() });
  const [presetOpen, setPresetOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch latest logs
  const refreshLogs = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch('/api/admin/visitors/raw');
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs.map((l: any) => ({ ...l, createdAt: new Date(l.createdAt) })));
      }
    } catch (e) {
      console.error(e);
    }
    setIsRefreshing(false);
  };

  // 1. Parse all raw logs and ignore admin paths
  const parsedLogs = useMemo<ParsedVisitorLog[]>(() => {
    return logs
      .filter(log => {
        const path = log.path || '';
        return !path.startsWith('/admin') && !path.startsWith('/api/admin');
      })
      .map(log => {
        const parser = new UAParser(log.userAgent || '');
        const device = parser.getDevice();
        const deviceType = device.type || (parser.getOS().name === 'iOS' || parser.getOS().name === 'Android' ? 'mobile' : 'desktop');
        
        return {
          ...log,
          browser: parser.getBrowser().name || 'Unknown',
          os: parser.getOS().name || 'Unknown',
          device: deviceType === 'mobile' ? 'Mobile' : deviceType === 'tablet' ? 'Tablet' : 'Desktop',
          timestamp: new Date(log.createdAt).getTime()
        };
      });
  }, [logs]);

  // 2. Filter by Date Range and Search
  const filteredLogs = useMemo(() => {
    return parsedLogs.filter(log => {
      // Date filter
      if (dateRange.start && dateRange.end) {
        if (log.createdAt < dateRange.start || log.createdAt > dateRange.end) return false;
      }
      
      // Search filter
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        if (!(log.path?.toLowerCase().includes(term) || log.ip?.toLowerCase().includes(term) || log.userAgent?.toLowerCase().includes(term))) {
          return false;
        }
      }
      
      return true;
    });
  }, [parsedLogs, dateRange, searchTerm]);

  // 3. Compute KPI Metrics
  const metrics = useMemo(() => {
    const totalVisitors = filteredLogs.length;
    const uniqueIps = new Set(filteredLogs.map(l => l.ip));
    const uniqueVisitors = uniqueIps.size;
    
    // Group by IP for bounce rate and session duration
    const ipGroups: Record<string, ParsedVisitorLog[]> = {};
    filteredLogs.forEach(log => {
      const key = log.ip || 'unknown';
      if (!ipGroups[key]) ipGroups[key] = [];
      ipGroups[key].push(log);
    });

    let bounces = 0;
    let totalDurationMs = 0;
    let durationCount = 0;

    Object.values(ipGroups).forEach(group => {
      if (group.length === 1) {
        bounces++;
      } else {
        // approximate session duration (max time - min time)
        const times = group.map(g => g.timestamp);
        const max = Math.max(...times);
        const min = Math.min(...times);
        if (max - min > 0 && max - min < 1000 * 60 * 60 * 4) { // ignore sessions over 4 hours
          totalDurationMs += (max - min);
          durationCount++;
        }
      }
    });

    const bounceRate = uniqueVisitors > 0 ? (bounces / uniqueVisitors) * 100 : 0;
    const avgSessionSeconds = durationCount > 0 ? (totalDurationMs / durationCount) / 1000 : 0;

    // Formatting
    const formatDuration = (seconds: number) => {
      if (seconds < 60) return `${Math.floor(seconds)}s`;
      const m = Math.floor(seconds / 60);
      const s = Math.floor(seconds % 60);
      return `${m}m ${s}s`;
    };

    return {
      totalVisitors,
      uniqueVisitors,
      bounceRate: bounceRate.toFixed(1) + '%',
      avgSession: formatDuration(avgSessionSeconds),
      activeNow: parsedLogs.filter(l => Date.now() - l.timestamp < 5 * 60 * 1000).length // active in last 5 mins
    };
  }, [filteredLogs, parsedLogs]);

  // 4. Compute Chart Data
  const chartData = useMemo(() => {
    // Trend Data (Group by Day using Sets for unique IPs)
    const trendMap: Record<string, Set<string>> = {};
    filteredLogs.forEach(log => {
      const day = format(log.createdAt, 'MMM dd');
      if (!trendMap[day]) trendMap[day] = new Set();
      if (log.ip) trendMap[day].add(log.ip);
    });
    const trend = Object.keys(trendMap).map(key => ({ date: key, visitors: trendMap[key].size }));
    trend.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Device/OS/Browser Data (Count once per unique IP in the selected period)
    const deviceMap: Record<string, number> = {};
    const browserMap: Record<string, number> = {};
    const osMap: Record<string, number> = {};
    const pageMap: Record<string, number> = {};

    const uniqueIpsInPeriod = new Set<string>();

    filteredLogs.forEach(log => {
      // Top pages counts every page view
      const path = log.path || '/';
      pageMap[path] = (pageMap[path] || 0) + 1;

      // Devices, OS, Browser count unique visitors only
      if (log.ip && !uniqueIpsInPeriod.has(log.ip)) {
        uniqueIpsInPeriod.add(log.ip);
        deviceMap[log.device] = (deviceMap[log.device] || 0) + 1;
        browserMap[log.browser] = (browserMap[log.browser] || 0) + 1;
        osMap[log.os] = (osMap[log.os] || 0) + 1;
      }
    });

    const formatPie = (map: Record<string, number>) => Object.keys(map).map(k => ({ name: k, value: map[k] })).sort((a, b) => b.value - a.value);
    
    return {
      trend,
      device: formatPie(deviceMap),
      browser: formatPie(browserMap).slice(0, 5), // top 5
      os: formatPie(osMap).slice(0, 5),
      pages: formatPie(pageMap).slice(0, 7) // top 7
    };
  }, [filteredLogs]);

  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

  const handleExport = () => {
    const csvRows = [
      ['Date', 'IP', 'Path', 'Device', 'OS', 'Browser', 'User Agent'],
      ...filteredLogs.map(l => [
        l.createdAt.toISOString(),
        l.ip || '',
        l.path || '',
        l.device,
        l.os,
        l.browser,
        `"${(l.userAgent || '').replace(/"/g, '""')}"`
      ])
    ];
    
    const blob = new Blob([csvRows.map(e => e.join(',')).join('\n')], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `visitor-logs-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  const applyPreset = (preset: string) => {
    const now = new Date();
    let start = new Date();
    let end = new Date();

    switch (preset) {
      case 'today':
        start.setHours(0, 0, 0, 0);
        break;
      case 'yesterday':
        start = subDays(now, 1);
        start.setHours(0, 0, 0, 0);
        end = subDays(now, 1);
        end.setHours(23, 59, 59, 999);
        break;
      case '7days':
        start = subDays(now, 7);
        break;
      case '30days':
        start = subDays(now, 30);
        break;
      case 'thisMonth':
        start = startOfMonth(now);
        break;
      case 'thisYear':
        start = startOfYear(now);
        break;
      default:
        break;
    }
    setDateRange({ start, end });
    setPresetOpen(false);
  };

  // Pagination for table
  const [page, setPage] = useState(1);
  const rowsPerPage = 10;
  const paginatedLogs = filteredLogs.slice((page - 1) * rowsPerPage, page * rowsPerPage);
  const totalPages = Math.ceil(filteredLogs.length / rowsPerPage);

  return (
    <div style={{ padding: '1rem', background: 'var(--bg-color)', minHeight: '100vh', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      
      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 700, margin: 0, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Activity color="var(--primary)" size={28} />
            Visitor Analytics
          </h1>
          <p style={{ margin: '0.2rem 0 0 0', color: 'var(--text-muted)' }}>Real-time insights and traffic analysis</p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          
          {/* Date Picker Dropdown */}
          <div style={{ position: 'relative' }}>
            <button 
              onClick={() => setPresetOpen(!presetOpen)}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1rem', background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '8px', cursor: 'pointer', color: 'var(--text-main)', fontWeight: 500 }}
            >
              <CalendarIcon size={16} color="var(--text-muted)" />
              {dateRange.start ? format(dateRange.start, 'MMM d, yyyy') : 'Start'} - {dateRange.end ? format(dateRange.end, 'MMM d, yyyy') : 'End'}
              <ChevronDown size={16} />
            </button>
            
            {presetOpen && (
              <div style={{ position: 'absolute', top: '110%', right: 0, background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '8px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', zIndex: 50, minWidth: '200px', overflow: 'hidden' }}>
                {['today', 'yesterday', '7days', '30days', 'thisMonth', 'thisYear'].map(p => (
                  <button 
                    key={p} 
                    onClick={() => applyPreset(p)}
                    style={{ display: 'block', width: '100%', padding: '0.75rem 1rem', textAlign: 'left', background: 'transparent', border: 'none', borderBottom: '1px solid var(--border-color)', cursor: 'pointer', color: 'var(--text-main)', fontSize: '0.9rem' }}
                    onMouseOver={e => e.currentTarget.style.background = 'var(--bg-color)'}
                    onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                  >
                    {p === 'today' ? 'Today' : p === 'yesterday' ? 'Yesterday' : p === '7days' ? 'Last 7 Days' : p === '30days' ? 'Last 30 Days' : p === 'thisMonth' ? 'This Month' : 'This Year'}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button onClick={refreshLogs} disabled={isRefreshing} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '40px', height: '40px', background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '8px', cursor: 'pointer', color: 'var(--text-main)' }}>
            <RefreshCw size={18} className={isRefreshing ? 'spin' : ''} />
          </button>
          
          <button onClick={handleExport} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1rem', background: 'var(--text-main)', color: 'var(--bg-color)', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 500 }}>
            <Download size={16} /> Export
          </button>
        </div>
      </div>

      {/* KPI CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <div style={{ background: 'var(--card-bg)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-color)', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Page Views</h3>
            <div style={{ background: 'var(--primary-light)', padding: '0.5rem', borderRadius: '8px', color: 'var(--primary)' }}><MousePointerClick size={18} /></div>
          </div>
          <p style={{ margin: 0, fontSize: '2rem', fontWeight: 700, color: 'var(--text-main)' }}>{metrics.totalVisitors}</p>
        </div>

        <div style={{ background: 'var(--card-bg)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-color)', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Unique Visitors</h3>
            <div style={{ background: 'var(--success-light)', padding: '0.5rem', borderRadius: '8px', color: 'var(--success)' }}><Users size={18} /></div>
          </div>
          <p style={{ margin: 0, fontSize: '2rem', fontWeight: 700, color: 'var(--text-main)' }}>{metrics.uniqueVisitors}</p>
        </div>

        <div style={{ background: 'var(--card-bg)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-color)', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Avg Session</h3>
            <div style={{ background: 'var(--accent-light)', padding: '0.5rem', borderRadius: '8px', color: 'var(--accent)' }}><Clock size={18} /></div>
          </div>
          <p style={{ margin: 0, fontSize: '2rem', fontWeight: 700, color: 'var(--text-main)' }}>{metrics.avgSession}</p>
        </div>

        <div style={{ background: 'var(--card-bg)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-color)', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Bounce Rate</h3>
            <div style={{ background: 'var(--danger-light)', padding: '0.5rem', borderRadius: '8px', color: 'var(--danger)' }}><BarChart3 size={18} /></div>
          </div>
          <p style={{ margin: 0, fontSize: '2rem', fontWeight: 700, color: 'var(--text-main)' }}>{metrics.bounceRate}</p>
        </div>

        <div style={{ background: 'var(--primary)', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)', color: 'white', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', opacity: 0.9 }}>
            <Zap size={18} fill="white" />
            <span style={{ fontSize: '0.9rem', fontWeight: 500, textTransform: 'uppercase' }}>Active Right Now</span>
          </div>
          <div style={{ fontSize: '2.5rem', fontWeight: 800 }}>{metrics.activeNow}</div>
        </div>
      </div>

      {/* CHARTS ROW 1 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem', marginBottom: '1rem' }}>
        <div style={{ background: 'var(--card-bg)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-color)', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', height: '400px' }}>
          <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '1.1rem', color: 'var(--text-main)' }}>Traffic Overview</h3>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData.trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorVisits" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
              <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-muted)' }} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-muted)' }} />
              <RechartsTooltip 
                contentStyle={{ borderRadius: '8px', border: '1px solid var(--border-color)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
              />
              <Area type="monotone" dataKey="visitors" stroke="var(--primary)" strokeWidth={3} fillOpacity={1} fill="url(#colorVisits)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* CHARTS ROW 2 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        
        <div style={{ background: 'var(--card-bg)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-color)', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', height: '350px' }}>
          <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '1.1rem', color: 'var(--text-main)' }}>Top Pages</h3>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData.pages} layout="vertical" margin={{ top: 0, right: 30, left: 20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border-color)" />
              <XAxis type="number" hide />
              <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-muted)' }} width={100} />
              <RechartsTooltip cursor={{fill: 'var(--bg-color)'}} contentStyle={{ borderRadius: '8px' }} />
              <Bar dataKey="value" fill="var(--primary)" radius={[0, 4, 4, 0]}>
                {chartData.pages.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div style={{ background: 'var(--card-bg)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-color)', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', height: '350px' }}>
          <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '1.1rem', color: 'var(--text-main)' }}>Device Distribution</h3>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={chartData.device} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value">
                {chartData.device.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <RechartsTooltip contentStyle={{ borderRadius: '8px' }} />
              <Legend verticalAlign="bottom" height={36} iconType="circle" />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div style={{ background: 'var(--card-bg)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-color)', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', height: '350px' }}>
          <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '1.1rem', color: 'var(--text-main)' }}>Browser Usage</h3>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={chartData.browser} cx="50%" cy="50%" innerRadius={0} outerRadius={100} dataKey="value">
                {chartData.browser.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                ))}
              </Pie>
              <RechartsTooltip contentStyle={{ borderRadius: '8px' }} />
              <Legend verticalAlign="bottom" height={36} iconType="circle" />
            </PieChart>
          </ResponsiveContainer>
        </div>

      </div>

      {/* TABLE */}
      <div style={{ background: 'var(--card-bg)', borderRadius: '12px', border: '1px solid var(--border-color)', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', overflow: 'hidden' }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-main)' }}>Recent Visitors</h3>
          <input 
            type="text" 
            placeholder="Search IPs or Paths..." 
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
            style={{ padding: '0.6rem 1rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-color)', fontSize: '0.9rem', width: '250px' }}
          />
        </div>
        
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
            <thead style={{ background: 'var(--bg-color)', color: 'var(--text-muted)' }}>
              <tr>
                <th style={{ padding: '1rem 1.5rem', fontWeight: 600 }}>Date & Time</th>
                <th style={{ padding: '1rem 1.5rem', fontWeight: 600 }}>IP Address</th>
                <th style={{ padding: '1rem 1.5rem', fontWeight: 600 }}>Page Path</th>
                <th style={{ padding: '1rem 1.5rem', fontWeight: 600 }}>Device</th>
                <th style={{ padding: '1rem 1.5rem', fontWeight: 600 }}>Browser / OS</th>
              </tr>
            </thead>
            <tbody>
              {paginatedLogs.map(log => (
                <tr key={log.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '1rem 1.5rem', color: 'var(--text-main)' }}>
                    <div style={{ fontWeight: 500 }}>{format(log.createdAt, 'MMM d, yyyy')}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{format(log.createdAt, 'HH:mm:ss')}</div>
                  </td>
                  <td style={{ padding: '1rem 1.5rem', fontFamily: 'monospace', color: 'var(--primary)' }}>{log.ip || 'Unknown'}</td>
                  <td style={{ padding: '1rem 1.5rem', color: 'var(--text-main)' }}>{log.path || '/'}</td>
                  <td style={{ padding: '1rem 1.5rem', color: 'var(--text-main)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <MonitorSmartphone size={16} color="var(--text-muted)" />
                      {log.device}
                    </div>
                  </td>
                  <td style={{ padding: '1rem 1.5rem', color: 'var(--text-main)' }}>
                    <div>{log.browser}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{log.os}</div>
                  </td>
                </tr>
              ))}
              {paginatedLogs.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>No visitors found matching your criteria.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ padding: '1rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Showing {(page - 1) * rowsPerPage + 1} to {Math.min(page * rowsPerPage, filteredLogs.length)} of {filteredLogs.length}</span>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button 
                onClick={() => setPage(p => Math.max(1, p - 1))} 
                disabled={page === 1}
                style={{ padding: '0.5rem 1rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: page === 1 ? 'var(--bg-color)' : 'var(--card-bg)', cursor: page === 1 ? 'not-allowed' : 'pointer', color: 'var(--text-main)' }}
              >
                Previous
              </button>
              <button 
                onClick={() => setPage(p => Math.min(totalPages, p + 1))} 
                disabled={page === totalPages}
                style={{ padding: '0.5rem 1rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: page === totalPages ? 'var(--bg-color)' : 'var(--card-bg)', cursor: page === totalPages ? 'not-allowed' : 'pointer', color: 'var(--text-main)' }}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
