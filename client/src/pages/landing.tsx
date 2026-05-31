import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import logoImage from "@assets/new_logo.png";
import slideImage1 from "@assets/Gemini_Generated_Image_7ykxay7ykxay7ykx_1764052434472.webp";
import slideImage2 from "@assets/Gemini_Generated_Image_1d294m1d294m1d29_1764052434473.webp";
import slideImage3 from "@assets/Gemini_Generated_Image_f6qyxpf6qyxpf6qy_1764052662755.webp";
import FloatingChatbot from "@/components/FloatingChatbot";

const slideImages = [slideImage1, slideImage2, slideImage3];

export default function Landing() {
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slideImages.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleLogin = () => {
    window.location.href = "/login";
  };

  return (
    <div className="landing-background min-h-screen relative">
      {/* Decorative HR-themed shape - top left */}
      <div className="absolute top-0 left-0 w-64 h-64 bg-gradient-to-br from-[#11754c]/40 to-transparent rounded-full blur-3xl pointer-events-none"></div>

      {/* Decorative shape - middle right */}
      <div className="absolute top-1/3 right-0 w-80 h-80 bg-gradient-to-br from-[#04e284]/35 to-transparent rounded-full blur-3xl pointer-events-none"></div>

      {/* Diagonal accent shape - bottom */}
      <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-full h-40 bg-gradient-to-t from-[#11754c]/30 to-transparent skew-y-3 pointer-events-none"></div>

      {/* Floating Chatbot Button */}
      <FloatingChatbot />

      <div className="container mx-auto px-4 py-4 relative z-10 flex flex-col items-center justify-center min-h-[90vh]">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-6">
            <img
              src={logoImage}
              alt="VHomofi HRM Portal Logo"
              className="h-28 object-contain dark:brightness-110"
            />
          </div>
          <p className="text-xl text-[#666666] dark:text-[#999999] max-w-2xl mx-auto">
            Advanced Lead Management System for HR Teams
          </p>
          <p className="text-lg text-[#666666] dark:text-[#999999] mt-4">
            Streamline your lead management process with role-based access control,
            real-time analytics, and automated workflows.
          </p>
        </div>

        {/* Features Slideshow */}
        <Card className="w-full max-w-4xl mx-auto bg-white dark:bg-[#1a1a1a] border-[#e0e0e0] dark:border-[#333333] mb-8 overflow-hidden shrink-0">
          <CardContent className="p-0">
            <div className="slideshow-container">
              {slideImages.map((image, index) => (
                <div
                  key={index}
                  className={`slide ${index === currentSlide ? 'active' : ''}`}
                >
                  <img src={image} alt={`Feature ${index + 1}`} />
                </div>
              ))}
              <div className="slide-nav">
                {slideImages.map((_, index) => (
                  <div
                    key={index}
                    className={`slide-dot ${index === currentSlide ? 'active' : ''}`}
                    onClick={() => setCurrentSlide(index)}
                    data-testid={`button-slide-${index}`}
                  />
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* CTA Section */}
        <Card className="max-w-md mx-auto bg-white/80 backdrop-blur-md border-gray-100 shadow-2xl hover:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] transition-all duration-500 rounded-2xl overflow-hidden relative group">
          <div className="absolute inset-0 bg-gradient-to-br from-[#11754c]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <CardContent className="pt-8 pb-8 px-8 relative z-10">
            <div className="text-center space-y-8">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 tracking-tight mb-2">Get Started</h2>
                <p className="text-gray-500 text-base leading-relaxed">
                  Sign in to access your Thulir Hr dashboard and start managing leads efficiently.
                </p>
              </div>
              <Button
                onClick={handleLogin}
                size="lg"
                className="w-full py-6 text-lg bg-[#11754c] hover:bg-[#0e623b] text-white font-semibold rounded-xl shadow-lg hover:shadow-xl hover:shadow-[#11754c]/20 transition-all duration-300"
                data-testid="button-login"
              >
                Sign In to Portal
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
