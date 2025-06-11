import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { formatDistanceToNow, format } from "date-fns";
import { useState } from "react";
import { toast } from "sonner";

interface WebsiteDetailsProps {
  websiteId: Id<"websites">;
  onBack: () => void;
}

interface EditWebsiteFormData {
  name: string;
  url: string;
  checkInterval: number;
  timeout: number;
  expectedStatusCode: number;
  keywords: string;
}

export function WebsiteDetails({ websiteId, onBack }: WebsiteDetailsProps) {
  const details = useQuery(api.websites.getWebsiteDetails, { websiteId });
  const deleteWebsite = useMutation(api.websites.deleteWebsite);
  const updateWebsite = useMutation(api.websites.updateWebsite);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<EditWebsiteFormData>({
    name: "",
    url: "",
    checkInterval: 5,
    timeout: 30,
    expectedStatusCode: 200,
    keywords: "",
  });

  if (details === undefined) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
      </div>
    );
  }

  // If website is not found (was deleted), go back to dashboard
  if (details === null) {
    onBack();
    return null;
  }

  const { website, checks, incidents } = details;

  const handleDelete = async () => {
    try {
      await deleteWebsite({ websiteId });
      toast.success("Website deleted successfully");
      onBack();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete website");
    }
  };

  const handleEdit = () => {
    setFormData({
      name: website.name,
      url: website.url,
      checkInterval: website.checkInterval,
      timeout: website.timeout,
      expectedStatusCode: website.expectedStatusCode || 200,
      keywords: website.keywords?.join(", ") || "",
    });
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const keywords = formData.keywords
        .split(",")
        .map(k => k.trim())
        .filter(k => k.length > 0);

      await updateWebsite({
        websiteId,
        name: formData.name,
        url: formData.url,
        checkInterval: formData.checkInterval,
        timeout: formData.timeout,
        expectedStatusCode: formData.expectedStatusCode || undefined,
        keywords: keywords.length > 0 ? keywords : undefined,
      });

      toast.success("Website updated successfully!");
      setShowEditModal(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to update website");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "up": return "text-green-600 bg-green-100";
      case "down": return "text-red-600 bg-red-100";
      case "degraded": return "text-yellow-600 bg-yellow-100";
      default: return "text-gray-600 bg-gray-100";
    }
  };

  const latestCheck = checks[0];
  const upChecks = checks.filter(c => c.status === "up").length;
  const uptimePercentage = checks.length > 0 ? (upChecks / checks.length) * 100 : 0;
  const avgResponseTime = checks.length > 0 
    ? checks.reduce((sum, c) => sum + c.responseTime, 0) / checks.length 
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors text-gray-300"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white">{website.name}</h1>
            <p className="text-gray-300">{website.url}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {latestCheck && (
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(latestCheck.status)}`}>
              {latestCheck.status.toUpperCase()}
            </span>
          )}
          <button
            onClick={handleEdit}
            className="px-4 py-2 text-blue-400 border border-blue-600 rounded-lg hover:bg-blue-900 transition-colors"
          >
            Edit
          </button>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="px-4 py-2 text-red-400 border border-red-600 rounded-lg hover:bg-red-900 transition-colors"
          >
            Delete
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-700">
          <h3 className="text-sm font-medium text-gray-400">Current Status</h3>
          <p className="text-2xl font-bold text-white mt-1">
            {latestCheck ? latestCheck.status.toUpperCase() : "UNKNOWN"}
          </p>
          <p className="text-sm text-gray-400 mt-1">
            {latestCheck ? `${latestCheck.responseTime}ms` : "No data"}
          </p>
        </div>

        <div className="bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-700">
          <h3 className="text-sm font-medium text-gray-400">Uptime (7 days)</h3>
          <p className="text-2xl font-bold text-white mt-1">
            {uptimePercentage.toFixed(1)}%
          </p>
          <p className="text-sm text-gray-400 mt-1">
            {upChecks} of {checks.length} checks
          </p>
        </div>

        <div className="bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-700">
          <h3 className="text-sm font-medium text-gray-400">Avg Response Time</h3>
          <p className="text-2xl font-bold text-white mt-1">
            {avgResponseTime.toFixed(0)}ms
          </p>
          <p className="text-sm text-gray-400 mt-1">Last 7 days</p>
        </div>

        <div className="bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-700">
          <h3 className="text-sm font-medium text-gray-400">Check Interval</h3>
          <p className="text-2xl font-bold text-white mt-1">
            {website.checkInterval}m
          </p>
          <p className="text-sm text-gray-400 mt-1">
            Timeout: {website.timeout}s
          </p>
        </div>
      </div>

      {/* Recent Checks */}
      <div className="bg-gray-800 rounded-lg shadow-sm border border-gray-700">
        <div className="p-6 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-white">Recent Checks</h2>
        </div>
        <div className="p-6">
          {checks.length === 0 ? (
            <p className="text-gray-400 text-center py-8">No checks available</p>
          ) : (
            <div className="space-y-3">
              {checks.slice(0, 10).map((check) => (
                <div key={check._id} className="flex items-center justify-between py-2 border-b border-gray-700 last:border-b-0">
                  <div className="flex items-center gap-3">
                    <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${getStatusColor(check.status)}`}>
                      {check.status.toUpperCase()}
                    </span>
                    <span className="text-sm text-gray-300">
                      {format(new Date(check.checkedAt), "MMM d, HH:mm:ss")}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-400">
                    <span>{check.responseTime}ms</span>
                    {check.statusCode && <span>HTTP {check.statusCode}</span>}
                    {check.errorMessage && (
                      <span className="text-red-400 max-w-xs truncate">
                        {check.errorMessage}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Incidents */}
      <div className="bg-gray-800 rounded-lg shadow-sm border border-gray-700">
        <div className="p-6 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-white">Recent Incidents</h2>
        </div>
        <div className="p-6">
          {incidents.length === 0 ? (
            <p className="text-gray-400 text-center py-8">No incidents recorded</p>
          ) : (
            <div className="space-y-4">
              {incidents.map((incident) => (
                <div key={incident._id} className="border border-gray-600 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                          incident.status === "resolved" ? "text-green-600 bg-green-100" : "text-red-600 bg-red-100"
                        }`}>
                          {incident.status.toUpperCase()}
                        </span>
                        <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                          incident.severity === "critical" ? "text-red-600 bg-red-100" :
                          incident.severity === "high" ? "text-orange-600 bg-orange-100" :
                          incident.severity === "medium" ? "text-yellow-600 bg-yellow-100" :
                          "text-gray-600 bg-gray-100"
                        }`}>
                          {incident.severity.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-white font-medium">{incident.description}</p>
                      <p className="text-sm text-gray-400 mt-1">
                        Started: {format(new Date(incident.startTime), "MMM d, yyyy HH:mm:ss")}
                      </p>
                      {incident.endTime && (
                        <p className="text-sm text-gray-400">
                          Resolved: {format(new Date(incident.endTime), "MMM d, yyyy HH:mm:ss")}
                        </p>
                      )}
                    </div>
                    <div className="text-sm text-gray-400">
                      {incident.endTime ? (
                        <span>
                          Duration: {Math.round((incident.endTime - incident.startTime) / (1000 * 60))} minutes
                        </span>
                      ) : (
                        <span>Ongoing</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-white mb-4">Edit Website</h3>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  URL *
                </label>
                <input
                  type="url"
                  required
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Check Interval (minutes) *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={formData.checkInterval}
                  onChange={(e) => setFormData({ ...formData, checkInterval: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Timeout (seconds) *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={formData.timeout}
                  onChange={(e) => setFormData({ ...formData, timeout: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Expected Status Code
                </label>
                <input
                  type="number"
                  value={formData.expectedStatusCode}
                  onChange={(e) => setFormData({ ...formData, expectedStatusCode: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Keywords (comma-separated)
                </label>
                <input
                  type="text"
                  value={formData.keywords}
                  onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="login, dashboard, welcome"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Optional keywords that must be present on the page
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-600 text-gray-300 rounded-md hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-white mb-4">Delete Website</h3>
            <p className="text-gray-300 mb-6">
              Are you sure you want to delete "{website.name}"? This action cannot be undone and will remove all monitoring data.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2 border border-gray-600 text-gray-300 rounded-md hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
