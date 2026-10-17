'use client'

import React, { useState } from 'react'
import { FileText, Cpu, CheckCircle2, Clock, AlertTriangle } from 'lucide-react'

export default function AdminAILogsPage() {
  const [logs] = useState([
    {
      id: 'log-1',
      time: '12:30:14 WIB',
      provider: 'gemini',
      model: 'gemini-2.5-flash',
      promptType: 'text_parse',
      inputTokens: 115,
      outputTokens: 48,
      latency: 412,
      status: 'success',
      sample: 'beli bakso 15rb',
    },
    {
      id: 'log-2',
      time: '12:28:02 WIB',
      provider: 'gemini',
      model: 'gemini-2.5-flash',
      promptType: 'receipt_ocr',
      inputTokens: 890,
      outputTokens: 140,
      latency: 1250,
      status: 'success',
      sample: '[Photo OCR: Supermarket Indomaret]',
    },
    {
      id: 'log-3',
      time: '12:21:40 WIB',
      provider: 'gemini',
      model: 'gemini-2.5-flash',
      promptType: 'voice_stt',
      inputTokens: 320,
      outputTokens: 35,
      latency: 890,
      status: 'success',
      sample: '[Voice Note: 8s]',
    },
    {
      id: 'log-4',
      time: '12:15:10 WIB',
      provider: 'deepseek',
      model: 'deepseek-chat-v3',
      promptType: 'text_parse',
      inputTokens: 130,
      outputTokens: 52,
      latency: 520,
      status: 'success',
      sample: 'gajian 5jt',
    },
  ])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
          Log Pemanggilan AI & Monitoring Biaya
          <FileText className="w-5 h-5 text-brand-400" />
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Pelacakan latency ms, konsumsi token input/output, dan audit keberhasilan parsing AI.
        </p>
      </div>

      <div className="rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
              <tr>
                <th className="p-4">Waktu</th>
                <th className="p-4">Tipe Pemanggilan</th>
                <th className="p-4">Provider & Model</th>
                <th className="p-4">Token (In / Out)</th>
                <th className="p-4">Latency</th>
                <th className="p-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 font-mono text-[11px]">
              {logs.map((l) => (
                <tr key={l.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="p-4 text-slate-300 font-sans">{l.time}</td>
                  <td className="p-4 font-sans">
                    <span className="font-bold text-white capitalize">{l.promptType.replace('_', ' ')}</span>
                    <p className="text-[10px] text-slate-400 truncate max-w-xs">{l.sample}</p>
                  </td>
                  <td className="p-4 text-slate-300">
                    <span className="text-brand-400 font-bold">{l.provider}</span> ({l.model})
                  </td>
                  <td className="p-4 text-slate-300">
                    {l.inputTokens} / {l.outputTokens}
                  </td>
                  <td className="p-4 text-slate-300">{l.latency} ms</td>
                  <td className="p-4">
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold font-sans">
                      {l.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
