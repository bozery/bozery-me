export interface Contact {
  label:string;
  value:string;
  url?:string;
  icon?:'x'|'qq'|'link';
}
export const profile={
  homeTagline:'狼在海岸奔跑',
  aboutTitle:'狼仍在他的旅途中。',
  paragraphs:[
    '喜欢唱歌，喜欢绘画，喜欢...一切会让生命流动的东西。',
    '很高兴见到你，在我海岸的一隅。',
  ],
  contactHeading:'联系我',
  contacts:[
    {label:'X / Twitter',value:'@_bozery',url:'https://x.com/_bozery',icon:'x'},
    {label:'QQ',value:'1738983866',icon:'qq'},
  ] as Contact[],
};
