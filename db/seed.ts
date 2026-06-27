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
  title: "双冰融",
  description: "一部关于冰与水的故事，探索记忆与遗忘的边界。",
  createdAt: new Date(now - MS_HOUR * 48).toISOString(),
  updatedAt: new Date(now - MS_HOUR * 1).toISOString(),
}

const sampleVolumes = [
  {
    id: generateId(),
    novelId: sampleNovel.id,
    title: "第一部",
    sortOrder: 0,
    createdAt: new Date(now - MS_HOUR * 48).toISOString(),
    updatedAt: new Date(now - MS_HOUR * 48).toISOString(),
  },
  {
    id: generateId(),
    novelId: sampleNovel.id,
    title: "第二部",
    sortOrder: 1,
    createdAt: new Date(now - MS_HOUR * 24).toISOString(),
    updatedAt: new Date(now - MS_HOUR * 24).toISOString(),
  },
]

const sampleChapters = [
  // ── Volume 1 ──
  {
    id: generateId(),
    volumeId: sampleVolumes[0].id,
    title: "第一章 冰蓝",
    sortOrder: 0,
    content:
      "泳池的水在灯光下泛着蓝色的波纹，陈玉冰深吸一口气，潜入水中。\n\n水是凉的，但不像冬天那么刺骨——晚春的泳池有一种温吞的凉意，像隔夜的茶。她睁开眼睛，透过泳镜看到池底的黑线笔直地延伸向前方。每一次划水，手臂切入水面，带起一串细小的气泡，那些气泡顺着她的脸颊向后飘去，在水面破碎成细碎的银光。\n\n二十五米。转身。蹬壁。\n\n重复。\n\n这个动作她已经做了二十年。从五岁第一次被母亲推进泳池的那天算起，她已经在这蓝色液体里度过了太多时间。久到她觉得自己的肺已经不完全属于空气，而是有一部分变成了鳃。\n\n五十米。到边。\n\n她摘掉泳镜，水珠顺着睫毛滴落。池边的电子钟显示：34.27秒。比昨天慢了零点三秒。\n\n\"玉冰，上来吧，教练叫你。\"队友小杨蹲在池边喊道。\n\n她从水中爬起来，毛巾裹住肩膀，走过湿漉漉的池岸。更衣室的荧光灯嗡嗡作响，照亮了墙上发黄的海报——一位游泳运动员站在领奖台上，金牌在胸前闪闪发光。\n\n陈玉冰看了那张海报十二年。她从来没把那上面的脸和自己的未来联系起来。",
    createdAt: new Date(now - MS_HOUR * 48).toISOString(),
    updatedAt: new Date(now - MS_HOUR * 2).toISOString(),
  },
  {
    id: generateId(),
    volumeId: sampleVolumes[0].id,
    title: "第二章 水的声音",
    sortOrder: 1,
    content:
      "更衣室的长凳上放着一部手机，屏幕亮着。\n\n陈玉冰坐下来，毛巾搭在肩上，拿起手机。微信里有十几条未读消息，大部分是群聊里的@。她快速滑动，找到置顶的那个对话。\n\n最后一次对话停留在一周前。\n\n「妈，这周末回来吗？」\n「不回了，训练。」\n「好。」\n\n她盯着那个「好」字看了很久。母亲的头像是一朵荷花，白色的花瓣在绿色的背景上显得格外干净。她记得小时候，母亲也是游泳运动员——或者说，曾经是。\n\n\"玉冰，快点！\"教练的声音从走廊尽头传来。\n\n她把手机塞进包里，站起来。更衣室的镜子里映出一个瘦高的女孩，肩膀宽阔，锁骨分明，头发湿漉漉地贴在头皮上。\n\n\"马上来。\"她应了一声。\n\n走廊通向游泳馆的途中，要经过一面奖牌墙。玻璃后面陈列着这些年学校游泳队赢得的荣誉，最中间那块是全国大学生锦标赛的团体金牌——去年拿的。陈玉冰的照片也在那面墙上，照片里的她笑得有些拘谨。\n\n她总觉得自己不属于那里。\n\n教练办公室的门半掩着，里面传来说话声。她正要敲门，听到自己的名字。\n\n\"……陈玉冰的成绩一直在退步。\"\n\n她的手停在半空中。",
    createdAt: new Date(now - MS_HOUR * 36).toISOString(),
    updatedAt: new Date(now - MS_HOUR * 4).toISOString(),
  },
  {
    id: generateId(),
    volumeId: sampleVolumes[0].id,
    title: "第三章 深水区",
    sortOrder: 2,
    content:
      "教练的话像一块石头沉入水底，溅起的涟漪久久不散。\n\n\"进来。\"教练的声音传来。\n\n陈玉冰推开门。教练老周坐在办公桌后面，桌上摊着一叠计时表。旁边站着一个人——不认识的，四十岁左右，戴着眼睛，穿着一件深灰色的夹克。\n\n\"这是省队的李教练。\"老周介绍道。\n\n李教练点了点头，目光在她身上停留了几秒，像在打量一件商品。\n\n\"你的成绩我看过了。\"李教练开口，声音平稳，不带感情，\"一百米自由泳最近三次比赛都在一分零二秒左右。这个成绩……\"\n\n\"我知道。\"陈玉冰打断了他。\"很差。\"\n\n办公室里安静了几秒。老周皱了下眉头，李教练倒是笑了一下——那种让人捉摸不透的微笑。\n\n\"我不是来批评你的。\"李教练说，\"我是来问你，想不想换个训练环境。\"\n\n陈玉冰愣了一下。\n\n\"省队下周有个选拔机会，针对明年全运会的。我觉得你有潜力。\"他从夹克口袋里掏出一张名片，放在桌上。\"考虑一下。\n\n名片是白色的，上面印着黑色的字。陈玉冰拿起来，指尖触到纸面，感觉到微微的粗糙。\n\n\"为什么是我？\"她问。\n\n\"因为你游的每一趟，都在跟自己较劲。\"李教练说，\"这种劲头教不出来。\"\n\n他走了之后，老周靠在椅背上，看着她说：\"去不去你自己决定。但你得想清楚一件事——你现在的问题不是技术，是脑子里的东西。\"老周指了指自己的太阳穴。\"你游泳的时候在想什么？\"\n\n陈玉冰没有回答。\n\n她不知道该怎么告诉教练，最近每次跳进水里，她都会想起母亲。想起母亲年轻时的照片——穿着泳衣站在领奖台上，笑得那么灿烂。想起母亲后来再也不游泳了，甚至连游泳池边都不肯去。\n\n\"你妈的事，我知道一些。\"老周的声音放轻了。\"但那不是你的包袱。\"\n\n陈玉冰攥紧了手里的名片。白色的纸边微微卷曲。",
    createdAt: new Date(now - MS_HOUR * 24).toISOString(),
    updatedAt: new Date(now - MS_HOUR * 6).toISOString(),
  },
  // ── Volume 2 ──
  {
    id: generateId(),
    volumeId: sampleVolumes[1].id,
    title: "第一章 新世界",
    sortOrder: 0,
    content:
      "省队的训练基地在城市的另一端，坐公交车要两个小时。\n\n陈玉冰拎着一个旧旅行袋，站在基地门口。铁门是深灰色的，上面挂着一块牌子：XX省体育训练基地。门口没有人迎接她，只有保安从窗户里探出头来，核对了她的证件。\n\n\"往里走，左手第三栋楼，二楼找李教练。\"\n\n她点了点头，拖着袋子往里走。基地比她想象的大得多——田径场、篮球馆、游泳馆，一排排建筑在午后的阳光下投下整齐的影子。游泳馆的外墙是蓝色的玻璃幕墙，在阳光下反射出波纹状的光。\n\n李教练在二楼办公室等她。桌子上放着一份训练计划，打印出来的，足足有七八页纸。\n\n\"这是你接下来三个月的训练计划。\"李教练把那份计划推到她面前。\"每天两练，早上六点到八点，下午四点到六点。周三和周六下午是体能训练。\"\n\n陈玉冰低头看着那些密密麻麻的时间表。\n\n\"有问题吗？\"\n\n\"没有。\"\n\n\"好。更衣室在楼下，柜子号码十七。你的室友叫林小禾，也是游自由泳的。\"李教练顿了顿，\"她比你早来半年，有什么不懂的可以问她。\"\n\n更衣室里的空气混杂着消毒水和汗的味道。陈玉冰找到十七号柜子，打开，里面空荡荡的，只有一只干掉的蟑螂尸体躺在角落。她用手纸把它捏走，开始换衣服。\n\n\"你是新来的？\"\n\n一个声音从背后传来。陈玉冰回头，看到一个短头发的女孩靠在柜门上，穿着一件已经褪色的训练服，手里拿着一个运动水壶。\n\n\"林小禾？\"陈玉冰问。\n\n\"对。\"女孩笑起来，露出一颗虎牙，\"室友。欢迎来到地狱。\"",
    createdAt: new Date(now - MS_HOUR * 12).toISOString(),
    updatedAt: new Date(now - MS_HOUR * 3).toISOString(),
  },
  {
    id: generateId(),
    volumeId: sampleVolumes[1].id,
    title: "第二章 对手",
    sortOrder: 1,
    content:
      "下午四点的训练馆，阳光从高窗斜射进来，在水面上投下金黄色的光斑。\n\n陈玉冰站在跳台上，深呼吸。\n\n这是她来到省队的第三天，第一个完整的训练日。李教练站在池边，手里拿着秒表，面无表情。\n\n\"预备——\"\n\n枪声响起，她跃入水中。\n\n水花在眼前炸开，然后是熟悉的蓝色。她的手划破水面，身体在阻力中前进。耳朵里只有水的声音——咕噜咕噜的，像某种古老的语言。\n\n二十五米。转身。\n\n她瞥见隔壁泳道有个人影，几乎是并驾齐驱。是林小禾。\n\n五十米。转身。\n\n林小禾领先半个身位。\n\n陈玉冰咬紧牙关，加大了划水的频率。手臂开始发酸，肺里的氧气在快速消耗。但她不想输——不想在第一天就输给自己的室友。\n\n七十五米。转身。\n\n最后二十五米。她的身体在尖叫，肌肉在燃烧。但水池对面那个黑色的T形触板在召唤她。\n\n到边。\n\n她撞上触板，大口喘气。摘下泳镜，看到旁边的林小禾已经扒在池边，正在用毛巾擦脸。\n\n\"一分零一秒三。\"李教练的声音从上方传来。\n\n陈玉冰趴在池边，喘得说不出话。\n\n\"不错，比上周快了零点七秒。\"李教练在表格上记了什么，\"但林小禾五十八秒九。\"\n\n陈玉冰转头看向林小禾。那个短头发的女孩正仰头喝水，神态轻松得像刚散了个步。\n\n\"别灰心。\"林小禾放下水壶，朝她咧嘴一笑，\"我刚来的时候跟你差不多。半年后才突破一分钟。\"\n\n\"你怎么做到的？\"陈玉冰问。\n\n\"每天多游一组。\"林小禾说，\"教练说练八百，我就游一千。教练说游到六点，我就游到六点半。\"她又喝了一口水，\"天赋只能带你走到门口，之后是水磨工夫。\"",
    createdAt: new Date(now - MS_HOUR * 6).toISOString(),
    updatedAt: new Date(now - MS_HOUR * 1).toISOString(),
  },
]

// ─── Characters ─────────────────────────────────────────────────────────────

const charYubing = {
  id: generateId(),
  novelId: sampleNovel.id,
  name: "陈玉冰",
  aliases: "玉冰",
  age: "22岁",
  gender: "女",
  appearance: "瘦高个，肩膀宽阔，锁骨分明，短发。常年在泳池训练，皮肤白皙中透着水汽般的清凉感。",
  personality: "内敛、倔强、不善表达。习惯把情绪压在心底，但在水里有种近乎偏执的专注。",
  background:
    "五岁被曾是游泳运动员的母亲推进泳池，从此与水结缘。大学游泳队主力，但近期成绩下滑。母亲曾是有前途的游泳运动员，后来因故放弃游泳，这件事一直影响着陈玉冰。",
  motivation:
    "最初只是为了不让母亲失望，后来游泳变成了她与自己对话的方式。她想知道自己在水里到底能走多远。",
  arc: "从被动接受命运到主动选择自己的人生——无论是游泳还是面对母亲的心结。",
  notes: "",
  sortOrder: 0,
  createdAt: new Date(now - MS_HOUR * 48).toISOString(),
  updatedAt: new Date(now - MS_HOUR * 1).toISOString(),
}

const charXiaohe = {
  id: generateId(),
  novelId: sampleNovel.id,
  name: "林小禾",
  aliases: "小禾",
  age: "21岁",
  gender: "女",
  appearance: "短发，虎牙，常年穿褪色的训练服，身材精瘦结实。",
  personality: "开朗直率，乐观但不盲目，有种超越年龄的通透。训练极其刻苦，信奉水磨工夫。",
  background:
    "比陈玉冰早半年进入省队，同样游自由泳。来自小城市，家里并不富裕，游泳是她唯一的出路。",
  motivation: "想靠游泳改变自己和家人的命运。",
  arc: "从陈玉冰的对手变成亦敌亦友的伙伴，两人互相成就。",
  notes: "",
  sortOrder: 1,
  createdAt: new Date(now - MS_HOUR * 48).toISOString(),
  updatedAt: new Date(now - MS_HOUR * 1).toISOString(),
}

const charCoachZhou = {
  id: generateId(),
  novelId: sampleNovel.id,
  name: "老周",
  aliases: "周教练",
  age: "50多岁",
  gender: "男",
  appearance: "微胖，办公桌上永远摆着一叠计时表。",
  personality: "表面严厉，实则心细。看人很准，知道每个学生的瓶颈在哪里。",
  background: "大学游泳队教练，执教二十多年，带出过不少优秀运动员。",
  motivation: "真心希望每个学生都能游出自己的路。",
  arc: "",
  notes: "",
  sortOrder: 2,
  createdAt: new Date(now - MS_HOUR * 48).toISOString(),
  updatedAt: new Date(now - MS_HOUR * 1).toISOString(),
}

const charCoachLi = {
  id: generateId(),
  novelId: sampleNovel.id,
  name: "李教练",
  aliases: "",
  age: "40岁左右",
  gender: "男",
  appearance: "戴眼镜，穿深灰色夹克，目光犀利，打量人时像在估量一件商品。",
  personality: "冷静、犀利、不拘一格。敢于给有潜力的年轻人机会。",
  background: "省队教练，负责选拔有潜力的年轻运动员。",
  motivation: "发掘真正有天赋且有意愿的运动员。",
  arc: "",
  notes: "",
  sortOrder: 3,
  createdAt: new Date(now - MS_HOUR * 48).toISOString(),
  updatedAt: new Date(now - MS_HOUR * 1).toISOString(),
}

const charMother = {
  id: generateId(),
  novelId: sampleNovel.id,
  name: "陈母",
  aliases: "",
  age: "50岁左右",
  gender: "女",
  appearance: "年轻时穿泳衣站在领奖台上笑得灿烂，如今微信头像是荷花。",
  personality: "沉默、内敛、有未竟的心结。",
  background: "年轻时也是游泳运动员，曾获得过不错的成绩，但后来因故放弃了游泳，从此再也不靠近泳池。女儿玉冰继承了她在游泳上的天赋。",
  motivation: "",
  arc: "需要与自己的过去和解。",
  notes: "母女之间的那条线——游泳——既是纽带也是隔阂。",
  sortOrder: 4,
  createdAt: new Date(now - MS_HOUR * 48).toISOString(),
  updatedAt: new Date(now - MS_HOUR * 1).toISOString(),
}

// ─── Character Relationships ────────────────────────────────────────────────

const sampleRelationships = [
  {
    id: generateId(),
    novelId: sampleNovel.id,
    characterId1: charYubing.id,
    characterId2: charMother.id,
    relationshipType: "家人",
    description: "母女，玉冰的母亲曾是游泳运动员",
    createdAt: new Date(now - MS_HOUR * 48).toISOString(),
    updatedAt: new Date(now - MS_HOUR * 48).toISOString(),
  },
  {
    id: generateId(),
    novelId: sampleNovel.id,
    characterId1: charYubing.id,
    characterId2: charCoachZhou.id,
    relationshipType: "师徒",
    description: "大学游泳队教练",
    createdAt: new Date(now - MS_HOUR * 48).toISOString(),
    updatedAt: new Date(now - MS_HOUR * 48).toISOString(),
  },
  {
    id: generateId(),
    novelId: sampleNovel.id,
    characterId1: charYubing.id,
    characterId2: charCoachLi.id,
    relationshipType: "师徒",
    description: "省队教练，发掘了玉冰的潜力",
    createdAt: new Date(now - MS_HOUR * 36).toISOString(),
    updatedAt: new Date(now - MS_HOUR * 36).toISOString(),
  },
  {
    id: generateId(),
    novelId: sampleNovel.id,
    characterId1: charYubing.id,
    characterId2: charXiaohe.id,
    relationshipType: "对手",
    description: "同宿舍的省队队友，亦敌亦友",
    createdAt: new Date(now - MS_HOUR * 12).toISOString(),
    updatedAt: new Date(now - MS_HOUR * 12).toISOString(),
  },
]

// ─── World Terms ────────────────────────────────────────────────────────────

const sampleTerms = [
  {
    id: generateId(),
    novelId: sampleNovel.id,
    term: "XX大学游泳馆",
    type: "地点",
    definition: "故事开篇的主要场景。泳池的灯光泛着蓝色的波纹，池底黑线笔直。更衣室有荧光灯和发黄的海报。",
    notes: "",
    createdAt: new Date(now - MS_HOUR * 48).toISOString(),
    updatedAt: new Date(now - MS_HOUR * 48).toISOString(),
  },
  {
    id: generateId(),
    novelId: sampleNovel.id,
    term: "省队训练基地",
    type: "地点",
    definition: "位于城市另一端，包含田径场、篮球馆、游泳馆等多个场馆。游泳馆外墙为蓝色玻璃幕墙。",
    notes: "陈玉冰转训到省队后的主要场景",
    createdAt: new Date(now - MS_HOUR * 36).toISOString(),
    updatedAt: new Date(now - MS_HOUR * 36).toISOString(),
  },
  {
    id: generateId(),
    novelId: sampleNovel.id,
    term: "奖牌墙",
    type: "地点",
    definition: "学校游泳馆走廊中的一面墙，陈列着历年游泳队赢得的荣誉。最中间是全国大学生锦标赛团体金牌。",
    notes: "陈玉冰的照片也在这面墙上",
    createdAt: new Date(now - MS_HOUR * 40).toISOString(),
    updatedAt: new Date(now - MS_HOUR * 40).toISOString(),
  },
  {
    id: generateId(),
    novelId: sampleNovel.id,
    term: "全运会",
    type: "事件",
    definition: "全国运动会的简称，中国国内最高水平的综合性体育赛事。李教练选拔陈玉冰的目标就是备战明年的全运会。",
    notes: "",
    createdAt: new Date(now - MS_HOUR * 34).toISOString(),
    updatedAt: new Date(now - MS_HOUR * 34).toISOString(),
  },
  {
    id: generateId(),
    novelId: sampleNovel.id,
    term: "自由泳",
    type: "概念",
    definition: "竞技游泳比赛项目之一，陈玉冰和林小禾的主项。",
    notes: "一百米自由泳是主要比赛距离",
    createdAt: new Date(now - MS_HOUR * 48).toISOString(),
    updatedAt: new Date(now - MS_HOUR * 48).toISOString(),
  },
  {
    id: generateId(),
    novelId: sampleNovel.id,
    term: "T形触板",
    type: "物品",
    definition: "泳池终点的触摸感应装置，运动员触碰到板即停止计时。黑色T形。",
    notes: "",
    createdAt: new Date(now - MS_HOUR * 6).toISOString(),
    updatedAt: new Date(now - MS_HOUR * 6).toISOString(),
  },
]

// ─── Plot Events ────────────────────────────────────────────────────────────

const samplePlotEvents = [
  {
    id: generateId(),
    novelId: sampleNovel.id,
    chapterId: sampleChapters[0].id,
    title: "日常训练受挫",
    description: "陈玉冰在晚训中游出34.27秒，比昨天慢了0.3秒。教练老周叫她上去，暗示有重要的事。",
    sortOrder: 0,
    createdAt: new Date(now - MS_HOUR * 48).toISOString(),
    updatedAt: new Date(now - MS_HOUR * 48).toISOString(),
  },
  {
    id: generateId(),
    novelId: sampleNovel.id,
    chapterId: sampleChapters[1].id,
    title: "母亲的影子",
    description: "更衣室里看到母亲的消息。陈玉冰回忆起母亲也曾是游泳运动员。听到教练在背后议论她的成绩下滑。",
    sortOrder: 1,
    createdAt: new Date(now - MS_HOUR * 36).toISOString(),
    updatedAt: new Date(now - MS_HOUR * 36).toISOString(),
  },
  {
    id: generateId(),
    novelId: sampleNovel.id,
    chapterId: sampleChapters[2].id,
    title: "省队选拔的机会",
    description: "省队李教练出现在办公室，给陈玉冰一张名片，邀请她参加全运会选拔。老周点出问题在于她的心态。母亲的心结第一次被明示。",
    sortOrder: 2,
    createdAt: new Date(now - MS_HOUR * 24).toISOString(),
    updatedAt: new Date(now - MS_HOUR * 24).toISOString(),
  },
  {
    id: generateId(),
    novelId: sampleNovel.id,
    chapterId: sampleChapters[3].id,
    title: "进入省队",
    description: "陈玉冰带着旧旅行袋来到省队训练基地，见到了室友兼竞争对手林小禾。",
    sortOrder: 3,
    createdAt: new Date(now - MS_HOUR * 12).toISOString(),
    updatedAt: new Date(now - MS_HOUR * 12).toISOString(),
  },
  {
    id: generateId(),
    novelId: sampleNovel.id,
    chapterId: sampleChapters[4].id,
    title: "第一场对决",
    description: "陈玉冰在省队的第一次正式训练，与林小禾进行一百米自由泳对抗。林小禾58.9秒，陈玉冰61.3秒。林小禾的刻苦训练态度让陈玉冰深受触动。",
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
for (const char of [charYubing, charXiaohe, charCoachZhou, charCoachLi, charMother]) {
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
    `5 characters, ${sampleRelationships.length} relationships, ` +
    `${sampleTerms.length} world terms, ${samplePlotEvents.length} plot events.`
)
