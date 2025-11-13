'use client';

import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useState } from 'react';

export default function LoginPage() {
  const [email, setEmail] = useState('admin@demo.com');
  const [pass, setPass] = useState('demodemo');
  const [err, setErr] = useState('');

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr('');
    try {
      await signInWithEmailAndPassword(auth, email, pass);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Error de login');
    }
  }

  return (
    <div className="max-w-md mx-auto bg-white rounded-2xl shadow p-4">
      <h1 className="text-xl font-semibold mb-4">Ingresar</h1>
      <form onSubmit={onSubmit} className="space-y-3">
        <div>
          <label className="text-sm text-gray-600">Email</label>
          <input className="w-full rounded-lg border px-3 py-2" value={email} onChange={e=>setEmail(e.target.value)} />
        </div>
        <div>
          <label className="text-sm text-gray-600">Password</label>
          <input className="w-full rounded-lg border px-3 py-2" type="password" value={pass} onChange={e=>setPass(e.target.value)} />
        </div>
        {err && <p className="text-red-600 text-sm">{err}</p>}
        <button className="w-full rounded-lg border px-3 py-2">Entrar</button>
      </form>
    </div>
  );
}
