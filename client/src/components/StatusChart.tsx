import { useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, TrendingUp } from "lucide-react";

interface StatusChartProps {
  data?: Record<string, number>;
  loading?: boolean;
}

export default function StatusChart({ data, loading = false }: StatusChartProps) {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstanceRef = useRef<any>(null);

  useEffect(() => {
    const loadChart = async () => {
      if (!chartRef.current || loading || !data) return;

      // Dynamically import Chart.js to avoid SSR issues
      const { Chart, registerables } = await import('chart.js');
      Chart.register(...registerables);

      // Destroy existing chart if it exists
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
      }

      const ctx = chartRef.current.getContext('2d');
      if (!ctx) return;

      // Prepare data for the chart
      const labels = Object.keys(data);
      const values = Object.values(data);
      
      // Define premium colors for different statuses - more vibrant and professional
      const statusColors: Record<string, string> = {
        new: 'rgb(59, 130, 246)',           // Blue
        register: 'rgb(236, 72, 153)',      // Rose
        scheduled: 'rgb(168, 85, 247)',     // Purple
        completed: 'rgb(34, 197, 94)',      // Green
        pending: 'rgb(249, 115, 22)',       // Orange
        ready_for_class: 'rgb(16, 185, 129)',   // Teal
        call_back: 'rgb(14, 165, 233)',         // Sky Blue
        dropped: 'rgb(239, 68, 68)',        // Red
      };

      const backgroundColors = labels.map(label => 
        statusColors[label] || 'rgb(107, 114, 128)'
      );

      // Calculate total for statistics
      const total = values.reduce((a, b) => a + b, 0);

      chartInstanceRef.current = new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: labels.map(label => label.replace('_', ' ').toUpperCase()),
          datasets: [{
            data: values,
            backgroundColor: backgroundColors,
            borderWidth: 3,
            borderColor: 'rgba(255, 255, 255, 0.8)',
            hoverBorderWidth: 4,
            hoverBorderColor: 'rgba(255, 255, 255, 1)',
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: {
            animateRotate: true,
            animateScale: true,
            duration: 1000,
          },
          plugins: {
            legend: {
              position: 'bottom',
              labels: {
                padding: 25,
                usePointStyle: true,
                pointStyle: 'circle',
                font: {
                  size: 12,
                  weight: '600',
                  family: "'Inter', sans-serif",
                },
                color: 'hsl(var(--foreground))',
                generateLabels: (chart) => {
                  const data = chart.data;
                  return (data.labels as string[]).map((label, i) => {
                    const value = (data.datasets[0].data as number[])[i];
                    const percentage = Math.round((value / total) * 100);
                    return {
                      text: `${label} (${value})`,
                      fillStyle: backgroundColors[i],
                      hidden: false,
                      index: i,
                    };
                  });
                }
              }
            },
            tooltip: {
              backgroundColor: 'rgba(0, 0, 0, 0.9)',
              padding: 16,
              titleFont: {
                size: 14,
                weight: 'bold',
              },
              bodyFont: {
                size: 13,
              },
              cornerRadius: 8,
              displayColors: true,
              borderColor: 'rgba(255, 255, 255, 0.1)',
              borderWidth: 1,
              callbacks: {
                label: function(context) {
                  const value = context.parsed;
                  const percentage = Math.round((value / total) * 100);
                  return `  Count: ${value}  •  ${percentage}%`;
                },
                afterLabel: function(context) {
                  return '';
                }
              }
            },
          },
          elements: {
            arc: {
              borderWidth: 3,
            }
          }
        }
      });
    };

    loadChart();

    // Cleanup function
    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
        chartInstanceRef.current = null;
      }
    };
  }, [data, loading]);

  if (loading) {
    return (
      <Card className="chart-container animate-pulse shadow-lg border border-border">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 rounded-t-lg">
          <CardTitle className="flex items-center text-lg font-bold">
            <TrendingUp className="mr-2 h-6 w-6 text-blue-600 dark:text-blue-400" />
            Lead Status Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 bg-muted rounded"></div>
        </CardContent>
      </Card>
    );
  }

  if (!data || Object.keys(data).length === 0) {
    return (
      <Card className="chart-container shadow-lg border border-border">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 rounded-t-lg">
          <CardTitle className="flex items-center text-lg font-bold">
            <TrendingUp className="mr-2 h-6 w-6 text-blue-600 dark:text-blue-400" />
            Lead Status Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <PieChart className="h-16 w-16 mx-auto mb-4 opacity-30" />
              <p className="text-lg">No data available</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const total = Object.values(data).reduce((a, b) => a + b, 0);

  return (
    <Card className="chart-container shadow-lg border border-border overflow-hidden" data-testid="status-chart">
      <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center text-lg font-bold">
            <TrendingUp className="mr-2 h-6 w-6 text-blue-600 dark:text-blue-400" />
            Lead Status Distribution
          </CardTitle>
          <div className="text-right">
            <div className="text-2xl font-bold text-foreground">{total}</div>
            <div className="text-xs text-muted-foreground">Total Leads</div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="h-64 relative">
          <canvas 
            ref={chartRef} 
            data-testid="status-chart-canvas"
          ></canvas>
        </div>
      </CardContent>
    </Card>
  );
}
