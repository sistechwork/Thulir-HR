import { useState, useMemo } from "react";
import Sidebar from "@/components/Sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Search, DollarSign, TrendingUp, TrendingDown, Wallet, X, User, Users, Edit2, Check } from "lucide-react";
import FloatingChatbot from "@/components/FloatingChatbot";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Lead {
  id: number;
  name: string;
  email: string;
  phone: string;
  registrationAmount: string | null;
  pendingAmount: string | null;
  partialAmount: string | null;
  concession: string | null;
  transactionNumber: string | null;
  status: string;
  walkinDate?: string;
  currentOwnerId?: string;
  totalAmount: string | null;
}

interface UserInfo {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  fullName: string | null;
  role: string;
}

export default function TallyPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterFromDate, setFilterFromDate] = useState("");
  const [filterToDate, setFilterToDate] = useState("");
  const [filterPhone, setFilterPhone] = useState("");
  const [filterEmail, setFilterEmail] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterAccountsUser, setFilterAccountsUser] = useState("");

  const { toast } = useToast();
  const isAccountsUser = (user as any)?.role === 'accounts';
  const isManager = (user as any)?.role === 'manager' || (user as any)?.role === 'admin';
  const [editingTotalId, setEditingTotalId] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState<string>("");
  const [globalTotalValue, setGlobalTotalValue] = useState<string>("7000");
  const [showGlobalDialog, setShowGlobalDialog] = useState(false);

  const { data: leadsData, isLoading: dataLoading } = useQuery<{ leads: Lead[] }>({
    queryKey: [isAccountsUser ? "/api/my/leads" : "/api/leads"],
    retry: false,
  });

  const { data: usersData } = useQuery<UserInfo[]>({
    queryKey: ["/api/users"],
    retry: false,
  });

  const updateTotalMutation = useMutation({
    mutationFn: async ({ id, totalAmount }: { id: number, totalAmount: string }) => {
      const res = await apiRequest("PUT", `/api/leads/${id}`, { totalAmount });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [isAccountsUser ? "/api/my/leads" : "/api/leads"] });
      toast({
        title: "Success",
        description: "Total amount updated successfully",
      });
      setEditingTotalId(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: "Failed to update total amount: " + error.message,
        variant: "destructive",
      });
    }
  });

  const handleUpdateTotalAmount = (id: number) => {
    if (!editingValue || isNaN(parseFloat(editingValue))) {
      toast({
        title: "Error",
        description: "Please enter a valid number",
        variant: "destructive",
      });
      return;
    }
    updateTotalMutation.mutate({ id, totalAmount: editingValue });
  };

  const bulkUpdateTotalMutation = useMutation({
    mutationFn: async (totalAmount: string) => {
      const res = await apiRequest("POST", "/api/leads/bulk-update-total", { totalAmount });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [isAccountsUser ? "/api/my/leads" : "/api/leads"] });
      toast({
        title: "Success",
        description: "All leads updated successfully",
      });
      setShowGlobalDialog(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: "Failed to update leads: " + error.message,
        variant: "destructive",
      });
    }
  });

  const handleBulkUpdate = () => {
    if (!globalTotalValue || isNaN(parseFloat(globalTotalValue))) {
      toast({
        title: "Error",
        description: "Please enter a valid number",
        variant: "destructive",
      });
      return;
    }
    bulkUpdateTotalMutation.mutate(globalTotalValue);
  };

  const leads: Lead[] = leadsData?.leads || [];
  const accountsUsers = usersData?.filter(u => u.role === 'accounts') || [];

  const leadsWithFinancialData = useMemo(() => {
    return leads.filter(lead => {
      // Check if there is any actual financial activity
      const hasRegAmount = lead.registrationAmount && parseFloat(lead.registrationAmount) > 0;
      const hasPartialAmount = lead.partialAmount && parseFloat(lead.partialAmount) > 0;
      const hasConcession = lead.concession && parseFloat(lead.concession) > 0;
      const hasTransaction = !!lead.transactionNumber;

      // Check for specific statuses that belong in Tally even if amounts aren't set yet
      const status = lead.status?.toLowerCase().trim();
      const isCompletedStatus = status === 'completed' || status === 'ready_for_class' || status === 'accounts_pending';

      return hasRegAmount || hasPartialAmount || hasConcession || hasTransaction || isCompletedStatus;
    });
  }, [leads]);

  const financialSummary = useMemo(() => {
    let totalRegistration = 0;
    let totalPending = 0;
    let totalPartial = 0;
    let totalCollected = 0;
    let totalConcession = 0;
    let totalExpected = 0;

    const dataToUse = leadsWithFinancialData;

    dataToUse.forEach((lead) => {
      const regAmount = lead.registrationAmount ? parseFloat(lead.registrationAmount) : 0;
      const concessionAmount = lead.concession ? parseFloat(lead.concession) : 0;
      const partAmount = lead.partialAmount ? parseFloat(lead.partialAmount) : 0;

      const TOTAL_FOR_LEAD = lead.totalAmount ? parseFloat(lead.totalAmount) : 7000;

      const calculatedPending = TOTAL_FOR_LEAD - (regAmount + concessionAmount + partAmount);

      totalRegistration += regAmount;
      totalPending += Math.max(0, calculatedPending);
      totalPartial += partAmount;
      totalCollected += (regAmount + partAmount);
      totalConcession += concessionAmount;
      totalExpected += TOTAL_FOR_LEAD;
    });

    return {
      totalRegistration,
      totalPending,
      totalPartial,
      totalCollected,
      totalConcession,
      totalExpected,
      totalLeadsWithData: leadsWithFinancialData.length,
    };
  }, [leadsWithFinancialData]);

  const accountsSummary = useMemo(() => {
    const summary: Record<string, {
      userName: string;
      collected: number;
      pending: number;
      concession: number;
      leadsCount: number;
    }> = {};

    accountsUsers.forEach(accUser => {
      summary[accUser.id] = {
        userName: accUser.fullName || `${accUser.firstName || ''} ${accUser.lastName || ''}`.trim() || accUser.email || 'Unknown',
        collected: 0,
        pending: 0,
        concession: 0,
        leadsCount: 0,
      };
    });

    leadsWithFinancialData.forEach(lead => {
      if (lead.currentOwnerId && summary[lead.currentOwnerId]) {
        const regAmount = lead.registrationAmount ? parseFloat(lead.registrationAmount) : 0;
        const partAmount = lead.partialAmount ? parseFloat(lead.partialAmount) : 0;
        const concAmount = lead.concession ? parseFloat(lead.concession) : 0;
        const totalForLead = lead.totalAmount ? parseFloat(lead.totalAmount) : 7000;
        const pending = totalForLead - (regAmount + concAmount + partAmount);

        summary[lead.currentOwnerId].collected += (regAmount + partAmount);
        summary[lead.currentOwnerId].pending += Math.max(0, pending);
        summary[lead.currentOwnerId].concession += concAmount;
        summary[lead.currentOwnerId].leadsCount += 1;
      }
    });

    return Object.values(summary).filter(s => s.leadsCount > 0);
  }, [leadsWithFinancialData, accountsUsers]);

  const uniqueStatuses = useMemo(() => {
    const statuses = new Set(leads.map(l => l.status));
    return Array.from(statuses).sort();
  }, [leads]);

  const filteredLeads = useMemo(() => {
    return leadsWithFinancialData.filter((lead) => {
      const matchesSearch =
        lead.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.phone?.includes(searchTerm) ||
        lead.transactionNumber?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesDate = (!filterFromDate && !filterToDate) ||
        (lead.walkinDate &&
          (!filterFromDate || new Date(lead.walkinDate) >= new Date(filterFromDate)) &&
          (!filterToDate || new Date(lead.walkinDate) <= new Date(filterToDate + 'T23:59:59')));

      const matchesPhone = !filterPhone || lead.phone?.includes(filterPhone);
      const matchesEmail = !filterEmail || lead.email?.toLowerCase().includes(filterEmail.toLowerCase());
      const matchesStatus = !filterStatus || lead.status === filterStatus;
      const matchesAccountsUser = !filterAccountsUser || lead.currentOwnerId === filterAccountsUser;

      return matchesSearch && matchesDate && matchesPhone && matchesEmail && matchesStatus && matchesAccountsUser;
    });
  }, [leadsWithFinancialData, searchTerm, filterFromDate, filterToDate, filterPhone, filterEmail, filterStatus, filterAccountsUser]);

  if (isLoading || dataLoading) {
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

      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-card border-b border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground" data-testid="heading-tally">
                {isManager ? "Accounts Tally Reports" : "Tally - Financial Overview"}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {isManager
                  ? "Financial data submitted by Accounts team"
                  : "Complete financial summary of all leads"}
              </p>
            </div>
            <div className="flex items-center gap-4">
              {isManager && (
                <div className="flex items-center gap-2">
                  <Dialog open={showGlobalDialog} onOpenChange={setShowGlobalDialog}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="flex items-center gap-2 border-[#11754c] text-[#11754c] hover:bg-[#11754c] hover:text-white transition-all">
                        <TrendingUp className="h-4 w-4" />
                        Set Global Total
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>Update Global Total Amount</DialogTitle>
                        <DialogDescription>
                          This will set a new total amount for all existing leads in the database.
                          This action cannot be easily undone.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="flex items-center space-x-2 py-4">
                        <div className="grid flex-1 gap-2">
                          <label htmlFor="global-total" className="text-sm font-medium">
                            New Total Amount (₹)
                          </label>
                          <Input
                            id="global-total"
                            type="number"
                            value={globalTotalValue}
                            onChange={(e) => setGlobalTotalValue(e.target.value)}
                            placeholder="e.g. 7000"
                          />
                        </div>
                      </div>
                      <DialogFooter className="sm:justify-end">
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => setShowGlobalDialog(false)}
                        >
                          Cancel
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              type="button"
                              className="bg-[#11754c] hover:bg-[#04e284] text-white"
                              disabled={bulkUpdateTotalMutation.isPending}
                            >
                              {bulkUpdateTotalMutation.isPending ? "Updating..." : "Apply to All Leads"}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will update the total amount to <strong>₹{globalTotalValue}</strong> for <strong>ALL</strong> existing leads in the system. This change will affect all pending amount calculations.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={handleBulkUpdate}
                                className="bg-[#D62828] hover:bg-[#b02020] text-white"
                              >
                                Yes, Update All Leads
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

                  <Badge variant="secondary" className="flex items-center gap-1 bg-[#11754c]/10 text-[#11754c] border-[#11754c]/20">
                    <Users className="h-3 w-3" />
                    {leadsWithFinancialData.length} leads with financial data
                  </Badge>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          {isManager && accountsSummary.length > 0 && (
            <Card className="mb-6 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/30 dark:to-blue-950/30 border-purple-200 dark:border-purple-800">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <User className="h-5 w-5 text-purple-600" />
                  Accounts Team Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {accountsSummary.map((acc, idx) => (
                    <div
                      key={idx}
                      className="bg-white dark:bg-gray-900 rounded-lg p-4 border shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => setFilterAccountsUser(
                        accountsUsers.find(u =>
                          (u.fullName || `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email) === acc.userName
                        )?.id || ''
                      )}
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white text-sm font-bold">
                          {acc.userName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{acc.userName}</p>
                          <p className="text-xs text-muted-foreground">{acc.leadsCount} leads</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <p className="text-muted-foreground">Collected</p>
                          <p className="font-bold text-green-600">₹{acc.collected.toFixed(0)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Pending</p>
                          <p className="font-bold text-red-600">₹{acc.pending.toFixed(0)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="mb-6 bg-card">
            <CardHeader>
              <CardTitle className="text-lg">Filters</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">From Date</label>
                  <Input
                    type="date"
                    value={filterFromDate}
                    onChange={(e) => setFilterFromDate(e.target.value)}
                    data-testid="input-filter-from-date"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">To Date</label>
                  <Input
                    type="date"
                    value={filterToDate}
                    onChange={(e) => setFilterToDate(e.target.value)}
                    data-testid="input-filter-to-date"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Phone</label>
                  <Input
                    type="text"
                    placeholder="Enter phone..."
                    value={filterPhone}
                    onChange={(e) => setFilterPhone(e.target.value)}
                    data-testid="input-filter-phone"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Email</label>
                  <Input
                    type="text"
                    placeholder="Enter email..."
                    value={filterEmail}
                    onChange={(e) => setFilterEmail(e.target.value)}
                    data-testid="input-filter-email"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Status</label>
                  <Select value={filterStatus || "all"} onValueChange={(val) => setFilterStatus(val === "all" ? "" : val)}>
                    <SelectTrigger data-testid="select-filter-status">
                      <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      {uniqueStatuses.map((status) => (
                        <SelectItem key={status} value={status}>
                          {status.replace(/_/g, ' ')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {isManager && accountsUsers.length > 0 && (
                  <div>
                    <label className="text-sm font-medium mb-2 block">Accounts User</label>
                    <Select value={filterAccountsUser || "all"} onValueChange={(val) => setFilterAccountsUser(val === "all" ? "" : val)}>
                      <SelectTrigger data-testid="select-filter-accounts">
                        <SelectValue placeholder="All Accounts" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Accounts</SelectItem>
                        {accountsUsers.map((accUser) => (
                          <SelectItem key={accUser.id} value={accUser.id}>
                            {accUser.fullName || `${accUser.firstName || ''} ${accUser.lastName || ''}`.trim() || accUser.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="flex items-end">
                  <Button
                    onClick={() => {
                      setFilterFromDate("");
                      setFilterToDate("");
                      setFilterPhone("");
                      setFilterEmail("");
                      setFilterStatus("");
                      setFilterAccountsUser("");
                      setSearchTerm("");
                    }}
                    variant="outline"
                    size="sm"
                    className="w-full"
                    data-testid="button-clear-filters"
                  >
                    <X className="mr-2 h-4 w-4" />
                    Clear All
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Expected
                </CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground" data-testid="total-amount">
                  ₹{financialSummary.totalExpected.toFixed(2)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Sum of all expected totals
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Concession Amount
                </CardTitle>
                <DollarSign className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400" data-testid="concession-amount">
                  ₹{financialSummary.totalConcession.toFixed(2)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Total concession given
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Pending Amount
                </CardTitle>
                <TrendingDown className="h-4 w-4 text-destructive" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive" data-testid="pending-amount">
                  ₹{financialSummary.totalPending.toFixed(2)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Total pending payments
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Partial Payments
                </CardTitle>
                <Wallet className="h-4 w-4 text-orange-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600 dark:text-orange-400" data-testid="partial-amount">
                  ₹{financialSummary.totalPartial.toFixed(2)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Total partial amounts
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Collected Amount
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600 dark:text-green-400" data-testid="collected-amount">
                  ₹{financialSummary.totalCollected.toFixed(2)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Total amount collected
                </p>
              </CardContent>
            </Card>
          </div>

          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, phone, or transaction number..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  data-testid="input-search"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                {isManager ? "Accounts Financial Records" : "All Leads Financial Data"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead className="text-right">Expected Total</TableHead>
                      <TableHead>Transaction #</TableHead>
                      <TableHead className="text-right">Registration Amount</TableHead>
                      <TableHead className="text-right">Concession Amount</TableHead>
                      <TableHead className="text-right">Pending Amount</TableHead>
                      <TableHead className="text-right">Partial Amount</TableHead>
                      <TableHead className="text-right">Collected Amount</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLeads.length > 0 ? (
                      filteredLeads.map((lead) => (
                        <TableRow key={lead.id} data-testid={`row-lead-${lead.id}`}>
                          <TableCell className="font-mono text-xs">#{lead.id}</TableCell>
                          <TableCell className="font-medium">{lead.name}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{lead.email}</TableCell>
                          <TableCell className="text-sm">{lead.phone}</TableCell>
                          <TableCell className="text-right font-bold">
                            {isManager ? (
                              <div className="flex items-center justify-end gap-2 group">
                                {editingTotalId === lead.id ? (
                                  <div className="flex items-center gap-1">
                                    <Input
                                      type="number"
                                      value={editingValue}
                                      onChange={(e) => setEditingValue(e.target.value)}
                                      className="h-8 w-24 text-right"
                                      autoFocus
                                    />
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-8 w-8 text-green-600"
                                      onClick={() => handleUpdateTotalAmount(lead.id)}
                                      disabled={updateTotalMutation.isPending}
                                    >
                                      <Check className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-8 w-8 text-destructive"
                                      onClick={() => setEditingTotalId(null)}
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </div>
                                ) : (
                                  <>
                                    <span>₹{parseFloat(lead.totalAmount || "7000").toFixed(2)}</span>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                      onClick={() => {
                                        setEditingTotalId(lead.id);
                                        setEditingValue(lead.totalAmount || "7000");
                                      }}
                                    >
                                      <Edit2 className="h-3 w-3" />
                                    </Button>
                                  </>
                                )}
                              </div>
                            ) : (
                              `₹${parseFloat(lead.totalAmount || "7000").toFixed(2)}`
                            )}
                          </TableCell>
                          <TableCell className="text-sm font-mono">
                            {lead.transactionNumber || '—'}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {lead.registrationAmount
                              ? `₹${parseFloat(lead.registrationAmount).toFixed(2)}`
                              : '—'}
                          </TableCell>
                          <TableCell className="text-right font-medium text-blue-600 dark:text-blue-400">
                            {lead.concession
                              ? `₹${parseFloat(lead.concession).toFixed(2)}`
                              : '—'}
                          </TableCell>
                          <TableCell className="text-right font-medium text-destructive">
                            {`₹${((parseFloat(lead.totalAmount || "7000")) - ((lead.registrationAmount ? parseFloat(lead.registrationAmount) : 0) + (lead.concession ? parseFloat(lead.concession) : 0) + (lead.partialAmount ? parseFloat(lead.partialAmount) : 0))).toFixed(2)}`}
                          </TableCell>
                          <TableCell className="text-right font-medium text-orange-600 dark:text-orange-400">
                            {lead.partialAmount
                              ? `₹${parseFloat(lead.partialAmount).toFixed(2)}`
                              : '—'}
                          </TableCell>
                          <TableCell className="text-right font-bold text-green-600 dark:text-green-400">
                            {lead.registrationAmount || lead.partialAmount
                              ? `₹${(
                                (lead.registrationAmount ? parseFloat(lead.registrationAmount) : 0) +
                                (lead.partialAmount ? parseFloat(lead.partialAmount) : 0)
                              ).toFixed(2)}`
                              : '—'}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {lead.status.replace('_', ' ')}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                          {searchTerm || filterAccountsUser
                            ? 'No leads found matching your filters.'
                            : 'No leads with financial data available.'}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {filteredLeads.length > 0 && (
                <div className="mt-4 text-sm text-muted-foreground text-center">
                  Showing {filteredLeads.length} of {leadsWithFinancialData.length} leads with financial data
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    </>
  );
}
