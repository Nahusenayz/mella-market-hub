
import React from 'react';
import { useEarnings } from '../hooks/useEarnings';
import { TrendingUp, DollarSign, Calendar, Briefcase } from 'lucide-react';

interface WorkerEarningsProps {
  userId: string | null;
}

const WorkerEarnings: React.FC<WorkerEarningsProps> = ({ userId }) => {
  const { earnings, loading } = useEarnings(userId);

  if (loading) return <div className="animate-pulse h-64 bg-white/50 rounded-2xl"></div>;
  if (!earnings) return null;

  const maxAmount = Math.max(...earnings.monthlyData.map(d => d.amount), 1);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass p-6 rounded-2xl border-l-4 border-orange-500 shadow-lg">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-orange-100 rounded-xl text-orange-600">
              <DollarSign size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Total Earnings</p>
              <h3 className="text-2xl font-bold text-gray-800">ETB {earnings.total.toLocaleString()}</h3>
            </div>
          </div>
        </div>

        <div className="glass p-6 rounded-2xl border-l-4 border-green-500 shadow-lg">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-100 rounded-xl text-green-600">
              <TrendingUp size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">This Month</p>
              <h3 className="text-2xl font-bold text-gray-800">ETB {earnings.thisMonth.toLocaleString()}</h3>
            </div>
          </div>
        </div>

        <div className="glass p-6 rounded-2xl border-l-4 border-blue-500 shadow-lg">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 rounded-xl text-blue-600">
              <Briefcase size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Avg / Job</p>
              <h3 className="text-2xl font-bold text-gray-800">ETB {Math.round(earnings.averagePerJob).toLocaleString()}</h3>
            </div>
          </div>
        </div>
      </div>

      {/* Chart and Recent Jobs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass p-6 rounded-2xl shadow-xl">
          <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
            <Calendar size={20} className="text-orange-500" />
            Monthly Revenue
          </h3>
          <div className="h-48 flex items-end justify-between gap-2 px-2">
            {earnings.monthlyData.map((data, idx) => (
              <div key={idx} className="flex-1 flex flex-col items-center gap-2 group">
                <div 
                  className="w-full bg-gradient-to-t from-orange-500 to-orange-400 rounded-t-lg transition-all duration-500 group-hover:from-orange-600 group-hover:to-orange-500 relative"
                  style={{ height: `${(data.amount / maxAmount) * 100}%`, minHeight: data.amount > 0 ? '4px' : '0' }}
                >
                  <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[10px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                    ETB {data.amount.toLocaleString()}
                  </div>
                </div>
                <span className="text-[10px] text-gray-400 font-bold uppercase">{data.month}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="glass p-6 rounded-2xl shadow-xl">
          <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
            <TrendingUp size={20} className="text-orange-500" />
            Recent Income
          </h3>
          <div className="space-y-4">
            {earnings.recentJobs.length > 0 ? earnings.recentJobs.map((job, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 hover:bg-orange-50 rounded-xl transition-colors border border-transparent hover:border-orange-100">
                <div>
                  <p className="font-bold text-gray-800">{job.title}</p>
                  <p className="text-xs text-gray-500">{job.date}</p>
                </div>
                <p className="font-bold text-green-600">+ ETB {job.amount.toLocaleString()}</p>
              </div>
            )) : (
              <div className="text-center py-10 text-gray-400 italic">No completed jobs yet</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkerEarnings;
