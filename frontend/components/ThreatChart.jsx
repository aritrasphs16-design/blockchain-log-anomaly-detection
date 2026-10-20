"use client";

import { useSSE } from "./SSEProvider";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { LiveDot } from './ui';

export function ThreatChart() {
  const { chartData } = useSSE();

  // Use a fallback empty array if chartData hasn't populated yet to prevent Recharts from breaking
  const data = chartData && chartData.length > 0 ? chartData : [];

  return (
    <div className="w-full h-full flex flex-col min-h-0">
      <div className="row between" style={{ marginBottom: '0.875rem' }}>
        <p className="section-label">Threat Activity — Live</p>
        <span className="row row-2 text-[9px] mono-data uppercase font-bold" style={{ color: 'var(--ok)' }}>
          <LiveDot tone="live" />
          Streaming
        </span>
      </div>

      <div className="relative w-full flex-1 min-h-[190px] -ml-3">
        <ResponsiveContainer width="100%" height="100%" minHeight={190}>
          <AreaChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorTraffic" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.22}/>
                <stop offset="95%" stopColor="#38bdf8" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorAnomalies" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#fb7185" stopOpacity={0.65}/>
                <stop offset="95%" stopColor="#fb7185" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148,163,184,0.08)" />
            <XAxis
              dataKey="time"
              tick={{ fontSize: 9, fill: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}
              tickMargin={8}
              tickLine={false}
              axisLine={false}
              minTickGap={30}
            />
            <YAxis
              tick={{ fontSize: 9, fill: 'var(--text-muted)' }}
              tickLine={false}
              axisLine={false}
              tickCount={4}
              width={34}
            />
            <Tooltip
              cursor={{ stroke: 'var(--border-strong)', strokeWidth: 1 }}
              contentStyle={{
                backgroundColor: 'var(--bg-elevated)',
                borderRadius: 'var(--radius-control)',
                border: '1px solid var(--border-default)',
                fontSize: '11px',
                color: 'var(--text-secondary)',
                boxShadow: 'var(--shadow-overlay)',
              }}
              itemStyle={{ fontSize: '11px' }}
              labelStyle={{ fontSize: '10px', fontWeight: 'bold', color: 'var(--text-primary)', marginBottom: '4px' }}
            />
            <Legend
              verticalAlign="top"
              align="right"
              height={26}
              iconType="circle"
              iconSize={7}
              wrapperStyle={{ fontSize: '10px', color: 'var(--text-muted)' }}
            />
            <Area type="monotone" dataKey="Traffic" name="Traffic" stroke="#38bdf8" strokeWidth={1.5} fillOpacity={1} fill="url(#colorTraffic)" isAnimationActive={true} />
            <Area type="monotone" dataKey="Anomalies" name="Anomalies" stroke="#fb7185" strokeWidth={2} fillOpacity={1} fill="url(#colorAnomalies)" isAnimationActive={true} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

