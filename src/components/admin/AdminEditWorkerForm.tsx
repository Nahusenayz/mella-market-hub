import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useUpdateUser } from '@/hooks/useAdminData';
import { Loader2 } from 'lucide-react';

interface AdminEditWorkerFormProps {
  worker: any;
  isOpen: boolean;
  onClose: () => void;
}

export const AdminEditWorkerForm: React.FC<AdminEditWorkerFormProps> = ({ worker, isOpen, onClose }) => {
  const updateUser = useUpdateUser();
  const [formData, setFormData] = useState({
    name: worker.full_name || '',
    phone: worker.phone_number || '',
    email: worker.email || '',
    worker_type: worker.user_type === 'worker' || worker.user_type === 'suspended_worker' ? 'worker' : (worker.user_type || 'worker'),
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateUser.mutateAsync({
        id: worker.id,
        updates: {
          full_name: formData.name,
          phone_number: formData.phone || null,
          email: formData.email || null,
          user_type: formData.worker_type,
        },
      });
      onClose();
    } catch (error) {
      // Error handled by mutation
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-[425px] bg-white max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Worker</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="edit-name">Full Name</Label>
            <Input id="edit-name" required placeholder="John Doe"
              value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-phone">Phone Number</Label>
            <Input id="edit-phone" type="tel" placeholder="9XXXXXXXX"
              value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} />
            <p className="text-xs text-gray-500">Phone number will be visible to users for calling the responder.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-email">Email Address</Label>
            <Input id="edit-email" type="email" placeholder="john@example.com"
              value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-worker_type">Worker Type</Label>
            <Select value={formData.worker_type} onValueChange={(val) => setFormData({...formData, worker_type: val})}>
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
          <Button type="submit" className="w-full bg-orange-600 hover:bg-orange-700 text-white" disabled={updateUser.isPending}>
            {updateUser.isPending ? (
              <><Loader2 className="animate-spin mr-2" size={18} /> Saving...</>
            ) : 'Save Changes'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
