import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { isUnauthorizedError } from "@/lib/authUtils";
import Sidebar from "@/components/Sidebar";
import FloatingChatbot from "@/components/FloatingChatbot";
import LeadTable from "@/components/LeadTable";
import LeadDetailsModal from "@/components/LeadDetailsModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Filter, Upload } from "lucide-react";
import { getAdminSubRole } from "@/lib/adminRoleUtils";
import BulkUploadModal from "@/components/BulkUploadModal";
import ScreenshotUploadModal from "@/components/ScreenshotUploadModal";
import { ImageIcon } from "lucide-react";

export default function Leads() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading, user } = useAuth();
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [showScreenshotUpload, setShowScreenshotUpload] = useState(false);
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [showLeadDetails, setShowLeadDetails] = useState(false);
  const [filters, setFilters] = useState({
    status: 'all',
    hrId: 'all',
    search: '',
    page: 1,
    limit: 20
  });

  // Show loading while authentication is being checked
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Only redirect if definitely not authenticated
  if (!isAuthenticated) {
    window.location.href = "/login";
    return null;
  }

  const currentAdminSubRole = getAdminSubRole();
  const { data: leadsData, isLoading: leadsLoading, refetch } = useQuery({
    queryKey: ["/api/leads", filters, (user as any)?.role, currentAdminSubRole],
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value && !(key === 'hrId' && value === 'all') && !(key === 'status' && value === 'all')) {
          params.append(key, value.toString());
        }
      });

      if (currentAdminSubRole) {
        params.append('adminSubRole', currentAdminSubRole);
      }

      const url = `/api/leads?${params.toString()}`;
      const res = await fetch(url, {
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      return res.json();
    },
    retry: false,
  });

  const { data: hrUsers, error: hrUsersError } = useQuery({
    queryKey: ["/api/users", { role: 'hr' }],
    queryFn: async () => {
      console.log('Fetching HR users...');
      const url = `/api/users?role=hr`;
      const res = await fetch(url, {
        credentials: "include",
      });

      if (!res.ok) {
        console.error(`Failed to fetch HR users: ${res.status}`);
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const data = await res.json();
      console.log('HR users fetched:', data);
      return data;
    },
    retry: false,
  });

  // Debug logging
  console.log('Leads page render:', {
    hrUsers,
    hrUsersError,
    leadsData,
    filters
  });

  const handleViewLead = (lead: any) => {
    setSelectedLead(lead);
    setShowLeadDetails(true);
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value, page: 1 }));
  };

  const handleSearch = (search: string) => {
    setFilters(prev => ({ ...prev, search, page: 1 }));
  };

  const handlePageChange = (page: number) => {
    setFilters(prev => ({ ...prev, page }));
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
      <div className="flex-1 flex flex-col min-w-0 px-2 sm:px-4">
        {/* Header */}
        <header className="backdrop-blur-[80px] border-b border-white/20 px-6 py-4 shadow-sm" style={{ background: 'linear-gradient(90deg, rgba(255,255,255,0.6), rgba(255,255,255,0.4))' }}>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground" data-testid="text-page-title">
                {(user as any)?.role === 'accounts' ? "My Leads" : "Lead Management"}
              </h1>
              <p className="text-sm text-muted-foreground">
                {(user as any)?.role === 'accounts'
                  ? "Manage completed leads assigned to accounts"
                  : "Manage and track all leads in the system"}
              </p>
            </div>
          </div>
        </header>

        {/* Filters */}
        <div className="bg-card border-b border-border px-6 py-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <Input
                  type="text"
                  placeholder="Search leads..."
                  value={filters.search}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="w-64 pl-10"
                  data-testid="input-search-leads"
                />
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              </div>

              <Select value={filters.status} onValueChange={(value) => handleFilterChange('status', value)}>
                <SelectTrigger className="w-40" data-testid="select-status-filter">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="register">Register</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="not_interested">Not Interested</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="ready_for_class">Ready for Class</SelectItem>
                </SelectContent>
              </Select>


              {/* HR filter - only show for managers/admins, not for accounts */}
              {(user as any)?.role !== 'accounts' && (
                Array.isArray(hrUsers) ? (
                  <Select value={filters.hrId} onValueChange={(value) => handleFilterChange('hrId', value)}>
                    <SelectTrigger className="w-40" data-testid="select-hr-filter">
                      <SelectValue placeholder="All HR" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All HR</SelectItem>
                      {hrUsers.filter(user => user && (user.id || user.userId)).map((user: any) => (
                        <SelectItem key={user.id || user.userId} value={String(user.id || user.userId)}>
                          {user.fullName || user.firstName || 'Unknown User'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="w-40 p-2 border rounded text-sm text-muted-foreground" data-testid="select-hr-filter">
                    {hrUsersError ? 'Error loading HR users' : 'Loading HR users...'}
                  </div>
                )
              )}

              <Button variant="secondary" data-testid="button-advanced-filter">
                <Filter className="mr-2 h-4 w-4" />
                Advanced Filter
              </Button>

              {/* Bulk Upload - Only for manager and admin */}
              {(user?.role === "manager" || user?.role === "admin") && (
                <div className="flex space-x-2">
                  <Button
                    onClick={() => setShowScreenshotUpload(true)}
                    variant="outline"
                    data-testid="button-screenshot-upload-leads"
                  >
                    <ImageIcon className="mr-2 h-4 w-4" />
                    Screenshot OCR
                  </Button>
                  <Button
                    onClick={() => setShowBulkUpload(true)}
                    className="bg-primary hover:bg-primary/90"
                    data-testid="button-bulk-upload-leads"
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    Bulk Import
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Lead Table */}
        <main className="flex-1 overflow-y-auto p-6">
          <LeadTable
            data={leadsData}
            loading={leadsLoading}
            onViewLead={handleViewLead}
            onPageChange={handlePageChange}
            currentPage={filters.page}
            onRefresh={refetch}
          />
        </main>
      </div>

      {/* Modals */}
      {showBulkUpload && (
        <BulkUploadModal
          isOpen={showBulkUpload}
          onClose={() => setShowBulkUpload(false)}
        />
      )}
      {showScreenshotUpload && (
        <ScreenshotUploadModal
          isOpen={showScreenshotUpload}
          onClose={() => setShowScreenshotUpload(false)}
        />
      )}
      {showLeadDetails && selectedLead && (
        <LeadDetailsModal
          lead={selectedLead}
          isOpen={showLeadDetails}
          onClose={() => {
            setShowLeadDetails(false);
            setSelectedLead(null);
          }}
          onUpdate={refetch}
        />
      )}
    </>
  );
}
