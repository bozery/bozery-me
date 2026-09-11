class ArtGallery extends HTMLElement {
  connectedCallback(){
    if(this.dataset.ready)return;this.dataset.ready='true';
    this.querySelectorAll<HTMLAnchorElement>('[data-open-art]').forEach(link=>{
      const dialog=this.querySelector<HTMLDialogElement>(`[data-art-dialog="${link.dataset.openArt}"]`)!;
      const image=dialog.querySelector<HTMLImageElement>('img')!;
      link.addEventListener('click',event=>{
        if(event.metaKey||event.ctrlKey||event.shiftKey||event.altKey||event.button!==0)return;
        event.preventDefault();
        if(!image.hasAttribute('src'))image.src=image.dataset.src!;
        dialog.showModal();dialog.scrollTop=0;
        dialog.querySelector<HTMLButtonElement>('.dialog-close')!.focus();
      });
      dialog.querySelector('.dialog-close')!.addEventListener('click',()=>dialog.close());
      dialog.addEventListener('click',event=>{
        if(event.target!==dialog)return;
        const r=dialog.getBoundingClientRect();
        if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();
      });
      dialog.addEventListener('close',()=>link.focus());
    });
  }
}
if(!customElements.get('art-gallery'))customElements.define('art-gallery',ArtGallery);
