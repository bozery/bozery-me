const vertex = `attribute vec2 position;void main(){gl_Position=vec4(position,0.0,1.0);}`;
const fragment = "\nprecision mediump float;\nuniform vec2 resolution;\nuniform vec2 pointer;\nuniform float time;\nuniform float scene;\nuniform float dim;\nfloat hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}\nfloat noise(vec2 p){\n  vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);\n  return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),f.x),f.y);\n}\nfloat fbm(vec2 p){float f=0.;float a=.5;for(int i=0;i<3;i++){f+=a*noise(p);p=mat2(.8,-.6,.6,.8)*p*2.03+1.7;a*=.5;}return f;}\nvoid main(){\n  vec2 uv=gl_FragCoord.xy/resolution;\n  vec2 p=(gl_FragCoord.xy-.5*resolution)/min(resolution.x,resolution.y);\n  p += pointer*.055;\n  float t=time*.105;\n  p.x += scene*.7;\n  p.y += scene*.16;\n  vec2 q=vec2(fbm(p*1.5+vec2(t*.24,-t*.18)),fbm(p*1.6+vec2(3.8,-t*.16)));\n  vec2 w=p*2.2+q*2.1+vec2(t*.15,-t*.10);\n  for(int i=0;i<3;i++){\n    float fi=float(i)+1.;\n    w += vec2(sin(w.y*1.2+fi+t*.33),cos(w.x*.94-fi-t*.27))*.36/fi;\n  }\n  float flow=sin(w.x*1.12+w.y*.87+q.x*3.);\n  float second=sin(w.y*1.5-w.x*.32+q.y*4.+t*.10);\n  float bands=pow(max(0.,1.-abs(flow)),5.);\n  float fine=pow(max(0.,1.-abs(flow+.055*sin(w.y*6.+t))),23.);\n  float folds=pow(max(0.,1.-abs(second)),8.);\n  float region=smoothstep(-.3,.7,p.x*.48+p.y*.28+q.x*.7);\n  float depth=fbm(p*1.1+q*.4-t*.08);\n  vec3 color=mix(vec3(.010,.035,.057),vec3(.028,.108,.135),depth);\n  color += vec3(.020,.089,.099)*bands*(.45+region*.65);\n  color += vec3(.050,.203,.204)*fine*(.22+region*.76);\n  color += vec3(.024,.099,.123)*folds*.50;\n  float sheen=exp(-pow(p.y*.7-p.x*.3-.08+sin(p.x*.8+t*.18)*.23,2.)*10.);\n  color += vec3(.025,.093,.101)*sheen*region;\n  float bloom=exp(-length((p-vec2(.52,.13))*vec2(.85,1.2))*1.6);\n  color += vec3(.017,.053,.072)*bloom;\n  float darkCenter=exp(-length((uv-vec2(.5,.5))*vec2(2.0,1.3))*2.);\n  color *= 1.-dim*darkCenter*.64;\n  float vignette=1.-smoothstep(.28,.99,length((uv-.5)*vec2(1.05,.85)));\n  color *= .63+.37*vignette;\n  float grain=(hash(gl_FragCoord.xy+fract(time))-.5)*.009;\n  gl_FragColor=vec4(color+grain,1.);\n}";

class OceanBackground extends HTMLElement {
  private canvas!:HTMLCanvasElement;
  private gl:WebGLRenderingContext|null=null;
  private program:WebGLProgram|null=null;
  private uniforms:Record<string,WebGLUniformLocation|null>={};
  private ready=false;
  private initialized=false;
  private paused=false;
  private reduced=matchMedia('(prefers-reduced-motion: reduce)');
  private clock=21;
  private previous=0;
  private frame=0;
  private x=0;private y=0;private targetX=0;private targetY=0;
  private scene=0;private targetScene=0;
  private dim=0;private targetDim=0;
  connectedCallback(){
    if(this.initialized){this.updateScene();this.syncMotion();return;}
    this.initialized=true;
    this.canvas=this.querySelector('canvas')!;
    this.paused=this.reduced.matches;
    this.gl=this.canvas.getContext('webgl',{alpha:false,antialias:false,depth:false,powerPreference:'low-power'});
    this.ready=this.setup();
    this.updateScene();this.scene=this.targetScene;this.dim=this.targetDim;
    this.resize();this.syncMotion();
    if(!this.ready)this.canvas.style.display='none';
    document.addEventListener('click',event=>{
      if(!(event.target instanceof Element)||!event.target.closest('[data-motion-toggle]')||!this.isConnected||!this.ready)return;
      this.paused=!this.paused;this.syncMotion();
    });
    document.addEventListener('astro:after-swap',()=>{if(this.isConnected){this.updateScene();this.syncMotion();}});
    document.addEventListener('astro:page-load',()=>{if(this.isConnected){this.updateScene();this.syncMotion();}});
    document.addEventListener('visibilitychange',()=>this.syncMotion());
    addEventListener('resize',()=>this.resize(),{passive:true});
    addEventListener('pointermove',event=>{if(event.pointerType==='mouse'){this.targetX=event.clientX/innerWidth-.5;this.targetY=.5-event.clientY/innerHeight;}},{passive:true});
    this.reduced.addEventListener('change',()=>{this.paused=this.reduced.matches;this.syncMotion();this.draw();});
    this.canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();this.ready=false;this.canvas.style.opacity='0';this.syncMotion();});
    this.canvas.addEventListener('webglcontextrestored',()=>{this.ready=this.setup();this.canvas.style.opacity='1';this.resize();this.syncMotion();});
  }
  disconnectedCallback(){if(this.frame)cancelAnimationFrame(this.frame);this.frame=0;this.previous=0;}
  private updateScene(){
    const mode=document.body.dataset.scene;
    const states:Record<string,[number,number]>={home:[0,0],blog:[1,1],article:[1,1.25],gallery:[-.7,.35],about:[.4,.7]};
    [this.targetScene,this.targetDim]=states[mode??'home']??states.home;
    if(this.paused){this.scene=this.targetScene;this.dim=this.targetDim;this.draw();}
  }
  private shader(type:number,source:string){
    const gl=this.gl!;const s=gl.createShader(type)!;gl.shaderSource(s,source);gl.compileShader(s);
    if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){gl.deleteShader(s);return null;}return s;
  }
  private setup(){
    const gl=this.gl;if(!gl)return false;
    const vs=this.shader(gl.VERTEX_SHADER,vertex),fs=this.shader(gl.FRAGMENT_SHADER,fragment);if(!vs||!fs)return false;
    this.program=gl.createProgram()!;gl.attachShader(this.program,vs);gl.attachShader(this.program,fs);gl.linkProgram(this.program);
    if(!gl.getProgramParameter(this.program,gl.LINK_STATUS))return false;
    gl.useProgram(this.program);const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
    const position=gl.getAttribLocation(this.program,'position');gl.enableVertexAttribArray(position);gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);
    for(const name of ['resolution','pointer','time','scene','dim'])this.uniforms[name]=gl.getUniformLocation(this.program,name);
    gl.deleteShader(vs);gl.deleteShader(fs);return true;
  }
  private resize(){
    if(!this.ready||!this.gl)return;
    const ratio=Math.min(devicePixelRatio,matchMedia('(pointer:coarse)').matches?1:1.25);
    this.canvas.width=Math.round(innerWidth*ratio);this.canvas.height=Math.round(innerHeight*ratio);
    this.gl.viewport(0,0,this.canvas.width,this.canvas.height);this.draw();
  }
  private draw(){
    const gl=this.gl;if(!gl||!this.ready||gl.isContextLost())return;
    gl.uniform2f(this.uniforms.resolution,this.canvas.width,this.canvas.height);
    gl.uniform2f(this.uniforms.pointer,this.x,this.y);
    gl.uniform1f(this.uniforms.time,this.clock);gl.uniform1f(this.uniforms.scene,this.scene);gl.uniform1f(this.uniforms.dim,this.dim);gl.drawArrays(gl.TRIANGLES,0,6);
  }
  private loop=(stamp:number)=>{
    this.frame=0;
    if(!this.isConnected)return;
    const dt=this.previous?Math.min((stamp-this.previous)/1000,.05):0;this.previous=stamp;
    this.clock+=dt*(1-Math.min(this.dim,1)*.35);
    this.x+=(this.targetX-this.x)*.035;this.y+=(this.targetY-this.y)*.035;
    this.scene+=(this.targetScene-this.scene)*.025;this.dim+=(this.targetDim-this.dim)*.025;
    this.draw();
    if(!this.paused&&!document.hidden&&this.ready)this.frame=requestAnimationFrame(this.loop);
  };
  private syncMotion(){
    if(this.frame)cancelAnimationFrame(this.frame);
    this.frame=0;this.previous=0;
    if(!this.isConnected)return;
    const stopped=this.paused||!this.ready;
    document.body.dataset.paused=String(stopped);
    const button=document.querySelector<HTMLButtonElement>('[data-motion-toggle]');
    if(button){
      button.disabled=!this.ready;button.setAttribute('aria-pressed',String(stopped));
      button.querySelector('.motion-label')!.textContent=!this.ready?'静态背景':stopped?'播放动态':'暂停动态';
      button.querySelector('.pause-symbol')!.textContent=!this.ready?'—':stopped?'▷':'Ⅱ';
    }
    if(!stopped&&!document.hidden)this.frame=requestAnimationFrame(this.loop);
  }
}
if(!customElements.get('ocean-background'))customElements.define('ocean-background',OceanBackground);
