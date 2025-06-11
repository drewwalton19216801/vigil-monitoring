import { formatDistanceToNow } from "date-fns";

interface Website {
  _id: string;
  name: string;
  url: string;
  currentStatus: string;
  lastChecked: number;
  responseTime: number;
  uptimePercentage: number;
  avgResponseTime: number;
  sslDaysUntilExpiry?: number;
}

interface WebsiteCardProps {
  website: Website;
  onClick: () => void;
}

export function WebsiteCard({ website, onClick }: WebsiteCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "up": return "text-green-600 bg-green-100";
      case "down": return "text-red-600 bg-red-100";
      case "degraded": return "text-yellow-600 bg-yellow-100";
      default: return "text-gray-600 bg-gray-100";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "up":
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        );
      case "down":
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        );
      case "degraded":
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        );
      default:
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  return (
    <div
      onClick={onClick}
      className="bg-gray-800 rounded-lg shadow-sm border border-gray-700 hover:shadow-md transition-shadow cursor-pointer p-6"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-white truncate">{website.name}</h3>
          <p className="text-sm text-gray-400 truncate">{website.url}</p>
        </div>
        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(website.currentStatus)}`}>
          {getStatusIcon(website.currentStatus)}
          {website.currentStatus.toUpperCase()}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-xs text-gray-400">Uptime (24h)</p>
          <p className="text-sm font-medium text-white">{website.uptimePercentage.toFixed(1)}%</p>
        </div>
        <div>
          <p className="text-xs text-gray-400">Response Time</p>
          <p className="text-sm font-medium text-white">{website.avgResponseTime}ms</p>
        </div>
      </div>

      {website.sslDaysUntilExpiry !== undefined && website.sslDaysUntilExpiry <= 30 && (
        <div className="mb-4 p-2 bg-yellow-50 border border-yellow-200 rounded-md">
          <div className="flex items-center">
            <svg className="w-4 h-4 text-yellow-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <p className="text-xs text-yellow-800">
              SSL expires in {website.sslDaysUntilExpiry} days
            </p>
          </div>
        </div>
      )}

      <div className="text-xs text-gray-400">
        Last checked: {website.lastChecked ? formatDistanceToNow(new Date(website.lastChecked), { addSuffix: true }) : "Never"}
      </div>
    </div>
  );
}
