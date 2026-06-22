// 歌詞 citation 卡片：引文置中靠左、出處置中。靜態，無互動效果。
export function LyricsCitation({ lyrics, attribution }: { lyrics: string; attribution: string }) {
  return (
    <div className="bg-card rounded-[20px] px-8 pt-7 pb-[22px] shadow-sm">
      <div className="mx-auto max-w-[30ch] text-left">
        <p className="text-card-foreground text-base leading-[1.75] whitespace-pre-line">{lyrics}</p>
      </div>
      <p className="text-muted-foreground mt-[22px] text-center text-xs font-bold tracking-[0.12em] uppercase">
        {attribution}
      </p>
    </div>
  )
}
