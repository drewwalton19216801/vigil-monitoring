import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { AlertConfigForm } from "./AlertConfigForm";

export function UserProfile() {
  const userProfile = useQuery(api.users.getCurrentUserProfile);
  const upsertProfile = useMutation(api.users.upsertUserProfile);
  const alertConfigs = useQuery(api.alerts.getUserAlertConfigs);
  const [isEditing, setIsEditing] = useState(false);
  const [isAddingAlert, setIsAddingAlert] = useState(false);
  const [editingAlertConfig, setEditingAlertConfig] = useState<any>(null);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    phoneNumber: "",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  });

  // Initialize form data when profile loads
  useEffect(() => {
    if (userProfile?.profile) {
      setFormData({
        firstName: userProfile.profile.firstName || "",
        lastName: userProfile.profile.lastName || "",
        phoneNumber: userProfile.profile.phoneNumber || "",
        timezone: userProfile.profile.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
    }
  }, [userProfile]);

  if (userProfile === undefined || alertConfigs === undefined) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
      </div>
    );
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await upsertProfile(formData);
      toast.success("Profile updated successfully!");
      setIsEditing(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to update profile");
    }
  };

  const handleCancel = () => {
    if (userProfile?.profile) {
      setFormData({
        firstName: userProfile.profile.firstName || "",
        lastName: userProfile.profile.lastName || "",
        phoneNumber: userProfile.profile.phoneNumber || "",
        timezone: userProfile.profile.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
    }
    setIsEditing(false);
  };

  const handleEditAlert = (config: any) => {
    setEditingAlertConfig(config);
  };

  const handleAlertSuccess = () => {
    setIsAddingAlert(false);
    setEditingAlertConfig(null);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Profile</h1>
        <p className="text-gray-300 mt-1">Manage your account settings and alert preferences</p>
      </div>

      {/* Profile Information */}
      <div className="bg-gray-800 rounded-lg shadow-sm border border-gray-700">
        <div className="p-6 border-b border-gray-700">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-white">Profile Information</h2>
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 text-blue-400 border border-blue-600 rounded-lg hover:bg-blue-900 transition-colors"
              >
                Edit
              </button>
            )}
          </div>
        </div>
        
        <div className="p-6 text-white">
          {isEditing ? (
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    First Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={formData.phoneNumber}
                  onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="+1234567890"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Required for SMS alerts
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Timezone
                </label>
                <select
                  value={formData.timezone}
                  onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="America/New_York">Eastern Time</option>
                  <option value="America/Chicago">Central Time</option>
                  <option value="America/Denver">Mountain Time</option>
                  <option value="America/Los_Angeles">Pacific Time</option>
                  <option value="UTC">UTC</option>
                  <option value="Europe/London">London</option>
                  <option value="Europe/Paris">Paris</option>
                  <option value="Asia/Tokyo">Tokyo</option>
                  <option value="Asia/Shanghai">Shanghai</option>
                  <option value="Australia/Sydney">Sydney</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-4 py-2 border border-gray-600 text-gray-300 rounded-md hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  Save Changes
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300">Email</label>
                  <p className="text-gray-300 mt-1">{userProfile?.user?.email || "Not provided"}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300">Name</label>
                  <p className="text-gray-300 mt-1">
                    {userProfile?.profile ? 
                      `${userProfile.profile.firstName} ${userProfile.profile.lastName}` : 
                      "Not provided"
                    }
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300">Phone Number</label>
                  <p className="text-gray-300 mt-1">
                    {userProfile?.profile?.phoneNumber || "Not provided"}
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300">Timezone</label>
                  <p className="text-gray-300 mt-1">
                    {userProfile?.profile?.timezone || "Not set"}
                  </p>
                </div>
              </div>

              {!userProfile?.profile && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                  <div className="flex">
                    <svg className="w-5 h-5 text-yellow-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <h3 className="text-sm font-medium text-yellow-800">Complete your profile</h3>
                      <p className="text-sm text-yellow-700 mt-1">
                        Please complete your profile to receive SMS alerts and personalized notifications.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Alert Configurations */}
      <div className="bg-gray-800 rounded-lg shadow-sm border border-gray-700">
        <div className="p-6 border-b border-gray-700">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-semibold text-white">Alert Configurations</h2>
              <p className="text-sm text-gray-400 mt-1">
                Configure how you want to be notified about website issues
              </p>
            </div>
            <button
              onClick={() => setIsAddingAlert(true)}
              className="px-4 py-2 text-blue-400 border border-blue-600 rounded-lg hover:bg-blue-900 transition-colors"
            >
              Add Configuration
            </button>
          </div>
        </div>
        
        <div className="p-6">
          {isAddingAlert ? (
            <AlertConfigForm
              onSuccess={handleAlertSuccess}
              onCancel={() => setIsAddingAlert(false)}
            />
          ) : editingAlertConfig ? (
            <AlertConfigForm
              websiteId={editingAlertConfig.websiteId}
              initialConfig={{
                alertTypes: editingAlertConfig.alertTypes,
                responseTimeThreshold: editingAlertConfig.responseTimeThreshold,
                sslExpiryThreshold: editingAlertConfig.sslExpiryThreshold,
                isActive: editingAlertConfig.isActive,
              }}
              onSuccess={handleAlertSuccess}
              onCancel={() => setEditingAlertConfig(null)}
            />
          ) : alertConfigs.length === 0 ? (
            <p className="text-gray-400 text-center py-8">
              No alert configurations found. Add websites to configure alerts.
            </p>
          ) : (
            <div className="space-y-4">
              {alertConfigs.map((config) => (
                <div key={config._id} className="border border-gray-700 rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium text-white">
                        {config.website?.name || "Unknown Website"}
                      </h3>
                      <p className="text-sm text-gray-400">
                        {config.website?.url}
                      </p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {config.alertTypes.map((type) => (
                          <span
                            key={type}
                            className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-900 text-blue-200"
                          >
                            {type.replace("_", " ").toUpperCase()}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                        config.isActive ? "bg-green-900 text-green-200" : "bg-gray-700 text-gray-300"
                      }`}>
                        {config.isActive ? "ACTIVE" : "INACTIVE"}
                      </span>
                      <button
                        onClick={() => handleEditAlert(config)}
                        className="text-gray-400 hover:text-white"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  <div className="mt-3 text-sm text-gray-400">
                    <p>Response time threshold: {config.responseTimeThreshold}ms</p>
                    <p>SSL expiry threshold: {config.sslExpiryThreshold} days</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
