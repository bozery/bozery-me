import type {CollectionEntry} from 'astro:content';
type Post=CollectionEntry<'blog'>;
const yearFormat=new Intl.DateTimeFormat('en',{year:'numeric',timeZone:'Asia/Shanghai'});
/** 年份与页面日期统一按北京时间计算，年份和文章均倒序。 */
export function groupPostsByYear(posts:Post[]){
  const grouped=new Map<number,Post[]>();
  const sorted=[...posts].sort((a,b)=>b.data.pubDate.valueOf()-a.data.pubDate.valueOf());
  for(const post of sorted){
    const year=Number(yearFormat.format(post.data.pubDate));
    const bucket=grouped.get(year)??[];
    bucket.push(post);grouped.set(year,bucket);
  }
  return [...grouped.entries()].sort(([a],[b])=>b-a).map(([year,entries])=>({year,posts:entries}));
}
