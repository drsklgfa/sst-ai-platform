import Link from 'next/link';
import { notFound } from 'next/navigation';
import { LearnerLessonClient } from '@/components/training/learner-lesson-client';
import { env } from '@/lib/env';
import { publicTrainingEnrollment } from '@/lib/training';

const contentText=(content:unknown)=>{if(!content||typeof content!=='object')return'';const value=content as Record<string,unknown>;return[value.text,value.summary,value.instructions].filter((item):item is string=>typeof item==='string'&&item.trim().length>0).join('\n\n')};
export default async function LearnerLessonPage({params}:{params:Promise<{token:string;lessonId:string}>}){
  if(!env.FEATURE_CORPORATE_UNIVERSITY)notFound(); const{token,lessonId}=await params;const enrollment=await publicTrainingEnrollment(token);if(!enrollment)notFound();
  const lesson=enrollment.course.modules.flatMap(module=>module.lessons.map(item=>({...item,moduleTitle:module.title}))).find(item=>item.id===lessonId);if(!lesson)notFound();
  const completed=enrollment.lessonProgress.some(item=>item.lessonId===lesson.id&&item.status==='COMPLETED');const text=contentText(lesson.content);
  return <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6"><Link href={`/learn/${token}`} className="text-sm font-semibold text-brand-700">← Voltar ao curso</Link><article className="mt-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><p className="text-sm text-slate-500">{lesson.moduleTitle}</p><h1 className="mt-1 text-3xl font-bold">{lesson.title}</h1><p className="mt-2 text-sm text-slate-500">{lesson.kind} · {lesson.estimatedMinutes} min{lesson.mandatory?' · obrigatória':''}</p>{lesson.description&&<p className="mt-5 text-slate-700">{lesson.description}</p>}{text&&<div className="mt-5 whitespace-pre-wrap rounded-xl bg-slate-50 p-5 text-sm leading-7 text-slate-700">{text}</div>}<div className="mt-5 flex flex-wrap gap-2">{lesson.externalUrl&&<a href={lesson.externalUrl} target="_blank" rel="noreferrer" className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold">Abrir conteúdo externo</a>}{lesson.fileId&&<a href={`/api/public/training/${token}/materials/${lesson.id}`} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold">Abrir material protegido</a>}</div><LearnerLessonClient action={`/api/public/training/${token}/lessons/${lesson.id}`} completed={completed}/></article></main>;
}
