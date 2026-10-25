// Source: github.com/Thomsen92/Sir-Byte @ ea10e0c - unchanged except this header.
const clamp=x=>Math.max(0,Math.min(1,x));
const smooth=x=>{x=clamp(x);return x*x*(3-2*x);};
const pulse=(t,center,width)=>Math.exp(-(((t-center)/width)**2));

// Hand-authored phrasing along the recording, gently accented by live RMS energy.
// Media time is the clock: replay, pause and dropped frames cannot desynchronise it.
export function sampleSpeech(time,duration,energy){
 const t=Number.isFinite(time)?Math.max(0,time):0;
 const length=Number.isFinite(duration)&&duration>0?duration:14.16;
 const level=Number.isFinite(energy)?clamp(energy):0;
 const progress=clamp(t/length),p=progress*14.16;
 const weight=smooth(t/Math.min(.4,length*.16))*smooth((length-t)/Math.min(.75,length*.22));
 const greeting=pulse(p,.8,.7),explain=pulse(p,4.4,1.3),knowing=pulse(p,8,1.1),finish=pulse(p,12.7,.9);
 return {
  weight,
  pitch:-.045*greeting+.045*explain-.04*finish+level*.045*Math.sin(t*4.3),
  roll:.055*Math.sin(p*.67)+.055*knowing,
  yaw:.045*Math.sin(p*.48),
  lift:.025*greeting+.018*finish+level*.009,
  leftArm:-.12-.48*greeting-.3*finish,
  rightArm:.14+.7*explain+.55*knowing+.3*finish,
  upperLeft:.34*knowing,
  upperRight:.06*knowing,
  smile:.28*greeting+.22*finish,
  eyeScale:1+.1*greeting+.08*finish
 };
}
