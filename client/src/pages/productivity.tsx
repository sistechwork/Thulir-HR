import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import {
  Users,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Eye,
  TrendingUp,
  MousePointer2,
  Keyboard,
  Timer,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import { useAuth } from '@/hooks/useAuth';

type TeamProductivityData = {
  id: string;
  teamName: string;
  teamLeadName: string;
  memberCount: number;
  totalLeads: number;
  completedLeads: number;
  completionRate: number;
  scheduleCount: number;
  members: any[];
};

type IdleWarning = {
  id: number;
  userId: string;
  userName: string;
  userEmail: string;
  warningType: string;
  warningLabel: string;
  createdAt: string;
  metadata: any;
  urlDetails?: string;
};

const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e'];

export default function Productivity() {
  const { user } = useAuth();
  const [selectedTeam, setSelectedTeam] = useState<TeamProductivityData | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('teams');
  const [selectedUserWarnings, setSelectedUserWarnings] = useState<IdleWarning[] | null>(null);
  const [warningsDetailOpen, setWarningsDetailOpen] = useState(false);
  const [selectedUserName, setSelectedUserName] = useState('');
  const [detectedPageName, setDetectedPageName] = useState('');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [scheduleSortOrder, setScheduleSortOrder] = useState<'asc' | 'desc'>('desc');

  const { data: teamsData, isLoading: teamsLoading } = useQuery<TeamProductivityData[]>({
    queryKey: ['/api/teams-productivity'],
    queryFn: async () => {
      const response = await fetch('/api/teams-productivity', {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch');
      return response.json();
    },
    enabled: (user as any)?.role === 'manager',
  });

  const { data: idleWarnings, isLoading: warningsLoading } = useQuery<IdleWarning[]>({
    queryKey: ['/api/productivity/idle-warnings'],
    queryFn: async () => {
      const response = await fetch('/api/productivity/idle-warnings', {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch');
      return response.json();
    },
    enabled: (user as any)?.role === 'manager',
  });

  const handleViewDetails = (team: TeamProductivityData) => {
    setSelectedTeam(team);
    setDetailsOpen(true);
  };

  // Detect page name on tab switch using Gemini API
  useEffect(() => {
    const detectPageName = async () => {
      if (activeTab === 'warnings') {
        try {
          const response = await fetch('/api/gemini/detect-page', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              tabName: activeTab,
              pageTitle: document.title
            })
          });
          if (response.ok) {
            const data = await response.json();
            setDetectedPageName(data.pageName || 'Idle Warnings');
          }
        } catch (error) {
          console.error('Error detecting page name:', error);
          setDetectedPageName('Idle Warnings');
        }
      }
    };
    detectPageName();
  }, [activeTab]);

  const handleViewUserWarnings = (userName: string, warnings: IdleWarning[]) => {
    setSelectedUserName(userName);
    setSelectedUserWarnings(warnings);
    setWarningsDetailOpen(true);
  };

  // Get schedules by date for filtered view
  const getScheduleCountForDate = (members: any[], date: string): number => {
    if (!date) return 0;
    let count = 0;
    members.forEach((member) => {
      if (member.schedulesByDate && member.schedulesByDate[date]) {
        count += member.schedulesByDate[date];
      }
    });
    return count;
  };

  // Filter teams data by selected date
  const filteredTeamsData = selectedDate
    ? teamsData?.map(team => ({
      ...team,
      scheduleCount: getScheduleCountForDate(team.members, selectedDate),
      members: team.members.map(member => ({
        ...member,
        totalSchedules: member.schedulesByDate?.[selectedDate] || 0
      }))
    }))
    : teamsData;

  // Calculate overall metrics
  const totalMetrics = {
    totalTeams: filteredTeamsData?.length || 0,
    totalMembers: filteredTeamsData?.reduce((sum, t) => sum + t.memberCount, 0) || 0,
    totalLeads: filteredTeamsData?.reduce((sum, t) => sum + t.totalLeads, 0) || 0,
    totalCompleted: filteredTeamsData?.reduce((sum, t) => sum + t.completedLeads, 0) || 0,
    totalSchedules: filteredTeamsData?.reduce((sum, t) => sum + t.scheduleCount, 0) || 0,
    avgCompletionRate: filteredTeamsData && filteredTeamsData.length > 0
      ? Math.round(filteredTeamsData.reduce((sum, t) => sum + t.completionRate, 0) / filteredTeamsData.length)
      : 0,
  };

  const chartData = filteredTeamsData?.map(team => ({
    name: team.teamName.substring(0, 10),
    'Completed': team.completedLeads,
    'Pending': team.totalLeads - team.completedLeads,
    'Scheduled': team.scheduleCount,
  })) || [];

  const completionData = filteredTeamsData?.map(team => ({
    name: team.teamName.substring(0, 15),
    value: team.completionRate,
  })) || [];

  if ((user as any)?.role !== 'manager') {
    return (
      <>
        <main className="flex-1 overflow-auto p-8">
          <div className="text-center py-12">
            <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold">Access Denied</h2>
            <p className="text-muted-foreground">Only managers can view productivity data.</p>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <main className="flex-1 overflow-auto">
        <div className="p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <TrendingUp className="h-8 w-8 text-primary" />
              Productivity & Performance Dashboard
            </h1>
            <p className="text-muted-foreground mt-2">
              Track team performance, lead completion metrics, and idle warnings
            </p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="teams">Team Analytics</TabsTrigger>
              <TabsTrigger value="warnings">Idle Warnings</TabsTrigger>
            </TabsList>

            <TabsContent value="teams" className="space-y-8">
              <Card className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
                <CardHeader>
                  <CardTitle className="text-lg">Filter by Date</CardTitle>
                  <CardDescription>Select a walk-in date to view schedules for that date</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-4 items-end">
                    <div className="flex-1">
                      <label className="text-sm font-medium mb-2 block">Walk-in Date</label>
                      <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Sort Schedules</label>
                      <div className="flex gap-2 mb-0">
                        <Button
                          variant={scheduleSortOrder === 'desc' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setScheduleSortOrder('desc')}
                          className="flex items-center gap-1"
                        >
                          <ArrowDown className="h-4 w-4" />
                          Newest
                        </Button>
                        <Button
                          variant={scheduleSortOrder === 'asc' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setScheduleSortOrder('asc')}
                          className="flex items-center gap-1"
                        >
                          <ArrowUp className="h-4 w-4" />
                          Oldest
                        </Button>
                      </div>
                    </div>
                    {selectedDate && (
                      <Button
                        variant="outline"
                        onClick={() => setSelectedDate('')}
                        className="mb-0"
                      >
                        Clear Filter
                      </Button>
                    )}
                  </div>
                  {selectedDate && (
                    <div className="mt-4 text-sm text-blue-700 bg-white p-3 rounded-md border border-blue-200">
                      📅 Showing schedules for: <strong>{new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</strong>
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="grid gap-4 md:grid-cols-5 mb-8">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Teams</CardTitle>
                    <Users className="h-4 w-4 text-blue-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{totalMetrics.totalTeams}</div>
                    <p className="text-xs text-muted-foreground">Active teams</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Team Members</CardTitle>
                    <Users className="h-4 w-4 text-green-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{totalMetrics.totalMembers}</div>
                    <p className="text-xs text-muted-foreground">HR personnel</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
                    <Clock className="h-4 w-4 text-orange-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{totalMetrics.totalLeads}</div>
                    <p className="text-xs text-muted-foreground">All leads</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Completed</CardTitle>
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{totalMetrics.totalCompleted}</div>
                    <p className="text-xs text-muted-foreground">Finished leads</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Avg Completion</CardTitle>
                    <TrendingUp className="h-4 w-4 text-purple-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{totalMetrics.avgCompletionRate}%</div>
                    <p className="text-xs text-muted-foreground">Across all teams</p>
                  </CardContent>
                </Card>

                {selectedDate && (
                  <Card className="bg-blue-50 border-blue-200">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Schedules on {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</CardTitle>
                      <Timer className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-blue-600">{totalMetrics.totalSchedules}</div>
                      <p className="text-xs text-muted-foreground">Scheduled for this date</p>
                    </CardContent>
                  </Card>
                )}
              </div>

              <div className="grid gap-6 md:grid-cols-2 mb-8">
                <Card>
                  <CardHeader>
                    <CardTitle>Lead Status by Team</CardTitle>
                    <CardDescription>Completion, pending, and scheduled leads</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {teamsLoading ? (
                      <Skeleton className="h-[300px] w-full" />
                    ) : chartData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="Completed" fill="#22c55e" />
                          <Bar dataKey="Pending" fill="#f97316" />
                          <Bar dataKey="Scheduled" fill="#3b82f6" />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                        No team data available
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Completion Rate</CardTitle>
                    <CardDescription>Percentage of completed leads per team</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {teamsLoading ? (
                      <Skeleton className="h-[300px] w-full" />
                    ) : completionData.some(d => d.value > 0) ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={completionData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, value }) => `${name} ${value}%`}
                            outerRadius={100}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {completionData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                        No completion data available
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Teams Overview</CardTitle>
                  <CardDescription>Click on a team to view detailed metrics and member information</CardDescription>
                </CardHeader>
                <CardContent>
                  {teamsLoading ? (
                    <div className="space-y-2">
                      {[1, 2, 3].map(i => (
                        <Skeleton key={i} className="h-12 w-full" />
                      ))}
                    </div>
                  ) : filteredTeamsData && filteredTeamsData.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Team Name</TableHead>
                          <TableHead className="text-center">Team Lead</TableHead>
                          <TableHead className="text-center">Members</TableHead>
                          <TableHead className="text-center">Total Leads</TableHead>
                          <TableHead className="text-center">Completed</TableHead>
                          <TableHead className="text-center">Completion %</TableHead>
                          <TableHead className="text-center">{selectedDate ? 'Schedules' : 'Total Schedules'}</TableHead>
                          <TableHead className="text-center">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredTeamsData.map((team) => (
                          <TableRow key={team.id} className="cursor-pointer hover:bg-muted/50">
                            <TableCell className="font-semibold text-primary">{team.teamName}</TableCell>
                            <TableCell className="text-center">{team.teamLeadName}</TableCell>
                            <TableCell className="text-center">
                              <Badge variant="outline">{team.memberCount}</Badge>
                            </TableCell>
                            <TableCell className="text-center">{team.totalLeads}</TableCell>
                            <TableCell className="text-center">
                              <Badge className="bg-green-500">{team.completedLeads}</Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex items-center justify-center">
                                <span className={`text-lg font-bold ${team.completionRate >= 80 ? 'text-green-600' :
                                  team.completionRate >= 50 ? 'text-yellow-600' :
                                    'text-red-600'
                                  }`}>
                                  {team.completionRate}%
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge
                                variant={selectedDate && team.scheduleCount > 0 ? "default" : "secondary"}
                                className={selectedDate && team.scheduleCount > 0 ? "bg-blue-600 hover:bg-blue-700" : "bg-blue-100 text-blue-700"}
                              >
                                {team.scheduleCount}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleViewDetails(team)}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                Details
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>{selectedDate ? 'No schedules found for this date' : 'No teams found'}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="warnings" className="space-y-8">
              <Card>
                <CardHeader>
                  <CardTitle>{detectedPageName || 'Idle Warnings'}</CardTitle>
                  <CardDescription>Users with idle warnings - Click on a user to view all their warning details</CardDescription>
                </CardHeader>
                <CardContent>
                  {warningsLoading ? (
                    <div className="space-y-2">
                      {[1, 2, 3, 4, 5].map(i => (
                        <Skeleton key={i} className="h-16 w-full" />
                      ))}
                    </div>
                  ) : idleWarnings && idleWarnings.length > 0 ? (
                    <div>
                      <div className="grid gap-4 md:grid-cols-1">
                        {Object.entries(
                          idleWarnings.reduce((acc: any, warning) => {
                            const key = warning.userName;
                            if (!acc[key]) {
                              acc[key] = {
                                userName: warning.userName,
                                userEmail: warning.userEmail,
                                userId: warning.userId,
                                warnings: []
                              };
                            }
                            acc[key].warnings.push(warning);
                            return acc;
                          }, {})
                        ).map(([userName, userData]: any) => (
                          <div
                            key={userName}
                            className="border rounded-lg p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                            onClick={() => handleViewUserWarnings(userName, userData.warnings)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <h3 className="font-semibold text-lg flex items-center gap-2">
                                  {userData.userName}
                                  <Badge variant="destructive" className="text-lg px-3 py-1">
                                    {userData.warnings.length}
                                  </Badge>
                                </h3>
                                <p className="text-sm text-muted-foreground">{userData.userEmail}</p>
                              </div>
                              <ChevronRight className="h-5 w-5 text-muted-foreground" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No idle warnings recorded yet</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <Dialog open={warningsDetailOpen} onOpenChange={setWarningsDetailOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              {selectedUserName} - Warning Details
            </DialogTitle>
            <DialogDescription>
              Total warnings: {selectedUserWarnings?.length || 0}
            </DialogDescription>
          </DialogHeader>

          {selectedUserWarnings && selectedUserWarnings.length > 0 ? (
            <div className="space-y-4 pr-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Warning Type</TableHead>
                    <TableHead className="text-right">Date & Time</TableHead>
                    <TableHead className="text-right">Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedUserWarnings.map((warning) => {
                    const warningColor = warning.warningLabel === 'Mouse Idle' ? 'bg-red-100 text-red-700' :
                      warning.warningLabel === 'Keyboard Idle' ? 'bg-orange-100 text-orange-700' :
                        warning.warningLabel === 'Long Key Press' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-blue-100 text-blue-700';

                    return (
                      <TableRow key={warning.id}>
                        <TableCell>
                          <Badge className={warningColor}>
                            {warning.warningLabel}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-sm">
                          {new Date(warning.createdAt).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right text-sm text-muted-foreground">
                          {warning.warningLabel === 'Tab Switch' ? (
                            <div className="max-w-xs text-left">
                              {warning.urlDetails ? (
                                <p className="text-sm font-semibold text-blue-600">{warning.urlDetails}</p>
                              ) : (
                                <p className="text-sm">Away for {warning.metadata?.duration || 0}s</p>
                              )}
                              {warning.metadata?.duration && warning.urlDetails && (
                                <p className="text-xs text-muted-foreground">({warning.metadata.duration}s away)</p>
                              )}
                            </div>
                          ) : (
                            warning.metadata?.duration ? `${Math.round(warning.metadata.duration / 1000)}s idle` : 'N/A'
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-muted-foreground">No warning details available</p>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              {selectedTeam?.teamName} - Team Details
            </DialogTitle>
            <DialogDescription>
              Team lead: {selectedTeam?.teamLeadName}
            </DialogDescription>
          </DialogHeader>

          {selectedTeam && (
            <div className="space-y-6 pr-4">
              <div className="grid grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-blue-600">{selectedTeam.memberCount}</p>
                      <p className="text-xs text-muted-foreground">Members</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-orange-600">{selectedTeam.totalLeads}</p>
                      <p className="text-xs text-muted-foreground">Total Leads</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-600">{selectedTeam.completedLeads}</p>
                      <p className="text-xs text-muted-foreground">Completed</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-blue-500">{selectedTeam.scheduleCount}</p>
                      <p className="text-xs text-muted-foreground">Total Schedules</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Team Members Performance</CardTitle>
                  <CardDescription>Individual member statistics and activity</CardDescription>
                </CardHeader>
                <CardContent>
                  {selectedTeam.members.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-1/4">Member Name</TableHead>
                          <TableHead className="w-1/4">Email</TableHead>
                          <TableHead className="w-1/8 text-center">
                            <div className="flex items-center justify-center gap-1 whitespace-nowrap">
                              <Clock className="h-4 w-4" />
                              Total
                            </div>
                          </TableHead>
                          <TableHead className="w-1/8 text-center">
                            <div className="flex items-center justify-center gap-1 whitespace-nowrap">
                              <CheckCircle2 className="h-4 w-4" />
                              Done
                            </div>
                          </TableHead>
                          <TableHead className="w-1/8 text-center">
                            <div className="flex items-center justify-center gap-1 whitespace-nowrap">
                              <Timer className="h-4 w-4" />
                              Schedules
                            </div>
                          </TableHead>
                          <TableHead className="w-1/8 text-center">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedTeam.members.map((member) => {
                          return (
                            <TableRow key={member.id}>
                              <TableCell className="font-medium text-sm">{member.name}</TableCell>
                              <TableCell className="text-sm text-muted-foreground break-all">{member.email}</TableCell>
                              <TableCell className="text-center">
                                <span className="inline-flex items-center justify-center px-2 py-1 rounded-md bg-blue-50 text-blue-700 font-semibold text-xs">
                                  {member.totalLeads}
                                </span>
                              </TableCell>
                              <TableCell className="text-center">
                                <span className="inline-flex items-center justify-center px-2 py-1 rounded-md bg-green-50 text-green-700 font-semibold text-xs">
                                  {member.completedLeads}
                                </span>
                              </TableCell>
                              <TableCell className="text-center">
                                <span className="inline-flex items-center justify-center px-2 py-1 rounded-md bg-orange-50 text-orange-700 font-semibold text-xs">
                                  {member.totalSchedules}
                                </span>
                              </TableCell>
                              <TableCell className="text-center">
                                <Badge className="bg-blue-500 text-xs cursor-pointer hover:bg-blue-600" title={Object.entries(member.schedulesByDate || {}).map(([date, count]) => `${date}: ${count}`).join(', ')}>
                                  View Dates
                                </Badge>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  ) : (
                    <p className="text-muted-foreground">No members in this team</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    Schedule Breakdown by Date
                    <Badge variant="outline" className="text-xs ml-auto">
                      {scheduleSortOrder === 'desc' ? (
                        <>
                          <ArrowDown className="h-3 w-3 mr-1" />
                          Newest First
                        </>
                      ) : (
                        <>
                          <ArrowUp className="h-3 w-3 mr-1" />
                          Oldest First
                        </>
                      )}
                    </Badge>
                  </CardTitle>
                  <CardDescription>Shows how many schedules each HR has scheduled per walk-in date</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {selectedTeam.members.map((member) => (
                      <div key={member.id} className="border rounded-lg p-4">
                        <h3 className="font-semibold text-sm mb-3">{member.name}</h3>
                        {Object.keys(member.schedulesByDate || {}).length > 0 ? (
                          <div className="grid grid-cols-2 gap-2">
                            {Object.entries(member.schedulesByDate || {})
                              .sort(([dateA], [dateB]) => {
                                const comparison = new Date(dateB).getTime() - new Date(dateA).getTime();
                                return scheduleSortOrder === 'desc' ? comparison : -comparison;
                              })
                              .map(([date, count]) => (
                                <div key={date} className="flex justify-between items-center border-b pb-2">
                                  <span className="text-sm text-muted-foreground">
                                    {new Date(date + 'T00:00:00').toLocaleDateString('en-US', {
                                      year: 'numeric',
                                      month: 'short',
                                      day: 'numeric'
                                    })}
                                  </span>
                                  <Badge variant="secondary">{count as number} schedule{(count as number) !== 1 ? 's' : ''}</Badge>
                                </div>
                              ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">No schedules yet</p>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Team Statistics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="border rounded p-3">
                      <p className="text-sm text-muted-foreground">Completion Rate</p>
                      <p className={`text-2xl font-bold ${selectedTeam.completionRate >= 80 ? 'text-green-600' :
                        selectedTeam.completionRate >= 50 ? 'text-yellow-600' :
                          'text-red-600'
                        }`}>
                        {selectedTeam.completionRate}%
                      </p>
                    </div>
                    <div className="border rounded p-3">
                      <p className="text-sm text-muted-foreground">Pending Leads</p>
                      <p className="text-2xl font-bold text-orange-600">
                        {selectedTeam.totalLeads - selectedTeam.completedLeads}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
