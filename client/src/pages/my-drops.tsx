import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import { Card, CardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Search, History } from "lucide-react";
import FloatingChatbot from "@/components/FloatingChatbot";
import LeadTable from "@/components/LeadTable";
import LeadDetailsModal from "@/components/LeadDetailsModal";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function MyDropsPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLeadId, setSelectedLeadId] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [page, setPage] = useState(1);

  // Fetch my dropped leads with category filter
  const { data: leadsData, isLoading: dataLoading, refetch } = useQuery({
    queryKey: ["/api/my/drops", searchTerm, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      if (searchTerm) params.append('search', searchTerm);
      const url = `/api/my/drops?${params}`;
      const response = await fetch(url, { credentials: 'include' });
      if (!response.ok) throw new Error("Failed to fetch dropped leads");
      return response.json();
    },
    retry: false,
    staleTime: 0,
  });

  if (authLoading) {
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
      <div className="flex-1 flex flex-col overflow-hidden relative z-10">
        {/* Header */}
        <header className="bg-card border-b border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                My Drops
              </h1>
              <p className="text-sm text-muted-foreground">
                View leads you've dropped and their current status
              </p>
            </div>
          </div>
        </header>

        {/* Search & Category Filter */}
        <div className="bg-card border-b border-border px-6 py-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Input
                placeholder="Search by name, email, or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10"
              />
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            </div>

          </div>
        </div>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6">
          <LeadTable
            data={leadsData}
            loading={dataLoading}
            onViewLead={(lead) => {
              setSelectedLeadId(lead.id);
              setIsModalOpen(true);
            }}
            onPageChange={(p) => setPage(p)}
            currentPage={page}
            onRefresh={refetch}
          />
        </main>
      </div>

      {/* Lead Details Modal */}
      {isModalOpen && selectedLeadId && (
        <LeadDetailsModal
          lead={leadsData?.leads.find((l: any) => l.id === selectedLeadId)}
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedLeadId(null);
          }}
          onUpdate={refetch}
        />
      )}
    </>
  );
}
