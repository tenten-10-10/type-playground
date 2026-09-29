import { useRef, useState } from 'react';
import { ArrowCounterClockwise, ArrowUpRight, Check, Code, Cursor, DownloadSimple, Pause, Play, TextT, X } from '@phosphor-icons/react';
import GlyphBanner from './GlyphBanner';

const defaults = { parts: [{text:'OpenAI',color:'#ffffff'},{text:'DevDay',color:'#00bf41'},{text:'2026',color:'#9747ff'}],caption:'Tuesday, September 29, 2026',background:'#000000',showBrackets:true,effect:'anchors',intensity:1 };
const presets = [
 {name:'Original', colors:['#ffffff','#00bf41','#9747ff'],background:'#000000'},
 {name:'Electric', colors:['#f0f3ee','#d6ff62','#a5a9ff'],background:'#141813'},
 {name:'Paper', colors:['#161a18','#166650','#df492e'],background:'#eeeae1'},
 {name:'Dusk', colors:['#f9e9dc','#f99e70','#cea3f5'],background:'#271c29'}
];

export function App() {
 const [config,setConfig] = useState(defaults);
 const [playing,setPlaying] = useState(false);
 const [ready,setReady] = useState(false);
 const [error,setError] = useState('');
 const [notice,setNotice] = useState('');
 const [exporting,setExporting] = useState(false);
 const [codeOpen,setCodeOpen] = useState(false);
 const banner = useRef(null);
 const toastTimer = useRef(null);
 const update = (key,value) => setConfig(old=>({...old,[key]:value}));
 const updatePart = (index,key,value) => setConfig(old=>({...old,parts:old.parts.map((part,i)=>i===index?{...part,[key]:value}:part)}));
 const toast = (message)=>{setNotice(message);clearTimeout(toastTimer.current);toastTimer.current=setTimeout(()=>setNotice(''),3600)};
 const reset=()=>{setConfig({...defaults,parts:defaults.parts.map(p=>({...p}))});setPlaying(false);toast('最初のデザインに戻しました')};
 const download = (blob,filename)=>{const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),2000)};
 const exportPng = async()=>{if(!banner.current)return;setExporting(true);try{const blob=await banner.current.exportPng();if(!blob)throw new Error();download(blob,'type-playground.png');toast('PNGを書き出しました')}catch{toast('画像を書き出せませんでした。もう一度お試しください。')}finally{setExporting(false)}};
 const exportSvg = ()=>{try{download(new Blob([banner.current.exportSvg()],{type:'image/svg+xml'}),'type-playground.svg');toast('SVGを書き出しました')}catch{toast('SVGを書き出せませんでした。')}};
 const snippet = JSON.stringify(config,null,2);
 const copyConfig=async()=>{try{await navigator.clipboard.writeText(snippet);toast('設定をコピーしました')}catch{toast('コピーできませんでした。表示された設定を選択してコピーしてください。')}};
 return <div className="app-shell">
  <header className="topbar">
   <a className="wordmark" href="#" aria-label="Type Playground ホーム"><TextT size={22} weight="bold"/><span>TYPE<span className="wordmark-light">PLAYGROUND</span></span><span className="version">01</span></a>
   <div className="header-actions"><span className="local-label">文字で、あそぼう。</span><button className="button export-button" onClick={exportPng} disabled={!ready||exporting}><DownloadSimple size={16}/>{exporting?'書き出し中…':'PNGを書き出す'}</button></div>
  </header>
  <main>
   <section className="preview-section" aria-label="インタラクティブプレビュー">
    <div className="section-top"><div className="eyebrow"><span className="status-dot"/> INTERACTIVE TYPE EXPLORER</div><span className="edition">YOUR WORDS. YOUR PLAYGROUND.</span></div>
    <div className="banner-frame" style={{background:config.background}}>
     <GlyphBanner ref={banner} {...config} playing={playing} onReady={()=>setReady(true)} onError={(message)=>setError(message)}/>
     {!ready&&!error&&<div className="loading">フォントを準備しています…</div>}
     {error&&<div className="loading error">{error}<button onClick={()=>location.reload()}>再読み込み</button></div>}
    </div>
    <div className="preview-footer"><p><Cursor size={16}/><span>文字にカーソルを重ねてみてください。<span className="mobile-hint">タップでも遊べます。</span></span></p><button className={'quiet-button '+(playing?'is-playing':'')} onClick={()=>setPlaying(p=>!p)} aria-pressed={playing} disabled={!ready}>{playing?<Pause size={15} weight="fill"/>:<Play size={15} weight="fill"/>}{playing?'デモを停止':'動きを見る'}</button></div>
   </section>
   <section className="editor" aria-labelledby="editor-title">
    <div className="editor-heading"><div><div className="eyebrow muted">MAKE IT YOURS</div><h1 id="editor-title">ことばを変える。印象が変わる。</h1><p>好きな文字と色で、あなただけのタイポグラフィに。</p></div><button className="quiet-button reset" onClick={reset}><ArrowCounterClockwise size={17}/>リセット</button></div>
    <div className="text-grid">
      {config.parts.map((part,i)=><div className="text-field" key={i}>
        <div className="field-heading"><label htmlFor={'text-'+i}>TEXT <span>0{i+1}</span></label><span className="field-description">{['はじめのことば','アクセント','最後のことば'][i]}</span></div>
        <div className="text-input-wrap"><input id={'text-'+i} value={part.text} maxLength={40} spellCheck={false} autoComplete="off" placeholder={['OpenAI','DevDay','2026'][i]} onChange={e=>updatePart(i,'text',e.target.value)}/></div>
        <div className="field-bottom"><label className="color-control"><input type="color" aria-label={'テキスト'+(i+1)+'の色'} value={part.color} onChange={e=>updatePart(i,'color',e.target.value)}/><span>{part.color.toUpperCase()}</span></label><span className="character-count">{Array.from(part.text).length} / 40</span></div>
      </div>)}
    </div>
    <div className="caption-row"><label htmlFor="caption">キャプション<span>上に添えるひとこと</span></label><input id="caption" value={config.caption} maxLength={100} onChange={e=>update('caption',e.target.value)} placeholder="日付やメッセージを入力"/><label className="checkbox"><input type="checkbox" checked={config.showBrackets} onChange={e=>update('showBrackets',e.target.checked)}/><span>最後の文字を [ ] で囲む</span></label></div>
    <div className="design-controls">
     <div className="control-group palette-group"><h2>カラーパレット</h2><div className="palettes">{presets.map(p=><button key={p.name} className={'palette '+(config.background===p.background&&config.parts.every((v,i)=>v.color===p.colors[i])?'selected':'')} aria-label={p.name+' パレット'} aria-pressed={config.background===p.background&&config.parts.every((v,i)=>v.color===p.colors[i])} onClick={()=>setConfig(c=>({...c,background:p.background,parts:c.parts.map((part,i)=>({...part,color:p.colors[i]}))}))}><span className="palette-dots">{p.colors.map((c,i)=><i key={i} style={{background:c}}/>)}</span><span>{p.name}</span></button>)}</div></div>
     <div className="control-group"><h2>ホバーの表情</h2><div className="segmented">{[{id:'anchors',label:'輪郭 ＋ 点'},{id:'outline',label:'輪郭のみ'},{id:'fill',label:'塗りつぶし'}].map(e=><button key={e.id} className={config.effect===e.id?'active':''} aria-pressed={config.effect===e.id} onClick={()=>update('effect',e.id)}>{e.label}</button>)}</div></div>
     <div className="control-group background-group"><h2>背景色</h2><label className="color-control background-color"><input type="color" aria-label="背景色" value={config.background} onChange={e=>update('background',e.target.value)}/><span>{config.background.toUpperCase()}</span></label></div>
    </div>
   </section>
   <footer className="page-footer"><p>小さな動きで、ことばに個性を。</p><div><button className="quiet-button" onClick={()=>setCodeOpen(true)}><Code size={15}/>設定を見る</button><button className="quiet-button" onClick={exportSvg} disabled={!ready}>SVGで保存<ArrowUpRight size={15}/></button></div></footer>
  </main>
  {notice&&<div className="toast" role="status"><Check size={17}/>{notice}</div>}
  {codeOpen&&<div className="modal-backdrop" onClick={()=>setCodeOpen(false)}><section role="dialog" aria-modal="true" aria-labelledby="config-title" className="config-dialog" onClick={e=>e.stopPropagation()} onKeyDown={e=>{if(e.key==='Escape'){e.stopPropagation();setCodeOpen(false)}if(e.key==='Tab'){const nodes=e.currentTarget.querySelectorAll('button,textarea');const first=nodes[0],last=nodes[nodes.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}}}}><header><h2 id="config-title">デザインの設定</h2><button className="icon-button" aria-label="閉じる" onClick={()=>setCodeOpen(false)} autoFocus><X size={20}/></button></header><p>現在の文字・色・エフェクトの設定です。</p><textarea aria-label="JSON設定" readOnly value={snippet}/><button className="button export-button" onClick={copyConfig}>設定をコピー</button></section></div>}
 </div>
}
