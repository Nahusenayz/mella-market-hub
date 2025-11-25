import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

const EMERGENCY_CATEGORIES = [
  { key: 'hospital', label: 'Hospital' },
  { key: 'security', label: 'Security' },
  { key: 'traffic', label: 'Traffic' },
  { key: 'fire', label: 'Fire Station' },
];

const AdminRegister: React.FC = () => {
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [category, setCategory] = useState(EMERGENCY_CATEGORIES[0].key);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    // 1. Sign up with Supabase Auth
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName }
      }
    });
    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }
    // 2. Update profile with admin role and category
    await supabase
      .from('profiles')
      .update({
        user_type: 'admin',
        // If you have a station_category column, use this:
        // station_category: category,
      })
      .eq('email', email);

    setLoading(false);
    alert('Admin account created! Please check your email to confirm your account.');
    navigate('/admin-login');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900">
      <form
        onSubmit={handleRegister}
        className="bg-white rounded-lg shadow-lg p-8 w-full max-w-sm"
      >
        <h2 className="text-2xl font-bold mb-6 text-gray-800 text-center">Admin Registration</h2>
        {error && <div className="mb-4 text-red-600 text-center">{error}</div>}
        <div className="mb-4">
          <label className="block text-gray-700 mb-2">Full Name</label>
          <input
            type="text"
            className="w-full p-3 border border-gray-300 rounded"
            value={fullName}
            onChange={e => setFullName(e.target.value)}
            required
          />
        </div>
        <div className="mb-4">
          <label className="block text-gray-700 mb-2">Email</label>
          <input
            type="email"
            className="w-full p-3 border border-gray-300 rounded"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="mb-4">
          <label className="block text-gray-700 mb-2">Password</label>
          <input
            type="password"
            className="w-full p-3 border border-gray-300 rounded"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
        </div>
        <div className="mb-6">
          <label className="block text-gray-700 mb-2">Station Category</label>
          <select
            className="w-full p-3 border border-gray-300 rounded"
            value={category}
            onChange={e => setCategory(e.target.value)}
            required
          >
            {EMERGENCY_CATEGORIES.map(cat => (
              <option key={cat.key} value={cat.key}>{cat.label}</option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="w-full bg-gray-800 text-white py-3 rounded font-semibold hover:bg-gray-700 transition"
          disabled={loading}
        >
          {loading ? 'Registering...' : 'Register'}
        </button>
      </form>
    </div>
  );
};

export default AdminRegister;
