'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Save, Upload, Building2, Phone, MapPin, FileText, Image, Calendar, X } from 'lucide-react'

interface SekolahSettings {
  id: string
  namaYayasan: string
  namaSekolah: string
  alamat: string
  kelurahan: string
  kecamatan: string
  kabKota: string
  provinsi: string
  noTelepon: string
  email: string
  website: string
  logoSekolah: string | null
  logoYayasan: string | null
  namaBendahara: string
  formatKuitansi: string
  bulanMulai: number
}

const defaultSettings: SekolahSettings = {
  id: 'default',
  namaYayasan: '',
  namaSekolah: '',
  alamat: '',
  kelurahan: '',
  kecamatan: '',
  kabKota: '',
  provinsi: '',
  noTelepon: '',
  email: '',
  website: '',
  logoSekolah: null,
  logoYayasan: null,
  namaBendahara: '',
  formatKuitansi: 'KWT/{tahun}/{bulan}/{tanggal}/{nomor}',
  bulanMulai: 7
}

const BULAN_OPTIONS = [
  { value: 1, label: 'Januari - Desember' },
  { value: 7, label: 'Juli - Juni (Default)' },
]

export default function PengaturanPage() {
  const [settings, setSettings] = useState<SekolahSettings>(defaultSettings)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => {
        if (data && data.id) {
          // Merge with defaults to ensure all fields have proper values
          setSettings({
            ...defaultSettings,
            ...data,
            // Ensure null values become empty strings for controlled inputs
            namaYayasan: data.namaYayasan || '',
            namaSekolah: data.namaSekolah || '',
            alamat: data.alamat || '',
            kelurahan: data.kelurahan || '',
            kecamatan: data.kecamatan || '',
            kabKota: data.kabKota || '',
            provinsi: data.provinsi || '',
            noTelepon: data.noTelepon || '',
            email: data.email || '',
            website: data.website || '',
            namaBendahara: data.namaBendahara || '',
            formatKuitansi: data.formatKuitansi || 'KWT/{tahun}/{bulan}/{tanggal}/{nomor}',
            bulanMulai: data.bulanMulai || 7
          })
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage(null)

    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      })

      if (res.ok) {
        setMessage({ type: 'success', text: 'Pengaturan berhasil disimpan' })
      } else {
        throw new Error('Gagal menyimpan')
      }
    } catch {
      setMessage({ type: 'error', text: 'Gagal menyimpan pengaturan' })
    } finally {
      setSaving(false)
    }
  }

  const handleLogoUpload = async (type: 'sekolah' | 'yayasan', file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('type', type)

    try {
      const res = await fetch('/api/settings/upload-logo', {
        method: 'POST',
        body: formData
      })

      if (res.ok) {
        const data = await res.json()
        setSettings(prev => ({
          ...prev,
          [type === 'sekolah' ? 'logoSekolah' : 'logoYayasan']: data.path
        }))
        setMessage({ type: 'success', text: `Logo ${type} berhasil diupload` })
      }
    } catch {
      setMessage({ type: 'error', text: 'Gagal mengupload logo' })
    }
  }

  const handleLogoDelete = async (type: 'sekolah' | 'yayasan') => {
    try {
      const res = await fetch('/api/settings/delete-logo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type })
      })

      if (res.ok) {
        setSettings(prev => ({
          ...prev,
          [type === 'sekolah' ? 'logoSekolah' : 'logoYayasan']: null
        }))
        setMessage({ type: 'success', text: `Logo ${type} berhasil dihapus` })
      }
    } catch {
      setMessage({ type: 'error', text: 'Gagal menghapus logo' })
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center py-12">Loading...</div>
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Pengaturan Sekolah</h1>
        <p className="text-gray-600">Atur informasi sekolah untuk kop surat dan kuitansi</p>
      </div>

      {message && (
        <div className={`p-4 rounded-lg ${message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Identitas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Identitas Sekolah
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Nama Yayasan"
                value={settings.namaYayasan}
                onChange={(e) => setSettings({ ...settings, namaYayasan: e.target.value })}
                placeholder="Yayasan Pendidikan Islam"
              />
              <Input
                label="Nama Sekolah"
                value={settings.namaSekolah}
                onChange={(e) => setSettings({ ...settings, namaSekolah: e.target.value })}
                placeholder="SD Islam Terpadu"
                required
              />
            </div>
          </CardContent>
        </Card>

        {/* Alamat */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Alamat
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              label="Alamat Lengkap"
              value={settings.alamat}
              onChange={(e) => setSettings({ ...settings, alamat: e.target.value })}
              placeholder="Jl. Pendidikan No. 123"
            />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Input
                label="Kelurahan"
                value={settings.kelurahan}
                onChange={(e) => setSettings({ ...settings, kelurahan: e.target.value })}
              />
              <Input
                label="Kecamatan"
                value={settings.kecamatan}
                onChange={(e) => setSettings({ ...settings, kecamatan: e.target.value })}
              />
              <Input
                label="Kab/Kota"
                value={settings.kabKota}
                onChange={(e) => setSettings({ ...settings, kabKota: e.target.value })}
              />
              <Input
                label="Provinsi"
                value={settings.provinsi}
                onChange={(e) => setSettings({ ...settings, provinsi: e.target.value })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Kontak */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="w-5 h-5" />
              Kontak
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                label="No. Telepon"
                value={settings.noTelepon}
                onChange={(e) => setSettings({ ...settings, noTelepon: e.target.value })}
                placeholder="021-12345678"
              />
              <Input
                label="Email"
                type="email"
                value={settings.email}
                onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                placeholder="info@sekolah.sch.id"
              />
              <Input
                label="Website"
                value={settings.website}
                onChange={(e) => setSettings({ ...settings, website: e.target.value })}
                placeholder="www.sekolah.sch.id"
              />
            </div>
          </CardContent>
        </Card>

        {/* Logo */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Image className="w-5 h-5" />
              Logo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Logo Sekolah</label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                  {settings.logoSekolah ? (
                    <div className="space-y-2 relative">
                      <button
                        type="button"
                        onClick={() => handleLogoDelete('sekolah')}
                        className="absolute top-0 right-0 p-1 bg-red-100 hover:bg-red-200 rounded-full text-red-600"
                        title="Hapus logo"
                      >
                        <X className="w-4 h-4" />
                      </button>
                      <img src={settings.logoSekolah} alt="Logo Sekolah" className="w-20 h-20 mx-auto object-contain" />
                      <p className="text-xs text-gray-500">Logo tersimpan</p>
                    </div>
                  ) : (
                    <div className="py-4">
                      <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                      <p className="text-sm text-gray-500">Upload logo sekolah</p>
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    id="logo-sekolah"
                    onChange={(e) => e.target.files?.[0] && handleLogoUpload('sekolah', e.target.files[0])}
                  />
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    className="mt-2"
                    onClick={() => document.getElementById('logo-sekolah')?.click()}
                  >
                    Pilih File
                  </Button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Logo Yayasan</label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                  {settings.logoYayasan ? (
                    <div className="space-y-2 relative">
                      <button
                        type="button"
                        onClick={() => handleLogoDelete('yayasan')}
                        className="absolute top-0 right-0 p-1 bg-red-100 hover:bg-red-200 rounded-full text-red-600"
                        title="Hapus logo"
                      >
                        <X className="w-4 h-4" />
                      </button>
                      <img src={settings.logoYayasan} alt="Logo Yayasan" className="w-20 h-20 mx-auto object-contain" />
                      <p className="text-xs text-gray-500">Logo tersimpan</p>
                    </div>
                  ) : (
                    <div className="py-4">
                      <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                      <p className="text-sm text-gray-500">Upload logo yayasan</p>
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    id="logo-yayasan"
                    onChange={(e) => e.target.files?.[0] && handleLogoUpload('yayasan', e.target.files[0])}
                  />
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    className="mt-2"
                    onClick={() => document.getElementById('logo-yayasan')?.click()}
                  >
                    Pilih File
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Format Kuitansi */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Format Kuitansi
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              label="Format Nomor Kuitansi"
              value={settings.formatKuitansi}
              onChange={(e) => setSettings({ ...settings, formatKuitansi: e.target.value })}
              placeholder="KWT/{tahun}/{bulan}/{tanggal}/{nomor}"
            />
            <p className="text-sm text-gray-500">
              Variabel yang tersedia: {'{tahun}'}, {'{bulan}'}, {'{tanggal}'}, {'{nomor}'}<br />
              Contoh hasil: KWT/2024/07/15/0001
            </p>
            <div className="border-t pt-4">
              <Input
                label="Nama Bendahara"
                value={settings.namaBendahara}
                onChange={(e) => setSettings({ ...settings, namaBendahara: e.target.value })}
                placeholder="Nama lengkap bendahara sekolah"
              />
              <p className="text-sm text-gray-500 mt-1">
                Nama bendahara akan tampil di bagian tanda tangan kuitansi
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Pengaturan Tahun Ajaran */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Pengaturan Tahun Ajaran
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Urutan Bulan Tahun Ajaran
              </label>
              <select
                value={settings.bulanMulai}
                onChange={(e) => setSettings({ ...settings, bulanMulai: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                {BULAN_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div className="p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800 font-medium mb-2">Preview Urutan Bulan:</p>
              <p className="text-sm text-blue-700">
                {settings.bulanMulai === 7 
                  ? 'Juli, Agustus, September, Oktober, November, Desember, Januari, Februari, Maret, April, Mei, Juni'
                  : 'Januari, Februari, Maret, April, Mei, Juni, Juli, Agustus, September, Oktober, November, Desember'
                }
              </p>
            </div>
            <p className="text-sm text-gray-500">
              Pengaturan ini mempengaruhi tampilan status pembayaran dan laporan.
            </p>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={saving} className="px-8">
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Menyimpan...' : 'Simpan Pengaturan'}
          </Button>
        </div>
      </form>
    </div>
  )
}
