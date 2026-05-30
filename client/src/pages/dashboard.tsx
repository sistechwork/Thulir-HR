import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { isUnauthorizedError } from "@/lib/authUtils";
import FloatingChatbot from "@/components/FloatingChatbot";
import NotificationBell from "@/components/NotificationBell";
import { KathaipomFeed } from "@/components/KathaipomFeed";
import MetricsCard from "@/components/MetricsCard";
import StatusChart from "@/components/StatusChart";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import {
  Users,
  Clock,
  CheckCircle,
  IndianRupee,
  Upload,
  Search,
  Send,
  Bell,
  Download,
  Filter,
} from "lucide-react";
import BulkUploadModal from "@/components/BulkUploadModal";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { isAdminOrganizer, isSessionOrganizer, hasManagerPermissions, hasAccountsPermissions, getAdminSubRole } from "@/lib/adminRoleUtils";
import { Link } from "wouter";
import { BookMarked, History, Mail as MailIcon, FileText, BookCheck } from "lucide-react";
import TechSupportDashboard from "@/components/TechSupportDashboard";

export default function Dashboard() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading, user } = useAuth();
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [dateRange, setDateRange] = useState<{
    minDate: string;
    maxDate: string;
  } | null>(null);
  const [notificationTitle, setNotificationTitle] = useState("");
  const [notificationMessage, setNotificationMessage] = useState("");
  const [selectedRoles, setSelectedRoles] = useState<string[]>(["hr"]);
  const [notificationImage, setNotificationImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");

  // Listen for localStorage changes (when HR changes category on login screen)

  // Fetch date range on mount (only for accounts and admin)
  useEffect(() => {
    const fetchDateRange = async () => {
      try {
        // Only fetch if user is accounts, session organizer admin, or admin
        const userRole = (user as any)?.role;
        const shouldFetch = userRole === "accounts" ||
          hasAccountsPermissions(userRole) ||
          userRole === "admin";
        if (user && shouldFetch) {
          const response = await fetch("/api/download-date-range", {
            credentials: 'include'
          });
          const data = await response.json();
          setDateRange(data);
          setFromDate(data.minDate);
          setToDate(data.maxDate);
        }
      } catch (error) {
        console.error("Error fetching date range:", error);
      }
    };
    fetchDateRange();
  }, [user]);

  const handleDownloadData = async () => {
    try {
      if (!fromDate || !toDate) {
        toast({
          title: "Error",
          description: "Please select both from and to dates",
          variant: "destructive",
        });
        return;
      }

      setIsDownloading(true);
      const params = new URLSearchParams({
        fromDate,
        toDate,
      });
      const response = await fetch(`/api/download-data?${params}`, {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error("Failed to download data");
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `MyData_${fromDate}_to_${toDate}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
      setShowDatePicker(false);
      toast({
        title: "Success",
        description: `Your data (${fromDate} to ${toDate}) has been downloaded`,
      });
    } catch (error) {
      console.error("Download error:", error);
      toast({
        title: "Error",
        description: "Failed to download your data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const sendNotificationMutation = useMutation({
    mutationFn: async (data: {
      title: string;
      message: string;
      roles: string[];
      image?: File;
    }) => {
      const formData = new FormData();
      formData.append("title", data.title);
      formData.append("message", data.message);
      formData.append("roles", JSON.stringify(data.roles));
      if (data.image) {
        formData.append("image", data.image);
      }

      const response = await fetch("/api/notifications/send", {
        method: "POST",
        body: formData,
      });
      return response.json();
    },
    onSuccess: () => {
      setNotificationTitle("");
      setNotificationMessage("");
      setSelectedRoles(["hr"]);
      setNotificationImage(null);
      setImagePreview("");
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      toast({
        title: "Notification Sent",
        description: "Message delivered to selected team members",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to Send",
        description: "Could not send notification. Please try again.",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  const activeCategoryFilter = "all";

  // Team stats for Team Lead users
  const { data: teamStats } = useQuery({
    queryKey: ["/api/my/team-stats"],
    queryFn: async () => {
      const response = await fetch("/api/my/team-stats", { credentials: 'include' });
      if (!response.ok) return null;
      return response.json();
    },
    enabled: (user as any)?.role === 'team_lead',
    retry: false,
  });

  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ["/api/metrics", activeCategoryFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      const url = `/api/metrics?${params}`;
      const response = await fetch(url, { credentials: 'include' });
      if (!response.ok) throw new Error("Failed to fetch metrics");
      return response.json();
    },
    retry: false,
  });

  const { data: recentActivity } = useQuery({
    queryKey: ["/api/leads/recent"],
    enabled: !!user && ['admin', 'manager', 'hr', 'accounts', 'session_organizer', 'session-coordinator', 'tech-support'].includes((user as any)?.role),
    retry: false,
  });

  const { data: myLeadsData } = useQuery({
    queryKey: ["/api/my/leads", (user as any)?.role],
    queryFn: async () => {
      const params = new URLSearchParams();
      const url = `/api/my/leads?${params.toString()}`;
      const response = await fetch(url, { credentials: 'include' });
      if (!response.ok) throw new Error("Failed to fetch leads");
      return response.json();
    },
    retry: false,
    refetchInterval: 3000,
    refetchOnWindowFocus: true,
  });

  const { data: myCompletedData } = useQuery({
    queryKey: ["/api/my/completed", (user as any)?.role],
    queryFn: async () => {
      const params = new URLSearchParams();
      const url = `/api/my/completed?${params.toString()}`;
      const response = await fetch(url, { credentials: 'include' });
      if (!response.ok) throw new Error("Failed to fetch leads");
      return response.json();
    },
    retry: false,
    refetchInterval: 3000,
    refetchOnWindowFocus: true,
  });

  const { data: hrUsersData } = useQuery({
    queryKey: ["/api/users"],
    queryFn: async () => {
      const response = await fetch("/api/users?role=hr");
      if (!response.ok) throw new Error("Failed to fetch HR users");
      return response.json();
    },
    enabled: !!user && ['admin', 'manager', 'team_lead', 'tech-support', 'accounts'].includes((user as any)?.role),
    retry: false,
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
  });

  const { data: leadHistoryData } = useQuery({
    queryKey: ["/api/history/all"],
    enabled: !!user && ['admin', 'manager', 'hr', 'accounts', 'tech-support'].includes((user as any)?.role),
    retry: false,
    refetchInterval: 3000,
    refetchOnWindowFocus: true,
  });

  const { data: notificationsData = [] } = useQuery({
    queryKey: ["/api/notifications"],
    retry: false,
    enabled: (user as any)?.role !== "manager",
    refetchInterval: 2000,
    refetchOnWindowFocus: true,
  });

  // Define all available statuses
  const ALL_STATUSES = [
    "new",
    "register",
    "scheduled",
    "completed",
    "pending",
    "ready_for_class",
    "call_back",
    "dropped",
  ];

  // Calculate role-specific status distribution for pie chart
  const roleSpecificMetrics = useMemo(() => {
    // For all roles: Show their own leads' status + completed leads
    const statusCounts: { [key: string]: number } = {};

    // Initialize all statuses with 0
    ALL_STATUSES.forEach((status) => {
      statusCounts[status] = 0;
    });

    // Count current leads by status
    if (myLeadsData?.leads && Array.isArray(myLeadsData.leads)) {
      myLeadsData.leads.forEach((lead: any) => {
        const status = lead.status || "new";
        statusCounts[status] = (statusCounts[status] || 0) + 1;
      });
    }

    // Add completed leads count
    if (myCompletedData?.leads && Array.isArray(myCompletedData.leads)) {
      statusCounts["completed"] =
        (statusCounts["completed"] || 0) + myCompletedData.leads.length;
    }

    // Filter out statuses with 0 count for cleaner display
    const filteredStatuses: { [key: string]: number } = {};
    Object.entries(statusCounts).forEach(([status, count]) => {
      if (count > 0) {
        filteredStatuses[status] = count;
      }
    });

    // Only Fallback if we are a manager/admin
    if (user?.role === 'manager' || user?.role === 'admin') {
      const dist: Record<string, number> = {};

      // Aggregate statuses from metrics distribution
      if (metrics?.statusDistribution) {
        Object.entries(metrics.statusDistribution).forEach(([status, count]) => {
          const s = status.toLowerCase().trim();
          const c = Number(count) || 0;
          // Group all completion-like statuses into 'completed'
          if (s === 'completed' || s === 'ready_for_class' || s === 'accounts_pending') {
            dist['completed'] = (dist['completed'] || 0) + c;
          } else {
            dist[s] = (dist[s] || 0) + c;
          }
        });
      }

      // Fallback: manually set completed if statusDistribution didn't have it or was empty
      if (metrics?.completedLeads && (!dist['completed'] || dist['completed'] < metrics.completedLeads)) {
        dist['completed'] = metrics.completedLeads;
      }

      return dist;
    }

    // For HR/Accounts: If no personal data, return empty to show "No Data" instead of fallback to system metrics
    if (Object.keys(filteredStatuses).length === 0) {
      return {};
    }

    return filteredStatuses;
  }, [
    metrics?.statusDistribution,
    metrics?.completedLeads,
    myLeadsData,
    myCompletedData,
    user?.id,
    user?.role,
  ]);

  // Calculate total collected amount (registration + partial amounts)
  const collectedAmount = useMemo(() => {
    return metrics?.revenue || 0;
  }, [metrics?.revenue]);

  // Calculate HR status assignment breakdown (Top 10 by completions)
  const hrStatusAssignments = useMemo(() => {
    if (!metrics?.hrPerformance) return [];

    return [...metrics.hrPerformance]
      .sort((a, b) => b.completed - a.completed)
      .slice(0, 10);
  }, [metrics?.hrPerformance]);

  // Format amount to display (e.g., 128000 -> "₹128K")
  const formatRevenueDisplay = (amount: number) => {
    if (amount >= 1000000) return `₹${(amount / 1000000).toFixed(1).replace(/\.0$/, '')}M`;
    if (amount >= 1000) return `₹${(amount / 1000).toFixed(1).replace(/\.0$/, '')}K`;
    return `₹${amount.toFixed(0)}`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <>
      <FloatingChatbot />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {user?.role === 'tech-support' || user?.role === 'admin' && getAdminSubRole() === 'tech_support' ? (
          <main className="flex-1 overflow-y-auto p-10">
            <TechSupportDashboard userDisplayName={user?.fullName || user?.username || "User"} />
          </main>
        ) : (
          <>
            {/* Header */}
            <header className="bg-card border-b border-border px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h1
                    className="text-2xl font-bold text-foreground"
                    data-testid="text-page-title"
                  >
                    Dashboard Overview
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    Monitor leads, manage users, and track performance
                  </p>
                </div>
                <div className="flex items-center space-x-4">
                  <NotificationBell />
                  <div className="relative">
                    <Input
                      type="text"
                      placeholder="Global search..."
                      className="w-64 pl-10"
                      data-testid="input-global-search"
                    />
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  </div>

                  {/* Bulk Upload - Only for manager and admin */}
                  {(user?.role === "manager" || user?.role === "admin") && (
                    <Button
                      onClick={() => setShowBulkUpload(true)}
                      variant="outline"
                      className="border-primary/50 text-primary hover:bg-primary/10"
                      data-testid="button-bulk-upload"
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      Bulk Import
                    </Button>
                  )}

                  {/* Date Range Picker - Only for accounts, session organizer, and admin */}
                  {!!user && (hasAccountsPermissions((user as any)?.role) || (user as any)?.role === "admin") && (
                    <div className="relative">
                      <Button
                        onClick={() => setShowDatePicker(!showDatePicker)}
                        disabled={isDownloading}
                        variant="outline"
                        data-testid="button-download-data"
                      >
                        <Download className="mr-2 h-4 w-4" />
                        {isDownloading ? "Downloading..." : "Download Data"}
                      </Button>

                      {/* Dropdown for date selection */}
                      {showDatePicker && (
                        <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-[#1a1a1a] border border-border rounded-lg shadow-lg z-50 p-4 space-y-3">
                          <div>
                            <label className="text-sm font-medium">From Date</label>
                            <Input
                              type="date"
                              value={fromDate}
                              onChange={(e) => setFromDate(e.target.value)}
                              min={dateRange?.minDate}
                              max={dateRange?.maxDate}
                              className="mt-1"
                              data-testid="input-from-date"
                            />
                          </div>
                          <div>
                            <label className="text-sm font-medium">To Date</label>
                            <Input
                              type="date"
                              value={toDate}
                              onChange={(e) => setToDate(e.target.value)}
                              min={dateRange?.minDate}
                              max={dateRange?.maxDate}
                              className="mt-1"
                              data-testid="input-to-date"
                            />
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Data available from{" "}
                            <strong>{dateRange?.minDate}</strong> to{" "}
                            <strong>{dateRange?.maxDate}</strong>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              onClick={handleDownloadData}
                              disabled={isDownloading}
                              size="sm"
                              className="flex-1"
                              data-testid="button-download-confirm"
                            >
                              {isDownloading ? "Downloading..." : "Download"}
                            </Button>
                            <Button
                              onClick={() => setShowDatePicker(false)}
                              size="sm"
                              variant="ghost"
                              className="flex-1"
                              data-testid="button-close-date-picker"
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                </div>
              </div>
            </header>

            {/* Dashboard Content */}
            <main className="flex-1 overflow-y-auto p-6">

              {/* Quick Actions for Session Organizer */}
              {isSessionOrganizer(user?.role) && (
                <div className="mb-8">
                  <div className="flex items-center space-x-2 mb-4">
                    <Send className="w-5 h-5 text-primary" />
                    <h2 className="text-xl font-bold">Quick Actions</h2>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                    <Link href="/classes">
                      <Card className="p-4 hover:shadow-green-md transition-all cursor-pointer border-blue-200 bg-blue-50/30 dark:bg-blue-900/10">
                        <div className="flex flex-col items-center text-center space-y-2">
                          <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                            <BookMarked className="w-6 h-6 text-blue-600" />
                          </div>
                          <span className="font-semibold text-blue-700 dark:text-blue-400">Manage Classes</span>
                        </div>
                      </Card>
                    </Link>
                    <Link href="/my-completion">
                      <Card className="p-4 hover:shadow-green-md transition-all cursor-pointer border-cyan-200 bg-cyan-50/30 dark:bg-cyan-900/10">
                        <div className="flex flex-col items-center text-center space-y-2">
                          <div className="p-3 bg-cyan-100 dark:bg-cyan-900/30 rounded-lg">
                            <History className="w-6 h-6 text-cyan-600" />
                          </div>
                          <span className="font-semibold text-cyan-700 dark:text-cyan-400">View History</span>
                        </div>
                      </Card>
                    </Link>
                    <Card className="p-4 hover:shadow-green-md transition-all cursor-pointer border-green-200 bg-green-50/30 dark:bg-green-900/10" onClick={() => setShowDatePicker(true)}>
                      <div className="flex flex-col items-center text-center space-y-2">
                        <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                          <FileText className="w-6 h-6 text-green-600" />
                        </div>
                        <span className="font-semibold text-green-700 dark:text-green-400">Export Data</span>
                      </div>
                    </Card>
                    <Card className="p-4 hover:shadow-green-md transition-all cursor-pointer border-yellow-200 bg-yellow-50/30 dark:bg-yellow-900/10 opacity-50 cursor-not-allowed">
                      <div className="flex flex-col items-center text-center space-y-2">
                        <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                          <Bell className="w-6 h-6 text-yellow-600" />
                        </div>
                        <span className="font-semibold text-yellow-700 dark:text-yellow-400">Notify Students</span>
                      </div>
                    </Card>
                  </div>
                </div>
              )}

              {/* Metrics Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <MetricsCard
                  title={(user as any)?.role === "hr" || (user as any)?.role === "accounts" || (user as any)?.role === "session-coordinator" ? "My Leads" : "Total Leads"}
                  value={
                    (user as any)?.role === "hr" || (user as any)?.role === "accounts" || (user as any)?.role === "session-coordinator"
                      ? (myLeadsData?.leads?.length || 0)
                      : (metrics?.totalLeads || 0)
                  }
                  icon={Users}
                  change="All Categories"
                  changeLabel="showing all leads"
                  loading={(user as any)?.role === "hr" || (user as any)?.role === "accounts" || (user as any)?.role === "session-coordinator" ? !myLeadsData : metricsLoading}
                  testId="metric-total-leads"
                />
                {((user as any)?.role === "manager" || (user as any)?.role === "admin" || (user as any)?.role === "team_lead") && (
                  <MetricsCard
                    title="Active HR Users"
                    value={metrics?.activeHR || 0}
                    icon={Clock}
                    change="HR team members active"
                    changeLabel="currently active"
                    changeType="positive"
                    loading={!hrUsersData}
                    testId="metric-active-hr"
                  />
                )}
                {((user as any)?.role === "manager" || (user as any)?.role === "admin" || (user as any)?.role === "team_lead") && (
                  <MetricsCard
                    title="Completed"
                    value={metrics?.completedLeads || 0}
                    icon={CheckCircle}
                    change="All Categories"
                    changeLabel="showing all"
                    loading={metricsLoading}
                    testId="metric-completed"
                  />
                )}
                {((user as any)?.role === "manager" || (user as any)?.role === "admin" || (user as any)?.role === "team_lead") && (
                  <MetricsCard
                    title="Revenue Pipeline"
                    value={formatRevenueDisplay(metrics?.revenue || 0)}
                    icon={IndianRupee}
                    change="All Categories"
                    changeLabel="total collected"
                    loading={metricsLoading}
                    testId="metric-revenue"
                  />
                )}
                {/* Available Leads Card for HR */}
                {((user as any)?.role === "hr" || (user as any)?.role === "session-coordinator") && (
                  <MetricsCard
                    title="Available to Claim"
                    value={
                      (metrics?.statusDistribution?.new || 0) +
                      (metrics?.statusDistribution?.register || 0)
                    }
                    icon={Search}
                    change="All Categories"
                    changeLabel="all new leads"
                    loading={metricsLoading}
                    testId="metric-available-leads"
                  />
                )}
              </div>

              {/* Recent Sessions Table for Session Organizers */}
              {isSessionOrganizer(user?.role) && (
                <Card className="mb-8 shadow-green-lg border border-border overflow-hidden">
                  <CardHeader className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950 dark:to-teal-950 pb-4">
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center text-xl font-bold">
                        <BookCheck className="mr-2 h-5 w-5 text-emerald-600" />
                        Scheduled Sessions
                      </CardTitle>
                      <Link href="/my-sessions">
                        <Button variant="ghost" size="sm" className="text-emerald-700 dark:text-emerald-400 font-semibold hover:bg-emerald-100/50">
                          View All Sessions →
                        </Button>
                      </Link>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left">
                        <thead className="bg-muted/50 text-muted-foreground font-medium border-b">
                          <tr>
                            <th className="px-6 py-4">Student</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4">Timing</th>
                            <th className="px-6 py-4 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {(myLeadsData?.leads as any[])?.filter(l => l.status === 'scheduled').slice(0, 5).map((lead) => (
                            <tr key={lead.id} className="hover:bg-muted/30 transition-colors">
                              <td className="px-6 py-4">
                                <div className="font-semibold text-foreground">{lead.name}</div>
                                <div className="text-xs text-muted-foreground">{lead.email}</div>
                              </td>
                              <td className="px-6 py-4 text-xs">
                                <span className="status-badge status-scheduled px-2 py-1">
                                  {lead.status.replace('_', ' ')}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <div className="text-foreground">{lead.sessionDays}</div>
                                <div className="text-xs text-muted-foreground font-medium">{lead.timing}</div>
                              </td>
                              <td className="px-6 py-4 text-right">
                                <Button
                                  size="sm"
                                  className="bg-primary hover:bg-primary/90 h-8"
                                  onClick={async () => {
                                    try {
                                      await apiRequest("PUT", `/api/leads/${lead.id}`, {
                                        status: "completed",
                                        changeReason: "Class created from dashboard"
                                      });
                                      queryClient.invalidateQueries({ queryKey: ["/api/my/leads"] });
                                      queryClient.invalidateQueries({ queryKey: ["/api/my/completed"] });
                                      toast({
                                        title: "Class Created",
                                        description: `Class for ${lead.name} has been initiated.`
                                      });
                                    } catch (e) {
                                      toast({
                                        title: "Error",
                                        description: "Failed to create class",
                                        variant: "destructive"
                                      });
                                    }
                                  }}
                                >
                                  <BookCheck className="w-3 h-3 mr-1" />
                                  Create Class
                                </Button>
                              </td>
                            </tr>
                          ))}
                          {(!(myLeadsData?.leads as any[])?.filter(l => l.status === 'scheduled').length) && (
                            <tr>
                              <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground">
                                No scheduled sessions found.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Modern Dashboard Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                {/* Left Column - Spans 2 rows */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Pie Chart - Wider */}
                  <Card className="shadow-green-lg hover:shadow-green-bright transition-shadow duration-300 border border-border overflow-hidden">
                    <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 pb-4">
                      <CardTitle className="text-xl font-bold">
                        My Lead Status
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6 px-6 pb-6 min-h-[390px] flex items-center justify-center">
                      <StatusChart data={roleSpecificMetrics} />
                    </CardContent>
                  </Card>

                  {/* Allocation Strategy - Full Width Bottom */}
                  <Card className="shadow-green-lg hover:shadow-green-bright transition-shadow duration-300 border border-border overflow-hidden">
                    <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 pb-4">
                      <CardTitle className="text-xl font-bold">
                        Allocation Strategy
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 pt-4 pb-3 px-4 dashboard-allocation-card min-h-[550px]">
                      <div className="flex items-center justify-between p-3 bg-muted rounded-lg shadow-sm">
                        <div>
                          <p className="text-sm font-medium">Current Strategy</p>
                          <p className="text-sm text-muted-foreground">
                            Registration Based
                          </p>
                        </div>
                        <span className="status-badge status-ready-for-class text-sm px-3 py-1.5">
                          Active
                        </span>
                      </div>

                      <div className="space-y-3">
                        <h4 className="text-sm font-semibold">
                          HR Status Assignment
                        </h4>
                        <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2">
                          {hrStatusAssignments.length > 0 ? (
                            hrStatusAssignments.map((hr, index) => (
                              <div
                                key={index}
                                className="bg-muted/50 rounded-lg p-3 shadow-sm flex items-center justify-between"
                              >
                                <p className="font-medium text-sm truncate">
                                  {hr.name}
                                </p>
                                <div className="flex items-center gap-2">
                                  <span className="status-badge status-completed text-xs px-2.5 py-1">
                                    {hr.completed} Completions
                                  </span>
                                </div>
                              </div>
                            ))
                          ) : (
                            <p className="text-sm text-muted-foreground text-center py-4">
                              No data available
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Right Column - 2 Cards Stacked */}
                <div className="space-y-6">
                  {/* Team Lead - Team Members Section */}
                  {(user as any)?.role === "team_lead" && teamStats && (
                    <Card className="shadow-green-lg hover:shadow-green-bright transition-shadow duration-300 border border-border overflow-hidden">
                      <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 pb-4">
                        <CardTitle className="flex items-center text-xl font-bold">
                          <Users className="mr-2 h-5 w-5" />
                          My Team: {teamStats.teamName}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4 pt-4">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-muted rounded-lg p-3 text-center">
                            <p className="text-2xl font-bold text-primary">{teamStats.totalMembers}</p>
                            <p className="text-xs text-muted-foreground">Team Members</p>
                          </div>
                          <div className="bg-muted rounded-lg p-3 text-center">
                            <p className="text-2xl font-bold text-green-600">{teamStats.totalCompleted}</p>
                            <p className="text-xs text-muted-foreground">Completed</p>
                          </div>
                        </div>
                        <div className="space-y-2 max-h-[300px] overflow-y-auto">
                          <h4 className="text-sm font-semibold">Team Members</h4>
                          {teamStats.members?.map((member: any) => (
                            <div key={member.id} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                              <div>
                                <p className="text-sm font-medium">{member.fullName}</p>
                                <p className="text-xs text-muted-foreground">{member.email}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-bold text-primary">{member.totalLeads}</p>
                                <p className="text-xs text-muted-foreground">leads</p>
                              </div>
                            </div>
                          ))}
                          {(!teamStats.members || teamStats.members.length === 0) && (
                            <p className="text-sm text-muted-foreground text-center py-4">
                              No team members assigned yet
                            </p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Notifications */}
                  {(user as any)?.role === "manager" ? (
                    <Card className="shadow-green-lg hover:shadow-green-bright transition-shadow duration-300 border border-border overflow-hidden">
                      <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 pb-4">
                        <CardTitle className="flex items-center text-xl font-bold">
                          <Bell className="mr-2 h-5 w-5" />
                          Send Team Notification
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4 pt-4 dashboard-notification-send max-h-[500px] overflow-y-auto">
                        <div>
                          <label className="text-sm font-medium mb-2 block">
                            Title
                          </label>
                          <Input
                            placeholder="Notification title..."
                            value={notificationTitle}
                            onChange={(e) => setNotificationTitle(e.target.value)}
                            data-testid="input-notification-title"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-2 block">
                            Message
                          </label>
                          <Textarea
                            placeholder="Type your message here..."
                            rows={4}
                            value={notificationMessage}
                            onChange={(e) => setNotificationMessage(e.target.value)}
                            data-testid="textarea-notification-message"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-3 block">
                            Send To
                          </label>
                          <div className="space-y-2">
                            {[
                              { value: "hr", label: "HR Team" },
                              { value: "accounts", label: "Accounts Team" },
                              { value: "admin", label: "Admin" },
                            ].map((role) => (
                              <div
                                key={role.value}
                                className="flex items-center space-x-2"
                              >
                                <Checkbox
                                  id={`role-${role.value}`}
                                  checked={selectedRoles.includes(role.value)}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      setSelectedRoles([
                                        ...selectedRoles,
                                        role.value,
                                      ]);
                                    } else {
                                      setSelectedRoles(
                                        selectedRoles.filter(
                                          (r) => r !== role.value,
                                        ),
                                      );
                                    }
                                  }}
                                  data-testid={`checkbox-role-${role.value}`}
                                />
                                <label
                                  htmlFor={`role-${role.value}`}
                                  className="text-sm cursor-pointer"
                                >
                                  {role.label}
                                </label>
                              </div>
                            ))}
                          </div>
                        </div>
                      </CardContent>
                      <div className="border-t border-border p-4">
                        <Button
                          onClick={() =>
                            sendNotificationMutation.mutate({
                              title: notificationTitle,
                              message: notificationMessage,
                              roles: selectedRoles,
                            })
                          }
                          disabled={
                            !notificationTitle.trim() ||
                            !notificationMessage.trim() ||
                            selectedRoles.length === 0 ||
                            sendNotificationMutation.isPending
                          }
                          className="w-full"
                          size="default"
                          data-testid="button-send-notification"
                        >
                          <Send className="w-4 h-4 mr-2" />
                          {sendNotificationMutation.isPending
                            ? "Sending..."
                            : "Send"}
                        </Button>
                      </div>
                    </Card>
                  ) : (
                    <Card className="shadow-green-lg hover:shadow-green-bright transition-shadow duration-300 border border-border overflow-hidden">
                      <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 pb-4">
                        <CardTitle className="text-xl font-bold">
                          Kathaipom - Team Feed
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-0 h-[800px] overflow-hidden dashboard-notification-receive border-t">
                        <KathaipomFeed />
                      </CardContent>
                    </Card>
                  )}

                  {/* Recent Activity */}
                  <Card className="shadow-green-lg hover:shadow-green-bright transition-shadow duration-300 border border-border overflow-hidden">
                    <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 pb-4">
                      <CardTitle className="text-xl font-bold">
                        Recent Activity
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4 px-4 pb-4 min-h-[320px] max-h-[450px] overflow-y-auto">
                      {!(recentActivity as any[])?.length ? (
                        <div className="flex items-center justify-center h-full text-center text-muted-foreground">
                          <div>
                            <p className="text-sm">No recent activity</p>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {(recentActivity as any[])
                            .slice(0, 12)
                            .map((activity: any, index: number) => (
                              <div
                                key={index}
                                className="p-3 bg-muted/50 rounded-lg border border-border shadow-sm hover:shadow-md transition-shadow"
                              >
                                <p className="font-medium text-sm text-foreground truncate">
                                  {activity.leadName}
                                </p>
                                <p className="text-muted-foreground text-xs mt-1.5 line-clamp-2">
                                  {activity.action}
                                </p>
                                <p className="text-muted-foreground text-xs mt-1.5">
                                  {new Date(
                                    activity.timestamp,
                                  ).toLocaleTimeString()}
                                </p>
                              </div>
                            ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            </main>
          </>
        )}
      </div>

      {/* Modals */}
      {showBulkUpload && (
        <BulkUploadModal
          isOpen={showBulkUpload}
          onClose={() => setShowBulkUpload(false)}
        />
      )}
    </>
  );
}
