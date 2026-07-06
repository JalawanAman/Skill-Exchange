const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET

/** True when Cloudinary env vars are set (so upload UIs can disable themselves gracefully). */
export function cloudinaryReady(): boolean {
  return Boolean(cloudName && cloudName !== 'your_cloud_name' && uploadPreset)
}

/** Unsigned client-side upload; returns the secure HTTPS URL. Throws if not configured or on failure. */
export async function uploadImage(file: File): Promise<string> {
  if (!cloudinaryReady()) throw new Error('Cloudinary is not configured')
  const fd = new FormData()
  fd.append('file', file)
  fd.append('upload_preset', uploadPreset as string)
  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: 'POST', body: fd })
  const data = await res.json()
  if (!data.secure_url) throw new Error('Upload failed')
  return data.secure_url as string
}
