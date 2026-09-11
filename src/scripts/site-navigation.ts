class SiteNavigation extends HTMLElement {
  private controller?: AbortController;
  private observer?: ResizeObserver;
  private frame=0;
  connectedCallback() {
    if(this.controller)return;
    this.controller=new AbortController();
    const {signal}=this.controller;
    document.addEventListener('astro:after-swap',this.sync,{signal});
    document.addEventListener('astro:page-load',this.sync,{signal});
    this.observer=new ResizeObserver(()=>this.schedule());
    const nav=this.querySelector('nav');
    if(nav)this.observer.observe(nav);
    this.querySelectorAll('a').forEach(link=>this.observer!.observe(link));
    this.sync();
  }
  disconnectedCallback() {
    // Astro moves this persistent element during a swap, so allow it to reconnect.
    this.controller?.abort();this.controller=undefined;
    this.observer?.disconnect();cancelAnimationFrame(this.frame);
  }
  private sync=()=>{
    const path=window.location.pathname;
    this.querySelectorAll<HTMLAnchorElement>('a').forEach(link=>{
      const href=link.getAttribute('href')!;
      const active=href==='/' ? path==='/'||path.startsWith('/concept') : path===href.slice(0,-1)||path.startsWith(href);
      if(active)link.setAttribute('aria-current','page');else link.removeAttribute('aria-current');
    });
    this.schedule();
  };
  private schedule() {
    cancelAnimationFrame(this.frame);
    this.frame=requestAnimationFrame(()=>{
      const nav=this.querySelector<HTMLElement>('nav');
      const active=nav?.querySelector<HTMLElement>('[aria-current="page"]');
      if(!nav||!active)return;
      const mobile=matchMedia('(max-width:700px)').matches;
      nav.style.setProperty('--nav-x',(active.offsetLeft-(mobile?7:9))+'px');
      nav.style.setProperty('--nav-y',active.offsetTop+'px');
      nav.style.setProperty('--nav-width',(active.offsetWidth+(mobile?14:18))+'px');
      nav.style.setProperty('--nav-height',active.offsetHeight+'px');
      nav.style.setProperty('--nav-line-x',(mobile?active.offsetLeft+active.offsetWidth/2-7:-18)+'px');
      nav.style.setProperty('--nav-line-y',(mobile?active.offsetTop+active.offsetHeight-4:active.offsetTop+(active.offsetHeight-18)/2)+'px');
      const links=Array.from(nav.querySelectorAll('a'));
      nav.style.setProperty('--nav-shine',(links.indexOf(active as HTMLAnchorElement)*100/Math.max(1,links.length-1))+'%');
      nav.dataset.ready='true';
    });
  }
}
if(!customElements.get('site-navigation'))customElements.define('site-navigation',SiteNavigation);
