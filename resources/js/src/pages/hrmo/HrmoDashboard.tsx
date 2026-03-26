import React, { useEffect, useState } from 'react';
import { useSalaryMatrix } from '../../hooks/useSalaryMatrix';
import { LoadingState } from '../common/LoadingState';
import { Link } from 'react-router-dom';
import API from '../../services/api';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/src/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/src/components/ui/chart";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Pie, PieChart, Cell, Label } from "recharts";

// Define types (unchanged)
interface PlantillaPosition {
  plantilla_position_id: number;
  dept_id: number;
  salary_grade: number;
  is_active: boolean;
  assignments?: { personnel_id: number }[];
}

interface Personnel {
  personnel_id: number;
}

interface Department {
  dept_id: number;
  dept_name: string;
  dept_abbreviation: string;
}

interface DeptAggregate {
  dept_id: number;
  dept_name: string;
  filled: number;
  vacant: number;
}

interface GradeCount {
  grade: number;
  count: number;
}

interface DeptPersonnelCount {
  dept_id: number;
  dept_name: string;
  count: number;
}

// Fixed color palette (HSL for reliability)
const CHART_COLORS = [
  'hsl(220, 70%, 50%)',  // blue
  'hsl(0, 70%, 50%)',     // red
  'hsl(120, 70%, 40%)',   // green
  'hsl(40, 90%, 50%)',    // orange
  'hsl(280, 70%, 60%)',   // purple
  'hsl(180, 70%, 45%)',   // teal
  'hsl(30, 80%, 55%)',    // amber
  'hsl(300, 70%, 55%)',   // pink
];

const HrmoDashboard: React.FC = () => {
  const { activeVersion, loading: matrixLoading } = useSalaryMatrix();
  const [loading, setLoading] = useState(true);

  const [totalPositions, setTotalPositions] = useState(0);
  const [filledPositions, setFilledPositions] = useState(0);
  const [vacantPositions, setVacantPositions] = useState(0);
  const [personnelCount, setPersonnelCount] = useState(0);

  const [deptStackedData, setDeptStackedData] = useState<DeptAggregate[]>([]);
  const [gradeBarData, setGradeBarData] = useState<GradeCount[]>([]);
  const [personnelPieData, setPersonnelPieData] = useState<DeptPersonnelCount[]>([]);
  const [overallDonutData, setOverallDonutData] = useState<{ name: string; value: number }[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [positionsRes, personnelRes, deptsRes] = await Promise.all([
          API.get('/plantilla-positions?include=assignments'),
          API.get('/personnels'),
          API.get('/departments'),
        ]);

        const positions: PlantillaPosition[] = positionsRes.data.data || [];
        const personnels: Personnel[] = personnelRes.data.data || [];
        const departments: Department[] = deptsRes.data.data || [];

        const activePositions = positions.filter(p => p.is_active);

        const total = activePositions.length;
        const filled = activePositions.filter(p => p.assignments?.[0]?.personnel_id).length;
        const vacant = total - filled;

        setTotalPositions(total);
        setFilledPositions(filled);
        setVacantPositions(vacant);
        setPersonnelCount(personnels.length);

        setOverallDonutData([
          { name: 'Filled', value: filled },
          { name: 'Vacant', value: vacant },
        ]);

        const deptMap = new Map<number, DeptAggregate>();
        departments.forEach(dept => {
          deptMap.set(dept.dept_id, {
            dept_id: dept.dept_id,
            dept_name: dept.dept_abbreviation || dept.dept_name,
            filled: 0,
            vacant: 0,
          });
        });

        activePositions.forEach(pos => {
          const dept = deptMap.get(pos.dept_id);
          if (dept) {
            if (pos.assignments?.[0]?.personnel_id) {
              dept.filled += 1;
            } else {
              dept.vacant += 1;
            }
          }
        });
        setDeptStackedData(Array.from(deptMap.values()));

        const gradeCounts: Record<number, number> = {};
        activePositions.forEach(pos => {
          gradeCounts[pos.salary_grade] = (gradeCounts[pos.salary_grade] || 0) + 1;
        });
        const gradeData = Object.entries(gradeCounts)
          .map(([grade, count]) => ({ grade: Number(grade), count }))
          .sort((a, b) => a.grade - b.grade);
        setGradeBarData(gradeData);

        const personnelDeptMap = new Map<number, number>();
        departments.forEach(dept => personnelDeptMap.set(dept.dept_id, 0));

        activePositions.forEach(pos => {
          if (pos.assignments?.[0]?.personnel_id) {
            const current = personnelDeptMap.get(pos.dept_id) || 0;
            personnelDeptMap.set(pos.dept_id, current + 1);
          }
        });

        const personnelDeptData: DeptPersonnelCount[] = [];
        personnelDeptMap.forEach((count, dept_id) => {
          if (count > 0) {
            const dept = departments.find(d => d.dept_id === dept_id);
            personnelDeptData.push({
              dept_id,
              dept_name: dept?.dept_abbreviation || dept?.dept_name || `Dept ${dept_id}`,
              count,
            });
          }
        });
        setPersonnelPieData(personnelDeptData);

      } catch (error) {
        console.error('Failed to fetch dashboard data', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (matrixLoading || loading) return <LoadingState />;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold mb-6">HRMO Dashboard</h1>

      {/* Current Tranche – separate section */}
      <div className="flex items-center justify-between bg-muted p-4 rounded-lg">
        <div>
          <span className="text-sm font-medium text-muted-foreground">Current Tranche</span>
          {activeVersion ? (
            <div className="mt-1">
              <p className="text-base font-semibold">{activeVersion.lbc_reference}</p>
              <p className="text-sm text-muted-foreground">
                {activeVersion.tranche} – {activeVersion.income_class}
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No active version</p>
          )}
        </div>
        <Link to="/hrmo/tranche" className="text-sm text-primary hover:underline">
          View details →
        </Link>
      </div>

      {/* Cards grid – 4 cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Positions Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Positions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalPositions}</div>
            <div className="mt-2">
              <Link to="/hrmo/plantilla" className="text-xs text-primary hover:underline">
                View all →
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Filled Positions Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Filled Positions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{filledPositions}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {totalPositions ? ((filledPositions / totalPositions) * 100).toFixed(1) : 0}% filled
            </p>
          </CardContent>
        </Card>

        {/* Vacant Positions Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Vacant Positions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{vacantPositions}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {totalPositions ? ((vacantPositions / totalPositions) * 100).toFixed(1) : 0}% vacant
            </p>
          </CardContent>
        </Card>

        {/* Total Personnel Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Personnel
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{personnelCount}</div>
            <div className="mt-2">
              <Link to="/hrmo/personnel" className="text-xs text-primary hover:underline">
                View all →
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid – reorganized */}
      <div className="space-y-6">
        {/* Staffing by Department - full width */}
        <Card>
          <CardHeader>
            <CardTitle>Staffing by Department</CardTitle>
            <CardDescription>Filled vs vacant positions per department</CardDescription>
          </CardHeader>
          <CardContent className="p-1 sm:p-4">
            <ChartContainer
              config={{
                filled: { label: 'Filled', color: CHART_COLORS[0] },
                vacant: { label: 'Vacant', color: CHART_COLORS[1] },
              }}
              className="h-[300px] w-full"
            >
              <BarChart data={deptStackedData} margin={{ top: 20, right: 30, left: 20, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="dept_name" angle={-45} textAnchor="end" height={60} interval={0} tick={{ fontSize: 12 }} />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar dataKey="filled" stackId="a" fill={CHART_COLORS[0]} />
                <Bar dataKey="vacant" stackId="a" fill={CHART_COLORS[1]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Three charts in one row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Salary Grade Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Salary Grade Distribution</CardTitle>
              <CardDescription>Number of positions per grade</CardDescription>
            </CardHeader>
            <CardContent className="p-1 sm:p-4">
              <ChartContainer
                config={{
                  count: { label: 'Positions', color: CHART_COLORS[2] },
                }}
                className="h-[300px] w-full"
              >
                <BarChart data={gradeBarData} margin={{ top: 20, right: 30, left: 20, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="grade" tick={{ fontSize: 12 }} />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" fill={CHART_COLORS[2]} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* Personnel by Department */}
          <Card>
            <CardHeader>
              <CardTitle>Personnel by Department</CardTitle>
              <CardDescription>Distribution of assigned personnel</CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center p-1 sm:p-4">
              <ChartContainer
                config={personnelPieData.reduce((acc, item, idx) => {
                  acc[item.dept_name] = { label: item.dept_name, color: CHART_COLORS[idx % CHART_COLORS.length] };
                  return acc;
                }, {} as any)}
                className="h-[300px] w-full max-w-[400px]"
              >
                <PieChart>
                  <Pie
                    data={personnelPieData}
                    dataKey="count"
                    nameKey="dept_name"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {personnelPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                </PieChart>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* Overall Fill Rate */}
          <Card>
            <CardHeader>
              <CardTitle>Overall Fill Rate</CardTitle>
              <CardDescription>Filled vs vacant positions</CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center p-1 sm:p-4">
              <ChartContainer
                config={{
                  filled: { label: 'Filled', color: CHART_COLORS[0] },
                  vacant: { label: 'Vacant', color: CHART_COLORS[1] },
                }}
                className="h-[300px] w-full max-w-[400px]"
              >
                <PieChart>
                  <Pie
                    data={overallDonutData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    label={({ name, value }) => `${name}: ${value}`}
                    labelLine={false}
                  >
                    {overallDonutData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index]} />
                    ))}
                    <Label
                      content={({ viewBox }) => {
                        if (viewBox && 'cx' in viewBox && 'cy' in viewBox) {
                          const total = filledPositions + vacantPositions;
                          const percentage = total ? ((filledPositions / total) * 100).toFixed(1) : '0';
                          return (
                            <text
                              x={viewBox.cx}
                              y={viewBox.cy}
                              textAnchor="middle"
                              dominantBaseline="middle"
                            >
                              <tspan
                                x={viewBox.cx}
                                y={viewBox.cy}
                                className="fill-foreground text-2xl font-bold"
                              >
                                {percentage}%
                              </tspan>
                              <tspan
                                x={viewBox.cx}
                                y={(viewBox.cy || 0) + 24}
                                className="fill-muted-foreground text-xs"
                              >
                                Filled
                              </tspan>
                            </text>
                          );
                        }
                      }}
                    />
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                </PieChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default HrmoDashboard;