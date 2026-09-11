export interface ArtworkInfo {
  title?: string;
  /** commission = 委托；personal = 自绘。不确定时不要填写。 */
  kind?: 'commission' | 'personal';
  artist?: string;
  artistUrl?: string;
  description?: string;
  /** 作品日期，可写 2026-09-11 或 2026-09。 */
  date?: string;
  /** 给无法看到图片的读者的画面描述。 */
  alt?: string;
}

/**
 * 左边的键对应 src/assets/oc/ 里的文件名（不含扩展名）。
 * 未填写的字段不会显示占位文字，也不会推断画师或作品归属。
 * 填写示例（仅为代码示例，不会出现在网站上）：
 * 'oc-01': { title: '标题', kind: 'commission', artist: '画师名', artistUrl: 'https://画师主页', description: '作品说明' }
 */
export const artworkInfo: Record<string, ArtworkInfo> = {
  'oc-01': {},
  'oc-02': {},
  'oc-03': {},
  'oc-04': {},
  'oc-05': {},
  'oc-06': {},
  'oc-07': {},
  'oc-08': {},
  'oc-09': {},
  'oc-10': {},
  'oc-11': {},
  'oc-12': {},
  'oc-13': {},
};
