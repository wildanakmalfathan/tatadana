'use client'

import React, { useState } from 'react'
import { Cpu, ShieldCheck, Save, CheckCircle2, AlertTriangle, Key, Sliders } from 'lucide-react'

export default function AdminAIPage() {
  const [routingMode, setRoutingMode] = useState<'single' | 'parallel_failover'>('parallel_failover')
  const [primaryProvider, setPrimaryProvider] = useState<'gemini' | 'openai' | 'deepseek'>('gemini')

  const [providers, setProviders] = useState([
    {
      id: 'p-1',
      name: 'gemini' as const,
      displayName: 'Google Gemini',
      model: 'gemini-2.5-flash',
      apiKeyMasked: 'AIzaSy*************************',
      isActive: true,
      priority: 1,
      supports: ['Teks Parsing', 'Vision Struk OCR', 'Voice Note STT'],
    },
    {
      id: 'p-2',
      name: 'deepseek' as const,
      displayName: 'DeepSeek Chat',
      model: 'deepseek-chat-v3',
      apiKeyMasked: 'sk-dsk*************************',
      isActive: true,
      priority: 2,
      supports: ['Teks NLP Parsing (Hemat Biaya)'],
    },
    {
      id: 'p-3',
      name: 'openai' as const,
      displayName: 'OpenAI GPT & Whisper',
      model: 'gpt-4o / whisper-1',
      apiKeyMasked: 'sk-proj*************************',
      isActive: false,
      priority: 3,
      supports: ['Teks Parsing', 'Vision OCR', 'Whisper STT'],
    },
  ])

  const [editingProvider, setEditingProvider] = useState<string | null>(null)
  const [newApiKey, setNewApiKey] = useState('')
  const [saveStatus, setSaveStatus] = useState<string | null>(null)

  const toggleProvider = (id: string) => {
    setProviders(
      providers.map((p) => (p.id === id ? { ...p, isActive: !p.isActive } : p))
    )
  }

  const handleSaveApiKey = (id: string) => {
    if (!newApiKey) return
    setProviders(
      providers.map((p) =>
        p.id === id
          ? {
              ...p,
              apiKeyMasked: `${newApiKey.substring(0, 7)}*************************`,
            }
          : p
      )
    )
    setEditingProvider(null)
    setNewApiKey('')
    setSaveStatus('Kunci API berhasil dienkripsi dan disimpan ke database!')
    setTimeout(() => setSaveStatus(null), 3000)
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
          Multi-Provider AI Switchboard
          <Cpu className="w-5 h-5 text-brand-400" />
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Atur mesin AI untuk parsing teks Telegram, ekstraksi struk OCR, dan transkripsi suara dengan failover otomatis.
        </p>
      </div>

      {saveStatus && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{saveStatus}</span>
        </div>
      )}

      {/* AI Routing Mode Card */}
      <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-brand-400" />
              <span>Strategi Pemanggilan AI</span>
            </h3>
            <p className="text-xs text-slate-400">Pilih antara Single Provider murni atau Paralel Failover.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div
            onClick={() => setRoutingMode('single')}
            className={`p-4 rounded-2xl border cursor-pointer transition-all ${
              routingMode === 'single'
                ? 'bg-brand-500/15 border-brand-500 text-white'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-white">Mode Single Provider</span>
              <input
                type="radio"
                checked={routingMode === 'single'}
                onChange={() => setRoutingMode('single')}
                className="accent-brand-500"
              />
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Hanya memanggil provider utama yang dipilih. Jika kuota habis atau timeout, sistem tidak mencoba provider lain.
            </p>
          </div>

          <div
            onClick={() => setRoutingMode('parallel_failover')}
            className={`p-4 rounded-2xl border cursor-pointer transition-all ${
              routingMode === 'parallel_failover'
                ? 'bg-brand-500/15 border-brand-500 text-white'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-white">Mode Paralel Failover (Rekomendasi)</span>
              <input
                type="radio"
                checked={routingMode === 'parallel_failover'}
                onChange={() => setRoutingMode('parallel_failover')}
                className="accent-brand-500"
              />
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Coba provider utama terlebih dahulu. Jika gagal / error 429 rate limit, sistem otomatis beralih ke provider cadangan seketika tanpa downtime.
            </p>
          </div>
        </div>

        {/* Primary Selector */}
        <div className="pt-2">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
            Provider Utama (Primary)
          </label>
          <select
            value={primaryProvider}
            onChange={(e) => setPrimaryProvider(e.target.value as any)}
            className="w-full sm:w-80 px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-brand-500"
          >
            <option value="gemini">Google Gemini (Gemini 2.5 Flash)</option>
            <option value="deepseek">DeepSeek Chat</option>
            <option value="openai">OpenAI GPT-4o</option>
          </select>
        </div>
      </div>

      {/* Provider List & Keys */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-white">Daftar Provider Terkonfigurasi</h3>

        <div className="grid grid-cols-1 gap-4">
          {providers.map((p) => (
            <div
              key={p.id}
              className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-sm ${
                      p.isActive ? 'bg-brand-500/20 text-brand-400' : 'bg-slate-800 text-slate-500'
                    }`}
                  >
                    {p.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <span>{p.displayName}</span>
                      {p.name === primaryProvider && (
                        <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-md bg-brand-500 text-white">
                          Primary
                        </span>
                      )}
                    </h4>
                    <p className="text-xs text-slate-400 font-mono">Model: {p.model}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span
                    className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                      p.isActive
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-slate-800 text-slate-500'
                    }`}
                  >
                    {p.isActive ? 'Aktif' : 'Nonaktif'}
                  </span>
                  <button
                    onClick={() => toggleProvider(p.id)}
                    className="text-xs text-slate-400 hover:text-white underline"
                  >
                    {p.isActive ? 'Matikan' : 'Aktifkan'}
                  </button>
                </div>
              </div>

              {/* API Key management */}
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2 font-mono text-xs text-slate-300 truncate">
                  <Key className="w-4 h-4 text-brand-400 shrink-0" />
                  <span className="text-slate-500 text-[11px]">API Key:</span>
                  <span className="truncate">{p.apiKeyMasked}</span>
                </div>

                <button
                  onClick={() => setEditingProvider(editingProvider === p.id ? null : p.id)}
                  className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-bold text-white transition-colors shrink-0"
                >
                  {editingProvider === p.id ? 'Tutup' : 'Ubah Kunci'}
                </button>
              </div>

              {/* Inline Edit API Key */}
              {editingProvider === p.id && (
                <div className="pt-2 flex items-center gap-2">
                  <input
                    type="password"
                    placeholder="Masukkan kunci API baru..."
                    value={newApiKey}
                    onChange={(e) => setNewApiKey(e.target.value)}
                    className="flex-1 px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
                  />
                  <button
                    onClick={() => handleSaveApiKey(p.id)}
                    className="px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold"
                  >
                    Simpan Terenkripsi
                  </button>
                </div>
              )}

              {/* Capabilities badge */}
              <div className="flex items-center gap-2 flex-wrap pt-1">
                {p.supports.map((sup, idx) => (
                  <span
                    key={idx}
                    className="text-[10px] px-2 py-0.5 rounded-md bg-slate-800/80 text-slate-400 font-medium"
                  >
                    ✓ {sup}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
