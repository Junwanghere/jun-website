export function SpotifyEmbed({
  playlistId,
  height = 152,
  title = 'Spotify 播放清單',
}: {
  playlistId: string
  height?: number
  title?: string
}) {
  return (
    <iframe
      title={title}
      src={`https://open.spotify.com/embed/playlist/${playlistId}?utm_source=generator&theme=0`}
      width="100%"
      height={height}
      style={{ borderRadius: 12 }}
      frameBorder={0}
      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
      allowFullScreen
      loading="lazy"
    />
  )
}
