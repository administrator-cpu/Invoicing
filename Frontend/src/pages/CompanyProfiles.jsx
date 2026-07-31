import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Building2, Plus, MapPin, FileText, X, Edit2, Trash2 } from 'lucide-react';
import {
  useCompanyProfiles, useCreateCompanyProfile,
  useUpdateCompanyProfile, useDeactivateCompanyProfile
} from '@/features/company/hooks/useCompany';
import INDIAN_STATES from '@/features/company/constants/states';

const profileSchema = z.object({
  label: z.string().min(1, 'Label is required (e.g., Delhi HQ)'),
  gstNumber: z.string().length(15, 'GST Number must be exactly 15 characters'),
  address: z.object({
    street: z.string().min(1, 'Street is required'),
    city: z.string().min(1, 'City is required'),
    state: z.string().min(1, "State is required").refine((value) => INDIAN_STATES.includes(value), {
      message: "Please select a state."
    }),
    pincode: z.string().min(6, 'Pincode is required'),
  }),
});

const CompanyProfiles = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState(null);

  const { data: profiles, isLoading } = useCompanyProfiles();
  const { mutate: createProfile, isPending: isCreating, isError: isCreateError, error: createError } = useCreateCompanyProfile();
  const { mutate: updateProfile, isPending: isUpdating, isError: isUpdateError, error: updateError } = useUpdateCompanyProfile();
  const { mutate: deactivateProfile } = useDeactivateCompanyProfile();

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(profileSchema),
  });

  const handleOpenAddModal = () => {
    setEditingProfile(null);
    reset({
      label: '',
      gstNumber: '',
      address: { street: '', city: '', state: '', pincode: '' }
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (profile) => {
    setEditingProfile(profile);
    reset(profile);
    setIsModalOpen(true);
  };

  const handleDeleteClick = (id) => {
    if (window.confirm("Are you sure you want to deactivate this profile? It will no longer appear on new invoices.")) {
      deactivateProfile(id);
    }
  };

  const onSubmit = (data) => {
    if (editingProfile) {
      updateProfile({ id: editingProfile._id, data }, {
        onSuccess: () => {
          setIsModalOpen(false);
          reset();
        }
      });
    } else {
      createProfile(data, {
        onSuccess: () => {
          setIsModalOpen(false);
          reset();
        },
      });
    }
  };

  const serverError = createError || updateError;
  const isPending = isCreating || isUpdating;

  return (
    <div className="space-y-6 px-4 pb-4 md:px-8 md:pb-8 max-w-[1600px] mx-auto">
      {/* Header Area */}
      <div className="flex flex-col pt-6 sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Company Profiles</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage your billing locations and GST numbers.</p>
        </div>
        <button
          onClick={handleOpenAddModal}
          className="flex items-center px-4 py-2 bg-primary hover:bg-indigo-600 text-white text-sm font-medium rounded-lg shadow-sm transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Profile
        </button>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      )}

      {/* Grid of Profiles */}
      {!isLoading && profiles?.length === 0 && (
        <div className="bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-12 text-center">
          <Building2 className="w-12 h-12 text-slate-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 dark:text-white">No profiles found</h3>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Add your first company profile to start generating invoices.</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {profiles?.map((profile) => (
          <div key={profile._id} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm flex flex-col h-full transition-colors relative group">

            {/* Hover Action Buttons inside profile cards */}
            <div className="absolute top-4 right-4 flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => handleOpenEditModal(profile)}
                className="p-1.5 text-slate-500 hover:text-primary dark:hover:text-indigo-400 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="Edit Profile"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              {profile.isActive && (
                <button
                  onClick={() => handleDeleteClick(profile._id)}
                  className="p-1.5 text-slate-500 hover:text-red-500 rounded-md hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors cursor-pointer"
                  title="Deactivate Profile"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="flex items-start justify-between mb-4 pr-16">
              <div className="flex items-center">
                <div className="p-2 bg-indigo-50 dark:bg-indigo-500/10 rounded-lg mr-3">
                  <Building2 className="w-5 h-5 text-primary dark:text-indigo-400" />
                </div>
                <h3 className="font-semibold text-slate-900 dark:text-white truncate">{profile.label}</h3>
              </div>
            </div>

            <div className="space-y-3 flex-1 text-sm">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800/60">
                <span className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase">Status</span>
                <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${profile.isActive ? 'bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'}`}>
                  {profile.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="flex items-start text-slate-600 dark:text-slate-300">
                <FileText className="w-4 h-4 mr-2 mt-0.5 shrink-0 text-slate-400" />
                <span className="font-mono uppercase tracking-wider">{profile.gstNumber}</span>
              </div>
              <div className="flex items-start text-slate-600 dark:text-slate-300">
                <MapPin className="w-4 h-4 mr-2 mt-0.5 shrink-0 text-slate-400" />
                <span>
                  {profile.address.street}, {profile.address.city}<br />
                  {profile.address.state} - {profile.address.pincode}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Form Modal (Add / Edit Polymorphic Shell) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-md overflow-hidden border border-slate-200 dark:border-slate-800">
            <div className="flex justify-between items-center p-6 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                {editingProfile ? 'Edit Company Profile' : 'Add Company Profile'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Profile Label (e.g., Delhi HQ)</label>
                <input {...register('label')} placeholder="Delhi Main Branch" className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-transparent text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-primary placeholder:text-slate-400 dark:placeholder:text-slate-600 outline-none transition-colors" />
                {errors.label && <p className="text-red-500 text-xs mt-1">{errors.label.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">GST Number</label>
                <input {...register('gstNumber')} placeholder="07AAAAA0000A1Z5" className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-transparent text-slate-900 dark:text-white uppercase focus:ring-2 focus:ring-primary focus:border-primary placeholder:text-slate-400 dark:placeholder:text-slate-600 outline-none transition-colors" />
                {errors.gstNumber && <p className="text-red-500 text-xs mt-1">{errors.gstNumber.message}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Street Address</label>
                  <input {...register('address.street')} placeholder="123 Business Road, Suite 4B" className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-transparent text-slate-900 dark:text-white focus:ring-2 focus:ring-primary placeholder:text-slate-400 dark:placeholder:text-slate-600 outline-none transition-colors" />
                  {errors.address?.street && <p className="text-red-500 text-xs mt-1">{errors.address.street.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">City</label>
                  <input {...register('address.city')} placeholder="New Delhi" className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-transparent text-slate-900 dark:text-white focus:ring-2 focus:ring-primary placeholder:text-slate-400 dark:placeholder:text-slate-600 outline-none transition-colors" />
                  {errors.address?.city && <p className="text-red-500 text-xs mt-1">{errors.address.city.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">State</label>
                  <select {...register('address.state')} placeholder="Delhi" className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-transparent text-slate-900 dark:text-white focus:ring-2 focus:ring-primary placeholder:text-slate-400 dark:placeholder:text-slate-600 outline-none transition-colors" >
                    <option value="">---- Select State ----</option>
                    {INDIAN_STATES.map(state => (
                      <option key={state} value={state}>{state}</option>
                    ))}
                  </select>
                  {errors.address?.state && <p className="text-red-500 text-xs mt-1">{errors.address.state.message}</p>}
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Pincode</label>
                  <input {...register('address.pincode')} placeholder="110001" className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-transparent text-slate-900 dark:text-white focus:ring-2 focus:ring-primary placeholder:text-slate-400 dark:placeholder:text-slate-600 outline-none transition-colors" />
                  {errors.address?.pincode && <p className="text-red-500 text-xs mt-1">{errors.address.pincode.message}</p>}
                </div>
              </div>

              {(isCreateError || isUpdateError) && (
                <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-500/10 dark:text-red-400 rounded-md border border-red-100 dark:border-red-500/20 mt-4">
                  {serverError?.message || 'Failed to save profile. Please check your data and try again.'}
                </div>
              )}

              <div className="pt-4 flex justify-end gap-3 border-t border-slate-200 dark:border-slate-800 mt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer">
                  Cancel
                </button>
                <button type="submit" disabled={isPending} className="px-4 py-2 text-sm font-medium bg-primary hover:bg-indigo-600 text-white rounded-lg disabled:opacity-50 transition-colors cursor-pointer">
                  {isPending ? 'Saving...' : editingProfile ? 'Update Profile' : 'Save Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompanyProfiles;