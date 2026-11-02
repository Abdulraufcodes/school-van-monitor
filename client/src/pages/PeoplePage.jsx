import { useCallback, useEffect, useState } from 'react';
import { DashboardLayout } from '../layouts/DashboardLayout.jsx';
import { createSchoolStudent, createSchoolUser, getSchoolPeople } from '../services/schoolPeople.service.js';

const inputClass = 'mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-600/15';

function splitEmails(value) {
  return value.split(/[\n,;]/).map((email) => email.trim().toLowerCase()).filter(Boolean);
}

export function PeoplePage() {
  const [people, setPeople] = useState({ users: [], students: [] });
  const [kind, setKind] = useState('parent');
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '', className: '', parentEmails: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try { setPeople(await getSchoolPeople()); }
    catch (cause) { setError(cause.response?.data?.message || 'School people could not be loaded.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  async function submit(event) {
    event.preventDefault();
    setSaving(true); setError(''); setNotice('');
    try {
      if (kind === 'student') await createSchoolStudent({ name: form.name, className: form.className, parentEmails: splitEmails(form.parentEmails) });
      else await createSchoolUser({ name: form.name, email: form.email, password: form.password, phone: form.phone, role: kind });
      setForm({ name: '', email: '', password: '', phone: '', className: '', parentEmails: '' });
      setNotice(kind === 'student' ? 'Student added and linked to the listed parents.' : `${kind === 'driver' ? 'Driver' : 'Parent'} account created. Share the initial password with the account holder securely.`);
      await load();
    } catch (cause) {
      const detail = cause.response?.data?.errors?.map((item) => item.message).join(' ') || '';
      setError([cause.response?.data?.message, detail].filter(Boolean).join(' ' ) || 'The record could not be created.');
    } finally { setSaving(false); }
  }

  return <DashboardLayout title="School people">
    <section className="mb-6"><p className="text-sm font-medium text-cyan-700">School directory</p><h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">Students, parents and drivers</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Add accounts and link each student to active parent accounts from your school.</p></section>
    {error && <p className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800" role="alert">{error}</p>}
    {notice && <p className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800" role="status">{notice}</p>}
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(320px,0.8fr)_1.2fr]">
      <form onSubmit={submit} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-950">Add a record</h2>
        <label className="block text-sm font-medium text-slate-700">Record type<select className={inputClass} value={kind} onChange={(event) => { setKind(event.target.value); setError(''); }}><option value="parent">Parent account</option><option value="driver">Driver account</option><option value="student">Student</option></select></label>
        <label className="block text-sm font-medium text-slate-700">{kind === 'student' ? 'Student name' : 'Full name'}<input className={inputClass} required minLength={2} maxLength={100} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })}/></label>
        {kind !== 'student' ? <>
          <label className="block text-sm font-medium text-slate-700">Email<input className={inputClass} type="email" required maxLength={254} value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })}/></label>
          <label className="block text-sm font-medium text-slate-700">Initial password<input className={inputClass} type="password" required minLength={12} maxLength={128} autoComplete="new-password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })}/><span className="mt-1 block text-xs font-normal text-slate-500">Use at least 12 characters and share it with the account holder securely.</span></label>
          <label className="block text-sm font-medium text-slate-700">Phone (optional)<input className={inputClass} type="tel" maxLength={20} value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })}/></label>
        </> : <>
          <label className="block text-sm font-medium text-slate-700">Class (optional)<input className={inputClass} maxLength={50} value={form.className} onChange={(event) => setForm({ ...form, className: event.target.value })}/></label>
          <label className="block text-sm font-medium text-slate-700">Parent email(s)<textarea className={inputClass} required rows={3} placeholder="parent@example.com (separate multiple addresses with commas)" value={form.parentEmails} onChange={(event) => setForm({ ...form, parentEmails: event.target.value })}/><span className="mt-1 block text-xs font-normal text-slate-500">Create parent accounts first. Every address must belong to an active parent in this school.</span></label>
        </>}
        <button disabled={saving} className="w-full rounded-xl bg-cyan-700 px-4 py-3 text-sm font-semibold text-white hover:bg-cyan-800 disabled:opacity-50">{saving ? 'Saving…' : 'Add record'}</button>
      </form>
      <section className="space-y-5">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-lg font-semibold text-slate-950">Accounts</h2>{loading ? <p className="mt-4 text-sm text-slate-500" role="status">Loading accounts…</p> : people.users.length === 0 ? <p className="mt-4 text-sm text-slate-500">No parent or driver accounts yet.</p> : <div className="mt-4 overflow-x-auto"><table className="w-full text-left text-sm"><thead className="text-xs uppercase text-slate-500"><tr><th className="pb-2 pr-4">Name</th><th className="pb-2 pr-4">Email</th><th className="pb-2">Role</th></tr></thead><tbody className="divide-y divide-slate-100">{people.users.map((user) => <tr key={user._id}><td className="py-3 pr-4 font-medium">{user.name}</td><td className="break-all py-3 pr-4">{user.email}</td><td className="py-3 capitalize">{user.role}</td></tr>)}</tbody></table></div>}</div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-lg font-semibold text-slate-950">Students</h2>{loading ? <p className="mt-4 text-sm text-slate-500" role="status">Loading students…</p> : people.students.length === 0 ? <p className="mt-4 text-sm text-slate-500">No students yet.</p> : <div className="mt-4 space-y-3">{people.students.map((student) => <article key={student._id} className="rounded-xl border border-slate-100 p-4"><div className="flex flex-wrap justify-between gap-2"><h3 className="font-semibold">{student.name}</h3><span className="text-sm text-slate-500">{student.className || 'Class not set'}</span></div><p className="mt-2 text-xs uppercase tracking-wide text-slate-500">Linked parents</p><p className="mt-1 break-words text-sm text-slate-700">{student.parentIds?.map((parent) => parent.email).join(', ') || 'No linked parents'}</p></article>)}</div>}</div>
      </section>
    </div>
  </DashboardLayout>;
}
