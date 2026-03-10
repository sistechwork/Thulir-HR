import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import logoImage from "@assets/Gemini_Generated_Image_kis2mfkis2mfkis2 (2)_1764051974976.webp";
import FloatingChatbot from "@/components/FloatingChatbot";

const CATEGORIES = [
  "Client Hiring",
  "Technical Hiring",
  "Talent Acquisition Executive",
  "Medical Coding"
];

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [generalError, setGeneralError] = useState("");
  const [loginSuccess, setLoginSuccess] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("Medical Coding");
  const [selectedAdminRole, setSelectedAdminRole] = useState("admin_organizer");
  const [showAdminRoleSelection, setShowAdminRoleSelection] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  useEffect(() => {
    // Auto-focus email input after component mounts
    const emailInput = document.querySelector('input[type="email"]') as HTMLInputElement;
    if (emailInput) {
      setTimeout(() => emailInput.focus(), 100);
    }
  }, []);

  const loginMutation = useMutation({
    mutationFn: async (data: LoginForm) => {
      const response = await apiRequest("POST", "/api/auth/login", data);
      return response.json();
    },
    onSuccess: async (data) => {
      // The login response contains the user object
      const response = data as any; // loginMutation returns the response JSON
      const user = response?.user;
      if (user) {
        setUserRole(user.role);
        setUserName(user.fullName || user.email);
        if (user.role === 'hr') {
          window.location.href = "/";
        } else if (user.role === 'admin') {
          setShowAdminRoleSelection(true);
        } else if (user.role === 'manager') {
          window.location.href = "/";
        } else {
          window.location.href = "/";
        }
      } else {
        // Fallback: fetch user info
        try {
          const userResponse = await fetch("/api/auth/user");
          const fetchedUser = await userResponse.json();
          setUserRole(fetchedUser.role);
          setUserName(fetchedUser.fullName || fetchedUser.email);
          if (fetchedUser.role === 'hr') {
            window.location.href = "/";
          } else if (fetchedUser.role === 'admin') {
            setShowAdminRoleSelection(true);
          } else {
            window.location.href = "/";
          }
        } catch (e) {
          window.location.href = "/";
        }
      }
    },
    onError: (error: Error) => {
      const errorMessage = error.message || "Invalid email or password";
      setGeneralError(errorMessage);
      toast({
        title: "Login Failed",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const handleCategorySelect = () => {
    // Store selected category in localStorage
    localStorage.setItem("selectedCategory", selectedCategory);
    // Redirect to dashboard
    window.location.href = "/";
  };

  const handleAdminRoleSelect = () => {
    // Store selected admin sub-role in localStorage
    localStorage.setItem("adminSubRole", selectedAdminRole);
    // Redirect to dashboard
    window.location.href = "/";
  };

  const onSubmit = (data: LoginForm) => {
    setGeneralError("");
    loginMutation.mutate(data);
  };

  return (
    <div className="landing-background min-h-screen flex items-center justify-center p-4 relative">
      {/* Decorative HR-themed shape - top left */}
      <div className="absolute top-0 left-0 w-64 h-64 bg-gradient-to-br from-[#11754c]/40 to-transparent rounded-full blur-3xl pointer-events-none"></div>

      {/* Decorative shape - middle right */}
      <div className="absolute top-1/3 right-0 w-80 h-80 bg-gradient-to-br from-[#04e284]/35 to-transparent rounded-full blur-3xl pointer-events-none"></div>

      {/* Diagonal accent shape - bottom */}
      <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-full h-40 bg-gradient-to-t from-[#11754c]/30 to-transparent skew-y-3 pointer-events-none"></div>

      {/* Floating Chatbot Button */}
      <FloatingChatbot />

      {/* Center: Login Form Section */}
      <div className="w-full relative z-10 flex justify-center items-center min-h-screen">
        <div className="px-4 max-w-lg w-full py-8">
          {/* Logo Section */}
          <div className="text-center mb-8 sm:mb-12">
            <img
              src={logoImage}
              alt="VHomofi HRM Portal Logo"
              className="h-24 sm:h-32 md:h-40 object-contain mx-auto"
            />
          </div>

          {/* Login Container */}
          <div className="backdrop-blur-[100px] rounded-[24px] sm:rounded-[32px] p-6 sm:p-12 shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-white/20 text-gray-900" style={{ background: 'linear-gradient(145deg, rgba(255,255,255,0.7), rgba(255,255,255,0.5))', boxShadow: '0 20px 50px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.4)' }}>

            {/* Admin Role Selection - Shown after Admin login */}
            {showAdminRoleSelection && userRole === 'admin' ? (
              <div className="space-y-6">
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-bold text-[#11754c] dark:text-[#04e284] mb-2">Welcome, {userName}</h2>
                  <p className="text-[#666666] dark:text-[#999999]">Select your admin role to continue</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#1a1a1a] dark:text-[#f5f5f5] mb-3">
                    Admin Role
                  </label>
                  <Select value={selectedAdminRole} onValueChange={setSelectedAdminRole}>
                    <SelectTrigger className="w-full px-5 py-4 text-base border border-[#e0e0e0] dark:border-[#333333] rounded-lg bg-[#F9F9F9] dark:bg-[#2a2a2a] text-[#1a1a1a] dark:text-[#f5f5f5] focus:border-[#11754c] dark:focus:border-[#04e284]" data-testid="select-admin-role">
                      <SelectValue placeholder="Select admin role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin_organizer">Admin Organizer</SelectItem>
                      <SelectItem value="session_organizer">Session Organizer</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-[#666666] dark:text-[#999999] mt-2">
                    {selectedAdminRole === 'admin_organizer'
                      ? '• Admin Organizer: Access to manager dashboard and user management'
                      : '• Session Organizer: Access to accounts tally and completed data view'}
                  </p>
                </div>

                <Button
                  type="button"
                  onClick={handleAdminRoleSelect}
                  className="w-full py-3 px-4 rounded-md bg-[#11754c] hover:bg-[#04e284] text-white font-medium transition-all duration-200"
                  data-testid="button-admin-role-select"
                >
                  Continue to Dashboard
                </Button>
              </div>
            ) : (
              <>
                {/* Error Message */}
                {generalError && (
                  <div className="mb-6 p-4 rounded-md bg-[#D62828] bg-opacity-10 border border-[#D62828]">
                    <p className="text-[#D62828] text-sm font-medium">{generalError}</p>
                  </div>
                )}

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                  {/* Username/Email Field */}
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-[#1a1a1a] dark:text-[#f5f5f5] mb-2">
                      Username / Email
                    </label>
                    <input
                      id="email"
                      type="email"
                      placeholder="Enter your email or username"
                      className="w-full px-5 py-4 text-base border border-[#e0e0e0] dark:border-[#333333] rounded-lg bg-[#F9F9F9] dark:bg-[#2a2a2a] text-[#1a1a1a] dark:text-[#f5f5f5] placeholder-[#999999] focus:outline-none focus:border-[#11754c] dark:focus:border-[#04e284] transition-colors"
                      data-testid="input-email"
                      {...register("email")}
                    />
                    {errors.email && (
                      <p className="mt-2 text-sm text-[#D62828]">{errors.email.message}</p>
                    )}
                  </div>

                  {/* Password Field */}
                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-[#1a1a1a] dark:text-[#f5f5f5] mb-2">
                      Password
                    </label>
                    <div className="relative">
                      <input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        className="w-full px-5 py-4 pr-14 text-base border border-[#e0e0e0] dark:border-[#333333] rounded-lg bg-[#F9F9F9] dark:bg-[#2a2a2a] text-[#1a1a1a] dark:text-[#f5f5f5] placeholder-[#999999] focus:outline-none focus:border-[#11754c] dark:focus:border-[#04e284] transition-colors"
                        data-testid="input-password"
                        {...register("password")}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-3 text-[#666666] dark:text-[#999999] hover:text-[#1a1a1a] dark:hover:text-[#f5f5f5]"
                        data-testid="button-toggle-password"
                      >
                        {showPassword ? (
                          <EyeOff className="w-5 h-5" />
                        ) : (
                          <Eye className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                    {errors.password && (
                      <p className="mt-2 text-sm text-[#D62828]">{errors.password.message}</p>
                    )}
                  </div>

                  {/* Remember Me & Forgot Password */}
                  <div className="flex items-center justify-between">
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="w-4 h-4 rounded border-[#e0e0e0] text-[#11754c] focus:ring-[#11754c]"
                      />
                      <span className="ml-2 text-sm text-[#666666] dark:text-[#999999]">Remember me</span>
                    </label>
                    <a href="#" className="text-sm text-[#11754c] hover:text-[#04e284] font-medium transition-colors">
                      Forgot Password?
                    </a>
                  </div>

                  {/* Sign In Button */}
                  <Button
                    type="submit"
                    disabled={loginMutation.isPending}
                    className="w-full py-3 px-4 rounded-md bg-[#11754c] hover:bg-[#04e284] text-white font-medium transition-all duration-200 flex items-center justify-center space-x-2 disabled:opacity-80"
                    data-testid="button-login-submit"
                    style={{
                      backgroundColor: loginMutation.isPending ? "#04e284" : "#11754c",
                    }}
                  >
                    {loginMutation.isPending ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Signing in...</span>
                      </>
                    ) : (
                      <span>Sign In</span>
                    )}
                  </Button>
                </form>
              </>
            )}

            {/* Footer Text */}
            {!loginSuccess && (
              <p className="text-center text-sm text-[#666666] dark:text-[#999999] mt-8">
                Secure login to your HRM Portal
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}