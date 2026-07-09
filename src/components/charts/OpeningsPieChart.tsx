import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';

const COLORS = ['rgb(var(--win))', 'rgb(var(--draw))', 'rgb(var(--loss))', '#3b82f6', '#8b5cf6'];

interface OpeningSlice {
  name: string;
  value: number;
}

interface OpeningsPieChartProps {
  data: OpeningSlice[];
  title?: string;
}

const OpeningsPieChart = ({ data, title = "Opening Distribution" }: OpeningsPieChartProps) => {
  return (
    <div className="p-6 bg-surface rounded-lg border border-hairline">
      <h3 className="mb-4 text-lg font-semibold text-fg">{title}</h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) => `${name}: ${((percent ?? 0) * 100).toFixed(0)}%`}
            outerRadius={100}
            fill="#8884d8"
            dataKey="value"
          >
            {data.map((_entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export default OpeningsPieChart;
