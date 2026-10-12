import { redirect } from 'next/navigation';
export default async function Join({searchParams}: {searchParams: Promise<Record<string,string|string[]|undefined>>}) {
  const params=await searchParams, ref=typeof params.ref==='string'?params.ref:'';
  redirect(`/hive/index.html?view=signup${ref?'&ref='+encodeURIComponent(ref):''}`);
}
