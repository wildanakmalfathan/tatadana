'use client'

import React, { useState } from 'react'
import { ShieldCheck, Lock, Eye, AlertCircle } from 'lucide-react'

export default function AdminAuditPage() {
  const [logs] = useState([
    {
      id: 'aud-1',
      adminName: 'Superadmin (root)',
      action: 'view_user_transactions',
      targetUser: 'Dimas Aditya (+628123456789)',
      reason: 'Support ticket #TD-412 (Klarifikasi struk OCR)',
      timestamp: '10 Okt 2026, 12:10 WIB',
      ipAddress: '127.0.0.1 (Localhost)',
    },
    {
      id: 'aud-2',
      adminName: 'Superadmin (root)',
      action: 'approve_payment',
      targetUser: 'Siti Rahmawati (+628571122334)',
      reason: 'Manual transfer verified',
      timestamp: '09 Okt 2026, 15:42 WIB',
      ipAddress: '127.0.0.1 (Localhost)',
    },
  ])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
          Audit Trail & Log Akses Privasi
          <ShieldCheck className="w-5 h-5 text-brand-400" />
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Pencatatan ketat setiap kali admin mengakses data transaksi user demi menjamin privasi dan keamanan standar perbankan.
        </p>
      </div>

      <div className="rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
              <tr>
                <th className="p-4">Waktu</th>
                <th className="p-4">Pelaksana</th>
                <th className="p-4">Aksi</th>
                <th className="p-4">Target Pengguna</th>
                <th className="p-4">Alasan Akses</th>
                <th className="p-4">IP Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {logs.map((l) => (
                <tr key={l.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="p-4 text-slate-400 font-mono text-[11px]">{l.timestamp}</td>
                  <td className="p-4 font-bold text-white">{l.adminName}</td>
                  <td className="p-4">
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[11px]">
                      {l.action}
                    </span>
                  </td>
                  <td className="p-4 text-slate-200">{l.targetUser}</td>
                  <td className="p-4 text-slate-400 italic">&ldquo;{l.reason}&rdquo;</td>
                  <td className="p-4 font-mono text-slate-500 text-[11px]">{l.ipAddress}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
