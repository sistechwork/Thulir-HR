import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Sidebar from "@/components/Sidebar";
import FloatingChatbot from "@/components/FloatingChatbot";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { MessageSquare, Trash2, Search, User, Calendar, ChevronDown, ChevronRight, MessageCircle } from "lucide-react";

interface ChatTranscript {
  id: number;
  hrUserId: string;
  question: string;
  answer: string;
  category: string | null;
  createdAt: string;
  hrUser: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    fullName: string | null;
    role: string;
  } | null;
}

interface GroupedTranscripts {
  [userId: string]: {
    hrUser: ChatTranscript['hrUser'];
    transcripts: ChatTranscript[];
  };
}

export default function ChatHistory() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading, user } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());

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

  useEffect(() => {
    if (!isLoading && user && user.role !== 'manager') {
      toast({
        title: "Access Denied",
        description: "Only managers can view chat history.",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 500);
    }
  }, [isLoading, user, toast]);

  const { data: transcripts, isLoading: transcriptsLoading } = useQuery<ChatTranscript[]>({
    queryKey: ["/api/chat/history"],
    retry: false,
    enabled: !!user && user.role === 'manager',
  });

  const handleDelete = async (id: number) => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/chat/history/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to delete transcript');
      }

      toast({
        title: "Deleted",
        description: "Chat transcript has been deleted.",
      });

      queryClient.invalidateQueries({ queryKey: ["/api/chat/history"] });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete transcript. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setDeleteId(null);
    }
  };

  const toggleUserExpanded = (userId: string) => {
    setExpandedUsers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated || (user && user.role !== 'manager')) {
    return null;
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getUserName = (transcript: ChatTranscript) => {
    if (transcript.hrUser) {
      return transcript.hrUser.fullName ||
        `${transcript.hrUser.firstName || ''} ${transcript.hrUser.lastName || ''}`.trim() ||
        transcript.hrUser.email;
    }
    return 'Unknown User';
  };

  const getUserNameFromData = (hrUser: ChatTranscript['hrUser']) => {
    if (hrUser) {
      return hrUser.fullName ||
        `${hrUser.firstName || ''} ${hrUser.lastName || ''}`.trim() ||
        hrUser.email;
    }
    return 'Unknown User';
  };

  const filteredTranscripts = transcripts?.filter(t => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    const userName = getUserName(t).toLowerCase();
    return userName.includes(search) ||
      t.question.toLowerCase().includes(search) ||
      t.answer.toLowerCase().includes(search) ||
      (t.category && t.category.toLowerCase().includes(search));
  });

  const groupedTranscripts: GroupedTranscripts = {};
  filteredTranscripts?.forEach(transcript => {
    const userId = transcript.hrUserId;
    if (!groupedTranscripts[userId]) {
      groupedTranscripts[userId] = {
        hrUser: transcript.hrUser,
        transcripts: []
      };
    }
    groupedTranscripts[userId].transcripts.push(transcript);
  });

  Object.values(groupedTranscripts).forEach(group => {
    group.transcripts.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  });

  const sortedUserIds = Object.keys(groupedTranscripts).sort((a, b) => {
    const latestA = groupedTranscripts[a].transcripts[0]?.createdAt || '';
    const latestB = groupedTranscripts[b].transcripts[0]?.createdAt || '';
    return new Date(latestB).getTime() - new Date(latestA).getTime();
  });

  return (
    <>
      <FloatingChatbot />

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <header className="bg-card border-b border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground" data-testid="text-page-title">
                Chat History
              </h1>
              <p className="text-sm text-muted-foreground">
                View and manage HR chatbot conversation transcripts - Click on HR name to view their conversations
              </p>
            </div>
          </div>
        </header>

        <div className="bg-card border-b border-border px-6 py-4">
          <div className="relative">
            <Input
              type="text"
              placeholder="Search by user, question, or answer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full max-w-md pl-10"
              data-testid="input-search-chat-history"
            />
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          </div>
        </div>

        <main className="flex-1 overflow-y-auto p-6">
          {transcriptsLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : sortedUserIds.length > 0 ? (
            <div className="space-y-4">
              {sortedUserIds.map((userId) => {
                const group = groupedTranscripts[userId];
                const isExpanded = expandedUsers.has(userId);
                const userName = getUserNameFromData(group.hrUser);
                const totalChats = group.transcripts.length;
                const latestChat = group.transcripts[0];

                return (
                  <Card key={userId} className="overflow-hidden">
                    <Collapsible open={isExpanded} onOpenChange={() => toggleUserExpanded(userId)}>
                      <CollapsibleTrigger asChild>
                        <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors pb-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold text-lg">
                                {userName.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <CardTitle className="text-lg flex items-center gap-2">
                                  {userName}
                                  <Badge variant="secondary" className="ml-2">
                                    <MessageCircle className="h-3 w-3 mr-1" />
                                    {totalChats} {totalChats === 1 ? 'chat' : 'chats'}
                                  </Badge>
                                </CardTitle>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                                  <Calendar className="h-3 w-3" />
                                  Last active: {formatDate(latestChat.createdAt)}
                                  {group.hrUser?.role && (
                                    <Badge variant="outline" className="ml-2 capitalize">
                                      {group.hrUser.role}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {isExpanded ? (
                                <ChevronDown className="h-5 w-5 text-muted-foreground" />
                              ) : (
                                <ChevronRight className="h-5 w-5 text-muted-foreground" />
                              )}
                            </div>
                          </div>
                        </CardHeader>
                      </CollapsibleTrigger>

                      <CollapsibleContent>
                        <CardContent className="pt-0 space-y-4 border-t">
                          {group.transcripts.map((transcript) => (
                            <div key={transcript.id} className="pt-4 first:pt-4">
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <Calendar className="h-3 w-3" />
                                  {formatDate(transcript.createdAt)}
                                  {transcript.category && (
                                    <Badge variant="outline" className="ml-1 text-xs">
                                      {transcript.category}
                                    </Badge>
                                  )}
                                </div>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDeleteId(transcript.id);
                                  }}
                                  data-testid={`button-delete-transcript-${transcript.id}`}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>

                              <div className="space-y-3">
                                <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-3 border-l-4 border-blue-500">
                                  <div className="flex items-start gap-2">
                                    <User className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                                    <div>
                                      <p className="text-xs font-medium text-blue-600 mb-1">HR Question:</p>
                                      <p className="text-sm">{transcript.question}</p>
                                    </div>
                                  </div>
                                </div>

                                <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-3 border-l-4 border-green-500">
                                  <div className="flex items-start gap-2">
                                    <MessageSquare className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                                    <div>
                                      <p className="text-xs font-medium text-green-600 mb-1">AI Response:</p>
                                      <p className="text-sm whitespace-pre-wrap">{transcript.answer}</p>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {group.transcripts.indexOf(transcript) < group.transcripts.length - 1 && (
                                <div className="border-b border-dashed border-muted-foreground/20 mt-4" />
                              )}
                            </div>
                          ))}
                        </CardContent>
                      </CollapsibleContent>
                    </Collapsible>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card className="p-12 text-center">
              <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                No Chat Transcripts
              </h3>
              <p className="text-sm text-muted-foreground">
                {searchTerm
                  ? "No transcripts match your search criteria."
                  : "HR chatbot conversations will appear here once they start using the assistant."}
              </p>
            </Card>
          )}
        </main>
      </div>

      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Chat Transcript</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this chat transcript? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && handleDelete(deleteId)}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
