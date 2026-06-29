
export function slugify(s: string): string {
    s = s.toLowerCase().trim()
    s = s.replace(/[^a-z0-9 -]/g, '')
    s = s.replace(/\s+/g, '-')
    s = s.replace(/-+/g, '-')
    return s
}