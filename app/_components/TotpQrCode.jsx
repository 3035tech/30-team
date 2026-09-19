'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { copyToClipboard } from '../../lib/clipboard';
import { AppLoading, ContentEnter } from './AppLoading';
import { Icon } from './Icon';

/** QR TOTP gerado no cliente: a URI otpauth nunca é enviada a terceiros. */
export function TotpQrCode({
  otpauthUrl,
  secret,
  alt,
  scanHint,
  scanStepLabel,
  manualLabel,
  copyLabel,
  copiedLabel,
  privateHint,
  loadingLabel,
}) {
  const [dataUrl, setDataUrl] = useState('');
  const [failed, setFailed] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;
    setDataUrl('');
    setFailed(false);
    if (!otpauthUrl) {
      setFailed(true);
      return () => { active = false; };
    }
    QRCode.toDataURL(otpauthUrl, { width: 224, margin: 2, errorCorrectionLevel: 'M' })
      .then((url) => { if (active) setDataUrl(url); })
      .catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, [otpauthUrl]);

  const copySecret = async () => {
    const ok = await copyToClipboard(secret);
    setCopied(ok);
  };

  return (
    <div className="overflow-hidden rounded-card border border-ink/10 bg-surface">
      <div className="grid items-stretch sm:grid-cols-[240px_minmax(0,1fr)]">
        <div className="border-b border-ink/10 bg-white p-4 sm:border-b-0 sm:border-r">
          <p className="mb-3 mt-0 font-ui text-sm font-semibold text-ink">{scanStepLabel}</p>
          <div className="flex min-h-[208px] items-center justify-center overflow-hidden rounded-control border border-ink/8 bg-white">
            {dataUrl ? (
              <ContentEnter animKey={dataUrl}>
                <img src={dataUrl} width="208" height="208" alt={alt} className="block h-auto w-full max-w-52" />
              </ContentEnter>
            ) : failed ? (
              <p className="m-0 px-4 text-center text-xs leading-5 text-danger">{manualLabel}</p>
            ) : (
              <AppLoading variant="block" label={loadingLabel} />
            )}
          </div>
        </div>
        <div className="flex min-w-0 flex-col justify-between p-4 sm:p-5">
          <div>
            <p className="mb-4 mt-0 text-sm leading-6 text-ink-muted">{scanHint}</p>
            <p className="mb-0 flex items-start gap-2 rounded-control bg-brand-50 px-3 py-2.5 text-xs leading-5 text-brand-800">
              <Icon name="check" className="mt-0.5 h-4 w-4 shrink-0" />
              {privateHint}
            </p>
          </div>
          <details className="mt-4 rounded-control border border-ink/10 bg-canvas/50 px-3">
            <summary className="flex min-h-touch cursor-pointer items-center py-2.5 font-ui text-sm font-medium text-ink">{manualLabel}</summary>
            <div className="border-t border-ink/10 py-3">
              <code className="block break-all rounded-control bg-white px-3 py-2.5 font-mono text-xs leading-5 text-ink">{secret}</code>
              <button type="button" onClick={copySecret} className="mt-2 inline-flex min-h-touch items-center gap-2 rounded-control border border-ink/12 bg-white px-3 py-2 font-ui text-sm font-medium text-ink hover:border-brand-300 hover:text-brand-700">
                <Icon name={copied ? 'check' : 'copy'} className="h-4 w-4" />
                {copied ? copiedLabel : copyLabel}
              </button>
              <span className="sr-only" aria-live="polite">{copied ? copiedLabel : ''}</span>
            </div>
          </details>
        </div>
      </div>
    </div>
  );
}
