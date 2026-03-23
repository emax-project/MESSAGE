import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

const DONUT_COLORS = ['#5B8DEF', '#7CA5FF'];

type DonutChartDataItem = { name: string; value: number };

type DonutChartProps = {
  isDark: boolean;
  data: DonutChartDataItem[];
  size?: number;
};

/** Donut chart using Recharts */
export function DonutChart({ isDark, data, size = 80 }: DonutChartProps) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const displayData = data.filter((d) => d.value > 0);
  const isEmpty = displayData.length === 0;

  if (isEmpty) {
    return (
      <div
        className="shrink-0 rounded-full flex items-center justify-center"
        style={{
          width: size,
          height: size,
          background: isDark ? '#334155' : '#e2e8f0',
        }}
      >
        <span className="text-[10px] font-bold" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>
          {total}
        </span>
      </div>
    );
  }

  return (
    <div className="shrink-0 relative" style={{ width: size, height: size }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={displayData}
            cx="50%"
            cy="50%"
            innerRadius={size * 0.4}
            outerRadius={size * 0.5}
            paddingAngle={0}
            dataKey="value"
            startAngle={90}
            endAngle={-270}
          >
            {displayData.map((d, i) => (
              <Cell key={d.name} fill={DONUT_COLORS[i % DONUT_COLORS.length]} stroke="none" />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <span
        className="absolute inset-0 flex items-center justify-center select-none text-[10px] font-bold pointer-events-none"
        style={{ color: isDark ? '#94a3b8' : '#64748b' }}
      >
        {total}
      </span>
    </div>
  );
}

type RoomDonutChartProps = {
  isDark: boolean;
  topicCount: number;
  chatCount: number;
};

export function RoomDonutChart({ isDark, topicCount, chatCount }: RoomDonutChartProps) {
  return (
    <DonutChart
      isDark={isDark}
      data={[
        { name: '아젠다', value: topicCount },
        { name: '채팅', value: chatCount },
      ]}
    />
  );
}

type UnreadDonutChartProps = {
  isDark: boolean;
  topicUnread: number;
  chatUnread: number;
};

export function UnreadDonutChart({ isDark, topicUnread, chatUnread }: UnreadDonutChartProps) {
  return (
    <DonutChart
      isDark={isDark}
      data={[
        { name: '아젠다', value: topicUnread },
        { name: '채팅', value: chatUnread },
      ]}
    />
  );
}
