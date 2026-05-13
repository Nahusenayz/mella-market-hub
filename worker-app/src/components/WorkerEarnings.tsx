
import React from 'react';
import { useEarnings } from '../hooks/useEarnings';
import { TrendingUp, DollarSign, Calendar, Briefcase, Clock } from 'lucide-react';

interface WorkerEarningsProps {
  userId: string | null;
}

const WorkerEarnings: React.FC<WorkerEarningsProps> = ({ userId }) => {
  const { earnings, loading } = useEarnings(userId);

  if (loading) return <div className="animate-pulse h-64 bg-white/50 rounded-2xl"></div>;
  if (!earnings) return null;

  const maxAmount = Math.max(...earnings.monthlyData.map(d => d.amount), 1);

  return (
    <div className="animate-fade-in-up">
      <div className="bg-white/40 backdrop-blur-md rounded-[2.5rem] border border-white/40 shadow-2xl overflow-hidden">
        {/* Header Summary */}
        <div className="p-8 bg-gradient-to-br from-orange-500/10 to-transparent border-b border-white/20">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Total Balance</p>
              <h2 className="text-4xl font-black text-gray-900 tracking-tight">
                <span className="text-orange-500 mr-2">ETB</span>
                {earnings.total.toLocaleString()}
              </h2>
            </div>
            <div className="flex gap-2">
              <div className="px-4 py-2 bg-white/50 rounded-2xl border border-white/40 text-center">
                <p className="text-[10px] font-bold text-gray-400 uppercase leading-none mb-1">Monthly</p>
                <p className="text-sm font-black text-green-600">{earnings.thisMonth.toLocaleString()}</p>
              </div>
              <div className="px-4 py-2 bg-white/50 rounded-2xl border border-white/40 text-center">
                <p className="text-[10px] font-bold text-gray-400 uppercase leading-none mb-1">Average</p>
                <p className="text-sm font-black text-blue-600">{Math.round(earnings.averagePerJob).toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Transaction History List */}
        <div className="p-6 sm:p-8">
          <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
            <TrendingUp size={20} className="text-orange-500" />
            Transaction History
          </h3>
          
          <div className="space-y-4">
            {earnings.recentJobs.length > 0 ? (
              earnings.recentJobs.map((job, idx) => (
                <div 
                  key={idx} 
                  className="group flex items-center justify-between p-4 bg-white/30 hover:bg-white/60 rounded-3xl border border-white/20 hover:border-white/50 transition-all duration-300 shadow-sm hover:shadow-md"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-12 h-12 bg-white/80 rounded-2xl flex items-center justify-center text-orange-500 shadow-inner group-hover:scale-110 transition-transform">
                      <DollarSign size={20} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-gray-800 truncate text-sm sm:text-base">{job.title}</p>
                      <div className="flex items-center gap-2 text-[10px] sm:text-xs text-gray-500 font-medium">
                        <Calendar size={12} />
                        <span>{job.date}</span>
                        <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                        <Clock size={12} />
                        <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right ml-4">
                    <p className="font-black text-base sm:text-lg text-green-600 leading-none">
                      + {job.amount.toLocaleString()}
                    </p>
                    <p className="text-[10px] font-bold text-gray-400 uppercase mt-1">ETB</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-20 text-gray-400">
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <TrendingUp size={32} />
                </div>
                <p className="font-medium italic">No transactions found yet</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkerEarnings;
