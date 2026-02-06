import { useState } from 'react';
import { ArrowLeft, Plus, Users, MoreVertical, Edit, Power, Trash2, Mail, CheckCircle, Clock, Eye, EyeOff, Loader2, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useNavigate } from 'react-router-dom';
import { useOwnerStaff, useCreateStaff, useUpdateStaff, useDeleteStaff } from '@/hooks/useStaff';
import { useOwnerShops } from '@/hooks/useShops';
import { Skeleton } from '@/components/ui/skeleton';

export const StaffManagement = () => {
  const navigate = useNavigate();
  const { data: staffList = [], isLoading: staffLoading } = useOwnerStaff();
  const { data: shops = [], isLoading: shopsLoading } = useOwnerShops();
  const createStaff = useCreateStaff();
  const updateStaff = useUpdateStaff();
  const deleteStaff = useDeleteStaff();
  
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    shopId: '',
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setFormData({ name: '', email: '', phone: '', password: '', shopId: '' });
    setShowPassword(false);
  };

  const handleAddStaff = async () => {
    if (!formData.name || !formData.email || !formData.phone || !formData.password) {
      return;
    }

    if (formData.password.length < 6) {
      return;
    }

    await createStaff.mutateAsync({
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      password: formData.password,
      shop_id: formData.shopId || undefined,
    });
    
    setShowAddDialog(false);
    resetForm();
  };

  const handleEditStaff = async () => {
    if (!selectedStaff) return;

    await updateStaff.mutateAsync({
      id: selectedStaff,
      shop_id: formData.shopId || undefined,
    });
    
    setShowEditDialog(false);
    setSelectedStaff(null);
    resetForm();
  };

  const openEditDialog = (staff: any) => {
    setSelectedStaff(staff.id);
    setFormData({
      name: staff.name || '',
      email: staff.email || '',
      phone: staff.phone || '',
      password: '',
      shopId: staff.shop_id || '',
    });
    setShowEditDialog(true);
  };

  const toggleStaffStatus = async (staffId: string, currentStatus: boolean) => {
    await updateStaff.mutateAsync({
      id: staffId,
      is_active: !currentStatus,
    });
  };

  const handleDeleteStaff = async (staffId: string) => {
    await deleteStaff.mutateAsync(staffId);
  };

  const isLoading = staffLoading || shopsLoading;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur-xl">
        <div className="flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/owner')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-bold text-foreground">Staff Management</h1>
          </div>
          <Button size="sm" onClick={() => setShowAddDialog(true)} disabled={shops.length === 0}>
            <Plus className="h-4 w-4 mr-1" />
            Add Staff
          </Button>
        </div>
      </header>

      <main className="px-4 py-6 space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="border-border">
            <CardContent className="p-3 text-center">
              {isLoading ? (
                <Skeleton className="h-6 w-8 mx-auto" />
              ) : (
                <p className="text-xl font-bold text-foreground">{staffList.length}</p>
              )}
              <p className="text-xs text-muted-foreground">Total Staff</p>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="p-3 text-center">
              {isLoading ? (
                <Skeleton className="h-6 w-8 mx-auto" />
              ) : (
                <p className="text-xl font-bold text-green-500">
                  {staffList.filter(s => s.is_active).length}
                </p>
              )}
              <p className="text-xs text-muted-foreground">Active</p>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="p-3 text-center">
              {isLoading ? (
                <Skeleton className="h-6 w-8 mx-auto" />
              ) : (
                <p className="text-xl font-bold text-foreground">{shops.length}</p>
              )}
              <p className="text-xs text-muted-foreground">Shops</p>
            </CardContent>
          </Card>
        </div>

        {/* No shops warning */}
        {!isLoading && shops.length === 0 && (
          <Card className="border-orange-500/20 bg-orange-500/5">
            <CardContent className="p-4">
              <p className="text-sm text-orange-600 dark:text-orange-400">
                You need to create at least one shop before adding staff members.
              </p>
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-2"
                onClick={() => navigate('/owner/shops')}
              >
                Create Shop
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Staff List */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <Card key={i} className="border-border">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-48" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : staffList.length === 0 ? (
          <Card className="border-border">
            <CardContent className="p-8 text-center">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No staff members yet</p>
              {shops.length > 0 && (
                <Button className="mt-4" onClick={() => setShowAddDialog(true)}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Your First Staff
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          staffList.map(staff => (
            <Card key={staff.id} className="border-border">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center">
                      <Users className="h-6 w-6 text-green-500" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-foreground">{staff.name}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          staff.is_active
                            ? 'bg-green-500/10 text-green-500'
                            : 'bg-destructive/10 text-destructive'
                        }`}>
                          {staff.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">{staff.shop_name || 'Not assigned'}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {staff.email}
                        </span>
                      </div>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEditDialog(staff)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => toggleStaffStatus(staff.id, staff.is_active)}>
                        <Power className="h-4 w-4 mr-2" />
                        {staff.is_active ? 'Deactivate' : 'Activate'}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => handleDeleteStaff(staff.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Remove
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </main>

      {/* Add Staff Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-sm mx-4">
          <DialogHeader>
            <DialogTitle>Add New Staff</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Full Name *</label>
              <Input
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Enter staff name"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Email *</label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="Enter email address"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Phone *</label>
              <Input
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                placeholder="Enter phone number"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Password *</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  placeholder="Create password (min 6 chars)"
                  className="pl-10 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">Staff will use this password to login</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Assign to Shop</label>
              <Select value={formData.shopId} onValueChange={(v) => handleInputChange('shopId', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a shop (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {shops.map(shop => (
                    <SelectItem key={shop.id} value={shop.id}>{shop.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => { setShowAddDialog(false); resetForm(); }}>
              Cancel
            </Button>
            <Button 
              onClick={handleAddStaff}
              disabled={createStaff.isPending || !formData.name || !formData.email || !formData.phone || !formData.password || formData.password.length < 6}
            >
              {createStaff.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Add Staff'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Staff Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-sm mx-4">
          <DialogHeader>
            <DialogTitle>Edit Staff</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Name</label>
              <Input value={formData.name} disabled className="bg-muted" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Email</label>
              <Input value={formData.email} disabled className="bg-muted" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Assign to Shop</label>
              <Select value={formData.shopId} onValueChange={(v) => handleInputChange('shopId', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a shop" />
                </SelectTrigger>
                <SelectContent>
                  {shops.map(shop => (
                    <SelectItem key={shop.id} value={shop.id}>{shop.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => { setShowEditDialog(false); resetForm(); }}>
              Cancel
            </Button>
            <Button 
              onClick={handleEditStaff}
              disabled={updateStaff.isPending}
            >
              {updateStaff.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
