import React, { useEffect, useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from '@/components/ui/sonner';
import { useRealTimeAds } from '@/hooks/useRealTimeAds';
import { Separator } from '@/components/ui/separator';
import { useBookingTracking } from '@/hooks/useBookingTracking';
import { MessageThread } from '@/components/MessageThread';


const EMERGENCY_CATEGORIES = [
  { key: 'hospital', label: 'Hospital' },
  { key: 'security', label: 'Security' },
  { key: 'traffic', label: 'Traffic' },
  { key: 'fire', label: 'Fire Station' },
];

// Map ad categories to emergency station categories
const mapAdCategoryToStation = (category: string) => {
  if (category.toLowerCase().includes('hospital')) return 'hospital';
  if (category.toLowerCase().includes('security') || category.toLowerCase().includes('police')) return 'security';
  if (category.toLowerCase().includes('traffic')) return 'traffic';
  if (category.toLowerCase().includes('fire')) return 'fire';
  return null;
};

const EmergencyAdminPanel: React.FC = () => {
  const { ads, loading, refetch } = useRealTimeAds();
  const [activeTab, setActiveTab] = useState('hospital');
  const [processing, setProcessing] = useState<string | null>(null);
  const [selectedEmergency, setSelectedEmergency] = useState<any | null>(null);
  const [chatUser, setChatUser] = useState<{id: string, name: string, image?: string} | null>(null);
  const { activeBookings, updateBookingStatus, refetch: refetchBookings } = useBookingTracking();

  // Filter emergencies by category
  const emergenciesByCategory = EMERGENCY_CATEGORIES.reduce((acc, cat) => {
    acc[cat.key] = ads.filter(
      (ad: any) => mapAdCategoryToStation(ad.category) === cat.key
    );
    return acc;
  }, {} as Record<string, any[]>);

  // Accept/Ignore handlers (simulate with toast)
  const handleAccept = async (emergencyId: string, userId: string) => {
    setProcessing(emergencyId);
    // Create a booking for this emergency (simulate acceptance)
    // await supabase
    //   .from('bookings')
    //   .insert({
    //     ad_id: emergencyId,
    //     customer_id: userId,
    //     worker_id: currentStationId, // get from auth context
    //     status: 'accepted',
    //     status_history: [{ status: 'accepted', timestamp: new Date().toISOString() }]
    //   });
    toast.success('Emergency accepted.');
    setProcessing(null);
    refetch();
    refetchBookings();
  };
  const handleIgnore = async (emergencyId: string) => {
    setProcessing(emergencyId);
    // Here you would update the emergency status in your backend
    setTimeout(() => {
      toast('Emergency ignored.');
      setProcessing(null);
      refetch();
    }, 800);
  };

  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-900 text-white flex flex-col">
        <div className="p-6 text-2xl font-bold border-b border-gray-800">Admin Panel</div>
        <nav className="flex-1 p-4">
          <ul className="space-y-4">
            <li className="font-semibold">Emergencies</li>
            <li className="text-gray-400">Stations</li>
            <li className="text-gray-400">Settings</li>
          </ul>
        </nav>
      </aside>
      {/* Main Content */}
      <main className="flex-1 p-8">
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-2xl font-bold">Emergency Admin Panel</CardTitle>
            <Alert className="mt-4 bg-orange-100 border-orange-200">
              <AlertDescription>
                Real-time emergencies posted by users are displayed below. Accept or ignore requests as needed. Each station only sees emergencies in their category.
              </AlertDescription>
            </Alert>
          </CardHeader>
        </Card>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            {EMERGENCY_CATEGORIES.map((cat) => (
              <TabsTrigger key={cat.key} value={cat.key} className="capitalize">
                <span className="px-2 py-1 rounded">{cat.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>
          {EMERGENCY_CATEGORIES.map((cat) => (
            <TabsContent key={cat.key} value={cat.key}>
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl font-semibold flex items-center gap-2">
                    {cat.label} Emergencies
                    <Badge variant="secondary">{emergenciesByCategory[cat.key]?.length || 0}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="text-center py-8">Loading emergencies...</div>
                  ) : emergenciesByCategory[cat.key]?.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">No emergencies found for this category.</div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Title</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>User</TableHead>
                          <TableHead>Posted</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {emergenciesByCategory[cat.key].map((emergency: any) => (
                          <TableRow key={emergency.id}>
                            <TableCell className="font-bold">{emergency.title}</TableCell>
                            <TableCell>{emergency.description}</TableCell>
                            <TableCell>{emergency.profiles?.full_name || 'Unknown'}</TableCell>
                            <TableCell>{new Date(emergency.created_at).toLocaleString()}</TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  className="bg-green-600 hover:bg-green-700 text-white"
                                  disabled={processing === emergency.id}
                                  onClick={() => handleAccept(emergency.id, emergency.user_id)}
                                >
                                  Accept
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  disabled={processing === emergency.id}
                                  onClick={() => handleIgnore(emergency.id)}
                                >
                                  Ignore
                                </Button>
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onClick={() => setChatUser({
                                    id: emergency.user_id,
                                    name: emergency.profiles?.full_name || 'User',
                                    image: emergency.profiles?.profile_image_url
                                  })}
                                >
                                  Chat
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
        {chatUser && (
          <MessageThread
            otherUserId={chatUser.id}
            otherUserName={chatUser.name}
            otherUserImage={chatUser.image}
            onBack={() => setChatUser(null)}
          />
        )}
      </main>
    </div>
  );
};

export default EmergencyAdminPanel;
