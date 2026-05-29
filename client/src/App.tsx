import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { useWebSocket } from "@/hooks/useWebSocket";
import { ActivityWarningPopup } from "@/components/ActivityWarningPopup";
import Landing from "@/pages/landing";
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import Leads from "@/pages/leads";
import MyLeads from "@/pages/my-leads";
import MySessions from "@/pages/my-sessions";
import MyCompletion from "@/pages/my-completion";
import MyDrops from "@/pages/my-drops";
import Users from "@/pages/users";
import UploadData from "@/pages/upload-data";
import MyClasses from "@/pages/classes";
import ClassStudentsPage from "@/pages/class-students";
import ClassAttendancePage from "@/pages/class-attendance";
import AllocatedStudentsPage from "@/pages/allocated-students";
import { isSessionOrganizer } from "@/lib/adminRoleUtils";

import Reports from "@/pages/reports";
import Audit from "@/pages/audit";
import Tally from "@/pages/tally";
import LiveMonitor from "@/pages/live-monitor";
import ChatHistory from "@/pages/chat-history";
import Productivity from "@/pages/productivity";
import TeamLeadDashboard from "@/pages/team-lead-dashboard";
import Kathaipom from "@/pages/kathaipom";
import TechDocs from "@/pages/tech-docs";
import EmailSettings from "@/pages/EmailSettings";
import TestEmail from "@/pages/TestEmail";
import ClassMarksPage from "@/pages/class-marks";
import NotFound from "@/pages/not-found";
import ResponsiveLayout from "@/components/ResponsiveLayout";

function Router() {
  const { isAuthenticated, isLoading, user } = useAuth();

  useWebSocket(isAuthenticated);

  const userRole = (user as any)?.role;
  const isSessOrg = isSessionOrganizer(userRole);
  const shouldShowWarnings = isAuthenticated && (userRole === 'hr' || userRole === 'tech-support');


  return (
    <>
      {shouldShowWarnings && <ActivityWarningPopup />}
      <Switch>
        <Route path="/login" component={Login} />

        {isLoading || !isAuthenticated ? (
          <Route path="/" component={Landing} />
        ) : (
          <ResponsiveLayout>
            <Switch>
              <Route path="/" component={Dashboard} />
              <Route path="/leads">
                {userRole === 'session_organizer' || isSessOrg ? (
                  <MyLeads />
                ) : (
                  <Leads />
                )}
              </Route>

              <Route path="/my-leads" component={MyLeads} />
              <Route path="/my-sessions" component={MySessions} />
              <Route path="/my-completion" component={MyCompletion} />
              <Route path="/my-drops" component={MyDrops} />
              <Route path="/allocated-students" component={AllocatedStudentsPage} />
              <Route path="/classes/:id/students" component={ClassStudentsPage} />
              <Route path="/classes/:id/attendance" component={ClassAttendancePage} />
              <Route path="/classes/:id/marks" component={ClassMarksPage} />
              <Route path="/classes" component={MyClasses} />
              <Route path="/upload-data" component={UploadData} />
              <Route path="/users" component={Users} />
              <Route path="/reports" component={Reports} />
              <Route path="/audit" component={Audit} />
              <Route path="/tally" component={Tally} />
              <Route path="/live-monitor" component={LiveMonitor} />
              <Route path="/chat-history" component={ChatHistory} />
              <Route path="/productivity" component={Productivity} />
              <Route path="/my-team-lead" component={TeamLeadDashboard} />
              <Route path="/kathaipom" component={Kathaipom} />
              <Route path="/tech-docs" component={TechDocs} />
              <Route path="/email-settings" component={EmailSettings} />
              <Route path="/test-email" component={TestEmail} />
              <Route component={NotFound} />
            </Switch>
          </ResponsiveLayout>
        )}
        <Route component={NotFound} />
      </Switch>
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
