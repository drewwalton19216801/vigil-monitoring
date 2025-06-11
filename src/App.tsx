import { Authenticated, Unauthenticated, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { SignInForm } from "./SignInForm";
import { SignOutButton } from "./SignOutButton";
import { Toaster } from "sonner";
import { Dashboard } from "./components/Dashboard";
import { UserProfile } from "./components/UserProfile";
import { useState } from "react";

export default function App() {
  const [currentView, setCurrentView] = useState<"dashboard" | "profile" | "admin">("dashboard");

  return (
    <div className="min-h-screen flex flex-col bg-gray-900">
      <header className="sticky top-0 z-10 bg-gray-800/80 backdrop-blur-sm h-16 flex justify-between items-center border-b border-gray-700 shadow-sm px-4">
        <div className="flex items-center gap-6">
          <h2 className="text-xl font-semibold text-blue-400">Vigil Web Monitor</h2>
          <Authenticated>
            <nav className="flex gap-4">
              <button
                onClick={() => setCurrentView("dashboard")}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  currentView === "dashboard" 
                    ? "bg-blue-600 text-white" 
                    : "text-gray-300 hover:text-blue-400"
                }`}
              >
                Dashboard
              </button>
              <button
                onClick={() => setCurrentView("profile")}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  currentView === "profile" 
                    ? "bg-blue-600 text-white" 
                    : "text-gray-300 hover:text-blue-400"
                }`}
              >
                Profile
              </button>
            </nav>
          </Authenticated>
        </div>
        <SignOutButton />
      </header>
      
      <main className="flex-1 p-6">
        <Content currentView={currentView} />
      </main>
      
      <Toaster />
    </div>
  );
}

function Content({ currentView }: { currentView: string }) {
  const loggedInUser = useQuery(api.auth.loggedInUser);

  if (loggedInUser === undefined) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <Authenticated>
        {currentView === "dashboard" && <Dashboard />}
        {currentView === "profile" && <UserProfile />}
      </Authenticated>

      <Unauthenticated>
        <div className="max-w-md mx-auto mt-20">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-blue-400 mb-4">Website Monitor</h1>
            <p className="text-xl text-gray-300">
              Monitor your websites 24/7 with real-time alerts and detailed analytics
            </p>
          </div>
          <SignInForm />
        </div>
      </Unauthenticated>
    </div>
  );
}
