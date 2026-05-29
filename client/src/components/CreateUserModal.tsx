import { useState, useEffect } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { UserPlus, Eye, EyeOff } from "lucide-react";
import CelebrationPopup from "@/components/CelebrationPopup";

interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingUserId?: string;
}

const createUserSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  role: z.enum(["team_lead", "hr", "accounts", "admin", "tech-support", "session-coordinator"], {
    required_error: "Please select a role",
  }),
  password: z.string().min(6, "Password must be at least 6 characters").optional().or(z.literal("")),
  teamName: z.string().optional(),
  teamLeadId: z.string().optional(),
  status: z.enum(["active", "deactive"]).optional().default("active"),
}).refine((data) => {
  if (data.role === "team_lead") {
    return data.teamName && data.teamName.trim().length >= 2;
  }
  return true;
}, {
  message: "Team name is required for Team Lead (at least 2 characters)",
  path: ["teamName"],
});

type CreateUserForm = z.infer<typeof createUserSchema>;

export default function CreateUserModal({ isOpen, onClose, onSuccess, editingUserId }: CreateUserModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showPassword, setShowPassword] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const isEditMode = !!editingUserId;

  const form = useForm<CreateUserForm>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      fullName: "",
      email: "",
      role: undefined,
      password: "",
      teamName: "",
      teamLeadId: "",
      status: "active",
    },
  });

  const selectedRole = useWatch({ control: form.control, name: "role" });

  const { data: editingUser, isLoading: loadingUserData } = useQuery({
    queryKey: ["/api/users", editingUserId],
    queryFn: async () => {
      const response = await fetch(`/api/users/${editingUserId}`, { credentials: "include" });
      return response.json();
    },
    enabled: isEditMode && isOpen,
  });

  useEffect(() => {
    if (isEditMode && editingUser && isOpen) {
      form.reset({
        fullName: editingUser.fullName || "",
        email: editingUser.email || "",
        role: editingUser.role || undefined,
        password: "",
        teamName: editingUser.teamName || "",
        teamLeadId: editingUser.teamLeadId || "",
        status: editingUser.status || (editingUser.isActive ? "active" : "deactive"),
      });
    } else if (!isEditMode && isOpen) {
      form.reset({
        fullName: "",
        email: "",
        role: undefined,
        password: "",
        teamName: "",
        teamLeadId: "",
        status: "active",
      });
    }
  }, [isEditMode, editingUser, isOpen, form]);

  const { data: teamLeads } = useQuery({
    queryKey: ["/api/users", { role: "team_lead" }],
    queryFn: async () => {
      const response = await fetch("/api/users?role=team_lead", { credentials: "include" });
      if (!response.ok) return [];
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    },
    enabled: isOpen,
  });

  const saveMutation = useMutation({
    mutationFn: async (data: CreateUserForm) => {
      if (isEditMode && editingUserId) {
        const response = await apiRequest("PUT", `/api/users/${editingUserId}`, data);
        return response.json();
      } else {
        const response = await apiRequest("POST", "/api/users", data);
        return response.json();
      }
    },
    onSuccess: () => {
      if (!isEditMode) {
        // Show celebration for new user creation only
        setShowCelebration(true);
      } else {
        toast({
          title: "User Updated",
          description: "User has been updated successfully",
        });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      form.reset();
      
      if (isEditMode) {
        onSuccess();
      }
      // If not edit mode, onSuccess will be called by handleCelebrationClose
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
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
      toast({
        title: isEditMode ? "Update Failed" : "Creation Failed",
        description: error.message || `There was an error ${isEditMode ? "updating" : "creating"} the user`,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CreateUserForm) => {
    // Validate password for create mode
    if (!isEditMode && !data.password) {
      toast({
        title: "Validation Error",
        description: "Password is required when creating a new user",
        variant: "destructive",
      });
      return;
    }
    // Remove empty password for edit mode
    if (isEditMode && !data.password) {
      const { password, ...dataWithoutPassword } = data;
      saveMutation.mutate({ ...dataWithoutPassword, password: "" } as CreateUserForm);
    } else {
      saveMutation.mutate(data);
    }
  };

  const handleClose = () => {
    form.reset();
    setShowCelebration(false);
    onClose();
  };

  const handleCelebrationClose = () => {
    setShowCelebration(false);
    handleClose();
  };


  const generatePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    form.setValue('password', password);
  };

  const handleFullNameChange = (value: string) => {
    form.setValue('fullName', value);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto" data-testid="create-user-modal">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <UserPlus className="mr-2 h-5 w-5" />
              {isEditMode ? "Edit User" : "Create New User"}
            </DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <FormField
                  control={form.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          onChange={(e) => handleFullNameChange(e.target.value)}
                          placeholder="Enter full name"
                          data-testid="input-full-name"
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
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="email"
                          placeholder="Enter email address"
                          data-testid="input-email"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-role">
                            <SelectValue placeholder="Select a role" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="team_lead">Team Lead</SelectItem>
                          <SelectItem value="hr">HR Personnel</SelectItem>
                          <SelectItem value="accounts">Accounts</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="tech-support">Tech Support</SelectItem>
                          <SelectItem value="session-coordinator">Session Coordinator</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {selectedRole === "team_lead" && (
                  <FormField
                    control={form.control}
                    name="teamName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Team Name *</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="Enter team name (e.g., Sales Team A)"
                            data-testid="input-team-name"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {selectedRole === "hr" && (
                  <FormField
                    control={form.control}
                    name="teamName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Team</FormLabel>
                        <Select onValueChange={(value) => {
                          field.onChange(value);
                          // Also set the teamLeadId from the matching team lead
                          if (value === "Individual") {
                            form.setValue("teamLeadId", "");
                          } else if (Array.isArray(teamLeads)) {
                            const matchingLead = teamLeads.find((tl: any) => tl.teamName === value);
                            if (matchingLead) {
                              form.setValue("teamLeadId", matchingLead.id);
                            }
                          }
                        }} value={field.value || "Individual"}>
                          <FormControl>
                            <SelectTrigger data-testid="select-team-name">
                              <SelectValue placeholder="Select a team" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Individual">Individual (No Team)</SelectItem>
                            {Array.isArray(teamLeads) && teamLeads
                              .filter((tl: any) => tl.teamName && tl.teamName.trim())
                              .map((tl: any) => (
                              <SelectItem key={tl.id} value={tl.teamName}>
                                {tl.teamName} — Led by {tl.fullName || tl.email || 'Unknown'}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                          Assign this HR to a team or keep as Individual
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center justify-between">
                        <span>{isEditMode ? "New Password (Optional)" : "Temporary Password"}</span>
                        {!isEditMode && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={generatePassword}
                            className="text-xs h-auto p-1"
                            data-testid="button-generate-password"
                          >
                            Generate
                          </Button>
                        )}
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            {...field}
                            type={showPassword ? "text" : "password"}
                            placeholder={isEditMode ? "Leave blank to keep current password" : "Enter temporary password"}
                            data-testid="input-password"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                            onClick={() => setShowPassword(!showPassword)}
                            data-testid="button-toggle-password"
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <Eye className="h-4 w-4 text-muted-foreground" />
                            )}
                          </Button>
                        </div>
                      </FormControl>
                      <p className="text-xs text-muted-foreground">
                        {isEditMode ? "Leave blank to keep the current password" : "User will be asked to change password on first login"}
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Account Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-status">
                            <SelectValue placeholder="Select account status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="active">
                            <span className="flex items-center">
                              <span className="inline-block w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                              Active - Credentials Valid
                            </span>
                          </SelectItem>
                          <SelectItem value="deactive">
                            <span className="flex items-center">
                              <span className="inline-block w-2 h-2 bg-red-500 rounded-full mr-2"></span>
                              Deactive - Credentials Invalid
                            </span>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Active accounts can log in. Deactive accounts cannot access the system.
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-border">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleClose}
                  data-testid="button-cancel-create-user"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={saveMutation.isPending || loadingUserData}
                  data-testid="button-submit-create-user"
                >
                  {saveMutation.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground mr-2"></div>
                      {isEditMode ? "Updating..." : "Creating..."}
                    </>
                  ) : (
                    <>
                      <UserPlus className="mr-2 h-4 w-4" />
                      {isEditMode ? "Update User" : "Create User"}
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <CelebrationPopup isOpen={showCelebration} onClose={handleCelebrationClose} />
    </>
  );
}
