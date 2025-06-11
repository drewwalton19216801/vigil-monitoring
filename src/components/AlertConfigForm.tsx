import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState } from "react";
import { toast } from "sonner";
import { Id } from "../../convex/_generated/dataModel";

interface AlertConfigFormProps {
  websiteId?: Id<"websites">;
  onSuccess?: () => void;
  onCancel?: () => void;
  initialConfig?: {
    alertTypes: string[];
    responseTimeThreshold: number;
    sslExpiryThreshold: number;
    isActive: boolean;
  };
}

const ALERT_TYPES = [
  { value: "downtime", label: "Downtime" },
  { value: "recovery", label: "Recovery" },
  { value: "slow_response", label: "Slow Response" },
  { value: "ssl_expiry", label: "SSL Expiry" },
  { value: "daily_summary", label: "Daily Summary" },
  { value: "weekly_summary", label: "Weekly Summary" },
] as const;

export function AlertConfigForm({ websiteId, onSuccess, onCancel, initialConfig }: AlertConfigFormProps) {
  const websites = useQuery(api.websites.getAllWebsites);
  const upsertAlertConfig = useMutation(api.alerts.upsertAlertConfig);

  const [formData, setFormData] = useState({
    websiteId: websiteId || "",
    alertTypes: initialConfig?.alertTypes || [],
    responseTimeThreshold: initialConfig?.responseTimeThreshold || 1000,
    sslExpiryThreshold: initialConfig?.sslExpiryThreshold || 30,
    isActive: initialConfig?.isActive ?? true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await upsertAlertConfig({
        websiteId: formData.websiteId as Id<"websites">,
        alertTypes: formData.alertTypes as any,
        responseTimeThreshold: formData.responseTimeThreshold,
        sslExpiryThreshold: formData.sslExpiryThreshold,
        isActive: formData.isActive,
      });
      
      toast.success("Alert configuration saved successfully!");
      onSuccess?.();
    } catch (error: any) {
      toast.error(error.message || "Failed to save alert configuration");
    }
  };

  const handleAlertTypeChange = (type: string) => {
    setFormData(prev => ({
      ...prev,
      alertTypes: prev.alertTypes.includes(type)
        ? prev.alertTypes.filter(t => t !== type)
        : [...prev.alertTypes, type],
    }));
  };

  if (!websites) {
    return (
      <div className="flex justify-center items-center min-h-[200px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {!websiteId && (
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Website *
          </label>
          <select
            required
            value={formData.websiteId}
            onChange={(e) => setFormData({ ...formData, websiteId: e.target.value })}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select a website</option>
            {websites.map((website) => (
              <option key={website._id} value={website._id}>
                {website.name} ({website.url})
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Alert Types *
        </label>
        <div className="grid grid-cols-2 gap-2">
          {ALERT_TYPES.map((type) => (
            <label
              key={type.value}
              className="flex items-center space-x-2 p-2 border border-gray-600 rounded-md hover:bg-gray-700 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={formData.alertTypes.includes(type.value)}
                onChange={() => handleAlertTypeChange(type.value)}
                className="rounded border-gray-600 text-blue-500 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-300">{type.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          Response Time Threshold (ms) *
        </label>
        <input
          type="number"
          required
          min="100"
          max="30000"
          value={formData.responseTimeThreshold}
          onChange={(e) => setFormData({ ...formData, responseTimeThreshold: parseInt(e.target.value) })}
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p className="text-xs text-gray-400 mt-1">
          Alert when response time exceeds this threshold
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          SSL Expiry Threshold (days) *
        </label>
        <input
          type="number"
          required
          min="1"
          max="90"
          value={formData.sslExpiryThreshold}
          onChange={(e) => setFormData({ ...formData, sslExpiryThreshold: parseInt(e.target.value) })}
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p className="text-xs text-gray-400 mt-1">
          Alert when SSL certificate expires within this many days
        </p>
      </div>

      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id="isActive"
          checked={formData.isActive}
          onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
          className="rounded border-gray-600 text-blue-500 focus:ring-blue-500"
        />
        <label htmlFor="isActive" className="text-sm text-gray-300">
          Active
        </label>
      </div>

      <div className="flex gap-3 pt-4">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-600 text-gray-300 rounded-md hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Save Configuration
        </button>
      </div>
    </form>
  );
} 