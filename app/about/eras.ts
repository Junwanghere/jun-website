// 音樂歷程各時期的共用資料。
// 文字由本人提供，Claude 只做分段與輕微潤飾；細節以本人為準。

export type EraPhoto = {
  src: string
  alt: string
  position?: string // 裁切對齊(Tailwind object-position class)，預設置中
}

export type EraLink = {
  kind: 'covers' | 'youtube' | 'instagram' | 'threads' | 'streetvoice'
  href: string
  label: string
}

export type Era = {
  id: string
  period: string // 時期標籤（年份）
  title: string
  body: string[]
  photos: EraPhoto[]
  note?: string // 備註：私房小註記
  links?: EraLink[]
  spotifyArtist?: string // Spotify 藝人頁 ID，有的話在連結下方嵌入播放器
}

export const ERAS: Era[] = [
  {
    id: 'nanmen',
    period: '2012 – 2014',
    title: '南門國中吉他社',
    body: [
      '國中參加吉他社，是我第一次握起吉他的時候。因為學過鋼琴、小提琴，上手稍微快一點——跟舅舅借了一把吉他，就開起了彈唱之旅。',
      '雖然是吉他社，但那時候和社團同學組了樂團，cover 了很多五月天的歌，大多在校內表演。後來又因緣際會認識了校外的老師，跟很多大朋友一起 cover 酷酷的歌。也是那時候，我體會到表演真是一件好快樂的事。',
    ],
    photos: [{ src: '/about/nanmen.jpg', alt: '國中時抱著木吉他，在戶外仰頭', position: 'object-top' }],
    note: '最喜歡的樂團是五月天；第一首練成的歌是〈擁抱〉，第一首最想練成的是張懸的〈寶貝〉；最討厭封閉和弦。',
  },
  {
    id: 'chengkung',
    period: '2015 – 2016',
    title: '成功高中音創社',
    body: [
      '有了國中的經驗，高中想繼續享受玩樂團的感覺，就加入了酷酷集團成功音創（那時候也有我國中很崇拜的學長在裡面）。這段期間是我的獨立樂團與金屬音樂啟蒙期。',
      '學長每週都要我們帶筆記本，把樂團抄下來回去聽，因此聽了好多好有意思的音樂（永遠記得第一次聽到 Cannibal Corpse 有多震驚）。後來想發出那樣帥氣的聲音，就去上了半年課，學成以後開了很多當時很喜歡的歌，最有印象的是瘋音盃的 recreant。',
      '這段期間也有很多很棒的回憶：到友校表演、看了很多樂團專場、去了颱風肆虐後的山海屯——是一段被音樂充滿的日子，現在回想很多畫面還歷歷在目。',
    ],
    photos: [
      { src: '/about/chengkung-3.jpg', alt: '穿著成功高中制服，在麥克風前演唱' },
      { src: '/about/chengkung-1.jpg', alt: '成功高中音創社的夥伴們，手上拿著獎狀' },
      { src: '/about/chengkung-2.jpg', alt: '瘋音盃演出，站在音箱上對著滿場觀眾唱歌' },
    ],
    note: '喜歡的樂團：Bring Me the Horizon、We Came As Romans、Chelsea Grin、Whitechapel、Crystal Lake、While She Sleeps、先知瑪莉、麋先生、Hello Nico、草東沒有派對、Lyra、粉紅噪音、隨性、胖虎、Beyond Cure、toe、Polyphia、Born of Osiris… 太多了。',
    links: [
      { kind: 'youtube', href: 'https://www.youtube.com/watch?v=Sh0ROoIDMr8', label: 'Chelsea Grin - Recreant' },
    ],
  },
  {
    id: 'ntu-guitar',
    period: '2018',
    title: '臺大吉他社',
    body: [
      '上大學以後，想不起來轉捩點是什麼，突然很想要有更多自彈自唱的機會，於是加入了吉他社，也買了一把 Crafter。',
      '吉他彈奏應該是有些許進步（嗎？），也在那時候認識了很厲害的吉他夥伴，一起報名了師韻獎和北醫金弦，拿了些名次。',
    ],
    photos: [{ src: '/about/ntu-guitar-2.jpg', alt: '暖色燈光下彈吉他' }],
    note: '喜歡的歌手：Phum Viphurit、柯智棠、謝震廷、郭頂。',
    links: [
      { kind: 'youtube', href: 'https://www.youtube.com/watch?v=7E0SOhfcYFM', label: '柯智棠 - It Was May' },
      { kind: 'youtube', href: 'https://www.youtube.com/watch?v=kOPpxQv9u_A', label: '理想混蛋 - 行星' },
    ],
  },
  {
    id: 'fresco',
    period: '2019 – 2021',
    title: 'Frescø Band',
    body: [
      '因為高中音創社朋友的引薦，認識了台中熱音圈的朋友，以主唱身份加入了前衛金屬團 Frescø。很熱血的一段歷程——北中來回跑練團、到廢墟拍 MV、拿了專輯補助發了一張專輯、辦了北中南專場。',
      '改編一些當下流行的歌，升級了音響、麥克風，更貼近了真正做音樂這件事，也認識了好多好厲害的音樂人。',
    ],
    photos: [
      { src: '/about/fresco-1.jpg', alt: 'Frescø 樂團演出，紅藍舞台燈下的 live' },
      { src: '/about/fresco-2.jpg', alt: '黑白照，戴帽對著麥克風演唱' },
    ],
    note: '錢真的很重要，做什麼都要錢嗚嗚。記得有一次表演台下只有五個人，真是非常 sad。',
    links: [
      { kind: 'youtube', href: 'https://www.youtube.com/watch?v=0Rcs-gW61ug', label: 'Frescø - Hindrance' },
      { kind: 'youtube', href: 'https://www.youtube.com/watch?v=NvutWULT5sg', label: 'Frescø - Revive' },
    ],
    spotifyArtist: '2veLaTIiqXIAhDgwvsJuUq',
  },
  {
    id: 'tjun',
    period: '2021 – 2022',
    title: 'TJun',
    body: [
      'Frescø 時期的鼓手 TJ，私底下也在做其他樂風的編曲。當時因為好玩，就一起寫了〈騷操作〉。',
      '後來被聽見，加入了奇洱文創，陸續發了幾首歌跟 MV，突然間就變成了流行歌手。嘗試了更多不一樣的創作，認識了更多厲害的音樂人，也因此有了一瞥音樂產業的機會。',
    ],
    photos: [
      { src: '/about/tjun.jpg', alt: 'TJun 雙人組合形象照，兩人坐在長椅上' },
      { src: '/about/tjun-2.jpg', alt: 'TJun 排練：一人打鼓、一人彈吉他演唱', position: 'object-top' },
      { src: '/about/tjun-3.jpg', alt: '穿著塗鴉丹寧外套的鏡子自拍' },
    ],
    note: '喜歡的歌手：keshi、LAUV、Justin Bieber、Ruel、Jeremy Zucker、MAX、John K。第一次進錄音室錄音真的好剉，原來強力長這樣。',
    links: [
      {
        kind: 'youtube',
        href: 'https://www.youtube.com/watch?v=MHDkYzmKaco',
        label: 'TJun - 騷操作',
      },
      { kind: 'streetvoice', href: 'https://streetvoice.com/tjuntw/', label: 'StreetVoice' },
    ],
    spotifyArtist: '1z38pvLkreierSpOCGxZXo',
  },
  {
    id: 'now',
    period: '現在',
    title: '王嘉駿',
    body: ['現在就是王嘉駿，在社會打滾，空閒時間做一些翻唱，也有在寫歌。再等等～'],
    photos: [
      { src: '/about/now-1.jpg', alt: '小時候運動會，戴著頭帶、拿著火炬奔跑' },
      { src: '/about/now-2.jpg', alt: '在大型舞台上演唱的現場' },
    ],
    note: '我不想上班。',
    links: [
      { kind: 'instagram', href: 'https://instagram.com/juniswang', label: 'Instagram' },
      { kind: 'threads', href: 'https://www.threads.net/@juniswang', label: 'Threads' },
      { kind: 'youtube', href: 'https://www.youtube.com/@junwang0917', label: 'YouTube' },
      { kind: 'covers', href: '/covers', label: '翻唱清單' },
    ],
  },
]
