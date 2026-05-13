import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus } from 'lucide-react';
import { useCreateUser, useCreateJob } from '@/hooks/useAdminData';
import { useAuth } from '@/contexts/AuthContext';

interface AdminAddFormProps {
  type: 'user' | 'worker' | 'job';
}

export const AdminAddForm: React.FC<AdminAddFormProps> = ({ type }) => {
  const [isOpen, setIsOpen] = useState(false);
  const createUser = useCreateUser();
  const createJob = useCreateJob();
  const { user } = useAuth();
  
  // Form States
  const [formData, setFormData] = useState<any>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (type === 'user' || type === 'worker') {
        const payload = {
          id: crypto.randomUUID(),
          full_name: formData.name,
          phone_number: formData.phone,
          email: formData.email,
          user_type: type === 'worker' ? (formData.worker_type || 'worker') : 'user',
          is_verified: formData.is_verified === 'true',
          created_at: new Date().toISOString(),
        };
        await createUser.mutateAsync(payload);
      } else {
        const payload = {
          id: crypto.randomUUID(),
          user_id: user?.id, // Link to current admin user
          title: formData.title,
          category: formData.category,
          price: parseFloat(formData.price || '0'),
          description: formData.description,
          is_active: true,
          created_at: new Date().toISOString(),
        };
        await createJob.mutateAsync(payload);
      }
      setIsOpen(false);
      setFormData({});
    } catch (error) {
      // Error handled by mutation
    }
  };

  const getTitle = () => {
    if (type === 'user') return 'Add New User';
    if (type === 'worker') return 'Add New Worker';
    return 'Add New Job Post';
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white">
          <Plus size={18} />
          {getTitle()}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] bg-white">
        <DialogHeader>
          <DialogTitle>{getTitle()}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          {(type === 'user' || type === 'worker') ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" required placeholder="John Doe" 
                  value={formData.name || ''} onChange={(e) => setFormData({...formData, name: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input id="email" type="email" required placeholder="john@example.com"
                  value={formData.email || ''} onChange={(e) => setFormData({...formData, email: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input id="phone" placeholder="9XXXXXXXX"
                  value={formData.phone || ''} onChange={(e) => setFormData({...formData, phone: e.target.value})} />
              </div>
              {type === 'worker' && (
                <div className="space-y-2">
                  <Label htmlFor="worker_type">Worker Type</Label>
                  <Select onValueChange={(val) => setFormData({...formData, worker_type: val})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="worker">General Worker</SelectItem>
                      <SelectItem value="responder">Emergency Responder</SelectItem>
                      <SelectItem value="tow_truck">Tow Truck</SelectItem>
                      <SelectItem value="traffic">Traffic Officer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="title">Post Title</Label>
                <Input id="title" required placeholder="Plumbing Service" 
                  value={formData.title || ''} onChange={(e) => setFormData({...formData, title: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Input id="category" required placeholder="Maintenance"
                  value={formData.category || ''} onChange={(e) => setFormData({...formData, category: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="price">Price (ETB)</Label>
                <Input id="price" type="number" required placeholder="500"
                  value={formData.price || ''} onChange={(e) => setFormData({...formData, price: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" placeholder="Describe the service..."
                  value={formData.description || ''} onChange={(e) => setFormData({...formData, description: e.target.value})} />
              </div>
            </>
          )}
          <Button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white" disabled={createUser.isPending || createJob.isPending}>
            {createUser.isPending || createJob.isPending ? 'Saving...' : 'Save and Create'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
