import { useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import { ClientProvider } from "@/context/ClientContext";
import { HistoryProvider } from "@/context/HistoryContext";

const queryClient = new QueryClient();

const ACCESS_CODE = "phico";
const STORAGE_KEY = "adprune_access";

const App = () => {
  const [unlocked, setUnlocked] = useState(
    () => localStorage.getItem(STORAGE_KEY) === "true"
  );
  const [input, setInput] = useState("");
  const [error, setError] = useState(false);

  const handleSubmit = () => {
    if (input === ACCESS_CODE) {
      localStorage.setItem(STORAGE_KEY, "true");
      setUnlocked(true);
    } else {
      setError(true);
      setTimeout(() => setError(false), 2000);
    }
  };

  if (!unlocked) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#111827",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            background: "#1F2937",
            border: "1px solid #374151",
            borderRadius: 16,
            padding: "48px 40px",
            width: 360,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 24,
          }}
        >
          <svg width="64" height="64" viewBox="18 104 116 116" xmlns="http://www.w3.org/2000/svg">
            <g transform="translate(76,162)">
              <circle cx="0" cy="0" r="58" fill="#9333ea" />
              <path
                d="M0,-58 C12,-46 20,-20 18,12 C16,40 6,56 0,58 C6,54 24,38 36,14 C46,0 44,-28 30,-46 C20,-58 10,-62 0,-58 Z"
                fill="#3b0764"
              />
              <ellipse cx="-16" cy="-18" rx="11" ry="15" transform="rotate(-15 -16 -18)" fill="rgba(255,255,255,0.1)" />
              <path
                d="M0,-58 C-4,-68 -8,-76 -10,-84"
                strokeWidth="3"
                strokeLinecap="round"
                fill="none"
                stroke="#ffffff"
              />
              <path d="M-7,-74 C2,-84 18,-84 18,-78 C8,-71 -5,-72 -7,-74 Z" fill="#a78bfa" />
              <path d="M-8,-67 C-16,-75 -28,-74 -28,-69 C-20,-63 -9,-64 -8,-67 Z" fill="#a78bfa" opacity="0.65" />
            </g>
          </svg>
          <div style={{ textAlign: "center" }}>
            <p style={{ color: "#F9FAFB", fontSize: 18, fontWeight: 600, margin: 0 }}>
              AdPrune
            </p>
            <p style={{ color: "#9CA3AF", fontSize: 14, marginTop: 6 }}>
              Enter access code to continue
            </p>
          </div>
          <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 12 }}>
            <input
              type="password"
              placeholder="Access code"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              style={{
                width: "100%",
                padding: "10px 14px",
                borderRadius: 8,
                border: error ? "1px solid #EF4444" : "1px solid #374151",
                background: "#111827",
                color: "#F9FAFB",
                fontSize: 15,
                outline: "none",
                boxSizing: "border-box",
              }}
              autoFocus
            />
            {error && (
              <p style={{ color: "#EF4444", fontSize: 13, margin: 0 }}>
                Incorrect code
              </p>
            )}
            <button
              onClick={handleSubmit}
              style={{
                width: "100%",
                padding: "10px 0",
                borderRadius: 8,
                border: "none",
                background: "#0D9488",
                color: "#FFFFFF",
                fontSize: 15,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ClientProvider>
      <HistoryProvider>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </QueryClientProvider>
      </HistoryProvider>
    </ClientProvider>
  );
};

export default App;
