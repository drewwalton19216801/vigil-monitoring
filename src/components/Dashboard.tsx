import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState } from "react";
import { WebsiteCard } from "./WebsiteCard";
import { AddWebsiteModal } from "./AddWebsiteModal";
import { WebsiteDetails } from "./WebsiteDetails";
import { Id } from "../../convex/_generated/dataModel";

export function Dashboard() {
  const websites = useQuery(api.websites.getAllWebsites);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedWebsiteId, setSelectedWebsiteId] = useState<Id<"websites"> | null>(null);

  if (websites === undefined) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
      </div>
    );
  }

  if (selectedWebsiteId) {
    return (
      <WebsiteDetails 
        websiteId={selectedWebsiteId} 
        onBack={() => setSelectedWebsiteId(null)} 
      />
    );
  }

  const upWebsites = websites.filter(w => w.currentStatus === "up").length;
  const downWebsites = websites.filter(w => w.currentStatus === "down").length;
  const degradedWebsites = websites.filter(w => w.currentStatus === "degraded").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Dashboard</h1>
          <p className="text-gray-300 mt-1">Monitor your websites in real-time</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          Add Website
        </button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400">Total Sites</p>
              <p className="text-2xl font-bold text-white">{websites.length}</p>
            </div>
            <div className="w-12 h-12 bg-blue-900 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400">Online</p>
              <p className="text-2xl font-bold text-green-400">{upWebsites}</p>
            </div>
            <div className="w-12 h-12 bg-green-900 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400">Degraded</p>
              <p className="text-2xl font-bold text-yellow-400">{degradedWebsites}</p>
            </div>
            <div className="w-12 h-12 bg-yellow-900 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400">Offline</p>
              <p className="text-2xl font-bold text-red-400">{downWebsites}</p>
            </div>
            <div className="w-12 h-12 bg-red-900 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Websites Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {websites.map((website) => (
          <WebsiteCard
            key={website._id}
            website={website}
            onClick={() => setSelectedWebsiteId(website._id)}
          />
        ))}
      </div>

      {websites.length === 0 && (
        <div className="text-center py-12">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-white">No websites</h3>
          <p className="mt-1 text-sm text-gray-400">Get started by adding your first website to monitor.</p>
          <div className="mt-6">
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Add Website
            </button>
          </div>
        </div>
      )}

      {showAddModal && (
        <AddWebsiteModal onClose={() => setShowAddModal(false)} />
      )}
    </div>
  );
}
