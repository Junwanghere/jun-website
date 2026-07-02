// Spotify 嵌入播放器，支援播放清單或藝人頁（擇一傳入）。
export function SpotifyEmbed({
  playlistId,
  artistId,
  height = 152,
  title = 'Spotify',
}: {
  playlistId?: string
  artistId?: string
  height?: number
  title?: string
}) {
  const path = artistId ? `artist/${artistId}` : `playlist/${playlistId}`
  return (
    <iframe
      title={title}
      src={`https://open.spotify.com/embed/${path}?utm_source=generator&theme=0`}
      width="100%"
      height={height}
      style={{ borderRadius: 12 }}
      frameBorder={0}
      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
      loading="lazy"
    />
  )
}
