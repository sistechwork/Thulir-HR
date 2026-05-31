import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getAdminSubRole, isSessionOrganizer, hasManagerPermissions, hasAccountsPermissions } from "@/lib/adminRoleUtils";
import {
  LayoutDashboard,
  Users,
  UserCog,
  FileText,
  History,
  Settings,
  LogOut,
  Building2,
  UserCheck,
  ChevronDown,
  ChevronRight,
  CheckCircle,
  Calculator,
  Video,
  MessageSquare,
  TrendingUp,
  BookCheck,
  CalendarSearch,
  BookOpen,
  Mail,
  Upload
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import cropLogo from "../assets/crop_logo.png";

export default function Sidebar() {
  const [location] = useLocation();
  const { user } = useAuth();
  const [myLeadsExpanded, setMyLeadsExpanded] = useState(false);
  const [mySessionsExpanded, setMySessionsExpanded] = useState(false);
  const [myTechSupportClassesExpanded, setMyTechSupportClassesExpanded] = useState(false);
  const [myCompletionExpanded, setMyCompletionExpanded] = useState(false);
  const [myDropsExpanded, setMyDropsExpanded] = useState(false);
  const isSessOrg = isSessionOrganizer((user as any)?.role);
  const currentAdminSubRole = getAdminSubRole();


  // Fetch team lead info for HR users
  const { data: teamLeadInfo } = useQuery({
    queryKey: ["/api/my/team-lead"],
    queryFn: async () => {
      const response = await fetch("/api/my/team-lead", { credentials: "include" });
      if (!response.ok) return null;
      return response.json();
    },
    enabled: (user as any)?.role === 'hr' && !!(user as any)?.teamLeadId,
    retry: false,
  });

  // Fetch team members for Team Lead users
  const { data: teamMembersData } = useQuery({
    queryKey: ["/api/my/team-members"],
    queryFn: async () => {
      const response = await fetch("/api/users?role=hr", { credentials: "include" });
      if (!response.ok) return [];
      return response.json();
    },
    enabled: (user as any)?.role === 'team_lead',
    retry: false,
  });

  // Fetch my leads for HR, Accounts, Tech Support, Manager, and Admin users
  // Now respects category selection and doesn't filter by status to show all assigned leads
  const { data: myLeadsData } = useQuery({
    queryKey: ["/api/my/leads", { limit: 5 }, currentAdminSubRole],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append("limit", "5");

      const response = await fetch(`/api/my/leads?${params.toString()}`, { credentials: "include" });
      if (!response.ok) return { leads: [], total: 0 };
      return response.json();
    },
    enabled: !!user,
    retry: false,
  });

  // Fetch my sessions for Session Organizers
  const { data: mySessionsData } = useQuery({
    queryKey: ["/api/my/leads", { limit: 5, status: 'scheduled' }, currentAdminSubRole],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append("limit", "5");
      params.append("status", "scheduled");
      if (currentAdminSubRole) {
        params.append("adminSubRole", currentAdminSubRole);
      }
      const response = await fetch(`/api/my/leads?${params.toString()}`, { credentials: "include" });
      if (!response.ok) return { leads: [], total: 0 };
      return response.json();
    },
    enabled: isSessOrg,
    retry: false,
  });

  // Fetch classes assigned to tech-support user as mentor
  const { data: myMentorClassesData } = useQuery({
    queryKey: ["/api/classes/my-mentor"],
    queryFn: async () => {
      const response = await fetch("/api/classes/my-mentor", { credentials: "include" });
      if (!response.ok) return [];
      return response.json();
    },
    enabled: (user as any)?.role === 'tech-support',
    retry: false,
  });

  const filteredSidebarLeads = (() => {
    const leads = (myLeadsData as any)?.leads || [];
    if (isSessionOrganizer((user as any)?.role)) {
      return leads.filter((l: any) => l.status === 'ready_for_class');
    }
    return leads;
  })();

  const filteredSidebarTotal = isSessionOrganizer((user as any)?.role)
    ? filteredSidebarLeads.length
    : (myLeadsData as any)?.total || 0;

  // Fetch my completed leads for HR, Accounts, Session Coordinator, Tech Support, Manager, and Admin users
  // Now respects category selection for consistency
  const { data: myCompletedData } = useQuery({
    queryKey: ["/api/my/completed", { limit: 5 }, currentAdminSubRole],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append("limit", "5");

      if (currentAdminSubRole) {
        params.append("adminSubRole", currentAdminSubRole);
      }

      const response = await fetch(`/api/my/completed?${params}`, { credentials: "include" });
      if (!response.ok) return { leads: [], total: 0 };
      return response.json();
    },
    enabled: (user as any)?.role === 'hr' || (user as any)?.role === 'accounts' || (user as any)?.role === 'session-coordinator' || (user as any)?.role === 'tech-support' || (user as any)?.role === 'manager' || (user as any)?.role === 'admin',
    retry: false,
  });

  const { data: myDropsData } = useQuery({
    queryKey: ["/api/my/drops", { limit: 5 }, currentAdminSubRole],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append("limit", "5");

      if (currentAdminSubRole) {
        params.append("adminSubRole", currentAdminSubRole);
      }

      const response = await fetch(`/api/my/drops?${params}`, { credentials: "include" });
      if (!response.ok) return { leads: [], total: 0 };
      return response.json();
    },
    enabled: (user as any)?.role === 'hr' || (user as any)?.role === 'manager' || (user as any)?.role === 'admin',
    retry: false,
  });

  // Fetch allocated students count
  const { data: allocatedCountData } = useQuery({
    queryKey: ["/api/students/allocated/count"],
    queryFn: async () => {
      const response = await fetch("/api/students/allocated/count");
      if (!response.ok) return { count: 0 };
      return response.json();
    },
    enabled: hasManagerPermissions((user as any)?.role) || (user as any)?.role === 'admin' || (user as any)?.role === 'session-coordinator',
    retry: false,
  });

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  const navigation = [
    {
      name: "Overview",
      href: "/",
      icon: LayoutDashboard,
      current: location === "/",
    },
    {
      name: (user as any)?.role === 'accounts' || (user as any)?.role === 'session_organizer' || isSessOrg ? "My Leads" : "Lead Management",
      href: (user as any)?.role === 'accounts' || (user as any)?.role === 'session_organizer' || isSessOrg ? "/my-leads" : "/leads",
      icon: Users,
      current: (user as any)?.role === 'accounts' || (user as any)?.role === 'session_organizer' || isSessOrg ? location === "/my-leads" : location === "/leads",
      roleRequired: ["admin", "manager", "hr", "accounts", "session_organizer", "team_lead", "session-coordinator"],
    },
    {
      name: "My Sessions",
      href: "/my-sessions",
      icon: BookCheck,
      current: location === "/my-sessions",
      roleRequired: ["session_organizer", "admin"],
      subRoleRequired: "session_organizer",
    },
    {
      name: user?.role === 'tech-support' ? "Classes" : "My Classes",
      href: "/classes",
      icon: BookOpen,
      current: location === "/classes",
      roleRequired: ["session_organizer", "admin", "tech-support"],
      subRoleRequired: undefined,
    },
    {
      name: "Allocated Students",
      href: "/allocated-students",
      icon: UserCheck,
      current: location === "/allocated-students",
      roleRequired: ["admin", "session-coordinator"],
      count: (allocatedCountData as any)?.count
    },
    {
      name: "Upload Data Management",
      href: "/upload-data",
      icon: Upload,
      current: location === "/upload-data",
      roleRequired: ["admin", "manager"],
    },
    {
      name: "User Management",
      href: "/users",
      icon: UserCog,
      current: location === "/users",
      roleRequired: ["manager", "team_lead"],
    },
    {
      name: "Reports & Export",
      href: "/reports",
      icon: FileText,
      current: location === "/reports",
      roleRequired: ["admin", "manager"],
    },
    {
      name: "Audit Trail",
      href: "/audit",
      icon: History,
      current: location === "/audit",
      roleRequired: ["admin", "manager"],
    },
    {
      name: "Kathipom",
      href: "/kathaipom",
      icon: MessageSquare,
      current: location === "/kathaipom",
      roleRequired: ["manager", "tech-support"],
    },
    {
      name: "Tally",
      href: "/tally",
      icon: Calculator,
      current: location === "/tally",
      roleRequired: ["admin", "manager", "accounts"],
    },
    {
      name: "Live Monitor",
      href: "/live-monitor",
      icon: Video,
      current: location === "/live-monitor",
      roleRequired: "manager",
    },
    {
      name: "Chat History",
      href: "/chat-history",
      icon: MessageSquare,
      current: location === "/chat-history",
      roleRequired: "manager",
    },
    {
      name: "Productivity",
      href: "/productivity",
      icon: TrendingUp,
      current: location === "/productivity",
      roleRequired: "manager",
    },
    {
      name: "My Team Lead",
      href: "/my-team-lead",
      icon: Users,
      current: location === "/my-team-lead",
      roleRequired: "team_lead",
    },
    {
      name: "System Help",
      href: "/tech-docs",
      icon: BookOpen,
      current: location === "/tech-docs",
      roleRequired: ["tech-support", "admin"],
    },
    {
      name: "Email Settings",
      href: "/email-settings",
      icon: Mail,
      current: location === "/email-settings" || location === "/test-email",
      roleRequired: ["admin", "manager", "tech-support"],
    },
  ];

  const getUserInitials = () => {
    const userAny = user as any;
    if (userAny?.firstName && userAny?.lastName) {
      return `${userAny.firstName[0]}${userAny.lastName[0]}`.toUpperCase();
    }
    if (userAny?.fullName) {
      const names = userAny.fullName.split(' ');
      return names.length > 1
        ? `${names[0][0]}${names[1][0]}`.toUpperCase()
        : names[0][0].toUpperCase();
    }
    return userAny?.username?.[0]?.toUpperCase() || 'U';
  };

  const getUserDisplayName = () => {
    const userAny = user as any;
    if (userAny?.fullName) return userAny.fullName;
    if (userAny?.firstName && userAny?.lastName) return `${userAny.firstName} ${userAny.lastName}`;
    return userAny?.username || 'User';
  };

  const hasAccess = (roleRequired?: string | string[], subRoleRequired?: string) => {
    const userAny = user as any;

    // Check sub-role if required
    if (subRoleRequired) {
      const currentSubRole = getAdminSubRole();
      if (currentSubRole !== subRoleRequired) return false;
    }

    if (!roleRequired) return true;
    const userRole = userAny?.role || '';

    // Check if role requirement is an array
    if (Array.isArray(roleRequired)) {
      // Direct role match
      if (roleRequired.includes(userRole)) return true;

      // For admin users, check sub-role permissions
      if (userRole === 'admin') {
        // Admin Organizer has manager permissions
        if (roleRequired.includes('manager') && hasManagerPermissions(userRole)) return true;
        // Session Organizer has accounts permissions  
        if (roleRequired.includes('accounts') && hasAccountsPermissions(userRole)) return true;
      }

      return false;
    }

    // Single role requirement
    if (userRole === roleRequired) return true;

    // For admin users, check sub-role permissions
    if (userRole === 'admin') {
      if (roleRequired === 'manager' && hasManagerPermissions(userRole)) return true;
      if (roleRequired === 'accounts' && hasAccountsPermissions(userRole)) return true;
    }

    return false;
  };

  const getRoleDisplayName = (role: string) => {
    // For admin users, show their sub-role
    if (role === 'admin') {
      const adminSubRole = getAdminSubRole();
      if (adminSubRole === 'admin_organizer') return "Admin Organizer";
      if (adminSubRole === 'session_organizer') return "Session Organizer";
      return "Admin";
    }

    switch (role) {
      case "team_lead":
        return "Team Lead";
      case "hr":
        return "HR Personnel";
      case "accounts":
        return "Accounts";
      case "manager":
        return "Manager";
      default:
        return role;
    }
  };

  return (
    <div className="h-full w-full backdrop-blur-[100px] border-r border-white/20 flex flex-col z-40 text-black shadow-[4px_0_24px_rgba(0,0,0,0.05)]" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.5) 100%)' }} data-testid="sidebar">
      {/* Header */}
      <div className="p-6 border-b border-border flex-shrink-0">
        <div className="flex items-center space-x-3">
          <img src={cropLogo} alt="HRM Logo" className="h-10 w-auto object-contain" />
          <div>
            <h2 className="text-xl font-bold text-black">HRM Portal</h2>
            <p className="text-sm text-gray-800">
              {getRoleDisplayName((user as any)?.role || 'User')} Dashboard
            </p>
          </div>
        </div>

        {/* Team Lead Info for HR users */}
        {(user as any)?.role === 'hr' && teamLeadInfo && (
          <div className="mt-3 p-2 bg-primary/10 rounded-lg">
            <p className="text-xs text-gray-800">Team Lead</p>
            <p className="text-sm font-medium text-primary">{teamLeadInfo.fullName}</p>
            {teamLeadInfo.teamName && (
              <p className="text-xs text-gray-800">{teamLeadInfo.teamName}</p>
            )}
          </div>
        )}

        {/* Team Info for Team Lead users */}
        {(user as any)?.role === 'team_lead' && (
          <div className="mt-3 p-2 bg-primary/10 rounded-lg">
            <p className="text-xs text-gray-800">Your Team</p>
            <p className="text-sm font-medium text-primary">{(user as any)?.teamName || 'Team'}</p>
            <p className="text-xs text-gray-800">
              {Array.isArray(teamMembersData) ? teamMembersData.length : 0} team members
            </p>
          </div>
        )}
      </div>

      {/* Navigation - Scrollable */}
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {navigation.map((item) => {
          if (!hasAccess(item.roleRequired, item.subRoleRequired)) return null;

          return (
            <Link
              key={item.name}
              href={item.href}
              className={`sidebar-item ${item.current ? 'active text-black' : 'text-black hover:text-black'}`}
              data-testid={`nav-${item.name.toLowerCase().replace(/\s+/g, '-')}`}
            >
              <item.icon className="w-5 h-5 mr-3" />
              <span className="flex-1">{item.name}</span>
              {item.count !== undefined && item.count > 0 && (
                <Badge variant="secondary" className="ml-2 text-xs">
                  {item.count}
                </Badge>
              )}
            </Link>
          );
        })}

        {/* My Leads Section for HR Users - NOT for Accounts (they use main My Leads) */}
        {((user as any)?.role === 'hr') && (
          <div className="mt-6 pt-4 border-t border-border">
            <button
              onClick={() => setMyLeadsExpanded(!myLeadsExpanded)}
              className="w-full flex items-center justify-between p-2 text-sm text-gray-800 hover:text-black hover:bg-accent rounded-md transition-colors"
              data-testid="button-my-leads-toggle"
            >
              <div className="flex items-center">
                <UserCheck className="w-4 h-4 mr-2" />
                <span>My Leads</span>
                {filteredSidebarTotal > 0 && (
                  <Badge variant="secondary" className="ml-2 text-xs">
                    {filteredSidebarTotal}
                  </Badge>
                )}
              </div>
              {myLeadsExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>

            {myLeadsExpanded && (
              <div className="mt-2 space-y-1 pl-6">
                {filteredSidebarLeads.length > 0 ? (
                  <>
                    {filteredSidebarLeads.slice(0, 3).map((lead: any) => (
                      <Link
                        key={lead.id}
                        href={`/my-leads`}
                        className="block px-2 py-1 text-xs text-gray-800 hover:text-black hover:bg-accent rounded transition-colors truncate"
                        data-testid={`link-my-lead-${lead.id}`}
                      >
                        {lead.name} • {lead.status.replace('_', ' ')}
                      </Link>
                    ))}
                    {filteredSidebarTotal > 3 && (
                      <Link
                        href="/my-leads"
                        className="block px-2 py-1 text-xs text-primary hover:text-primary/80 rounded transition-colors"
                        data-testid="link-view-all-my-leads"
                      >
                        View all {(myLeadsData as any).total} leads →
                      </Link>
                    )}
                  </>
                ) : (
                  <p className="px-2 py-1 text-xs text-gray-800">
                    No leads assigned yet
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* My Sessions Section for Session Organizers */}
        {isSessOrg && (
          <div className="mt-4 pt-4 border-t border-border">
            <button
              onClick={() => setMySessionsExpanded(!mySessionsExpanded)}
              className="w-full flex items-center justify-between p-2 text-sm text-gray-800 hover:text-black hover:bg-accent rounded-md transition-colors"
              data-testid="button-my-sessions-toggle"
            >
              <div className="flex items-center">
                <BookCheck className="w-4 h-4 mr-2" />
                <span>My Sessions</span>
                {(mySessionsData as any)?.total > 0 && (
                  <Badge variant="secondary" className="ml-2 text-xs">
                    {(mySessionsData as any).total}
                  </Badge>
                )}
              </div>
              {mySessionsExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>

            {mySessionsExpanded && (
              <div className="mt-2 space-y-1 pl-6">
                {(mySessionsData as any)?.leads?.length > 0 ? (
                  <>
                    {(mySessionsData as any).leads.slice(0, 3).map((lead: any) => (
                      <Link
                        key={lead.id}
                        href={`/my-sessions`}
                        className="block px-2 py-1 text-xs text-gray-800 hover:text-black hover:bg-accent rounded transition-colors truncate"
                        data-testid={`link-my-session-${lead.id}`}
                      >
                        {lead.name} • {lead.status.replace('_', ' ')}
                      </Link>
                    ))}
                    {(mySessionsData as any).total > 3 && (
                      <Link
                        href="/my-sessions"
                        className="block px-2 py-1 text-xs text-primary hover:text-primary/80 rounded transition-colors"
                        data-testid="link-view-all-my-sessions"
                      >
                        View all {(mySessionsData as any).total} sessions →
                      </Link>
                    )}
                  </>
                ) : (
                  <p className="px-2 py-1 text-xs text-gray-800">
                    No sessions scheduled yet
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* My Sessions Section for Tech Support Users */}
        {(user as any)?.role === 'tech-support' && (
          <div className="mt-4 pt-4 border-t border-border">
            <button
              onClick={() => setMyTechSupportClassesExpanded(!myTechSupportClassesExpanded)}
              className="w-full flex items-center justify-between p-2 text-sm text-gray-800 hover:text-black hover:bg-accent rounded-md transition-colors"
              data-testid="button-tech-support-sessions-toggle"
            >
              <div className="flex items-center">
                <BookCheck className="w-4 h-4 mr-2" />
                <span>My Sessions</span>
                {Array.isArray(myMentorClassesData) && myMentorClassesData.length > 0 && (
                  <Badge variant="secondary" className="ml-2 text-xs">
                    {myMentorClassesData.length}
                  </Badge>
                )}
              </div>
              {myTechSupportClassesExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>

            {myTechSupportClassesExpanded && (
              <div className="mt-2 space-y-1 pl-6">
                {Array.isArray(myMentorClassesData) && myMentorClassesData.length > 0 ? (
                  <>
                    {myMentorClassesData.slice(0, 3).map((cls: any) => (
                      <Link
                        key={cls.id}
                        href="/classes"
                        className="block px-2 py-1 text-xs text-gray-800 hover:text-black hover:bg-accent rounded transition-colors truncate"
                        data-testid={`link-tech-support-class-${cls.id}`}
                      >
                        {cls.name} • {cls.studentCount} students
                      </Link>
                    ))}
                    {myMentorClassesData.length > 3 && (
                      <Link
                        href="/classes"
                        className="block px-2 py-1 text-xs text-primary hover:text-primary/80 rounded transition-colors"
                        data-testid="link-view-all-tech-support-classes"
                      >
                        View all {myMentorClassesData.length} classes →
                      </Link>
                    )}
                  </>
                ) : (
                  <p className="px-2 py-1 text-xs text-gray-800">
                    No classes assigned yet
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* My Completion section for HR, Accounts, and Session Coordinator users */}
        {((user as any)?.role === 'hr' || (user as any)?.role === 'accounts' || (user as any)?.role === 'session-coordinator') && (
          <div className="mt-4">
            <button
              onClick={() => setMyCompletionExpanded(!myCompletionExpanded)}
              className="w-full flex items-center justify-between p-2 text-sm text-gray-800 hover:text-black hover:bg-accent rounded-md transition-colors"
              data-testid="button-my-completion-toggle"
            >
              <div className="flex items-center">
                <CheckCircle className="w-4 h-4 mr-2" />
                <span>My Completion</span>
                {(myCompletedData as any)?.total > 0 && (
                  <Badge variant="secondary" className="ml-2 text-xs">
                    {(myCompletedData as any).total}
                  </Badge>
                )}
              </div>
              {myCompletionExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>

            {myCompletionExpanded && (
              <div className="mt-2 space-y-1 pl-6">
                {(myCompletedData as any)?.leads?.length > 0 ? (
                  <>
                    {(myCompletedData as any).leads.slice(0, 3).map((lead: any) => (
                      <Link
                        key={lead.id}
                        href={`/my-completion`}
                        className="block px-2 py-1 text-xs text-gray-800 hover:text-black hover:bg-accent rounded transition-colors truncate"
                        data-testid={`link-my-completed-${lead.id}`}
                      >
                        {lead.name} • {lead.status.replace('_', ' ')}
                      </Link>
                    ))}
                    {(myCompletedData as any).total > 3 && (
                      <Link
                        href="/my-completion"
                        className="block px-2 py-1 text-xs text-primary hover:text-primary/80 rounded transition-colors"
                        data-testid="link-view-all-my-completion"
                      >
                        View all {(myCompletedData as any).total} completed →
                      </Link>
                    )}
                  </>
                ) : (
                  <p className="px-2 py-1 text-xs text-gray-800">
                    No completed leads yet
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* My Drops section for HR users */}
        {((user as any)?.role === 'hr') && (
          <div className="mt-4">
            <button
              onClick={() => setMyDropsExpanded(!myDropsExpanded)}
              className="w-full flex items-center justify-between p-2 text-sm text-gray-800 hover:text-black hover:bg-accent rounded-md transition-colors"
              data-testid="button-my-drops-toggle"
            >
              <div className="flex items-center">
                <History className="w-4 h-4 mr-2" />
                <span>My Drops</span>
                {(myDropsData as any)?.total > 0 && (
                  <Badge variant="secondary" className="ml-2 text-xs">
                    {(myDropsData as any).total}
                  </Badge>
                )}
              </div>
              {myDropsExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>

            {myDropsExpanded && (
              <div className="mt-2 space-y-1 pl-6">
                {(myDropsData as any)?.leads?.length > 0 ? (
                  <>
                    {(myDropsData as any).leads.slice(0, 3).map((lead: any) => (
                      <Link
                        key={lead.id}
                        href={`/my-drops`}
                        className="block px-2 py-1 text-xs text-gray-800 hover:text-black hover:bg-accent rounded transition-colors truncate"
                        data-testid={`link-my-drops-${lead.id}`}
                      >
                        {lead.name} • {lead.status.replace('_', ' ')}
                      </Link>
                    ))}
                    {(myDropsData as any).total > 3 && (
                      <Link
                        href="/my-drops"
                        className="block px-2 py-1 text-xs text-primary hover:text-primary/80 rounded transition-colors"
                        data-testid="link-view-all-my-drops"
                      >
                        View all {(myDropsData as any).total} dropped →
                      </Link>
                    )}
                  </>
                ) : (
                  <p className="px-2 py-1 text-xs text-gray-800">
                    No dropped leads
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </nav>

      {/* User Profile */}
      < div className="p-3 backdrop-blur-xl border-t border-white/20 shadow-lg flex-shrink-0" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0.4) 100%)' }}>
        <div className="flex items-center space-x-3 mb-3 p-2 bg-primary/5 rounded-lg">
          <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-primary-foreground font-semibold text-sm">
              {getUserInitials()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate text-black" data-testid="text-user-name">
              {getUserDisplayName()}
            </p>
            <p className="text-xs text-gray-800 capitalize" data-testid="text-user-role">
              {(user as any)?.role || 'User'}
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          className="w-full justify-start text-sm font-medium transition-all duration-200 hover:bg-destructive/10 hover:text-destructive text-black border-gray-300"
          onClick={handleLogout}
          data-testid="button-logout"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sign Out
        </Button>
      </div >
    </div >
  );
}
