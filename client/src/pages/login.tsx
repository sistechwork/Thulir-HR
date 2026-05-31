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
import logoImage from "@assets/new_logo.png";
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
    <div className="min-h-screen flex bg-white w-full">
      {/* Left Side: Branding / Visual */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#F8F9FA] relative overflow-hidden items-center justify-center flex-col p-12">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-[#11754c]/5 to-transparent"></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#04e284]/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/3"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#11754c]/10 rounded-full blur-[100px] translate-y-1/3 -translate-x-1/3"></div>
        
        <div className="relative z-10 text-center max-w-md mx-auto">
           <img src={logoImage} alt="HRM Portal Logo" className="h-40 object-contain mx-auto mb-12 drop-shadow-xl hover:scale-105 transition-transform duration-500" />
           <h1 className="text-4xl font-bold text-gray-900 mb-6 tracking-tight leading-tight">Enterprise HR<br />Management</h1>
           <p className="text-lg text-gray-600 leading-relaxed">Streamline your recruitment and human resources workflow with intelligent tools and precise analytics.</p>
        </div>
      </div>

      {/* Right Side: Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 lg:p-24 bg-white relative">
        <FloatingChatbot />
        
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden mb-12 text-center">
            <img src={logoImage} alt="Logo" className="h-24 object-contain mx-auto drop-shadow-md" />
          </div>
          
          <div className="mb-10">
            <h2 className="text-3xl font-bold text-gray-900 mb-3 tracking-tight">Welcome back</h2>
            <p className="text-gray-500 text-lg">Please enter your details to sign in.</p>
          </div>

          {/* Admin Role Selection - Shown after Admin login */}
          {showAdminRoleSelection && userRole === 'admin' ? (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="mb-8">
                <h3 className="text-xl font-bold text-gray-900 mb-2">Hello, {userName}</h3>
                <p className="text-gray-500">Select your admin role to continue</p>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">
                  Admin Role
                </label>
                <Select value={selectedAdminRole} onValueChange={setSelectedAdminRole}>
                  <SelectTrigger className="w-full px-4 py-6 text-base border-gray-200 rounded-xl bg-gray-50 text-gray-900 focus:ring-primary/20 focus:border-primary transition-all shadow-sm" data-testid="select-admin-role">
                    <SelectValue placeholder="Select admin role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin_organizer">Admin Organizer</SelectItem>
                    <SelectItem value="session_organizer">Session Organizer</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-gray-500 mt-3 bg-gray-50 p-3 rounded-lg border border-gray-100">
                  {selectedAdminRole === 'admin_organizer'
                    ? '• Admin Organizer: Access to manager dashboard and user management'
                    : '• Session Organizer: Access to accounts tally and completed data view'}
                </p>
              </div>

              <Button
                type="button"
                onClick={handleAdminRoleSelect}
                className="w-full py-6 rounded-xl bg-[#11754c] hover:bg-[#0e623b] hover:shadow-lg hover:shadow-[#11754c]/20 text-white font-medium text-lg transition-all duration-300"
                data-testid="button-admin-role-select"
              >
                Continue to Dashboard
              </Button>
            </div>
          ) : (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              {/* Error Message */}
              {generalError && (
                <div className="mb-8 p-4 rounded-xl bg-red-50 border border-red-100 flex items-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-500 mr-3"></div>
                  <p className="text-red-700 text-sm font-medium">{generalError}</p>
                </div>
              )}

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                {/* Username/Email Field */}
                <div className="space-y-2">
                  <label htmlFor="email" className="block text-sm font-semibold text-gray-700">
                    Username / Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    placeholder="Enter your email or username"
                    className="w-full px-4 py-4 text-base border border-gray-200 rounded-xl bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-[#11754c]/10 focus:border-[#11754c] focus:bg-white transition-all shadow-sm"
                    data-testid="input-email"
                    {...register("email")}
                  />
                  {errors.email && (
                    <p className="mt-2 text-sm text-red-500 flex items-center"><span className="w-1 h-1 rounded-full bg-red-500 mr-2"></span>{errors.email.message}</p>
                  )}
                </div>

                {/* Password Field */}
                <div className="space-y-2">
                  <label htmlFor="password" className="block text-sm font-semibold text-gray-700">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      className="w-full px-4 py-4 pr-12 text-base border border-gray-200 rounded-xl bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-[#11754c]/10 focus:border-[#11754c] focus:bg-white transition-all shadow-sm"
                      data-testid="input-password"
                      {...register("password")}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 transition-colors"
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
                    <p className="mt-2 text-sm text-red-500 flex items-center"><span className="w-1 h-1 rounded-full bg-red-500 mr-2"></span>{errors.password.message}</p>
                  )}
                </div>

                {/* Remember Me & Forgot Password */}
                <div className="flex items-center justify-between pt-2 pb-4">
                  <label className="flex items-center cursor-pointer group">
                    <div className="relative flex items-center justify-center">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="peer w-5 h-5 rounded border-gray-300 text-[#11754c] focus:ring-[#11754c] transition-all cursor-pointer"
                      />
                    </div>
                    <span className="ml-3 text-sm text-gray-600 group-hover:text-gray-900 transition-colors">Remember me</span>
                  </label>
                  <a href="#" className="text-sm text-[#11754c] hover:text-[#0e623b] font-semibold transition-colors">
                    Forgot Password?
                  </a>
                </div>

                {/* Sign In Button */}
                <Button
                  type="submit"
                  disabled={loginMutation.isPending}
                  className="w-full py-6 rounded-xl bg-[#11754c] hover:bg-[#0e623b] hover:shadow-lg hover:shadow-[#11754c]/20 text-white font-medium text-lg transition-all duration-300 flex items-center justify-center space-x-2 disabled:opacity-70 disabled:hover:shadow-none"
                  data-testid="button-login-submit"
                >
                  {loginMutation.isPending ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Authenticating...</span>
                    </>
                  ) : (
                    <span>Sign In</span>
                  )}
                </Button>
              </form>
            </div>
          )}

          {/* Footer Text */}
          {!loginSuccess && (
            <p className="text-center text-sm text-gray-400 mt-12 font-medium">
              Secure Enterprise Portal
            </p>
          )}
        </div>
      </div>
    </div>
  );
}