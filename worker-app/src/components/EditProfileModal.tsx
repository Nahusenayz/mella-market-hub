import React, { useState, useEffect } from 'react'
import { supabase } from '../integrations/supabase/client'
import Modal from './Modal'
import { Loader2, User, Phone, Briefcase, Save } from 'lucide-react'
import { useTranslation } from '../contexts/LanguageContext'

interface EditProfileModalProps {
  isOpen: boolean
  onClose: () => void
  userId: string
  currentName: string
  currentCategory: string
  onSaved?: () => void
}

const categories = [
  { id: 'police', label: 'Police Officer' },
  { id: 'ambulance', label: 'Paramedic' },
  { id: 'traffic_police', label: 'Traffic Control' },
  { id: 'fire_truck', label: 'Firefighter' },
  { id: 'tow_truck', label: 'Tow Operator' },
]

export default function EditProfileModal({ isOpen, onClose, userId, currentName, currentCategory, onSaved }: EditProfileModalProps) {
  const { t } = useTranslation()
  const [fullName, setFullName] = useState(currentName)
  const [phoneNumber, setPhoneNumber] = useState('')
  const [category, setCategory] = useState(currentCategory)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setFullName(currentName)
      setCategory(currentCategory)
      setError(null)
      setSuccess(false)
      // Fetch current phone number from profiles
      supabase.from('profiles').select('phone_number').eq('id', userId).single().then(({ data }) => {
        if (data?.phone_number) setPhoneNumber(data.phone_number)
      })
    }
  }, [isOpen, userId, currentName, currentCategory])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!fullName.trim()) {
      setError(t('Full name is required'))
      return
    }

    setSaving(true)
    setError(null)

    try {
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: fullName.trim(),
          phone_number: phoneNumber.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)

      if (profileError) throw profileError

      // Update category in worker_locations
      const { error: locError } = await supabase
        .from('worker_locations')
        .upsert({
          worker_id: userId,
          category: category,
        }, { onConflict: 'worker_id' })

      if (locError) throw locError

      setSuccess(true)
      setTimeout(() => {
        onSaved?.()
        onClose()
      }, 1200)
    } catch (err: any) {
      setError(err.message || t('Failed to save profile'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('Edit Profile')}>
      <form onSubmit={handleSave} className="space-y-5">
        <div className="form-group">
          <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
            <User size={16} /> {t('Full Name')}
          </label>
          <input
            type="text"
            value={fullName}
            onChange={e => setFullName(e.target.value)}
            placeholder={t('Your full name')}
            required
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
          />
        </div>

        <div className="form-group">
          <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
            <Phone size={16} /> {t('Phone Number')}
          </label>
          <input
            type="tel"
            value={phoneNumber}
            onChange={e => setPhoneNumber(e.target.value)}
            placeholder={t('9XXXXXXXX')}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
          />
          <p className="mt-1 text-xs text-slate-400">{t('Users will see this number to call you during emergencies.')}</p>
        </div>

        <div className="form-group">
          <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
            <Briefcase size={16} /> {t('Service Category')}
          </label>
          <div className="grid grid-cols-2 gap-2 mt-1">
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategory(cat.id)}
                className={`rounded-xl border-2 px-3 py-2.5 text-sm font-bold transition-all ${
                  category === cat.id
                    ? 'border-orange-500 bg-orange-50 text-orange-700'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                }`}
              >
                {t(cat.label)}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm font-medium text-emerald-700 flex items-center gap-2">
            <Save size={16} /> {t('Profile saved successfully!')}
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-2xl border-2 border-slate-200 bg-white py-3.5 text-sm font-black text-slate-600 transition-all hover:bg-slate-50 active:scale-[0.98]"
          >
            {t('CANCEL')}
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 rounded-2xl bg-orange-500 py-3.5 text-sm font-black text-white shadow-lg shadow-orange-500/20 transition-all hover:bg-orange-600 active:scale-[0.98] disabled:opacity-50"
          >
            {saving ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="animate-spin" size={18} /> {t('SAVING...')}
              </span>
            ) : t('SAVE')}
          </button>
        </div>
      </form>
    </Modal>
  )
}
