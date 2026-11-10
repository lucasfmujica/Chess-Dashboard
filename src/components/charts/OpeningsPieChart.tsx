import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { Card, CardHeader } from '../ui';

const COLORS = ['rgb(var(--cat-1))', 'rgb(var(--cat-2))', 'rgb(var(--cat-3))', 'rgb(var(--cat-4))', 'rgb(var(--cat-5))', 'rgb(var(--cat-6))'];

interface OpeningSlice {
  name: string;
  value: number;
}

interface OpeningsPieChartProps {
  data: OpeningSlice[];
  title?: string;
}

const OpeningsPieChart = ({ data, title = "Distribución de aperturas" }: OpeningsPieChartProps) => {
  return (
    <Card>
      <CardHeader title={title} className="mb-4" />
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) => `${name}: ${((percent ?? 0) * 100).toFixed(0)}%`}
            outerRadius={100}
            fill="rgb(var(--cat-1))"
            dataKey="value"
          >
            {data.map((_entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              background: 'rgb(var(--surface))',
              border: '1px solid rgb(var(--border))',
              borderRadius: 4,
              color: 'rgb(var(--fg))',
            }}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </Card>
  );
};

export default OpeningsPieChart;
