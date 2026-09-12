// Static composition study: draw only when mounted, resized or restored.
const vertex = `attribute vec2 position;void main(){gl_Position=vec4(position,0.,1.);}`;
const fragment = `
precision highp float;
uniform vec2 resolution;
uniform float mobile;

float hash(vec2 p) {
  return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);
}
vec2 hash2(vec2 p) {
  return fract(sin(vec2(dot(p,vec2(127.1,311.7)),dot(p,vec2(269.5,183.3))))*43758.5453);
}
float noise(vec2 p) {
  vec2 i=floor(p), f=fract(p);f=f*f*(3.-2.*f);
  return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+1.),f.x),f.y);
}
float fbm(vec2 p) {
  float sum=0., strength=.5;
  for(int i=0;i<4;i++){sum+=strength*noise(p);p=mat2(.8,-.6,.6,.8)*p*2.02+2.3;strength*=.5;}
  return sum;
}
float waterLight(vec2 p) {
  vec2 cell=floor(p), local=fract(p);float first=8.,second=8.;
  for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){
    vec2 neighbor=vec2(float(x),float(y));
    vec2 offset=neighbor+.2+.6*hash2(cell+neighbor)-local;
    float d=dot(offset,offset);
    if(d<first){second=first;first=d;}else{second=min(second,d);}
  }
  return 1.-smoothstep(.015,.085,second-first);
}
void main() {
  vec2 uv=vec2(gl_FragCoord.x/resolution.x,1.-gl_FragCoord.y/resolution.y);
  vec2 p=uv*resolution/min(resolution.x,resolution.y);
  float desktopShore=1.28-.70*uv.x+.024*sin(uv.x*6.2+.3);
  float phoneShore=.91-.23*uv.x+.021*sin(uv.x*5.5);
  float shore=mix(desktopShore,phoneShore,mobile);
  shore+=(fbm(p*7.+1.7)-.5)*.016;
  float distance=uv.y-shore;
  float depth=smoothstep(.015,.78,-distance);
  vec3 deep=vec3(.095,.365,.415);
  vec3 shallow=vec3(.43,.775,.735);
  vec3 sea=mix(shallow,deep,depth);
  float seabed=fbm(p*3.4+5.);
  sea+=(seabed-.48)*vec3(.055,.105,.085);

  vec2 flow=p*13.+vec2(fbm(p*3.5),fbm(p*3.5+8.))*2.8;
  flow+=vec2(sin(flow.y*.85+sin(flow.x*.7)),cos(flow.x*.75+cos(flow.y*.65)))*.6;
  float caustic=waterLight(flow);
  float ripples=pow(.5+.5*sin(p.y*54.+p.x*21.+fbm(p*9.)*7.),10.);
  float transparency=1.-smoothstep(.06,.66,-distance);
  sea+=vec3(.17,.22,.17)*caustic*(.025+.25*transparency);
  sea+=vec3(.05,.09,.08)*ripples*(.15+.45*transparency);
  sea=mix(sea,vec3(.64,.81,.69),.2*(1.-smoothstep(.005,.075,-distance)));

  float sandNoise=fbm(p*14.);
  vec3 drySand=vec3(.89,.845,.73)+(sandNoise-.5)*.038;
  vec3 wetSand=vec3(.68,.715,.62)+(sandNoise-.5)*.032;
  float dry=smoothstep(.015,.09,distance);
  vec3 sand=mix(wetSand,drySand,dry);
  sand+=(hash(gl_FragCoord.xy)-.5)*.026;
  vec3 color=mix(sea,sand,smoothstep(-.002,.005,distance));

  // Irregular foam crest, dissolving bubbles and a fainter incoming ripple.
  float edge=distance+.012+(noise(p*62.)-.5)*.006;
  float crest=1.-smoothstep(.0015,.0055,abs(edge));
  float wash=(1.-smoothstep(.006,.032,abs(edge+.009)))*smoothstep(.44,.74,fbm(p*85.));
  float lace=(1.-smoothstep(.008,.04,abs(edge+.013)))*smoothstep(.78,.94,noise(p*220.));
  float foam=clamp(crest*.68+wash*.38+lace*.27,0.,.88);
  color=mix(color,vec3(.96,.985,.91),foam);
  float incoming=distance+.105+(fbm(p*8.)-.5)*.025;
  float rippleEdge=(1.-smoothstep(.001,.0045,abs(incoming)))*(.13+.13*noise(p*37.));
  color=mix(color,vec3(.84,.95,.87),rippleEdge*(1.-dry));
  vec2 copyOffset=(uv-vec2(.21,.48))*vec2(2.8,1.7);
  float copyShade=exp(-dot(copyOffset,copyOffset));
  color*=1.-copyShade*.10*(1.-smoothstep(-.03,.04,distance));
  color+=(hash(gl_FragCoord.xy+11.)-.5)*.003;
  gl_FragColor=vec4(color,1.);
}
`;

class CoastBackground extends HTMLElement {
  private canvas!: HTMLCanvasElement;
  private gl: WebGLRenderingContext | null = null;
  private program?: WebGLProgram;
  private buffer?: WebGLBuffer;
  private observer?: ResizeObserver;
  private controller?: AbortController;

  connectedCallback() {
    if(this.controller)return;
    this.controller=new AbortController();
    this.canvas=this.querySelector('canvas')!;
    this.gl=this.canvas.getContext('webgl',{alpha:false,antialias:false,depth:false,powerPreference:'low-power'});
    this.setup();
    this.observer=new ResizeObserver(()=>this.draw());
    this.observer.observe(this);
    this.canvas.addEventListener('webglcontextlost',event=>{
      event.preventDefault();delete this.dataset.rendered;
    },{signal:this.controller.signal});
    this.canvas.addEventListener('webglcontextrestored',()=>this.setup(),{signal:this.controller.signal});
  }

  disconnectedCallback() {
    this.observer?.disconnect();this.controller?.abort();this.controller=undefined;
    if(this.program)this.gl?.deleteProgram(this.program);
    if(this.buffer)this.gl?.deleteBuffer(this.buffer);
    this.program=undefined;this.buffer=undefined;
  }

  private setup() {
    const gl=this.gl;if(!gl)return;
    const shaders=[this.shader(gl.VERTEX_SHADER,vertex),this.shader(gl.FRAGMENT_SHADER,fragment)];
    if(shaders.some(shader=>!shader)){shaders.forEach(shader=>shader&&gl.deleteShader(shader));return;}
    const program=gl.createProgram();if(!program)return;
    shaders.forEach(shader=>gl.attachShader(program,shader!));gl.linkProgram(program);
    shaders.forEach(shader=>gl.deleteShader(shader!));
    if(!gl.getProgramParameter(program,gl.LINK_STATUS)){gl.deleteProgram(program);return;}
    this.program=program;gl.useProgram(program);
    this.buffer=gl.createBuffer()!;gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
    const position=gl.getAttribLocation(program,'position');gl.enableVertexAttribArray(position);gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);
    this.draw();
  }

  private shader(type:number,source:string) {
    const gl=this.gl!,shader=gl.createShader(type);if(!shader)return null;
    gl.shaderSource(shader,source);gl.compileShader(shader);
    if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS)){gl.deleteShader(shader);return null;}
    return shader;
  }

  private draw() {
    const gl=this.gl;if(!gl||!this.program||gl.isContextLost())return;
    const scale=Math.min(devicePixelRatio,1.5);
    this.canvas.width=Math.round(this.clientWidth*scale);this.canvas.height=Math.round(this.clientHeight*scale);
    gl.viewport(0,0,this.canvas.width,this.canvas.height);gl.useProgram(this.program);
    gl.uniform2f(gl.getUniformLocation(this.program,'resolution'),this.canvas.width,this.canvas.height);
    gl.uniform1f(gl.getUniformLocation(this.program,'mobile'),matchMedia('(max-width:700px)').matches?1:0);
    gl.drawArrays(gl.TRIANGLES,0,6);this.dataset.rendered='true';
  }
}
if(!customElements.get('coast-background'))customElements.define('coast-background',CoastBackground);
