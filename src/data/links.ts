export function publicUrl(value?: string, contact=false): string | undefined {
  if(!value)return undefined;
  try { const url=new URL(value);const allowed=contact?['https:','http:','mailto:','tel:']:['https:','http:'];return allowed.includes(url.protocol)?url.href:undefined; }
  catch{return undefined;}
}
