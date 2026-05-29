import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  UserCheck,
  Search,
  Filter,
  Clock,
  Phone,
  Mail,
  MapPin,
  Edit,
  Save,
  X,
  Trash2,
  Plus,
  ChevronDown,
  ChevronUp,
  Calendar,
  CalendarCheck,
  User,
  Building2,
  Share2,
  GraduationCap,
  Timer,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { insertLeadSchema } from "@shared/schema";
import Sidebar from "@/components/Sidebar";
import FloatingChatbot from "@/components/FloatingChatbot";
import { getAdminSubRole, isSessionOrganizer } from "@/lib/adminRoleUtils";

// User type for auth
interface AuthUser {
  id: string;
  email: string;
  role: 'hr' | 'accounts' | 'manager' | 'admin' | 'team_lead' | 'tech-support' | 'session-coordinator' | 'session_organizer';
  firstName?: string;
  lastName?: string;
  fullName?: string;
}

// Edit lead form schema - Simplified to handle form data properly
const editLeadSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().optional(),
  location: z.string().optional(),
  degree: z.string().optional(),
  domain: z.string().optional(),
  sessionDays: z
    .enum(["M,W,F", "T,T,S", "daily", "weekend", "custom"])
    .optional()
    .or(z.literal("")),
  walkinDate: z.string().optional().or(z.literal("")),
  walkinTime: z.string().optional().or(z.literal("")),
  timing: z.string().optional(),
  status: z.string().optional(),
  notes: z.string().optional(),
  changeReason: z.string().optional(),
  yearOfPassing: z.string().optional(),
  collegeName: z.string().optional(),
  registrationAmount: z.string().optional(),
  pendingAmount: z.string().optional(),
  partialAmount: z.string().optional(),
  transactionNumber: z.string().optional(),
  concession: z.string().optional(),
  program: z.string().optional().or(z.literal("")),
});

// Create lead form schema - Simplified for form submission
const createLeadSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().optional(),
  location: z.string().optional(),
  degree: z.string().optional(),
  domain: z.string().optional(),
  sessionDays: z
    .enum(["M,W,F", "T,T,S", "daily", "weekend", "custom"])
    .optional()
    .or(z.literal("")),
  walkinDate: z.string().optional().or(z.literal("")),
  walkinTime: z.string().optional().or(z.literal("")),
  timing: z.string().optional(),
  program: z.string().optional().or(z.literal("")),
  notes: z.string().optional(),
});

type EditLeadForm = z.infer<typeof editLeadSchema>;
type CreateLeadForm = z.infer<typeof createLeadSchema>;

const statusOptions = [
  { value: 'new', label: 'New' },
  { value: 'register', label: 'Register' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'completed', label: 'Completed' },
  { value: 'pending', label: 'Pending' },
  { value: 'ready_for_class', label: 'Ready for Class' },
  { value: 'call_back', label: 'Call Back' },
  { value: 'dropped', label: 'Dropped' },
];

const getAllowedStatuses = (currentStatus: string) => {
  switch (currentStatus) {
    case 'new':
      return statusOptions.filter(s => s.value !== 'new' || currentStatus === 'new');
    case 'register':
      return statusOptions.filter(s => 
        ['register', 'completed', 'pending', 'ready_for_class', 'dropped'].includes(s.value)
      );
    default:
      return statusOptions.filter(s => s.value !== 'new');
  }
};

export default function MyLeadsPage() {
  const { user: authUser } = useAuth();
  const user = authUser as AuthUser | undefined;
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [editingLeadId, setEditingLeadId] = useState<number | null>(null);
  const [expandedLeadId, setExpandedLeadId] = useState<number | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [releaseLeadId, setReleaseLeadId] = useState<number | null>(null);
  const [releaseReason, setReleaseReason] = useState<string>("");
  const [, setTick] = useState(0); // Used to force re-render for countdown timers

  // Re-render every 30 seconds to update countdown timers
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "new":
        return "status-new";
      case "register":
        return "status-ready-for-class";
      case "scheduled":
        return "status-scheduled";
      case "completed":
        return "status-completed";
      case "pending":
        return "status-pending";
      case "ready_for_class":
        return "status-ready-for-class";
      case "call_back":
        return "status-scheduled";
      case "dropped":
        return "status-not-interested";
      default:
        return "status-new";
    }
  };

  // Fetch my leads with category filter (but not for accounts/session_organizer users)
  const isSessOrg = isSessionOrganizer(user?.role);
  const currentAdminSubRole = getAdminSubRole();

  const { data, isLoading, error } = useQuery({
    queryKey: ["/api/my/leads", user?.role, currentAdminSubRole],
    queryFn: async () => {
      const params = new URLSearchParams();

      if (currentAdminSubRole) {
        params.append("adminSubRole", currentAdminSubRole);
      }

      // Add cache-busting timestamp to ensure fresh data
      params.append("_t", Date.now().toString());
      const url = `/api/my/leads?${params.toString()}`;
      console.log(`[my-leads] Fetching leads for role=${user?.role}, currentAdminSubRole=${currentAdminSubRole}, url=${url}`);
      const response = await fetch(url, { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch leads");
      const result = await response.json();
      console.log(`[my-leads] Got ${result.leads?.length || 0} leads:`, result.leads);
      return result;
    },
    retry: false,
    staleTime: 0, // Always consider data stale to force refetch
    gcTime: 0, // Don't cache data
    enabled: !!user, // Only run when user is loaded
  });

  // Fetch accounts pending leads for accounts users
  const { data: accountsPendingData, isLoading: accountsPendingLoading } = useQuery({
    queryKey: ["/api/my/accounts-pending"],
    queryFn: async () => {
      const url = `/api/my/accounts-pending`;
      const response = await fetch(url, { credentials: "include" });
      if (!response.ok) return { leads: [], total: 0 };
      return response.json();
    },
    retry: false,
    enabled: user?.role === 'accounts', // Only for accounts users
  });

  // Fetch HR lead capacity (new lead count & limit)
  const { data: capacityData } = useQuery({
    queryKey: ["/api/my/lead-capacity"],
    queryFn: async () => {
      const response = await fetch("/api/my/lead-capacity", { credentials: "include" });
      if (!response.ok) return { currentNewLeads: 0, limit: 15, remaining: 15 };
      return response.json();
    },
    retry: false,
    staleTime: 0,
    enabled: user?.role === 'hr',
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Update lead mutation
  const updateLeadMutation = useMutation({
    mutationFn: async ({
      leadId,
      data,
    }: {
      leadId: number;
      data: EditLeadForm;
    }) => {
      const response = await apiRequest("PUT", `/api/leads/${leadId}`, data);
      return response.json();
    },
    onSuccess: (data, variables) => {
      toast({
        title: "Lead Updated",
        description: "Lead details have been saved successfully.",
      });

      queryClient.invalidateQueries({ queryKey: ["/api/my/leads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/my/completed"] });
      queryClient.invalidateQueries({ queryKey: ["/api/metrics"] });
      setEditingLeadId(null);
      setExpandedLeadId(null);
    },
    onError: (error) => {
      toast({
        title: "Update Failed",
        description: "Failed to update lead. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Pass to Accounts mutation
  const passToAccountsMutation = useMutation({
    mutationFn: async ({
      leadId,
      data,
    }: {
      leadId: number;
      data: EditLeadForm;
    }) => {
      const response = await apiRequest("POST", `/api/leads/${leadId}/pass-to-accounts`, data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Lead Passed to Accounts",
        description: "Lead has been successfully passed to the accounts team.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/my/leads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/metrics"] });
      setEditingLeadId(null);
      setExpandedLeadId(null);
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || "Failed to pass lead to accounts. Please check all required fields.";
      toast({
        title: "Failed to Pass to Accounts",
        description: message,
        variant: "destructive",
      });
    },
  });

  // Release lead mutation for HR users
  const releaseLeadMutation = useMutation({
    mutationFn: async ({ leadId, reason }: { leadId: number; reason: string }) => {
      const response = await apiRequest("POST", `/api/leads/${leadId}/release`, { releaseReason: reason });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Lead Released",
        description: "The lead has been returned to Lead Management.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/my/leads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      setReleaseLeadId(null);
      setReleaseReason("");
    },
    onError: (error: Error) => {
      toast({
        title: "Release Failed",
        description: error.message || "Failed to release lead. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Delete lead mutation for HR users
  const deleteLeadMutation = useMutation({
    mutationFn: async (leadId: number) => {
      const response = await apiRequest("DELETE", `/api/leads/${leadId}`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Lead Deleted",
        description: "The lead has been removed successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/my/leads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Delete Failed",
        description: error.message || "Failed to delete lead. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Schedule Session mutation for Session Organizers
  const scheduleSessionMutation = useMutation({
    mutationFn: async ({
      leadId,
      data,
    }: {
      leadId: number;
      data: any;
    }) => {
      // Update status to 'scheduled'
      const updateData = {
        ...data,
        status: 'scheduled'
      };
      const response = await apiRequest("PUT", `/api/leads/${leadId}`, updateData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Session Scheduled",
        description: "The lead has been marked as scheduled successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/my/leads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/metrics"] });
      setEditingLeadId(null);
      setExpandedLeadId(null);
    },
    onError: (error: any) => {
      toast({
        title: "Scheduling Failed",
        description: "Failed to schedule session. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Create lead mutation for HR users
  const createLeadMutation = useMutation({
    mutationFn: async (data: CreateLeadForm) => {
      const response = await apiRequest("POST", `/api/leads`, data);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Lead Created",
        description:
          "New lead has been successfully created and assigned to you.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/my/leads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/metrics"] });
      setIsCreateModalOpen(false);
      createForm.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Create Lead",
        description:
          error.message || "An error occurred while creating the lead.",
        variant: "destructive",
      });
    },
  });

  // Edit form
  const form = useForm<EditLeadForm>({
    resolver: zodResolver(editLeadSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      location: "",
      degree: "",
      domain: "",
      sessionDays: "",
      walkinDate: "",
      walkinTime: "",
      timing: "",
      status: "new",
      notes: "",
      changeReason: "",
      yearOfPassing: "",
      collegeName: "",
      registrationAmount: "",
      pendingAmount: "",
      partialAmount: "",
      transactionNumber: "",
      concession: "",
      program: "",
    },
  });

  const createForm = useForm<CreateLeadForm>({
    resolver: zodResolver(createLeadSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      location: "",
      degree: "",
      domain: "",
      sessionDays: "",
      timing: "",
      program: "",
      notes: "",
    },
  });

  const handleEditLead = (lead: any) => {
    console.log('[handleEditLead] Called with lead:', lead);
    console.log('[handleEditLead] Setting editingLeadId to:', lead.id);
    setEditingLeadId(lead.id);
    form.reset({
      name: lead.name ?? "",
      email: lead.email ?? "",
      phone: lead.phone ?? "",
      location: lead.location ?? "",
      degree: lead.degree ?? "",
      domain: lead.domain ?? "",
      sessionDays: lead.sessionDays ?? "",
      walkinDate: lead.walkinDate ?? "",
      walkinTime: lead.walkinTime ?? "",
      timing: lead.timing ?? "",
      status: lead.status ?? "",
      notes: lead.notes ?? "",
      changeReason: "",
      yearOfPassing: lead.yearOfPassing ?? "",
      collegeName: lead.collegeName ?? "",
      registrationAmount: lead.registrationAmount ?? "",
      pendingAmount: lead.pendingAmount ?? "",
      partialAmount: lead.partialAmount ?? "",
      transactionNumber: lead.transactionNumber ?? "",
      concession: lead.concession ?? "",
      program: lead.program ?? "",
    });
  };

  const handleToggleExpand = (leadId: number) => {
    setExpandedLeadId(expandedLeadId === leadId ? null : leadId);
  };

  const handleSubmitEdit = (data: EditLeadForm) => {
    console.log("Form submission - editingLeadId:", editingLeadId);
    console.log("Form data:", data);
    console.log("Form errors:", form.formState.errors);
    if (editingLeadId) {
      updateLeadMutation.mutate({ leadId: editingLeadId, data });
    }
  };

  const handlePassToAccounts = (data: EditLeadForm) => {
    let hasErrors = false;

    // Clear previous errors
    form.clearErrors();

    // Validate required fields and set inline errors
    if (!data.name || data.name.trim() === '') {
      form.setError('name', { type: 'manual', message: 'Name is required' });
      hasErrors = true;
    }
    if (!data.email || data.email.trim() === '') {
      form.setError('email', { type: 'manual', message: 'Email is required' });
      hasErrors = true;
    }
    if (!data.phone || data.phone.trim() === '') {
      form.setError('phone', { type: 'manual', message: 'Phone Number is required' });
      hasErrors = true;
    }
    if (!data.walkinDate || data.walkinDate.trim() === '') {
      form.setError('walkinDate', { type: 'manual', message: 'Walk-in Date is required' });
      hasErrors = true;
    }
    if (!data.walkinTime || data.walkinTime.trim() === '') {
      form.setError('walkinTime', { type: 'manual', message: 'Walk-in Time is required' });
      hasErrors = true;
    }
    if (!data.registrationAmount || data.registrationAmount.trim() === '') {
      form.setError('registrationAmount', { type: 'manual', message: 'Registration Amount is required' });
      hasErrors = true;
    }

    if (hasErrors) {
      toast({
        title: "Missing Required Fields",
        description: "Please fill all required fields before passing to accounts.",
        variant: "destructive",
      });
      return;
    }

    if (editingLeadId) {
      passToAccountsMutation.mutate({ leadId: editingLeadId, data });
    }
  };


  const handleCancelEdit = () => {
    setEditingLeadId(null);
    form.reset();
  };

  const leads = (data as any)?.leads || [];
  const total = (data as any)?.total || 0;
  const isSessOrgView = user?.role === 'session_organizer' || (user?.role === 'admin' && getAdminSubRole() === 'session_organizer');

  // Filter leads based on search and status
  const filteredLeads = leads.filter((lead: any) => {
    const matchesSearch =
      !searchTerm ||
      (lead.name && lead.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (lead.email && lead.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (lead.phone && lead.phone.includes(searchTerm)) ||
      (lead.location && lead.location.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (lead.degree && lead.degree.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (lead.domain && lead.domain.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (lead.collegeName && lead.collegeName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (lead.yearOfPassing && lead.yearOfPassing.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (lead.program && lead.program.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus =
      statusFilter === "all" ? (isSessOrgView ? lead.status === "ready_for_class" : true) : lead.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  if (isLoading) {
    return (
      <>
        <div className="flex-1 flex flex-col min-w-0">
          {/* Removed redundant background and sidebar */}
          <div className="p-6">
            <div className="flex items-center space-x-3 mb-6">
              <UserCheck className="w-8 h-8 text-primary" />
              <div>
                <h1 className="text-3xl font-bold">My Leads</h1>
                <p className="text-muted-foreground">
                  Loading your assigned leads...
                </p>
              </div>
            </div>
            <div className="grid gap-4">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6">
                    <div className="h-4 bg-muted rounded w-1/3 mb-2"></div>
                    <div className="h-3 bg-muted rounded w-1/2"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </>
    );
  }

  if (error) {
    const errorMessage =
      (error as any)?.message || error?.toString() || "Unknown error";
    const isAccessDenied =
      errorMessage.includes("403") ||
      errorMessage.includes("HR users only") ||
      errorMessage.includes("HR and accounts users only") ||
      errorMessage.includes("insufficient permissions");

    return (
      <>
        <div className="flex-1 flex flex-col min-w-0">
          {/* Removed redundant background and sidebar */}
          <div className="p-6">
            <div className="flex items-center space-x-3 mb-6">
              <UserCheck className="w-8 h-8 text-primary" />
              <div>
                <h1 className="text-3xl font-bold">My Leads</h1>
                <p className="text-muted-foreground">Your assigned leads</p>
              </div>
            </div>
            <Card>
              <CardContent className="p-6 text-center">
                {isAccessDenied ? (
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold text-destructive">
                      Access Denied
                    </h3>
                    <p className="text-muted-foreground">
                      This page is only available to HR, accounts, and session organizer users.
                      Please contact your manager if you believe this is an
                      error.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold">
                      Failed to Load Leads
                    </h3>
                    <p className="text-muted-foreground">
                      Unable to load your leads at this time. Please try again
                      or contact support if the problem persists.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </>
    );
  }

  if (user?.role === 'accounts' || user?.role === 'session_organizer' || isSessOrg) {
    return (
      <>
        <FloatingChatbot />

        {/* Main Content */}
        <div className="space-y-6" data-testid="page-my-leads">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <UserCheck className="w-8 h-8 text-primary" />
              <div>
                <h1
                  className="text-3xl font-bold"
                  data-testid="heading-my-leads"
                >
                  My Leads
                </h1>
                <p className="text-muted-foreground">
                  {filteredLeads.length > 0
                    ? `${filteredLeads.length} lead${filteredLeads.length !== 1 ? "s" : ""} assigned to you`
                    : "No leads assigned yet"}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {filteredLeads.length > 0 && (
                <Badge
                  variant="outline"
                  className="text-lg px-3 py-1"
                  data-testid="badge-total-count"
                >
                  {filteredLeads.length} Total
                </Badge>
              )}
            </div>
          </div>

          {/* Filters */}
          {total > 0 && (
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search leads by name, email, phone, location, degree..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  data-testid="input-search-leads"
                />
              </div>
              {user?.role !== 'hr' && (
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger
                    className="w-full sm:w-48"
                    data-testid="select-status-filter"
                  >
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    {isSessOrgView ? (
                      <>
                        <SelectItem value="all">All Status (Ready for Class)</SelectItem>
                        <SelectItem value="ready_for_class">Ready for Class</SelectItem>
                      </>
                    ) : (
                      <>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="new">New</SelectItem>
                        <SelectItem value="register">Register</SelectItem>
                        <SelectItem value="scheduled">Scheduled</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="ready_for_class">Ready for Class</SelectItem>
                        <SelectItem value="dropped">Dropped</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          {/* Leads Grid */}
          {filteredLeads.length > 0 ? (
            <div className="grid gap-4">
              {filteredLeads.map((lead: any) => (
                <Card
                  key={lead.id}
                  className="shadow-green-md hover:shadow-green-bright transition-shadow"
                  data-testid={`card-lead-${lead.id}`}
                >
                  <CardHeader
                    className="pb-3 cursor-pointer"
                    onClick={() => handleToggleExpand(lead.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center space-x-2">
                          <CardTitle
                            className="text-lg"
                            data-testid={`text-lead-name-${lead.id}`}
                          >
                            {lead.name}
                          </CardTitle>
                          {expandedLeadId === lead.id ? (
                            <ChevronUp className="w-4 h-4 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-muted-foreground" />
                          )}
                        </div>
                        <CardDescription className="flex items-center space-x-2">
                          <span data-testid={`text-lead-email-${lead.id}`}>
                            {lead.email}
                          </span>
                          {lead.degree && (
                            <>
                              <span>•</span>
                              <span
                                className="text-xs bg-muted px-2 py-1 rounded"
                                data-testid={`badge-lead-degree-${lead.id}`}
                              >
                                {lead.degree}
                              </span>
                            </>
                          )}
                        </CardDescription>
                      </div>
                      <div
                        className="flex items-center space-x-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Badge
                          className={`status-badge ${getStatusColor(lead.status)}`}
                          data-testid={`status-${lead.id}`}
                        >
                          {lead.status.replace("_", " ")}
                        </Badge>
                        {/* 120-min countdown for new leads */}
                        {lead.status === 'new' && lead.claimedAt && (() => {
                          const claimedTime = new Date(lead.claimedAt).getTime();
                          const expiryTime = claimedTime + 120 * 60 * 1000;
                          const remaining = Math.max(0, expiryTime - Date.now());
                          const mins = Math.floor(remaining / 60000);
                          const secs = Math.floor((remaining % 60000) / 1000);
                          if (remaining <= 0) return <span className="text-xs text-red-500 font-medium">⏰ Expired</span>;
                          return (
                            <span className={`text-xs font-medium ${mins < 15 ? 'text-red-500' : mins < 30 ? 'text-yellow-600' : 'text-muted-foreground'}`}>
                              ⏱ {mins}m {secs}s left
                            </span>
                          );
                        })()}
                        {lead.createdAt && (
                          <div className="flex items-center text-xs text-muted-foreground">
                            <Clock className="w-3 h-3 mr-1" />
                            <span>
                              Added{" "}
                              {new Date(lead.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    {/* Edit Button Row - More Prominent for Accounts Users */}
                    <div className="mt-2 flex justify-end">
                      <Button
                        size="sm"
                        variant="default"
                        className="bg-primary hover:bg-primary/90"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditLead(lead);
                        }}
                        data-testid={`button-edit-${lead.id}`}
                      >
                        <Edit className="w-3 h-3 mr-1" />
                        Edit Lead
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {/* Basic Info - Always Visible */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div className="flex items-center space-x-2">
                        <Phone className="w-4 h-4 text-muted-foreground" />
                        <span data-testid={`text-lead-phone-${lead.id}`}>
                          {lead.phone || "Not provided"}
                        </span>
                      </div>
                      {lead.location && (
                        <div className="flex items-center space-x-2">
                          <MapPin className="w-4 h-4 text-muted-foreground" />
                          <span
                            className="truncate"
                            data-testid={`text-lead-location-${lead.id}`}
                          >
                            {lead.location}
                          </span>
                        </div>
                      )}
                      {lead.sessionDays && (
                        <div className="flex items-center space-x-2">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          <span
                            data-testid={`text-lead-session-days-${lead.id}`}
                          >
                            {lead.sessionDays}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Expanded Details */}
                    {expandedLeadId === lead.id && (
                      <div className="mt-4 border-t pt-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Personal Information */}
                          <div className="space-y-3">
                            <h4 className="font-semibold text-sm flex items-center">
                              <User className="w-4 h-4 mr-2" />
                              Personal Information
                            </h4>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">
                                  Email:
                                </span>
                                <span
                                  className="font-medium"
                                  data-testid={`text-lead-email-full-${lead.id}`}
                                >
                                  {lead.email}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">
                                  Degree:
                                </span>
                                <span
                                  className="font-medium"
                                  data-testid={`text-lead-degree-full-${lead.id}`}
                                >
                                  {lead.degree || "N/A"}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">
                                  Domain:
                                </span>
                                <span
                                  className="font-medium"
                                  data-testid={`text-lead-domain-full-${lead.id}`}
                                >
                                  {lead.domain || "N/A"}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">
                                  Year of Passing:
                                </span>
                                <span
                                  className="font-medium"
                                  data-testid={`text-lead-yop-full-${lead.id}`}
                                >
                                  {lead.yearOfPassing || "N/A"}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">
                                  College:
                                </span>
                                <span
                                  className="font-medium"
                                  data-testid={`text-lead-college-full-${lead.id}`}
                                >
                                  {lead.collegeName || "N/A"}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Status Information */}
                          <div className="space-y-3">
                            <h4 className="font-semibold text-sm flex items-center">
                              <Timer className="w-4 h-4 mr-2" />
                              Status Information
                            </h4>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">
                                  Current Status:
                                </span>
                                <Badge
                                  className={`status-badge ${getStatusColor(lead.status)}`}
                                >
                                  {lead.status.replace("_", " ")}
                                </Badge>
                              </div>
                              {lead.changeReason && (
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">
                                    Last Update Reason:
                                  </span>
                                  <span className="font-medium text-right max-w-[200px]">
                                    {lead.changeReason}
                                  </span>
                                </div>
                              )}
                              {lead.notes && (
                                <div className="flex flex-col gap-1">
                                  <span className="text-muted-foreground">
                                    Notes:
                                  </span>
                                  <span className="font-medium bg-muted/50 p-2 rounded">
                                    {lead.notes}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="h-60 flex flex-col items-center justify-center text-center p-6">
                <Search className="w-12 h-12 text-muted-foreground/30 mb-4" />
                <h3 className="text-lg font-semibold text-muted-foreground">
                  No leads found
                </h3>
                <p className="text-sm text-muted-foreground max-w-sm mt-2">
                  No leads match your search criteria.
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Edit Lead Dialog for Accounts Users - Complete Version */}
        <Dialog
          open={editingLeadId !== null}
          onOpenChange={(open) => !open && handleCancelEdit()}
        >
          <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>Edit Lead</DialogTitle>
              <DialogDescription>
                Update lead information. All changes will be tracked.
              </DialogDescription>
            </DialogHeader>
            <div className="overflow-y-auto flex-1">
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(handleSubmitEdit)}
                  className="space-y-4 pr-4"
                >
                  {/* Basic Information */}
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Name *</FormLabel>
                          <FormControl>
                            <Input placeholder="Full name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email *</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="Email" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Priority Fields */}
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone</FormLabel>
                          <FormControl>
                            <Input placeholder="Phone number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Status</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select status" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {getAllowedStatuses(filteredLeads.find((l: any) => l.id === editingLeadId)?.status || 'new').map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="program"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Program</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select Program" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="PET">PET</SelectItem>
                              <SelectItem value="COURSE">COURSE</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="registrationAmount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Registration Amount</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="e.g., 5000.00"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="pendingAmount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Pending Amount</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="e.g., 2000.00"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="location"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Location</FormLabel>
                          <FormControl>
                            <Input placeholder="Location" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Education Details */}
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="degree"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Degree</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., BE/CSE, MBA" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="domain"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Domain</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Technology, Marketing" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Academic Information */}
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="yearOfPassing"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Year of Passing</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., 2023" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="collegeName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>College Name</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., ABC University" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Session Information */}
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="sessionDays"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Session Days</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select session pattern" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="M,W,F">M,W,F (Monday, Wednesday, Friday)</SelectItem>
                              <SelectItem value="T,T,S">T,T,S (Tuesday, Thursday, Saturday)</SelectItem>
                              <SelectItem value="daily">Daily (Monday to Saturday)</SelectItem>
                              <SelectItem value="weekend">Weekend Only</SelectItem>
                              <SelectItem value="custom">Custom Schedule</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="timing"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Timing</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., 9:00 AM - 5:00 PM" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Walk-in Details */}
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="walkinDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Walk-in Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="walkinTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Walk-in Time</FormLabel>
                          <FormControl>
                            <Input type="time" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Additional Financial Information */}
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="partialAmount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Partial Amount</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="e.g., 1000.00"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="concession"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Concession Amount</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="e.g., 500.00"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Transaction Details */}
                  <FormField
                    control={form.control}
                    name="transactionNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Transaction Number</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., TXN123456" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Notes */}
                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Add any additional notes..."
                            className="min-h-[80px]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Reason for Change */}
                  <FormField
                    control={form.control}
                    name="changeReason"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Reason for Change</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Briefly describe the reason for this update..."
                            className="min-h-[80px]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end space-x-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleCancelEdit}
                    >
                      Cancel
                    </Button>
                    <Button type="submit">Save Changes</Button>
                  </div>
                </form>
              </Form>
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // Default return for other users (HR, etc.)
  return (
    <>
      {/* Main Content */}
      <div className="space-y-6" data-testid="page-my-leads">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <UserCheck className="w-8 h-8 text-primary" />
            <div>
              <h1
                className="text-3xl font-bold"
                data-testid="heading-my-leads"
              >
                My Leads
              </h1>
              <p className="text-muted-foreground">
                {total > 0
                  ? `${total} lead${total !== 1 ? "s" : ""} assigned to you`
                  : "No leads assigned yet"}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            {/* Create Lead button - only for HR users */}
            {user?.role === "hr" && (
              <Button
                onClick={() => setIsCreateModalOpen(true)}
                className="flex items-center space-x-2"
                data-testid="button-create-lead"
              >
                <Plus className="w-4 h-4" />
                <span>Create Lead</span>
              </Button>
            )}
            {total > 0 && (
              <Badge
                variant="outline"
                className="text-lg px-3 py-1"
                data-testid="badge-total-count"
              >
                {total} Total
              </Badge>
            )}
          </div>
        </div>

        {/* Lead Capacity Banner for HR */}
        {user?.role === 'hr' && capacityData && (
          <div className={`rounded-lg border p-3 flex items-center justify-between ${
            capacityData.remaining === 0 
              ? 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800' 
              : capacityData.remaining <= 3 
                ? 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800'
                : 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800'
          }`}>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">
                New Lead Capacity: {capacityData.currentNewLeads}/{capacityData.limit}
              </span>
              <span className="text-xs text-muted-foreground">
                ({capacityData.remaining} remaining)
              </span>
            </div>
            <div className="w-32 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all ${
                  capacityData.remaining === 0 
                    ? 'bg-red-500' 
                    : capacityData.remaining <= 3 
                      ? 'bg-yellow-500' 
                      : 'bg-green-500'
                }`}
                style={{ width: `${(capacityData.currentNewLeads / capacityData.limit) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Filters */}
        {total > 0 && (
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search leads by name, email, or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="input-search-leads"
              />
            </div>


            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger
                className="w-full sm:w-48"
                data-testid="select-status-filter"
              >
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="register">Register</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="ready_for_class">Ready for Class</SelectItem>
                <SelectItem value="dropped">Dropped</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Leads Grid */}
        {filteredLeads.length > 0 ? (
          <div className="grid gap-4">
            {filteredLeads.map((lead: any) => (
              <Card
                key={lead.id}
                className="shadow-green-md hover:shadow-green-bright transition-shadow"
                data-testid={`card-lead-${lead.id}`}
              >
                <CardHeader
                  className="pb-3 cursor-pointer"
                  onClick={() => handleToggleExpand(lead.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center space-x-2">
                        <CardTitle
                          className="text-lg"
                          data-testid={`text-lead-name-${lead.id}`}
                        >
                          {lead.name}
                        </CardTitle>
                        {expandedLeadId === lead.id ? (
                          <ChevronUp className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                      <CardDescription className="flex items-center space-x-2">
                        <span data-testid={`text-lead-email-${lead.id}`}>
                          {lead.email}
                        </span>
                        {lead.degree && (
                          <>
                            <span>•</span>
                            <span
                              className="text-xs bg-muted px-2 py-1 rounded"
                              data-testid={`badge-lead-degree-${lead.id}`}
                            >
                              {lead.degree}
                            </span>
                          </>
                        )}
                      </CardDescription>
                    </div>
                    <div
                      className="flex items-center space-x-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Badge
                        className={`status-badge ${getStatusColor(lead.status)}`}
                        data-testid={`status-${lead.id}`}
                      >
                        {lead.status.replace("_", " ")}
                      </Badge>
                      {lead.createdAt && (
                        <div className="flex items-center text-xs text-muted-foreground">
                          <Clock className="w-3 h-3 mr-1" />
                          <span>
                            Added{" "}
                            {new Date(lead.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditLead(lead);
                        }}
                        data-testid={`button-edit-${lead.id}`}
                      >
                        <Edit className="w-3 h-3 mr-1" />
                        Edit
                      </Button>
                      {/* Schedule Session button - only for Session Organizer role */}
                      {(user?.role === 'session_organizer' || isSessOrg) && lead.status === 'ready_for_class' && (
                        <Button
                          size="sm"
                          className="bg-primary hover:bg-primary/90"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm("Are you sure you want to schedule a session for this lead?")) {
                              scheduleSessionMutation.mutate({
                                leadId: lead.id,
                                data: lead
                              });
                            }
                          }}
                          disabled={scheduleSessionMutation.isPending}
                        >
                          <CalendarCheck className="w-3 h-3 mr-1" />
                          {scheduleSessionMutation.isPending ? "Scheduling..." : "Schedule Session"}
                        </Button>
                      )}
                      {/* Delete / Release button - only for HR users */}
                      {user?.role === "hr" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            setReleaseLeadId(lead.id);
                          }}
                          className="text-red-600 hover:text-red-700 border-red-200 hover:border-red-300"
                          data-testid={`button-release-${lead.id}`}
                        >
                          <Trash2 className="w-3 h-3 mr-1" />
                          Release
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  {/* Basic Info - Always Visible */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div className="flex items-center space-x-2">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      <span data-testid={`text-lead-phone-${lead.id}`}>
                        {lead.phone || "Not provided"}
                      </span>
                    </div>
                    {lead.location && (
                      <div className="flex items-center space-x-2">
                        <MapPin className="w-4 h-4 text-muted-foreground" />
                        <span
                          className="truncate"
                          data-testid={`text-lead-location-${lead.id}`}
                        >
                          {lead.location}
                        </span>
                      </div>
                    )}
                    {lead.sessionDays && (
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <span
                          data-testid={`text-lead-session-days-${lead.id}`}
                        >
                          {lead.sessionDays}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Expanded Details */}
                  {expandedLeadId === lead.id && (
                    <div className="mt-4 border-t pt-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Personal Information */}
                        <div className="space-y-3">
                          <h4 className="font-semibold text-sm flex items-center">
                            <User className="w-4 h-4 mr-2" />
                            Personal Information
                          </h4>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">
                                Email:
                              </span>
                              <span
                                data-testid={`expanded-email-${lead.id}`}
                              >
                                {lead.email}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">
                                Phone:
                              </span>
                              <span
                                data-testid={`expanded-phone-${lead.id}`}
                              >
                                {lead.phone || "Not provided"}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">
                                Location:
                              </span>
                              <span
                                data-testid={`expanded-location-${lead.id}`}
                              >
                                {lead.location || "Not provided"}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Academic & Professional */}
                        <div className="space-y-3">
                          <h4 className="font-semibold text-sm flex items-center">
                            <GraduationCap className="w-4 h-4 mr-2" />
                            Academic & Professional
                          </h4>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">
                                Degree:
                              </span>
                              <span
                                data-testid={`expanded-degree-${lead.id}`}
                              >
                                {lead.degree || "Not provided"}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">
                                Domain:
                              </span>
                              <span
                                data-testid={`expanded-domain-${lead.id}`}
                              >
                                {lead.domain || "Not provided"}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">
                                College Name:
                              </span>
                              <span
                                data-testid={`expanded-college-name-${lead.id}`}
                              >
                                {lead.collegeName || "Not provided"}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">
                                Year of Passing:
                              </span>
                              <span
                                data-testid={`expanded-year-of-passing-${lead.id}`}
                              >
                                {lead.yearOfPassing || "Not provided"}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Session Information */}
                        <div className="space-y-3">
                          <h4 className="font-semibold text-sm flex items-center">
                            <Calendar className="w-4 h-4 mr-2" />
                            Session Information
                          </h4>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">
                                Session Days:
                              </span>
                              <span
                                data-testid={`expanded-session-days-${lead.id}`}
                              >
                                {lead.sessionDays || "Not set"}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">
                                Timing:
                              </span>
                              <span
                                data-testid={`expanded-timing-${lead.id}`}
                              >
                                {lead.timing || "Not set"}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">
                                Walk-in Date:
                              </span>
                              <span
                                data-testid={`expanded-walkin-date-${lead.id}`}
                              >
                                {lead.walkinDate || "Not set"}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">
                                Walk-in Time:
                              </span>
                              <span
                                data-testid={`expanded-walkin-time-${lead.id}`}
                              >
                                {lead.walkinTime || "Not set"}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Additional Information */}
                        <div className="space-y-3">
                          <h4 className="font-semibold text-sm flex items-center">
                            <Building2 className="w-4 h-4 mr-2" />
                            Additional Information
                          </h4>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">
                                Status:
                              </span>
                              <Badge
                                className={`status-badge ${getStatusColor(lead.status)}`}
                              >
                                {lead.status.replace("_", " ")}
                              </Badge>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">
                                Registration Amount:
                              </span>
                              <span
                                data-testid={`expanded-registration-amount-${lead.id}`}
                              >
                                {lead.registrationAmount
                                  ? `₹${parseFloat(lead.registrationAmount).toFixed(2)}`
                                  : "Not set"}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">
                                Pending Amount:
                              </span>
                              <span
                                data-testid={`expanded-pending-amount-${lead.id}`}
                              >
                                {lead.pendingAmount
                                  ? `₹${parseFloat(lead.pendingAmount).toFixed(2)}`
                                  : "Not set"}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">
                                Created:
                              </span>
                              <span>
                                {new Date(
                                  lead.createdAt,
                                ).toLocaleDateString()}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">
                                Updated:
                              </span>
                              <span>
                                {new Date(
                                  lead.updatedAt,
                                ).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {lead.notes && (
                        <div className="mt-4">
                          <h4 className="font-semibold text-sm mb-2">
                            Notes
                          </h4>
                          <div className="p-3 bg-muted rounded text-sm">
                            <p data-testid={`expanded-notes-${lead.id}`}>
                              {lead.notes}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-8 text-center">
              <UserCheck className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              {total === 0 ? (
                <div className="space-y-2">
                  <h3
                    className="text-lg font-semibold"
                    data-testid="text-no-leads-title"
                  >
                    No leads assigned yet
                  </h3>
                  <p
                    className="text-muted-foreground"
                    data-testid="text-no-leads-description"
                  >
                    Once leads are assigned to you, they will appear here
                    for easy management.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold">
                    No matching leads found
                  </h3>
                  <p className="text-muted-foreground">
                    Try adjusting your search terms or filters.
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearchTerm("");
                      setStatusFilter("all");
                    }}
                    data-testid="button-clear-filters"
                  >
                    Clear Filters
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Passed to Accounts Data Section - Only for Accounts Users */}
        {(user?.role as string) === 'accounts' && (
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <Share2 className="w-8 h-8 text-blue-600" />
              <div>
                <h2 className="text-2xl font-bold">Passed to Accounts Data</h2>
                <p className="text-muted-foreground">
                  {accountsPendingData?.total > 0
                    ? `${accountsPendingData.total} lead${accountsPendingData.total !== 1 ? "s" : ""} waiting for processing`
                    : "No data passed from HR yet"}
                </p>
              </div>
            </div>

            {accountsPendingLoading ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <p className="text-muted-foreground">Loading accounts pending leads...</p>
                </CardContent>
              </Card>
            ) : accountsPendingData?.leads && accountsPendingData.leads.length > 0 ? (
              <div className="grid gap-4">
                {accountsPendingData.leads.map((lead: any) => (
                  <Card key={lead.id} className="shadow-blue-md hover:shadow-blue-bright transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1 flex-1">
                          <CardTitle className="text-lg">{lead.name}</CardTitle>
                          <CardDescription>{lead.email}</CardDescription>
                        </div>
                        <Badge className={`status-badge ${getStatusColor(lead.status)}`}>
                          {lead.status.replace("_", " ")}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Phone:</span>
                          <p className="font-medium">{lead.phone}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Location:</span>
                          <p className="font-medium">{lead.location}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Walk-in Date:</span>
                          <p className="font-medium">{lead.walkinDate || "Not set"}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Walk-in Time:</span>
                          <p className="font-medium">{lead.walkinTime || "Not set"}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Registration Amount:</span>
                          <p className="font-medium">
                            {lead.registrationAmount ? `₹${parseFloat(lead.registrationAmount).toFixed(2)}` : "Not set"}
                          </p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Degree:</span>
                          <p className="font-medium">{lead.degree || "Not provided"}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <Share2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold">No data to process</h3>
                  <p className="text-muted-foreground">Leads passed by HR will appear here</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Edit Lead Dialog */}
        <Dialog
          open={editingLeadId !== null}
          onOpenChange={(open) => !open && handleCancelEdit()}
        >
          <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>Edit Lead</DialogTitle>
              <DialogDescription>
                Update lead status and add notes. Changes will be tracked in
                the audit trail.
              </DialogDescription>
            </DialogHeader>
            <div className="overflow-y-auto flex-1">
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(handleSubmitEdit)}
                  className="space-y-4 pr-4"
                >
                  {/* Basic Information */}
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Name *</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Full name"
                              {...field}
                              data-testid="input-edit-name"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email *</FormLabel>
                          <FormControl>
                            <Input
                              type="email"
                              placeholder="Email address"
                              {...field}
                              data-testid="input-edit-email"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Priority Fields */}
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Phone number"
                              {...field}
                              data-testid="input-edit-phone"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Status</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger data-testid="select-edit-status">
                                <SelectValue placeholder="Select status" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {getAllowedStatuses(filteredLeads.find((l: any) => l.id === editingLeadId)?.status || 'new').map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="program"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Program</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select Program" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="PET">PET</SelectItem>
                              <SelectItem value="COURSE">COURSE</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="registrationAmount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Registration Amount</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="e.g., 5000.00"
                              {...field}
                              data-testid="input-edit-registration-amount"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="pendingAmount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Pending Amount</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="e.g., 2000.00"
                              {...field}
                              data-testid="input-edit-pending-amount"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="location"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Location</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Location"
                              {...field}
                              data-testid="input-edit-location"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Education Details */}
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="degree"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Degree</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="e.g., BE/CSE, MBA"
                              {...field}
                              data-testid="input-edit-degree"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="domain"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Domain</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="e.g., Technology, Marketing"
                              {...field}
                              data-testid="input-edit-domain"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Academic Information */}
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="yearOfPassing"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Year of Passing</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="e.g., 2023"
                              {...field}
                              data-testid="input-edit-year-of-passing"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="collegeName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>College Name</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="e.g., ABC University"
                              {...field}
                              data-testid="input-edit-college-name"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Session Information */}
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="sessionDays"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Session Days</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger data-testid="select-edit-session-days">
                                <SelectValue placeholder="Select session pattern" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="M,W,F">
                                M,W,F (Monday, Wednesday, Friday)
                              </SelectItem>
                              <SelectItem value="T,T,S">
                                T,T,S (Tuesday, Thursday, Saturday)
                              </SelectItem>
                              <SelectItem value="daily">
                                Daily (Monday to Saturday)
                              </SelectItem>
                              <SelectItem value="weekend">
                                Weekend Only
                              </SelectItem>
                              <SelectItem value="custom">
                                Custom Schedule
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="timing"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Timing</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="e.g., 9:00 AM - 5:00 PM"
                              {...field}
                              data-testid="input-edit-timing"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="walkinDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Walk-in Date</FormLabel>
                          <FormControl>
                            <Input
                              type="date"
                              {...field}
                              data-testid="input-edit-walkin-date"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="walkinTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Walk-in Time</FormLabel>
                          <FormControl>
                            <Input
                              type="time"
                              {...field}
                              data-testid="input-edit-walkin-time"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Add any notes about this lead..."
                            className="resize-none"
                            rows={3}
                            {...field}
                            data-testid="textarea-edit-notes"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="changeReason"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Reason for Change</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Briefly explain the reason for this update..."
                            className="min-h-[80px]"
                            {...field}
                            data-testid="textarea-change-reason"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </form>
              </Form>
            </div>
            <DialogFooter className="mt-4 pt-4 border-t gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancelEdit}
                data-testid="button-cancel-edit"
              >
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={updateLeadMutation.isPending}
                data-testid="button-save-edit"
                onClick={form.handleSubmit(handleSubmitEdit)}
              >
                <Save className="w-4 h-4 mr-2" />
                {updateLeadMutation.isPending
                  ? "Saving..."
                  : "Save and Pass"}

              </Button>
            </DialogFooter>

          </DialogContent>
        </Dialog>

        {/* Create Lead Modal */}
        <Dialog
          open={isCreateModalOpen}
          onOpenChange={setIsCreateModalOpen}
        >
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Lead</DialogTitle>
              <DialogDescription>
                Add a new lead that will be automatically assigned to you.
              </DialogDescription>
            </DialogHeader>
            <Form {...createForm}>
              <form
                onSubmit={createForm.handleSubmit((data) =>
                  createLeadMutation.mutate(data),
                )}
                className="space-y-4"
              >
                <FormField
                  control={createForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter lead's full name"
                          {...field}
                          data-testid="input-create-name"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={createForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email *</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="Enter email address"
                          {...field}
                          data-testid="input-create-email"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Priority Fields */}
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={createForm.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter phone number"
                            {...field}
                            data-testid="input-create-phone"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={createForm.control}
                    name="program"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Program</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select Program" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="PET">PET</SelectItem>
                            <SelectItem value="COURSE">COURSE</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={createForm.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Location</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter location"
                            {...field}
                            data-testid="input-create-location"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={createForm.control}
                    name="degree"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Degree</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g., MBA, BE/CSE"
                            {...field}
                            data-testid="input-create-degree"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={createForm.control}
                    name="domain"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Domain</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g., Technology"
                            {...field}
                            data-testid="input-create-domain"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={createForm.control}
                    name="sessionDays"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Session Days</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-create-session-days">
                              <SelectValue placeholder="Select session pattern" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="M,W,F">
                              M,W,F (Monday, Wednesday, Friday)
                            </SelectItem>
                            <SelectItem value="T,T,S">
                              T,T,S (Tuesday, Thursday, Saturday)
                            </SelectItem>
                            <SelectItem value="daily">
                              Daily (Monday to Saturday)
                            </SelectItem>
                            <SelectItem value="weekend">
                              Weekend Only
                            </SelectItem>
                            <SelectItem value="custom">
                              Custom Schedule
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={createForm.control}
                  name="timing"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Timing</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., 9:00 AM - 5:00 PM"
                          {...field}
                          data-testid="input-create-timing"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={createForm.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Add any initial notes about this lead..."
                          rows={3}
                          {...field}
                          data-testid="input-create-notes"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsCreateModalOpen(false)}
                    data-testid="button-cancel-create"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createLeadMutation.isPending}
                    data-testid="button-save-create"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    {createLeadMutation.isPending
                      ? "Creating..."
                      : "Create Lead"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
        <Dialog open={releaseLeadId !== null} onOpenChange={(open) => !open && setReleaseLeadId(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Release Lead</DialogTitle>
              <DialogDescription>
                Please select a reason for releasing this lead. The lead will be returned to the Lead Management pool.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <label className="text-sm font-medium mb-2 block">Release Reason</label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={releaseReason}
                onChange={(e) => setReleaseReason(e.target.value)}
              >
                <option value="" disabled>Select a reason...</option>
                <option value="dropped">Dropped</option>
              </select>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setReleaseLeadId(null)}>Cancel</Button>
              <Button 
                variant="destructive" 
                disabled={!releaseReason || releaseLeadMutation.isPending}
                onClick={() => releaseLeadId && releaseLeadMutation.mutate({ leadId: releaseLeadId, reason: releaseReason })}
              >
                {releaseLeadMutation.isPending ? "Releasing..." : "Release Lead"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <FloatingChatbot />
      </div>
    </>
  );
}
