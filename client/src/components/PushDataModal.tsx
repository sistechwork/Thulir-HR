import { useState } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Send, Users, User, Share2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

interface PushDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  maxLeads: number;
}

export default function PushDataModal({ isOpen, onClose, maxLeads }: PushDataModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [count, setCount] = useState<number>(10);
  const [targetType, setTargetType] = useState<string>("common_pool");
  const [selectedTargets, setSelectedTargets] = useState<string[]>([]);

  const { data: hrUsers = [] } = useQuery({
    queryKey: ["/api/users", { role: "hr" }],
    queryFn: async () => {
      const response = await fetch(`/api/users?role=hr`);
      if (!response.ok) throw new Error("Failed to fetch HR users");
      return response.json();
    },
    enabled: isOpen && targetType === "individual",
  });

  const { data: teams = [] } = useQuery({
    queryKey: ["/api/teams"],
    queryFn: async () => {
      // In a real app we'd fetch actual teams, but since we use team leads to represent teams:
      const response = await fetch(`/api/users?role=team_lead`);
      if (!response.ok) throw new Error("Failed to fetch teams");
      return response.json();
    },
    enabled: isOpen && targetType === "team",
  });

  const pushMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/temp-leads/push", data);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Push Successful",
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/temp-leads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Push Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleTargetToggle = (id: string) => {
    setSelectedTargets(prev => 
      prev.includes(id) 
        ? prev.filter(t => t !== id)
        : [...prev, id]
    );
  };

  const handleSubmit = () => {
    if ((targetType === "team" || targetType === "individual") && selectedTargets.length === 0) {
      toast({
        title: "Selection Required",
        description: `Please select at least one ${targetType} to push leads to.`,
        variant: "destructive",
      });
      return;
    }

    pushMutation.mutate({
      count,
      targetType,
      targetIds: targetType === "common_pool" ? [] : selectedTargets
    });
  };

  const totalRequired = targetType === 'common_pool' ? count : (count * Math.max(1, selectedTargets.length));

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md" data-testid="push-data-modal">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Send className="mr-2 h-5 w-5" />
            Push to Database
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-3">
            <Label>How many leads per selection?</Label>
            <div className="flex items-center space-x-2">
              <Button 
                variant="outline" 
                size="icon" 
                onClick={() => setCount(Math.max(1, count - 5))}
              >-</Button>
              <Input 
                type="number" 
                min={1}
                value={count} 
                onChange={(e) => setCount(Math.max(1, parseInt(e.target.value) || 1))}
                className="text-center"
              />
              <Button 
                variant="outline" 
                size="icon" 
                onClick={() => setCount(count + 5)}
              >+</Button>
            </div>
            <p className="text-xs text-muted-foreground">Default is 10. Increase or decrease by 5.</p>
          </div>

          <div className="space-y-3">
            <Label>Whom to assign?</Label>
            <Select 
              value={targetType} 
              onValueChange={(val) => {
                setTargetType(val);
                setSelectedTargets([]); // reset selections on type change
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select target type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="common_pool">
                  <div className="flex items-center">
                    <Share2 className="mr-2 h-4 w-4" />
                    Common Pool
                  </div>
                </SelectItem>
                <SelectItem value="team">
                  <div className="flex items-center">
                    <Users className="mr-2 h-4 w-4" />
                    Specific Teams
                  </div>
                </SelectItem>
                <SelectItem value="individual">
                  <div className="flex items-center">
                    <User className="mr-2 h-4 w-4" />
                    Individual HR
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {targetType === "team" && (
            <div className="space-y-3 border p-4 rounded-md">
              <Label>Select Teams</Label>
              <div className="max-h-48 overflow-y-auto space-y-2 pr-2">
                {teams.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">No teams found.</p>
                ) : (
                  teams.map((team: any) => (
                    <div key={team.id} className="flex items-center space-x-2">
                      <Checkbox 
                        id={`team-${team.id}`}
                        checked={selectedTargets.includes(team.id)}
                        onCheckedChange={() => handleTargetToggle(team.id)}
                      />
                      <label htmlFor={`team-${team.id}`} className="text-sm cursor-pointer select-none">
                        {team.teamName || `${team.firstName}'s Team`}
                      </label>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {targetType === "individual" && (
            <div className="space-y-3 border p-4 rounded-md">
              <Label>Select HR Personnel</Label>
              <div className="max-h-48 overflow-y-auto space-y-2 pr-2">
                {hrUsers.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">No HR personnel found.</p>
                ) : (
                  hrUsers.map((hr: any) => (
                    <div key={hr.id} className="flex items-center space-x-2">
                      <Checkbox 
                        id={`hr-${hr.id}`}
                        checked={selectedTargets.includes(hr.id)}
                        onCheckedChange={() => handleTargetToggle(hr.id)}
                      />
                      <label htmlFor={`hr-${hr.id}`} className="text-sm cursor-pointer select-none">
                        {hr.fullName || `${hr.firstName} ${hr.lastName}`}
                      </label>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          <div className={`p-3 rounded-md text-sm ${totalRequired > maxLeads ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'}`}>
            <div className="flex justify-between font-medium">
              <span>Total leads required:</span>
              <span>{totalRequired}</span>
            </div>
            <div className="flex justify-between mt-1 text-xs opacity-80">
              <span>Available in temporary database:</span>
              <span>{maxLeads}</span>
            </div>
            {totalRequired > maxLeads && (
              <p className="mt-2 text-xs font-semibold text-red-600">
                Not enough leads available to complete this push!
              </p>
            )}
          </div>
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose} disabled={pushMutation.isPending}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={pushMutation.isPending || totalRequired > maxLeads || (targetType !== 'common_pool' && selectedTargets.length === 0)}
          >
            {pushMutation.isPending ? "Pushing..." : "Confirm Push"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
