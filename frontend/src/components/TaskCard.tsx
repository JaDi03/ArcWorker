import React from 'react';

interface TaskCardProps {
  id?: number;
  title: string;
  reward: string;
  description: string;
  timeEstimate: string;
  tags: string[];
  status?: number; // 0: Created, 1: Submitted, 2: Approved, 3: Rejected
  isAutoVerify?: boolean;
  onStart?: () => void;
}

export function TaskCard({ id, title, reward, description, timeEstimate, tags, status = 0, isAutoVerify, onStart }: TaskCardProps) {
  const [isVerifying, setIsVerifying] = React.useState(false);

  const handleManualSync = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!id) return;
    setIsVerifying(true);
    try {
      await fetch('/api/tasks/auto-verify', {
        method: 'POST',
        body: JSON.stringify({ taskId: id }),
      });
      alert("✅ Verification triggered. Please refresh in a few seconds.");
    } catch (e) {
      alert("Failed to trigger verification.");
    } finally {
      setIsVerifying(false);
    }
  };

  // Helper to render the action or status badge
  const renderAction = () => {
    switch (status) {
      case 0: // Created / Available
        return (
          <button
            onClick={onStart}
            className="text-sm font-bold text-white bg-[#005ddb] px-5 py-2 rounded-lg hover:bg-[#004bb3] transition-colors shadow-sm hover:shadow-md"
          >
            Start Task
          </button>
        );
      case 1: // Submitted
        return (
          <div className="flex flex-col items-end space-y-2">
            <div className="flex items-center space-x-2 text-[#005ddb] bg-blue-50 px-4 py-2 rounded-lg border border-blue-100 font-bold text-sm">
              <span className="w-2 h-2 bg-[#005ddb] rounded-full animate-pulse"></span>
              <span>In Review</span>
            </div>
            {isAutoVerify && (
              <button
                onClick={handleManualSync}
                disabled={isVerifying}
                className="text-xs font-black text-emerald-600 hover:text-emerald-700 transition-colors underline underline-offset-4 flex items-center bg-emerald-50 px-2 py-1 rounded-md border border-emerald-100 mt-1"
              >
                {isVerifying ? "🔄 Verifying..." : "⚡ Sync Verification"}
              </button>
            )}
          </div>
        );
      case 2: // Approved
        return (
          <div className="flex items-center space-x-2 text-emerald-600 bg-emerald-50 px-4 py-2 rounded-lg border border-emerald-100 font-bold text-sm">
            <span>✅ Approved & Paid</span>
          </div>
        );
      case 3: // Rejected
        return (
          <div className="flex items-center space-x-2 text-red-600 bg-red-50 px-4 py-2 rounded-lg border border-red-100 font-bold text-sm">
            <span>❌ Rejected</span>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="bg-white p-6 rounded-2xl border border-gray-100 hover:shadow-xl transition-all duration-300 group h-full flex flex-col">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="font-bold text-slate-800 text-lg mb-1 group-hover:text-[#005ddb] transition-colors">{title}</h3>
          <div className="flex flex-wrap gap-2">
            {tags.map((tag, i) => (
              <span key={i} className="text-xs font-medium px-2 py-1 bg-slate-100 text-slate-600 rounded-md">
                {tag}
              </span>
            ))}
          </div>
        </div>
        <div className="bg-blue-50 px-3 py-1.5 rounded-xl border border-blue-100 flex-shrink-0">
          <span className="text-[#005ddb] font-bold block text-center text-sm">{reward}</span>
          <span className="text-[#005ddb]/70 text-[10px] uppercase font-bold tracking-wide">USDC</span>
        </div>
      </div>

      <p className="text-slate-500 text-sm mb-6 line-clamp-2 flex-grow">{description}</p>

      <div className="flex items-center justify-between pt-4 border-t border-gray-50 mt-auto">
        <div className="flex items-center text-slate-400 text-xs font-medium">
          <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {timeEstimate}
        </div>

        {renderAction()}
      </div>
    </div>
  );
}
