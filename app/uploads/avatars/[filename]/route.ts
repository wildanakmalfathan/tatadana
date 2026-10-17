import { NextRequest, NextResponse } from 'next/server'
import fs from 'node:fs'
import path from 'node:path'
import { getAvatarFilePath } from '@/lib/storage/avatar-storage'

export const dynamic = 'force-dynamic'

function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase()
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg'
  if (ext === '.png') return 'image/png'
  if (ext === '.webp') return 'image/webp'
  return 'application/octet-stream'
}

export async function GET(
  req: NextRequest,
  { params }: { params: { filename: string } }
) {
  try {
    const filename = params.filename
    const filePath = getAvatarFilePath(filename)

    if (!filePath || !fs.existsSync(filePath)) {
      return new NextResponse('File avatar tidak ditemukan', { status: 404 })
    }

    const contentType = getMimeType(filePath)
    const fileBuffer = fs.readFileSync(filePath)

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': fileBuffer.length.toString(),
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=43200',
      },
    })
  } catch (err: any) {
    return new NextResponse('Internal server error', { status: 500 })
  }
}

export async function HEAD(
  req: NextRequest,
  { params }: { params: { filename: string } }
) {
  try {
    const filename = params.filename
    const filePath = getAvatarFilePath(filename)

    if (!filePath || !fs.existsSync(filePath)) {
      return new NextResponse(null, { status: 404 })
    }

    const contentType = getMimeType(filePath)
    const stat = fs.statSync(filePath)

    return new NextResponse(null, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': stat.size.toString(),
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=43200',
      },
    })
  } catch (err: any) {
    return new NextResponse(null, { status: 500 })
  }
}
