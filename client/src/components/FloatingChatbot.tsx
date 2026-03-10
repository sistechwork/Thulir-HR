import { useState, useRef, useEffect } from "react";
import { X, Send, Loader } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import chatbotLogo from "@assets/nimmi_log (1)_1764161983246.webp";

interface Message {
  id: string;
  text: string;
  sender: "user" | "bot";
  timestamp: Date;
}

const formatMessageText = (text: string) => {
  return text.split("\n").map((line, idx) => (
    <div key={idx} className="mb-1">
      {line}
    </div>
  ));
};

export default function FloatingChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      text: "Hello! I'm your VHomofi HRM Assistant powered by VCodez. How can I help you today?",
      sender: "bot",
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputValue,
      sender: "user",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    const question = inputValue;
    setInputValue("");
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat/ask', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          question,
          category: (user as any)?.category || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to get response');
      }

      const data = await response.json();

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: data.answer,
        sender: "bot",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch (error: any) {
      console.error("Error calling chat API:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to get response from AI. Please try again.",
        variant: "destructive",
      });

      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: "Sorry, I encountered an error. Please try again.",
        sender: "bot",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 transform"
        data-testid="button-floating-chatbot"
        aria-label="Open chatbot"
      >
        <img
          src={chatbotLogo}
          alt="Chatbot Assistant"
          className="w-16 h-16 rounded-full object-cover"
        />
      </button>

      {/* Chat Modal */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 w-[500px] max-h-[600px] bg-white dark:bg-[#1a1a1a] rounded-lg shadow-2xl border border-[#e0e0e0] dark:border-[#333333] flex flex-col overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-[#6B21A8] to-[#A855F7] p-4 flex items-center justify-between text-white">
            <div className="flex items-center gap-3">
              <img
                src={chatbotLogo}
                alt="Chat"
                className="w-8 h-8 rounded-full object-cover"
              />
              <div>
                <h3 className="font-semibold text-sm">VHomofi Assistant</h3>
                <p className="text-xs opacity-90">Always here to help</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="hover:opacity-80 transition-opacity"
              data-testid="button-close-chat"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#F9F9F9] dark:bg-[#0a0a0a] max-h-[400px]">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"
                  }`}
                data-testid={`message-${message.sender}-${message.id}`}
              >
                <div
                  className={`px-4 py-2 rounded-lg text-sm leading-relaxed ${message.sender === "user"
                    ? "bg-[#7C3AED] text-white rounded-br-none max-w-xs"
                    : "bg-white dark:bg-[#2a2a2a] text-[#1a1a1a] dark:text-[#f5f5f5] border border-[#e0e0e0] dark:border-[#333333] rounded-bl-none max-w-sm"
                    }`}
                >
                  {message.sender === "bot"
                    ? formatMessageText(message.text)
                    : message.text}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-[#2a2a2a] rounded-lg border border-[#e0e0e0] dark:border-[#333333] rounded-bl-none">
                  <Loader className="w-4 h-4 animate-spin text-[#7C3AED]" />
                  <span className="text-xs text-[#666666] dark:text-[#999999]">
                    Thinking...
                  </span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form
            onSubmit={handleSendMessage}
            className="p-4 border-t border-[#e0e0e0] dark:border-[#333333] bg-white dark:bg-[#1a1a1a] flex gap-2"
          >
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 text-sm"
              data-testid="input-chat-message"
              disabled={isLoading}
            />
            <Button
              type="submit"
              size="sm"
              className="bg-[#7C3AED] hover:bg-[#A855F7] text-white disabled:opacity-50"
              data-testid="button-send-message"
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </form>
        </div>
      )}
    </>
  );
}
