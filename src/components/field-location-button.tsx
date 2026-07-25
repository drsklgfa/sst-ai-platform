'use client';

import { useState } from 'react';

export function FieldLocationButton({ visitId }: { visitId: string }) {
  const [state, setState] = useState('');
  const capture = () => {
    if (!navigator.geolocation) { setState('Localização não disponível neste dispositivo.'); return; }
    setState('Obtendo localização...');
    navigator.geolocation.getCurrentPosition(async (position) => {
      const form = new FormData();
      form.set('latitude', String(position.coords.latitude));
      form.set('longitude', String(position.coords.longitude));
      form.set('accuracy', String(position.coords.accuracy));
      const response = await fetch(`/api/field-visits/${visitId}/location`, { method: 'POST', body: form });
      if (!response.ok) { setState(await response.text()); return; }
      setState('Localização registrada.');
      window.location.reload();
    }, () => setState('Não foi possível obter a localização. Verifique a permissão do navegador.'), { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 });
  };
  return <div><button type="button" onClick={capture} className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold hover:bg-slate-50">Registrar localização</button>{state && <p className="mt-1 max-w-xs text-xs text-slate-500">{state}</p>}</div>;
}
