'use client';
import { useEffect, useState } from 'react';

export function LearnerLessonClient({ action, completed }: { action: string; completed: boolean }) {
  const [elapsed, setElapsed] = useState(0); const [saving, setSaving] = useState(false);
  useEffect(() => {
    let lastSent = Date.now();
    const display = window.setInterval(() => setElapsed(Math.floor((Date.now() - lastSent) / 1000)), 1000);
    const heartbeat = window.setInterval(async () => {
      const now = Date.now(); const seconds = Math.max(1, Math.round((now - lastSent) / 1000)); lastSent = now; setElapsed(0);
      const body = new FormData(); body.set('completed', 'false'); body.set('activeSeconds', String(seconds));
      try { await fetch(action, { method: 'POST', body, redirect: 'manual', keepalive: true }); } catch { /* próxima interação repete o registro */ }
    }, 60_000);
    return () => { window.clearInterval(display); window.clearInterval(heartbeat); };
  }, [action]);
  return <form action={action} method="post" onSubmit={() => { setSaving(true); }} className="mt-5 flex flex-wrap items-center gap-3">
    <input type="hidden" name="completed" value="true"/><input type="hidden" name="activeSeconds" value={Math.max(1,elapsed)}/>
    <button type="submit" disabled={completed||saving} className="rounded-xl bg-brand-600 px-4 py-2.5 font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300">{completed?'Aula concluída':saving?'Salvando...':'Concluir aula'}</button>
    <span className="text-xs text-slate-500">Tempo ativo nesta abertura: {Math.floor(elapsed/60)}m {elapsed%60}s</span>
  </form>;
}
