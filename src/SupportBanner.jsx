import { ArrowUpRight, Coffee } from '@phosphor-icons/react';
import { getKofiUrl } from './support-config';

export default function SupportBanner() {
  const url = getKofiUrl();
  const content = <><Coffee size={21} weight="duotone" aria-hidden="true"/><span>{url ? 'Ko-fiで応援' : 'Ko-fi · 準備中'}</span>{url && <ArrowUpRight size={14} aria-hidden="true"/>}</>;
  return url
    ? <a className="support-banner" href={url} target="_blank" rel="noopener noreferrer" aria-label="Ko-fiで応援（新しいタブで開きます）">{content}</a>
    : <button className="support-banner" disabled>{content}</button>;
}
