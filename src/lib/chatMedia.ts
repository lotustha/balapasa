// Shared media helpers for the omnichannel chat pipeline.
//
// `saveFile` returns RELATIVE urls (`/uploads/images/...`). Meta's send-by-link,
// Messenger attachments, and FCM `notification.image` are all fetched by EXTERNAL
// servers, so those must be ABSOLUTE. `abs()` is the single source of truth for
// turning a stored media url into a publicly reachable one (STORE_URL is the
// guarded production host — never localhost). `downloadAndSave` pulls a remote
// media url (optionally bearer-authenticated, e.g. the WhatsApp media CDN) into
// our own `/uploads` store so the file survives Meta's short-lived URLs.

import { saveFile, type SavedFile } from './upload'
import { STORE_URL } from './config'

/** Make a stored media url absolute & publicly reachable. Pass-through for urls
 *  that are already absolute (e.g. a Messenger CDN url we chose not to mirror). */
export function abs(url: string): string {
  if (!url) return url
  if (/^https?:\/\//i.test(url)) return url
  return STORE_URL + (url.startsWith('/') ? url : '/' + url)
}

/** Download a remote media url and persist it under /uploads. `authToken` is sent
 *  as a bearer header when the source is auth-gated (WhatsApp media CDN). Returns
 *  the SavedFile ({ url, kind, mimeType, ... }) or null on any failure. */
export async function downloadAndSave(
  remoteUrl: string,
  opts: { authToken?: string; baseName?: string; contentTypeHint?: string } = {},
): Promise<SavedFile | null> {
  try {
    const res = await fetch(remoteUrl, {
      headers: opts.authToken ? { Authorization: `Bearer ${opts.authToken}` } : undefined,
    })
    if (!res.ok) {
      console.error('[chatMedia] download failed', res.status, remoteUrl.slice(0, 80))
      return null
    }
    // Prefer the response Content-Type, but fall back to the platform-provided
    // hint (e.g. WhatsApp's media metadata mime_type) when the CDN returns a
    // generic octet-stream — otherwise a video could be misfiled as an image.
    const headerType = res.headers.get('content-type')?.split(';')[0].trim()
    const contentType = (headerType && headerType !== 'application/octet-stream')
      ? headerType
      : (opts.contentTypeHint || headerType || 'application/octet-stream')
    const buf = await res.arrayBuffer()
    return await saveFile(buf, contentType, undefined, opts.baseName)
  } catch (e) {
    console.error('[chatMedia] download error', e)
    return null
  }
}
