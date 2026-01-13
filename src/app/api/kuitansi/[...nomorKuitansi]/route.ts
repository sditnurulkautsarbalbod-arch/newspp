import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import jsPDF from 'jspdf'
import { formatCurrency, formatDate, BULAN_INDONESIA } from '@/lib/utils'
import fs from 'fs'
import path from 'path'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ nomorKuitansi: string[] }> }
) {
  try {
    const { nomorKuitansi: segments } = await params
    // Join segments back together with '/' for catch-all route
    const nomorKuitansi = segments.join('/')

    // Fetch payment data and school settings in parallel
    const [pembayaran, settings] = await Promise.all([
      prisma.pembayaran.findUnique({
        where: { nomorKuitansi },
        include: {
          tagihan: {
            include: {
              siswa: true,
              jenisTagihan: true,
              tahunAjaran: true
            }
          }
        }
      }),
      prisma.sekolahSettings.findFirst()
    ])

    if (!pembayaran) {
      return NextResponse.json({ error: 'Kuitansi tidak ditemukan' }, { status: 404 })
    }

    const { tagihan } = pembayaran
    const { siswa, jenisTagihan, tahunAjaran } = tagihan

    // Generate PDF
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a5'
    })

    const pageWidth = doc.internal.pageSize.getWidth()
    let currentY = 10
    
    // === KOP SEKOLAH ===
    const logoSize = 18
    const hasLogoSekolah = settings?.logoSekolah
    const hasLogoYayasan = settings?.logoYayasan
    
    // Helper function to load logo
    const loadLogo = (logoPath: string): string | null => {
      try {
        const fullPath = path.join(process.cwd(), 'public', logoPath)
        if (fs.existsSync(fullPath)) {
          const logoData = fs.readFileSync(fullPath)
          const ext = logoPath.toLowerCase().endsWith('.png') ? 'PNG' : 'JPEG'
          return `data:image/${ext.toLowerCase()};base64,${logoData.toString('base64')}`
        }
      } catch (e) {
        console.error('Error loading logo:', e)
      }
      return null
    }
    
    // Add logo sekolah on the LEFT
    if (hasLogoSekolah) {
      const logoData = loadLogo(settings.logoSekolah!)
      if (logoData) {
        doc.addImage(logoData, 'PNG', 12, currentY, logoSize, logoSize)
      }
    }
    
    // Add logo yayasan on the RIGHT
    if (hasLogoYayasan) {
      const logoData = loadLogo(settings.logoYayasan!)
      if (logoData) {
        doc.addImage(logoData, 'PNG', pageWidth - 12 - logoSize, currentY, logoSize, logoSize)
      }
    }
    
    // Text is always centered between logos
    const textCenterX = pageWidth / 2
    
    // Nama Yayasan (if exists)
    if (settings?.namaYayasan) {
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.text(settings.namaYayasan.toUpperCase(), textCenterX, currentY + 4, { align: 'center' })
    }
    
    // Nama Sekolah
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    const namaSekolah = settings?.namaSekolah || 'SEKOLAH'
    doc.text(namaSekolah.toUpperCase(), textCenterX, currentY + 9, { align: 'center' })
    
    // Alamat lengkap
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    
    const alamatParts: string[] = []
    if (settings?.alamat) alamatParts.push(settings.alamat)
    
    const wilayahParts: string[] = []
    if (settings?.kelurahan) wilayahParts.push(settings.kelurahan)
    if (settings?.kecamatan) wilayahParts.push(settings.kecamatan)
    if (settings?.kabKota) wilayahParts.push(settings.kabKota)
    if (settings?.provinsi) wilayahParts.push(settings.provinsi)
    
    let textY = currentY + 13
    
    if (alamatParts.length > 0) {
      doc.text(alamatParts[0], textCenterX, textY, { align: 'center' })
      textY += 3.5
    }
    
    if (wilayahParts.length > 0) {
      doc.text(wilayahParts.join(', '), textCenterX, textY, { align: 'center' })
      textY += 3.5
    }
    
    // Kontak (Telp, Email, Website)
    const kontakParts: string[] = []
    if (settings?.noTelepon) kontakParts.push(`Telp: ${settings.noTelepon}`)
    if (settings?.email) kontakParts.push(`Email: ${settings.email}`)
    if (settings?.website) kontakParts.push(settings.website)
    
    if (kontakParts.length > 0) {
      doc.text(kontakParts.join(' | '), textCenterX, textY, { align: 'center' })
    }
    
    // Adjust currentY based on logo size or text height
    currentY += Math.max(logoSize + 5, 22)
    
    // Garis pemisah KOP
    doc.setLineWidth(0.8)
    doc.line(10, currentY, pageWidth - 10, currentY)
    doc.setLineWidth(0.3)
    doc.line(10, currentY + 1, pageWidth - 10, currentY + 1)
    
    // === JUDUL KUITANSI ===
    currentY += 8
    doc.setFontSize(13)
    doc.setFont('helvetica', 'bold')
    doc.text('KUITANSI PEMBAYARAN', pageWidth / 2, currentY, { align: 'center' })
    
    currentY += 3

    // Receipt Number & Date
    currentY += 5
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.text(`No. Kuitansi: ${nomorKuitansi}`, 15, currentY)
    doc.text(`Tanggal: ${formatDate(pembayaran.tanggalBayar)}`, pageWidth - 15, currentY, { align: 'right' })

    // Student Info
    currentY += 10
    doc.setFontSize(10)
    doc.text('Telah diterima pembayaran dari:', 15, currentY)
    
    currentY += 7
    doc.setFont('helvetica', 'bold')
    doc.text(`${siswa.nama}`, 15, currentY)
    
    currentY += 5
    doc.setFont('helvetica', 'normal')
    doc.text(`NIPD: ${siswa.nipd}`, 15, currentY)
    doc.text(`Kelas: ${siswa.kelasNama}`, 70, currentY)

    // Payment Details
    currentY += 10
    doc.text('Untuk pembayaran:', 15, currentY)
    
    currentY += 7
    doc.setFont('helvetica', 'bold')
    let description = jenisTagihan.nama
    if (tagihan.bulan) {
      description += ` - ${BULAN_INDONESIA[tagihan.bulan - 1]} ${tagihan.tahun}`
    }
    doc.text(description, 15, currentY)
    
    currentY += 5
    doc.setFont('helvetica', 'normal')
    doc.text(`Tahun Ajaran: ${tahunAjaran.nama}`, 15, currentY)

    // Amount
    currentY += 12
    doc.setDrawColor(200)
    doc.setFillColor(245, 245, 245)
    doc.roundedRect(15, currentY - 5, pageWidth - 30, 20, 3, 3, 'FD')
    
    doc.setFontSize(11)
    doc.text('Jumlah Pembayaran:', 20, currentY + 3)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(14)
    doc.text(formatCurrency(Number(pembayaran.jumlahBayar)), pageWidth - 20, currentY + 5, { align: 'right' })

    // Payment Method
    currentY += 22
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    if (pembayaran.metodeBayar) {
      doc.text(`Metode: ${pembayaran.metodeBayar}`, 15, currentY)
    }
    if (pembayaran.keterangan) {
      doc.text(`Keterangan: ${pembayaran.keterangan}`, 15, currentY + 5)
    }

    // Signature
    currentY += 15
    const namaBendahara = settings?.namaBendahara || ''
    const signatureX = pageWidth - 45
    
    doc.text('Bendahara,', signatureX, currentY, { align: 'center' })
    currentY += 25
    if (namaBendahara) {
      doc.setFont('helvetica', 'bold')
      doc.text(namaBendahara, signatureX, currentY, { align: 'center' })
      doc.setFont('helvetica', 'normal')
    }
    currentY += 3
    doc.text('____________________', signatureX, currentY, { align: 'center' })

    // Footer
    doc.setFontSize(8)
    doc.setTextColor(128)
    doc.text('Kuitansi ini sah sebagai bukti pembayaran', pageWidth / 2, 200, { align: 'center' })

    // Convert to buffer
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'))
    
    // Sanitize filename (replace / with -)
    const safeFilename = nomorKuitansi.replace(/\//g, '-')

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Kuitansi-${safeFilename}.pdf"`
      }
    })
  } catch (error) {
    console.error('Error generating kuitansi:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
