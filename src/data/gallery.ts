import type {ImageMetadata} from 'astro';
import {artworkInfo} from './artworks';
import {publicUrl} from './links';
const modules=import.meta.glob<{default:ImageMetadata}>('../assets/oc/oc-*.{jpg,jpeg,png,webp}',{eager:true});
const descriptions:Record<string,string>={
  'oc-01':'青蓝色的 Q 版小狼，身后有蓬松的大尾巴',
  'oc-02':'青蓝色长耳狼回头望向左侧，胸前是白色毛发',
  'oc-03':'穿着衬衫、马甲和领带的 Bozery 侧面肖像',
  'oc-04':'深蓝阴影和青色鬃毛的 Bozery 侧脸',
  'oc-05':'Q 版 Bozery 举起双爪，露出粉色肉垫',
  'oc-06':'金色眼睛的青蓝小狼微笑头像',
  'oc-07':'白色背景上的 Bozery 青蓝色侧面头像',
  'oc-08':'蓝色背景上张嘴微笑的 Q 版 Bozery',
  'oc-09':'用青蓝几何线条表现毛发的 Bozery 侧面肖像',
  'oc-10':'青蓝小狼眨眼，身旁有黄色笑脸装饰',
  'oc-11':'穿蓝色外套的 Bozery 坐着弹奏木吉他',
  'oc-12':'纸面上的青蓝狼头像，颈间戴着棕色颈饰',
  'oc-13':'站立的青蓝小狼，身后有蓬松的卷尾巴',
};
const seen=new Set<string>();
export const gallery=Object.entries(modules).sort(([a],[b])=>a.localeCompare(b,undefined,{numeric:true})).map(([file,module],index)=>{
  const id=file.split('/').pop()!.replace(/\.[^.]+$/,'');
  if(seen.has(id))throw new Error(`图集有重复编号：${id}。请给不同作品使用不同文件名。`);
  seen.add(id);
  const info=artworkInfo[id]??{};
  return {
    id,number:String(index+1).padStart(2,'0'),image:module.default,
    title:info.title?.trim()||`作品 ${String(index+1).padStart(2,'0')}`,
    alt:info.alt?.trim()||descriptions[id]||'Bozery 的 OC 作品',
    kind:info.kind,kindLabel:info.kind==='commission'?'委托':info.kind==='personal'?'自绘':undefined,
    artist:info.artist?.trim(),artistUrl:publicUrl(info.artistUrl),
    description:info.description?.trim(),date:info.date?.trim(),
  };
});
