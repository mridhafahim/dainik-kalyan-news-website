// 'use client'
// import { useEffect, useState } from 'react'
// const permissions = ['news:read','news:write','news:publish']
// export default function UsersPage() { const [users,setUsers]=useState<any[]>([]); const [message,setMessage]=useState(''); const [userId,setUserId]=useState(''); const [selected,setSelected]=useState<string[]>(['news:read']); const load=()=>fetch('/api/admin/users').then(r=>r.ok?r.json():Promise.reject(new Error('অনুমোদিত নয়'))).then(d=>setUsers(d.users)).catch(e=>setMessage(e.message)); useEffect(() => { void load() }, []); async function create(){const r=await fetch('/api/admin/users',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({userId,permissions:selected})});const d=await r.json();setMessage(r.ok?`একবারের পাসওয়ার্ড: ${d.temporaryPassword} · ID: ${d.user.userId}`:d.error||'তৈরি ব্যর্থ');if(r.ok){setUserId('');setSelected(['news:read']);void load()}} async function toggle(user:any){const r=await fetch('/api/admin/users',{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({id:user.id,status:user.status==='active'?'suspended':'active'})});const d=await r.json();setMessage(r.ok?'স্ট্যাটাস আপডেট হয়েছে':d.error||'আপডেট ব্যর্থ');if(r.ok)void load()} return <section className="admin-section"><div className="section-heading"><div><span className="eyebrow">Super Admin</span><h1>মডারেটর অ্যাকাউন্ট</h1><p>মডারেটর তৈরি, অনুমতি এবং অ্যাক্সেস নিয়ন্ত্রণ করুন।</p></div></div>{message&&<p role="status" className="form-message">{message}</p>}<div className="admin-card"><h2>নতুন মডারেটর</h2><div className="admin-form-row"><input value={userId} onChange={e=>setUserId(e.target.value)} placeholder="User ID (ঐচ্ছিক)"/><button onClick={create}>তৈরি করুন</button></div><fieldset><legend>অনুমতি</legend>{permissions.map(permission=><label key={permission}><input type="checkbox" checked={selected.includes(permission)} onChange={e=>setSelected(e.target.checked?[...selected,permission]:selected.filter(item=>item!==permission))}/>{permission}</label>)}</fieldset></div><div className="admin-card"><h2>মডারেটর তালিকা</h2>{users.length ? users.map(user=><div className="admin-list-row" key={user.id}><span><strong>{user.userId}</strong><small>{user.role} · {user.permissions?.join(', ')}</small></span><span><b>{user.status}</b><button onClick={()=>toggle(user)}>{user.status==='active'?'Suspend':'Activate'}</button></span></div>) : <p>কোনো মডারেটর নেই বা তালিকা লোড হয়নি।</p>}</div></section> }



'use client'

import { useEffect, useState } from 'react'
import type React from 'react'
import { PageTitle } from '@/components/admin/AdminUi'

type AdminUser = {
  id: number
  userId: string
  role: string
  status: string
  permissions: string[]
  createdAt: string
  lastLoginAt: string | null
}

const ALL_PERMISSIONS = [
  { id: 'news:read', label: 'সংবাদ দেখা (Read)' },
  { id: 'news:write', label: 'সংবাদ তৈরি ও এডিট (Write)' },
  { id: 'epaper:read', label: 'ই-পেপার দেখা (Read)' },
  { id: 'epaper:write', label: 'ই-পেপার আপলোড ও ম্যাপিং (Write)' },
  { id: 'ticker:write', label: 'টিকার পরিচালনা (Ticker)' }
]

export default function UsersAdmin() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [userId, setUserId] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('moderator')
  const [permissions, setPermissions] = useState<string[]>([
    'news:read',
    'news:write',
    'epaper:read',
    'epaper:write'
  ])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  async function loadUsers() {
    try {
      const res = await fetch('/api/admin/users')
      const data = await res.json()
      if (res.ok) {
        setUsers(data.users || [])
      } else {
        setMessage({ text: data.error || 'ইউজার তালিকা লোড ব্যর্থ', type: 'error' })
      }
    } catch {
      setMessage({ text: 'সার্ভারের সাথে সংযোগ ব্যর্থ', type: 'error' })
    }
  }

  useEffect(() => {
    void loadUsers()
  }, [])

  function togglePermission(permId: string) {
    setPermissions(prev =>
      prev.includes(permId) ? prev.filter(p => p !== permId) : [...prev, permId]
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!userId.trim() || !password.trim()) {
      setMessage({ text: 'ইউজার আইডি ও পাসওয়ার্ড আবশ্যক', type: 'error' })
      return
    }

    setLoading(true)
    setMessage(null)

    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, password, role, permissions })
      })

      const data = await res.json()

      if (res.ok) {
        setMessage({ text: '✅ নতুন মডারেটর সফলভাবে তৈরি হয়েছে!', type: 'success' })
        setUserId('')
        setPassword('')
        void loadUsers()
      } else {
        setMessage({ text: data.error || 'মডারেটর তৈরি ব্যর্থ', type: 'error' })
      }
    } catch {
      setMessage({ text: 'সার্ভারে সংযোগ ব্যর্থ হয়েছে', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('আপনি কি এই মডারেটরের একাউন্ট মুছে ফেলতে চান?')) return
    try {
      const res = await fetch(`/api/admin/users?id=${id}`, { method: 'DELETE' })
      if (res.ok) {
        setMessage({ text: 'একাউন্ট সফলভাবে ডিলিট হয়েছে', type: 'success' })
        setUsers(prev => prev.filter(u => u.id !== id))
      }
    } catch {
      setMessage({ text: 'ডিলিট করতে সমস্যা হয়েছে', type: 'error' })
    }
  }

  return (
    <>
      <PageTitle
        title="মডারেটর ও ইউজার ম্যানেজমেন্ট"
        subtitle="সুপার অ্যাডমিন হিসেবে নতুন মডারেটর নিয়োগ দিন এবং রোল পারমিশন নির্ধারণ করুন।"
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 420px) 1fr', gap: 24, marginTop: 20 }}>
        {/* Create Moderator Form */}
        <section className="admin-panel">
          <h2 style={{ fontSize: 18, marginBottom: 14 }}>নতুন মডারেটর তৈরি করুন</h2>

          {message && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: 8,
                marginBottom: 16,
                fontSize: 14,
                fontWeight: 600,
                background: message.type === 'success' ? '#dcfce7' : '#fee2e2',
                color: message.type === 'success' ? '#166534' : '#991b1b',
                border: `1px solid ${message.type === 'success' ? '#86efac' : '#fca5a5'}`
              }}
            >
              {message.text}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 14 }}>
            <label style={{ display: 'grid', gap: 6, fontWeight: 600, fontSize: 13 }}>
              ইউজার আইডি / ইউজারনেম *
              <input
                type="text"
                value={userId}
                onChange={e => setUserId(e.target.value)}
                placeholder="যেমন: fahim_mod, sub_editor"
                required
                style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1' }}
              />
            </label>

            <label style={{ display: 'grid', gap: 6, fontWeight: 600, fontSize: 13 }}>
              পাসওয়ার্ড *
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="কমপক্ষে ৬ অক্ষরের পাসওয়ার্ড"
                required
                style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1' }}
              />
            </label>

            <label style={{ display: 'grid', gap: 6, fontWeight: 600, fontSize: 13 }}>
              ভূমিকা (Role)
              <select
                value={role}
                onChange={e => setRole(e.target.value)}
                style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1' }}
              >
                <option value="moderator">মডারেটর (Moderator)</option>
                <option value="super_admin">সুপার অ্যাডমিন (Super Admin)</option>
              </select>
            </label>

            <div style={{ display: 'grid', gap: 8 }}>
              <span style={{ fontWeight: 600, fontSize: 13 }}>পারমিশন নির্ধারণ:</span>
              {ALL_PERMISSIONS.map(p => (
                <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={permissions.includes(p.id)}
                    onChange={() => togglePermission(p.id)}
                  />
                  {p.label}
                </label>
              ))}
            </div>

            <button
              type="submit"
              className="button button-primary"
              disabled={loading}
              style={{ padding: '10px', fontSize: 14, fontWeight: 700, marginTop: 6 }}
            >
              {loading ? 'তৈরি হচ্ছে...' : 'মডারেটর একাউন্ট তৈরি করুন'}
            </button>
          </form>
        </section>

        {/* Existing Users List */}
        <section className="admin-panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ fontSize: 18, margin: 0 }}>সকল অ্যাডমিন ও মডারেটর ({users.length}জন)</h2>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                  <th style={{ padding: '10px 12px' }}>ইউজার আইডি</th>
                  <th style={{ padding: '10px 12px' }}>ভূমিকা (Role)</th>
                  <th style={{ padding: '10px 12px' }}>স্ট্যাটাস</th>
                  <th style={{ padding: '10px 12px' }}>অনুমতি (Permissions)</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right' }}>অ্যাকশন</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '10px 12px', fontWeight: 700 }}>{u.userId}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <span className={`status-pill ${u.role === 'super_admin' ? 'status-published' : 'status-draft'}`}>
                        {u.role === 'super_admin' ? 'Super Admin' : 'Moderator'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', color: '#16a34a', fontWeight: 600 }}>● {u.status}</td>
                    <td style={{ padding: '10px 12px', fontSize: 12, color: '#64748b' }}>
                      {Array.isArray(u.permissions) ? u.permissions.join(', ') : 'সকল অনুমতি'}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                      <button
                        type="button"
                        onClick={() => handleDelete(u.id)}
                        style={{
                          background: '#fee2e2',
                          color: '#dc2626',
                          border: 0,
                          padding: '4px 10px',
                          borderRadius: 4,
                          cursor: 'pointer',
                          fontSize: 12,
                          fontWeight: 600
                        }}
                      >
                        মুছুন
                      </button>
                    </td>
                  </tr>
                ))}
                {!users.length && (
                  <tr>
                    <td colSpan={5} style={{ padding: 24, textAlign: 'center', color: '#64748b' }}>
                      কোনো মডারেটর পাওয়া যায়নি।
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </>
  )
}