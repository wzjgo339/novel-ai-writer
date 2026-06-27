import { db } from "./index"
import {
  novels,
  volumes,
  chapters,
  characters,
  characterRelationships,
  worldTerms,
  plotEvents,
} from "./schema"

function generateId(): string {
  return Math.random().toString(36).slice(2, 11) + Date.now().toString(36)
}

// ─── Sample novel data ──────────────────────────────────────────────────────

const now = Date.now()
const MS_HOUR = 3600000

const sampleNovel = {
  id: generateId(),
  title: "深夜食肆",
  description: "一家只在午夜出现的神秘小馆，老板能做出让人重温记忆的菜肴。每个推开门的食客，都带着一段放不下的过去。",
  createdAt: new Date(now - MS_HOUR * 48).toISOString(),
  updatedAt: new Date(now - MS_HOUR * 1).toISOString(),
}

const sampleVolumes = [
  {
    id: generateId(),
    novelId: sampleNovel.id,
    title: "第一卷 灶火初燃",
    sortOrder: 0,
    createdAt: new Date(now - MS_HOUR * 48).toISOString(),
    updatedAt: new Date(now - MS_HOUR * 48).toISOString(),
  },
]

const sampleChapters = [
  {
    id: generateId(),
    volumeId: sampleVolumes[0].id,
    title: "第一章 午夜来客",
    sortOrder: 0,
    content:
      `钟敲十二下的时候，苏晚照准时推开了那扇门。\n\n这是一条她走了二十二年的老街，但今晚不太一样——巷子深处多了一盏暖黄色的灯笼。橙红色的光晕在潮湿的青石板上铺开，像一块被人遗忘的手绢。灯笼下方，是一扇木门。门楣上没有招牌，只在门板上用墨笔写了四个字：深夜食肆。\n\n苏晚照在门口站了片刻。夜风吹动她的风衣下摆，十一月的南方城市有一种无孔不入的湿冷。她不知道自己为什么会停下来——加班到这个点，她应该叫个车回家，而不是在一条陌生的小巷里打量一家来路不明的店。\n\n但她还是推开了门。\n\n门内的世界比想象中温暖得多。店面不大，只能摆下四五张桌子，但收拾得干净利落。吧台后面站着一个男人，三十岁上下，穿着一件洗得发白的厨师服，正在用一块白布擦拭一只陶碗。\n\n\"欢迎。\"他抬起头，声音不大，却让整个空间的嘈杂感——如果那也算嘈杂的话——安静了下来。\n\n苏晚照挑了吧台的位置坐下。店里没有菜单。\n\n\"想吃什么？\"老板放下陶碗。\n\n\"有什么？\"\n\n\"看你想记住什么，还是想忘记什么。\"\n\n苏晚照愣住了。\n\n这句话像一根针，精准地扎在她心里某个她自己都不愿触碰的地方。她张了张嘴，想说点什么，却发现喉咙发紧。\n\n老板没有追问。他转身打开冰箱，取出一个搪瓷盆，里面是用保鲜膜封好的面团。他的动作很慢，很稳，像在做一件重复了无数次的事情。面团在他手里被揉开、折叠、再揉开。面粉在暖黄的灯光下像细雪一样飘散。\n\n\"你失眠很久了吧。\"老板说。不是问句。\n\n苏晚照没有回答。\n\n\"我帮你做一碗面。\"老板说，\"吃了，今晚好好睡一觉。\"\n\n面端上来的时候，苏晚照看着那只陶碗里清亮的面汤，忽然觉得眼眶有点热。汤面上漂浮着几片葱花和一朵不知道什么名字的花——浅紫色的，在热汤里缓慢地舒展开来。\n\n她拿起筷子，夹起第一箸面。\n\n面条入口的瞬间，她仿佛回到了童年——外婆家的厨房，灶台上的大铁锅咕嘟咕嘟地冒着热气，外婆背对着她，正在往锅里下面。夕阳从窗户斜射进来，照在外婆花白的发髻上，空气中的面粉在光线里缓慢地浮动。\n\n\"囡囡，饿了吧？马上就好。\"外婆回头朝她笑。\n\n苏晚照的眼泪终于掉了下来。\n\n她已经有十三年没吃过外婆做的面了。`,
    createdAt: new Date(now - MS_HOUR * 48).toISOString(),
    updatedAt: new Date(now - MS_HOUR * 2).toISOString(),
  },
  {
    id: generateId(),
    volumeId: sampleVolumes[0].id,
    title: "第二章 南城的雪",
    sortOrder: 1,
    content:
      "第二晚，苏晚照又来了。\n\n这一次她没有犹豫，下了出租车就径直走进巷子。灯笼还在，暖黄色的光在冬夜的雾气里晕开，像一团凝固的蜂蜜。\n\n推开木门，老板还是站在吧台后面，这次他在切一截莲藕。刀起刀落，藕片薄得透光。\n\n“今晚想吃什么？”他问。\n\n苏晚照坐在昨天的位置上。店里还有一个客人——角落的桌子上坐着一个年轻男人，面前放着一碟花生米和一瓶白酒，但他既没吃也没喝，只是发呆。\n\n“你这里……”苏晚照斟酌着措辞，“每一道菜都能让人看到记忆？”\n\n“不是每一道。”老板把切好的藕片放进清水里浸泡，“只有用心做的才行。”\n\n“这有什么不同？”\n\n“用心做的菜，里面有做菜人的念想。”老板说，“你吃到的不是味道，是那个念想。”\n\n苏晚照沉默了一会儿。\n\n“那我想吃一道菜。”她说，“一道关于雪的。”\n\n老板看了她一眼，没有多问。他转身从冰箱里取出一块豆腐，又拿出几个干香菇开始泡发。动作依然很慢，依然很稳。\n\n角落里的客人忽然开口了。\n\n“你也是来找东西的？”他问苏晚照。\n\n苏晚照转头看他。那个男人大概二十七八岁，胡子拉碴，眼眶下有明显的乌青。\n\n“我不知道。”她说。\n\n“我叫周远。”他说，“我来这里七天了。”他指了指面前的酒瓶，“每天都来，每天都点同一道菜，但每次都吃不出老板说的那个味道。”\n\n“你点的什么？”\n\n“红烧肉。”周远说，“我妈以前最拿手的菜。”\n\n他的声音很平静，但捏着酒杯的手指关节发白。",
    createdAt: new Date(now - MS_HOUR * 36).toISOString(),
    updatedAt: new Date(now - MS_HOUR * 4).toISOString(),
  },
  {
    id: generateId(),
    volumeId: sampleVolumes[0].id,
    title: "第三章 豆腐雪",
    sortOrder: 2,
    content:
      "老板端上来的是一道看起来极其普通的菜——麻婆豆腐。\n\n红色的辣油在白瓷盘里晕开，嫩白色的豆腐块浸在其中，上面撒着一层花椒粉和碧绿的葱花。热气升腾，带着麻辣的香气。\n\n“这跟雪有什么关系？”苏晚照问。\n\n“吃吃看。”老板说。\n\n她舀起一勺豆腐，吹了吹，送入口中。\n\n麻辣的味道在舌尖炸开的瞬间，画面涌了上来——\n\n那是南城罕见的一场大雪。她大概七八岁，穿着厚厚的棉袄，在院子里疯跑。父亲在后面追她，手里拿着一条红色的围巾。雪花落在父亲的肩头和头发上，他的笑声在白色的世界里回荡。\n\n“晚照，别跑了，把围巾系上！”\n\n她停下来，父亲蹲在她面前，笨拙地帮她系好围巾。红色的羊毛围巾裹住她的脖子，带着父亲衣服上淡淡的烟草味。\n\n“爸，南城以后还会下雪吗？”\n\n“会的。”父亲抬头看了看天空，“每年都会下。”\n\n但南城之后再也没有下过雪。那场大雪后的第三年，父亲因为一场事故离开了。\n\n苏晚照睁开眼睛，发现自己的手在微微发抖。她放下勺子，深吸了一口气。\n\n“这道菜叫什么？”她问。\n\n“豆腐雪。”老板说。\n\n“为什么是麻婆豆腐？”\n\n“因为你说要雪，但南城不下雪。”老板看着她说，“所以我只能用豆腐来代替。豆腐嫩滑，颜色洁白，像雪。麻婆豆腐是你记忆里最温暖的那道菜——你父亲每次下馆子都会点。”\n\n苏晚照的眼泪夺眶而出。\n\n她从来没有跟任何人提过父亲的事。\n\n“你到底是谁？”她问。\n\n老板没有回答。他低头擦拭吧台，动作不急不缓。\n\n“我只是一个厨子。”他说。\n\n角落里的周远静静地看着这一幕。他的面前，那碟花生米和那瓶白酒依然没有动过。",
    createdAt: new Date(now - MS_HOUR * 24).toISOString(),
    updatedAt: new Date(now - MS_HOUR * 6).toISOString(),
  },
  {
    id: generateId(),
    volumeId: sampleVolumes[0].id,
    title: "第四章 红烧肉的秘密",
    sortOrder: 3,
    content:
      "第三天深夜，苏晚照推开深夜食肆的门时，发现周远已经不在了。\n\n他的位置上坐着另一个客人——一个穿着高中校服的女孩，扎着马尾辫，面前放着一碗白米饭，却一口没动。\n\n“老板说她来三次了。”苏晚照在吧台坐下。\n\n“嗯。”老板在熬一锅高汤，汤锅里咕嘟咕嘟地翻滚着，乳白色的蒸汽在灯光下升腾。\n\n“周远呢？”\n\n“他今晚没来。”\n\n“他还会来吗？”\n\n老板停下手中的勺子，沉默了片刻。\n\n“他吃了七天的红烧肉，每次都吃不出味道。”老板说，“不是我的菜有问题。他顿了顿，是他自己还没准备好。”\n\n“准备好什么？”\n\n“面对。”\n\n苏晚照没有再问。她看着老板往汤锅里加了几片干贝，动作依然从容。这个男人似乎永远不会着急。\n\n“我想替周远问一个问题。”她说。\n\n老板没有抬头，但显然在听。\n\n“他妈妈的事……你知道吗？”\n\n“我不知道具体发生了什么。”老板说，“我做菜的时候，只能感知到客人心里最深的那个念想。周远的念想是一盘红烧肉，和一个他再也没有机会说出口的词。”\n\n“什么词？”\n\n老板没有回答。他把熬好的高汤滤出来，汤色清澈见底。\n\n“跟他说，下次来的时候，不要想着吃出什么味道。”老板说，“专心想着他想说的话就行。”\n\n苏晚照点了点头。她转头看向角落里的那个女孩。女孩面前的饭还一口没动，但她似乎在哭——肩膀微微抽动，但没有发出声音。\n\n“她呢？”苏晚照问。\n\n“她还没想好要点什么。”老板说。\n\n“你这里什么都能做吗？”\n\n“我只能做人们需要的那道菜。”老板把滤好的高汤倒进一个陶罐，“至于那是什么……得由他们自己告诉我。”",
    createdAt: new Date(now - MS_HOUR * 12).toISOString(),
    updatedAt: new Date(now - MS_HOUR * 3).toISOString(),
  },
  {
    id: generateId(),
    volumeId: sampleVolumes[0].id,
    title: "第五章 归途",
    sortOrder: 4,
    content:
      "第四天晚上，苏晚照在深夜食肆门口看到了周远。\n\n他蹲在灯笼旁边，手里捏着一根烟，烟头在夜风中明明灭灭。看到苏晚照，他站起来，把烟掐灭。\n\n“我在等你。”他说。\n\n“等我？”\n\n“嗯。”周远深吸一口气，“我想请你帮我一个忙。”\n\n他告诉苏晚照，他的母亲三年前因为癌症去世了。他一直在外地工作，母亲病重的时候，他没能赶回来见最后一面。\n\n“我连她最后一面都没见到。”周远的声音沙哑，“电话里听到消息的时候，我正在跟客户吃饭。那顿饭吃的就是红烧肉。”他苦笑了一下，“从那以后，我再也没吃过这道菜。”\n\n“老板说，你吃不出味道。”\n\n“因为我每次吃的时候，想的都是自己的后悔。”周远说，“我从没想过要跟她说话。”\n\n他推开深夜食肆的门。老板依然站在吧台后面，仿佛他从未离开过。\n\n“今天想吃什么？”老板问。\n\n“红烧肉。”周远说。\n\n和之前的每一次一样，老板转身，开始准备。但这一次，周远没有坐在角落里发呆。他走到吧台前面，坐了下来，看着老板做菜。\n\n五花肉被切成均匀的方块，在热油里煎到表面金黄。冰糖在另一口锅里融化，变成琥珀色的糖浆。葱姜爆香，料酒沿着锅边淋下去，滋啦一声，香气四溢。\n\n周远看得目不转睛。\n\n四十分钟后，一盘红烧肉被端到他面前。深红色的肉块在浓稠的酱汁里微微颤动，表面泛着油亮的光泽。白米饭的热气裹着肉香，直往鼻腔里钻。\n\n周远拿起筷子。他没有犹豫，夹起一块肉，送入口中。\n\n肥肉入口即化，瘦肉酥而不柴。酱香、甜味、肉味在口腔里融合，然后——\n\n他的眼泪流了下来。\n\n不是因为好吃。而是因为他终于看到了：记忆里母亲站在厨房门口，围裙上沾着油渍，笑着对他说：“小远，洗手吃饭。”\n\n“妈。”他轻声说。\n\n那盘红烧肉他吃了很久。苏晚照和老板都没有打扰他。\n\n苏晚照结账的时候，问了老板最后一个问题。\n\n“你这里的菜，每个来过的人都会忘记吗？”\n\n“白天会忘。”老板说，“但需要的时候，会再想起来。”\n\n苏晚照走出深夜食肆的时候，回头看了一眼。那盏暖黄色的灯笼还亮着，在冬夜的雾气里，像一团不会熄灭的火。\n\n她知道，自己还会再来的。\n\n不是因为失眠。\n\n是因为有些记忆，需要一个人和一盏灯，才能重新捡起来。",
    createdAt: new Date(now - MS_HOUR * 6).toISOString(),
    updatedAt: new Date(now - MS_HOUR * 1).toISOString(),
  },
]

// ─── Characters ─────────────────────────────────────────────────────────────

const charSu = {
  id: generateId(),
  novelId: sampleNovel.id,
  name: "苏晚照",
  aliases: "",
  age: "28岁",
  gender: "女",
  appearance: "长发，常穿风衣，气质清冷。长期加班导致面色疲惫，眼眶下总有淡淡的乌青。",
  personality: "外表坚强理性，内心敏感细腻。不擅长表达情感，习惯把心事藏在工作的忙碌之下。",
  background:
    "南城人，父母早逝，由外婆带大。工作后独自在城市打拼，长期高压工作导致严重失眠。十三年前外婆去世后，再也没有吃过记忆中的那碗面。",
  motivation:
    "最初是被失眠所困，偶然走进了深夜食肆。后来发现这里能让她重新面对那些她以为已经忘记的人和事。",
  arc: "从一个逃避记忆的人，变成主动面对过去的人。通过深夜食肆里的每一道菜，重新拼凑起自己人生的碎片。",
  notes: "故事的主视角。她的失眠症贯穿全书，既是症状也是隐喻。",
  sortOrder: 0,
  createdAt: new Date(now - MS_HOUR * 48).toISOString(),
  updatedAt: new Date(now - MS_HOUR * 1).toISOString(),
}

const charChef = {
  id: generateId(),
  novelId: sampleNovel.id,
  name: "老板",
  aliases: "深夜食肆老板",
  age: "三十岁左右",
  gender: "男",
  appearance: "穿着洗得发白的厨师服，身高颀长，手指修长干净。眼神平静，说话不紧不慢。",
  personality: "沉稳、寡言、洞察力极强。似乎能看穿每一个客人心里最深处的念想。从不多问，但从不多做。",
  background:
    "身份成谜。经营一家只在午夜出现的餐馆，能做让人看到记忆的菜。没有人知道他从哪里来，为什么开这家店。",
  motivation: "不为赚钱，不为名气。他似乎只是单纯地在做菜——那些客人需要的菜。",
  arc: "神秘人物，他的真实身份和目的是贯穿全书的核心谜团之一。",
  notes: "目前只知其姓沈，具体名字未透露。",
  sortOrder: 1,
  createdAt: new Date(now - MS_HOUR * 48).toISOString(),
  updatedAt: new Date(now - MS_HOUR * 1).toISOString(),
}

const charZhou = {
  id: generateId(),
  novelId: sampleNovel.id,
  name: "周远",
  aliases: "",
  age: "27岁",
  gender: "男",
  appearance: "胡子拉碴，眼眶下有明显的乌青，不修边幅。手指上戴着褪色的红绳。",
  personality: "外表颓废，内心被愧疚压垮。不善求助，但本质上是个善良的人。",
  background:
    "外地来南城打拼的白领。母亲三年前因癌症去世，他因为工作没能赶回去见最后一面。这成了他解不开的心结。",
  motivation: "想通过深夜食肆的红烧肉，再感受一次母亲的味道，说出那句没来得及说的话。",
  arc: "从被愧疚吞噬到最终与过去和解，重新开始生活。",
  notes: "第三章客串角色，第四章成为重要配角。他手上的红绳是母亲临终前托人带给他的。",
  sortOrder: 2,
  createdAt: new Date(now - MS_HOUR * 24).toISOString(),
  updatedAt: new Date(now - MS_HOUR * 3).toISOString(),
}

const charGirl = {
  id: generateId(),
  novelId: sampleNovel.id,
  name: "马尾女孩",
  aliases: "",
  age: "17岁",
  gender: "女",
  appearance: "穿着高中校服，扎马尾辫，背着沉重的书包。眼神躲闪，不愿与人交流。",
  personality: "内向、敏感，有明显的社交焦虑。",
  background: "高三学生，连续三晚出现在深夜食肆，每次都只点一碗白米饭却一口不吃。",
  motivation: "未知。她还没想好要点什么菜。",
  arc: "待展开——她的故事将是下一卷的主线之一。",
  notes: "目前只知她叫小鹿（化名），从校服上的校徽判断是南城一中的学生。",
  sortOrder: 3,
  createdAt: new Date(now - MS_HOUR * 12).toISOString(),
  updatedAt: new Date(now - MS_HOUR * 3).toISOString(),
}

// ─── Character Relationships ────────────────────────────────────────────────

const sampleRelationships = [
  {
    id: generateId(),
    novelId: sampleNovel.id,
    characterId1: charSu.id,
    characterId2: charChef.id,
    relationshipType: "其他",
    description: "食客与老板。苏晚照是深夜食肆的常客，两人之间有一种微妙的信任与好奇",
    createdAt: new Date(now - MS_HOUR * 48).toISOString(),
    updatedAt: new Date(now - MS_HOUR * 48).toISOString(),
  },
  {
    id: generateId(),
    novelId: sampleNovel.id,
    characterId1: charZhou.id,
    characterId2: charSu.id,
    relationshipType: "朋友",
    description: "在深夜食肆认识。周远拜托苏晚照帮忙，两人因此产生交集",
    createdAt: new Date(now - MS_HOUR * 12).toISOString(),
    updatedAt: new Date(now - MS_HOUR * 12).toISOString(),
  },
  {
    id: generateId(),
    novelId: sampleNovel.id,
    characterId1: charZhou.id,
    characterId2: charChef.id,
    relationshipType: "其他",
    description: "食客与老板。周远连续七天来店点红烧肉，最终在老板的引导下解开心结",
    createdAt: new Date(now - MS_HOUR * 12).toISOString(),
    updatedAt: new Date(now - MS_HOUR * 12).toISOString(),
  },
  {
    id: generateId(),
    novelId: sampleNovel.id,
    characterId1: charGirl.id,
    characterId2: charChef.id,
    relationshipType: "其他",
    description: "食客与老板。马尾女孩连续三晚来店但从不点菜",
    createdAt: new Date(now - MS_HOUR * 12).toISOString(),
    updatedAt: new Date(now - MS_HOUR * 12).toISOString(),
  },
]

// ─── World Terms ────────────────────────────────────────────────────────────

const sampleTerms = [
  {
    id: generateId(),
    novelId: sampleNovel.id,
    term: "深夜食肆",
    type: "地点",
    definition: "一家只在午夜十二点后出现的餐馆，位于南城一条无名小巷深处。门口挂一盏暖黄色灯笼，门板上用墨笔写着店名。店内只能摆下四五张桌子，但干净整洁。",
    notes: "白天去寻找时，巷子尽头只有一面墙。没有人知道这家店到底在哪里，也没有人知道老板是怎么做到的。",
    createdAt: new Date(now - MS_HOUR * 48).toISOString(),
    updatedAt: new Date(now - MS_HOUR * 48).toISOString(),
  },
  {
    id: generateId(),
    novelId: sampleNovel.id,
    term: "记忆之味",
    type: "概念",
    definition: "老板做的菜中蕴含的特殊力量。用心制作的菜肴能唤起食客内心深处最真实的记忆——不仅是味觉记忆，还包括场景、情感、声音和气味。老板称其原理为「做菜人的念想」。",
    notes: "并非每一道菜都有此效果，只有老板真正用心做的菜才行。食客需要真正做好准备，才能完整地体验到记忆。",
    createdAt: new Date(now - MS_HOUR * 48).toISOString(),
    updatedAt: new Date(now - MS_HOUR * 48).toISOString(),
  },
  {
    id: generateId(),
    novelId: sampleNovel.id,
    term: "念想",
    type: "概念",
    definition: "老板使用的术语，指做菜人在烹饪过程中注入的情感和心意。一份用心做的菜里包含了做菜人的念想，食客品尝时能感受到这份念想所承载的记忆。",
    notes: "念想的本质是什么，老板没有解释过。可能是某种类似共情能力的心灵感应，也可能是某种超自然力量。",
    createdAt: new Date(now - MS_HOUR * 48).toISOString(),
    updatedAt: new Date(now - MS_HOUR * 48).toISOString(),
  },
  {
    id: generateId(),
    novelId: sampleNovel.id,
    term: "南城",
    type: "地点",
    definition: "故事发生的城市，一座湿冷的南方城市。气候潮湿，冬季多雾，极少下雪。老城区保留着青石板路和旧式民居。",
    notes: "苏晚照的故乡。一座充满记忆和烟火气的城市。",
    createdAt: new Date(now - MS_HOUR * 48).toISOString(),
    updatedAt: new Date(now - MS_HOUR * 48).toISOString(),
  },
  {
    id: generateId(),
    novelId: sampleNovel.id,
    term: "外婆的面",
    type: "物品",
    definition: "苏晚照记忆中最温暖的食物。外婆做的手擀面，清亮的面汤里浮着葱花，简单却无可替代。这碗面是苏晚照与逝去外婆之间最深的连结。",
    notes: "开篇第一道菜。老板做了一碗外婆的面，让苏晚照重新感受到了以为已经遗忘的温暖。",
    createdAt: new Date(now - MS_HOUR * 48).toISOString(),
    updatedAt: new Date(now - MS_HOUR * 48).toISOString(),
  },
  {
    id: generateId(),
    novelId: sampleNovel.id,
    term: "豆腐雪",
    type: "物品",
    definition: "老板为苏晚照特制的一道菜，看起来是普通的麻婆豆腐，但能让人看到南城那场久远的大雪。因为南城不下雪，老板用洁白嫩滑的豆腐来代替雪。麻婆豆腐是苏晚照已故父亲最爱的菜。",
    notes: "这道菜让苏晚照看到了童年时和父亲在雪中嬉戏的场景。",
    createdAt: new Date(now - MS_HOUR * 24).toISOString(),
    updatedAt: new Date(now - MS_HOUR * 24).toISOString(),
  },
  {
    id: generateId(),
    novelId: sampleNovel.id,
    term: "红绳",
    type: "物品",
    definition: "周远手上戴的褪色红绳。是母亲临终前托人带给他的，他戴了三年从未取下。代表着他与母亲之间最后的连结，以及他未能见到最后一面的遗憾。",
    notes: "红绳在第四章中成为重要意象——周远最终能吃到红烧肉味道的关键，与他是否愿意面对这条红绳代表的感情有关。",
    createdAt: new Date(now - MS_HOUR * 12).toISOString(),
    updatedAt: new Date(now - MS_HOUR * 12).toISOString(),
  },
]

// ─── Plot Events ────────────────────────────────────────────────────────────

const samplePlotEvents = [
  {
    id: generateId(),
    novelId: sampleNovel.id,
    chapterId: sampleChapters[0].id,
    title: "初入深夜食肆",
    description: "苏晚照因失眠偶然走进深夜食肆。老板为她做了一碗面，让她看到了已故外婆的记忆。这碗面打开了她尘封已久的感情闸门。",
    sortOrder: 0,
    createdAt: new Date(now - MS_HOUR * 48).toISOString(),
    updatedAt: new Date(now - MS_HOUR * 48).toISOString(),
  },
  {
    id: generateId(),
    novelId: sampleNovel.id,
    chapterId: sampleChapters[1].id,
    title: "第二夜：雪与红烧肉",
    description: "苏晚照再次来到深夜食肆。遇到同样常来的客人周远——他连续七天点红烧肉却吃不出味道。苏晚照向老板点了一道关于雪的菜。",
    sortOrder: 1,
    createdAt: new Date(now - MS_HOUR * 36).toISOString(),
    updatedAt: new Date(now - MS_HOUR * 36).toISOString(),
  },
  {
    id: generateId(),
    novelId: sampleNovel.id,
    chapterId: sampleChapters[2].id,
    title: "豆腐雪与父亲的记忆",
    description: "老板端上「豆腐雪」——一道以麻婆豆腐形式呈现的雪的记忆。苏晚照吃到了与父亲在雪中的最后回忆，痛哭失声。老板展现出惊人的洞察力，似乎能看穿每个客人的内心。",
    sortOrder: 2,
    createdAt: new Date(now - MS_HOUR * 24).toISOString(),
    updatedAt: new Date(now - MS_HOUR * 24).toISOString(),
  },
  {
    id: generateId(),
    novelId: sampleNovel.id,
    chapterId: sampleChapters[3].id,
    title: "真相与准备",
    description: "苏晚照第三次到食肆，遇到新的客人——一个穿校服不说话的女孩。老板解释周远吃不出味道的原因：「是他自己还没准备好。」揭示记忆之味的核心规则：食客需要准备好面对自己的情感。",
    sortOrder: 3,
    createdAt: new Date(now - MS_HOUR * 12).toISOString(),
    updatedAt: new Date(now - MS_HOUR * 12).toISOString(),
  },
  {
    id: generateId(),
    novelId: sampleNovel.id,
    chapterId: sampleChapters[4].id,
    title: "归途：周远的和解",
    description: "周远在苏晚照的鼓励下再次来到深夜食肆。这一次他没有逃避，而是专注地看着老板做菜。他终于在红烧肉中看到了母亲的记忆，说出了埋藏三年的那句「妈」。完成了第一次重要的和解。",
    sortOrder: 4,
    createdAt: new Date(now - MS_HOUR * 6).toISOString(),
    updatedAt: new Date(now - MS_HOUR * 6).toISOString(),
  },
]

// ─── Seed ───────────────────────────────────────────────────────────────────

// Clear existing data in correct order (due to foreign keys)
db.delete(characterRelationships).run()
db.delete(characters).run()
db.delete(worldTerms).run()
db.delete(plotEvents).run()
db.delete(chapters).run()
db.delete(volumes).run()
db.delete(novels).run()

// Novel
db.insert(novels).values(sampleNovel).run()

// Volumes
for (const vol of sampleVolumes) {
  db.insert(volumes).values(vol).run()
}

// Chapters
for (const ch of sampleChapters) {
  db.insert(chapters).values(ch).run()
}

// Characters
for (const char of [charSu, charChef, charZhou, charGirl]) {
  db.insert(characters).values(char).run()
}

// Relationships
for (const rel of sampleRelationships) {
  db.insert(characterRelationships).values(rel).run()
}

// World terms
for (const term of sampleTerms) {
  db.insert(worldTerms).values(term).run()
}

// Plot events
for (const evt of samplePlotEvents) {
  db.insert(plotEvents).values(evt).run()
}

console.log(
  `✅ Seeded 1 novel, ${sampleVolumes.length} volumes, ${sampleChapters.length} chapters, ` +
    `4 characters, ${sampleRelationships.length} relationships, ` +
    `${sampleTerms.length} world terms, ${samplePlotEvents.length} plot events.`
)
