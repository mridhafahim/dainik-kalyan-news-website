'use client'

import { useState } from 'react'
import type React from 'react'

export default function AdminLoginPage() {
  const [role, setRole] = useState<'super_admin' | 'moderator'>('super_admin')
  const [adminId, setAdminId] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // ফরগেট পাসওয়ার্ড স্টেট
  const [isForgotMode, setIsForgotMode] = useState(false)
  const [forgotUserId, setForgotUserId] = useState('')
  const [resetCode, setResetCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [codeSent, setCodeSent] = useState(false)
  const [forgotLoading, setForgotLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    if (!adminId || !password) {
      setError('আপনার অ্যাডমিন আইডি ও পাসওয়ার্ড দিন')
      return
    }

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, adminId, password })
      })

      const data = await res.json()

      if (res.ok && data.ok) {
        // সফল হলে সরাসরি ড্যাশবোর্ডে প্রবেশ
        window.location.replace('/dainik-kalyan-control-panel/dashboard')
      } else {
        setError(data.error || 'ভুল ইউজার আইডি অথবা পাসওয়ার্ড!')
      }
    } catch {
      setError('সার্ভারের সাথে সংযোগ স্থাপন ব্যর্থ হয়েছে')
    } finally {
      setLoading(false)
    }
  }

  // মডারেটর কোডের অনুরোধ
  async function handleRequestCode() {
    if (!forgotUserId.trim()) {
      setError('মডারেটর ইউজার আইডি দিন')
      return
    }
    setForgotLoading(true)
    setError('')
    setSuccess('')

    try {
      const res = await fetch('/api/admin/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'request_code', userId: forgotUserId })
      })
      const data = await res.json()
      if (res.ok) {
        setCodeSent(true)
        setSuccess('সুপার অ্যাডমিনের ড্যাশবোর্ডে ৬-সংখ্যার কোড পাঠানো হয়েছে। কোডটি সংগ্রহ করে নিচে দিন।')
      } else {
        setError(data.error || 'কোড পাঠানো যায়নি')
      }
    } catch {
      setError('সার্ভারে সমস্যা হয়েছে')
    } finally {
      setForgotLoading(false)
    }
  }

  // মডারেটর নতুন পাসওয়ার্ড সাবমিট
  async function handleResetSubmit(e: React.FormEvent) {
    e.preventDefault()
    setForgotLoading(true)
    setError('')
    setSuccess('')

    try {
      const res = await fetch('/api/admin/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reset_password',
          userId: forgotUserId,
          code: resetCode,
          newPassword
        })
      })
      const data = await res.json()
      if (res.ok) {
        setSuccess('পাসওয়ার্ড সফলভাবে পরিবর্তন হয়েছে! এবার লগইন করুন।')
        setIsForgotMode(false)
        setCodeSent(false)
        setPassword('')
      } else {
        setError(data.error || 'পাসওয়ার্ড পরিবর্তন ব্যর্থ')
      }
    } catch {
      setError('সমস্যা হয়েছে')
    } finally {
      setForgotLoading(false)
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fafafa',
        padding: '20px',
        fontFamily: 'inherit'
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '430px',
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          boxShadow: '0 4px 24px rgba(0, 0, 0, 0.06)',
          border: '1px solid #f0f0f0',
          padding: '40px 36px',
          textAlign: 'center'
        }}
      >
        {/* Title Header Matching Your Original UI */}
        <h1
          style={{
            fontSize: '34px',
            fontWeight: '900',
            color: '#c8102e',
            margin: '0 0 6px 0',
            letterSpacing: '-0.5px'
          }}
        >
          দৈনিক কল্যাণ
        </h1>
        <p
          style={{
            fontSize: '13px',
            color: '#64748b',
            margin: '0 0 28px 0',
            fontWeight: '600'
          }}
        >
          Admin Control Panel
        </p>

        {error && (
          <div
            style={{
              backgroundColor: '#fee2e2',
              color: '#dc2626',
              padding: '10px 14px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: '600',
              marginBottom: '20px',
              textAlign: 'left'
            }}
          >
            {error}
          </div>
        )}

        {success && (
          <div
            style={{
              backgroundColor: '#dcfce7',
              color: '#166534',
              padding: '10px 14px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: '600',
              marginBottom: '20px',
              textAlign: 'left'
            }}
          >
            {success}
          </div>
        )}

        {/* Regular Login Form */}
        {!isForgotMode ? (
          <form onSubmit={handleLogin} style={{ display: 'grid', gap: '20px', textAlign: 'left' }}>
            {/* 1. ভূমিকা (Role Dropdown) */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontSize: '13px', fontWeight: '700', color: '#1e293b' }}>ভূমিকা</span>
                <span style={{ fontSize: '11px', color: '#94a3b8' }}>Role</span>
              </div>
              <select
                value={role}
                onChange={e => setRole(e.target.value as any)}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  border: '1.5px solid #e2e8f0',
                  fontSize: '14px',
                  backgroundColor: '#fff',
                  color: '#1e293b',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value="super_admin">Super Admin</option>
                <option value="moderator">Moderator</option>
              </select>
            </div>

            {/* 2. অ্যাডমিন আইডি (Admin ID) */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontSize: '13px', fontWeight: '700', color: '#1e293b' }}>
                  {role === 'super_admin' ? 'অ্যাডমিন আইডি' : 'মডারেটর আইডি'}
                </span>
                <span style={{ fontSize: '11px', color: '#94a3b8' }}>Admin ID</span>
              </div>
              <input
                type="text"
                value={adminId}
                onChange={e => setAdminId(e.target.value)}
                placeholder="আপনার অ্যাডমিন আইডি"
                required
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  border: '1.5px solid #e2e8f0',
                  fontSize: '14px',
                  color: '#1e293b',
                  outline: 'none'
                }}
              />
            </div>

            {/* 3. পাসওয়ার্ড (Password with Eye Icon) */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontSize: '13px', fontWeight: '700', color: '#1e293b' }}>পাসওয়ার্ড</span>
                <span style={{ fontSize: '11px', color: '#94a3b8' }}>Password</span>
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="পাসওয়ার্ড লিখুন"
                  required
                  style={{
                    width: '100%',
                    padding: '12px 42px 12px 14px',
                    borderRadius: '10px',
                    border: '1.5px solid #e2e8f0',
                    fontSize: '14px',
                    color: '#1e293b',
                    outline: 'none'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(prev => !prev)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#64748b',
                    fontSize: '16px',
                    padding: 0
                  }}
                  title={showPassword ? 'পাসওয়ার্ড লুকান' : 'পাসওয়ার্ড দেখুন'}
                >
                  {showPassword ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>
            </div>

            {/* 4. লগইন বাটন Matching Your Red Button */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                backgroundColor: '#c8102e',
                color: '#ffffff',
                border: 'none',
                borderRadius: '10px',
                padding: '13px 20px',
                fontSize: '15px',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                marginTop: '6px'
              }}
            >
              <span>➔|</span>
              <span>{loading ? 'যাচাই হচ্ছে...' : 'লগইন করুন'}</span>
              <small style={{ fontSize: '11px', fontWeight: '400', opacity: 0.9 }}>Sign in to continue</small>
            </button>

            {/* 5. পাসওয়ার্ড ভুলে গেছেন? Link */}
            <div style={{ textAlign: 'center', marginTop: '4px' }}>
              <button
                type="button"
                onClick={() => {
                  setIsForgotMode(true)
                  setError('')
                  setSuccess('')
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#c8102e',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  padding: 0
                }}
              >
                পাসওয়ার্ড ভুলে গেছেন? <span style={{ color: '#94a3b8', fontSize: '11px' }}>Forgot password?</span>
              </button>
            </div>
          </form>
        ) : (
          /* Forgot Password Flow for Moderators */
          <div style={{ textAlign: 'left', display: 'grid', gap: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '16px', color: '#1e293b' }}>
              মডারেটর পাসওয়ার্ড রিসেট
            </h3>
            <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
              আপনার মডারেটর আইডি দিন। একটি ৬-সংখ্যার কোড সুপার অ্যাডমিনের ড্যাশবোর্ডে জমা হবে।
            </p>

            <div>
              <label style={{ fontSize: '12px', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '4px' }}>
                মডারেটর ইউজার আইডি
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  value={forgotUserId}
                  onChange={e => setForgotUserId(e.target.value)}
                  placeholder="আপনার মডারেটর আইডি"
                  style={{ flex: 1, padding: '10px 12px', borderRadius: '8px', border: '1.5px solid #e2e8f0', fontSize: '13px' }}
                />
                <button
                  type="button"
                  onClick={handleRequestCode}
                  disabled={forgotLoading}
                  style={{ background: '#2563eb', color: '#fff', border: 0, borderRadius: '8px', padding: '0 14px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}
                >
                  {forgotLoading ? '...' : 'কোড পাঠান'}
                </button>
              </div>
            </div>

            {codeSent && (
              <form onSubmit={handleResetSubmit} style={{ display: 'grid', gap: '14px', marginTop: '10px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '4px' }}>
                    ৬-সংখ্যার ওটিপি কোড (সুপার অ্যাডমিনের থেকে সংগ্রহ করুন)
                  </label>
                  <input
                    type="text"
                    value={resetCode}
                    onChange={e => setResetCode(e.target.value)}
                    placeholder="যেমন: 489210"
                    required
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1.5px solid #e2e8f0', fontSize: '14px' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '4px' }}>
                    নতুন পাসওয়ার্ড
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="কমপক্ষে ৬ অক্ষরের নতুন পাসওয়ার্ড"
                    required
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1.5px solid #e2e8f0', fontSize: '14px' }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={forgotLoading}
                  style={{ background: '#16a34a', color: '#fff', border: 0, borderRadius: '8px', padding: '12px', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}
                >
                  পাসওয়ার্ড সংরক্ষণ করুন
                </button>
              </form>
            )}

            <button
              type="button"
              onClick={() => {
                setIsForgotMode(false)
                setError('')
                setSuccess('')
              }}
              style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '13px', cursor: 'pointer', textAlign: 'center', marginTop: '8px' }}
            >
              ← লগইনে ফিরে যান
            </button>
          </div>
        )}

        {/* Bottom Footer Text Matching Original Screenshot */}
        <div
          style={{
            marginTop: '32px',
            paddingTop: '20px',
            borderTop: '1px solid #f1f5f9',
            fontSize: '11px',
            color: '#94a3b8'
          }}
        >
          © ২০২৬ দৈনিক কল্যাণ · নিরাপদ সংবাদ ব্যবস্থাপনা
        </div>
      </div>
    </div>
  )
}