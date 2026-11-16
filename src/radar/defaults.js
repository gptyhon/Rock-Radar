// Original fallback values from index.html; each mount receives fresh data.
export function createRadarDefaults(BackgroundEffects) {
let COLOR_PRESETS = [
            { name: "青蓝", color: "#00ffff", bg1: "#001a1a", bg2: "#000d0d" },
            { name: "洋红", color: "#ff00ff", bg1: "#1a001a", bg2: "#0d000d" },
            { name: "明黄", color: "#ffff00", bg1: "#1a1a00", bg2: "#0d0d00" },
            { name: "翠绿", color: "#00ff00", bg1: "#001a00", bg2: "#000d00" },
            { name: "橙红", color: "#ff4500", bg1: "#1a0700", bg2: "#0d0300" }
        ];
let CONFIG = {
            RADAR_SCALE: 0.9,           // 雷达图底图大小缩放比例
            RADAR_GRID_LEVELS: 5,        // 雷达图底图行数（圈数）
            RADAR_GRID_LINE_WIDTH: 3,    // 雷达图底图线条粗细
            RADAR_GRID_LINE_OPACITY: 0.2, // 雷达图底图线条透明度
            PARTICLE_OPACITY_MULT: 2.0,  // 背景粒子特效透明度倍率
            PARTICLE_SIZE_MULT: 2.0,     // 背景粒子特效大小倍率
            BG_EFFECT_MODE: 'living-field', // 背景特效：particles / living-field / off
            BG_EFFECT_CONFIG: BackgroundEffects.normalizeConfig(),
            RADAR_AUDIO_FX_MODE: 'tech', // 雷达周围音频动效：tech / pulse / orbit / off
            VERTEX_COUNT: 6,             // 雷达图顶点数（默认为6边形，可改为8边形等）,一定要把DIM_NAMES等数组内容也改成对应的个数!
            INTRO_WAIT_TIME: 1000, // 蓝色前奏时长 (ms)
            MUSIC_VOLUME: 0.7, // 背景音乐音量（0-1）
            MUSIC_DELAY_SECONDS: 0, // 演出开始后音乐延迟启动秒数
            MUSIC_TRACKS: "/assets/audio/music.mp3", // 背景音乐列表，逗号分隔
            OUTRO_VIDEO: "/assets/video/ending.mp4", // 全部角色结束后的结尾视频
            OUTRO_TRANSITION_MS: 1100, // 结尾视频转场时长 (ms)

            // 雷达图各个维度的名称
            DIM_NAMES: ["创新性", "旋律", "歌词", "影响力", "主唱", "乐器"],
            // 六个维度的满分基准线，每个维度可单独控制
            BASE_MAX_SCORES: [10, 10, 10, 10, 10, 10], 
            // 六个维度的允许最低分数，每个维度可单独控制
            MIN_SCORES: [5, 5, 5, 5, 5, 5], 

            ANIM_DURATION: 1500, // 雷达各项数值生长动画的过渡时间 (ms)

            // 是否启用特殊的数值格式化（如雷达图的实际值在 11-19 时显示为 "10+"）
            ENABLE_SPECIAL_FORMAT: true, 
            DEFAULT_DURATION: 5000, // 默认每页的的展示时长 (ms)
            SHOW_DESC: true, // 是否显示羁绊图标/标签
            IMAGE_SCALE: 1.0, // 图片默认缩放比例 (1.0 为原始大小)
            PRESENTATION_SCALE: 1.3, // 主体舞台倍率；与屏幕物理分辨率无关

            // 哪些维度显示为百分数（例如 0.7 变为 70%）。数组长度 6，true 表示显示为百分数，false 表示显示为普通数字
            USE_PERCENTAGE: [false, false, false, false, false, false],
            // 真实百分比：直接把输入值当作百分数显示（例如填 20 显示 20%），与 USE_PERCENTAGE 互斥
            REAL_PERCENTAGE: [false, false, false, false, false, false],
            LABEL_MARGIN: 80, // 维度名称距离雷达图外圈的距离 (px)，默认 80
            USE_AUTO_PRECISION: true, // 是否根据 points 中定义的位数自动控制显示精度（例如写 8.5 就显示 8.5，写 8 就显示整数）
            SHOW_SCORE_UNDER_NAME: false, // 是否将评分数值显示在维度名称下方

            BEST_COLOR: '#fff2a6',  // Best标记颜色（金白亮金）
            BEST_LABEL_FONT: 'italic 800 36px "Cormorant Garamond", "Georgia", "Times New Roman", serif', // Best维度标题字体
            BEST_VALUE_FONT: 'italic 900 42px "Cormorant Garamond", "Georgia", "Times New Roman", serif', // Best分数字体
            BEST_FONT: 'italic 800 34px "Cormorant Garamond", "Georgia", "Times New Roman", serif', // Best标记字体

            GACHA_ANIM_DURATION: 4500, // 抽卡出金动画总时长 (ms)
            GACHA_ANIM_TYPE: 2,       // 抽卡动画类型，固定为故障神启
            GACHA_FONT_STYLE: 0,       // 抽卡艺术字风格 (0-3)
            GACHA_LOGO_ON_TIME: 120,   // hsr_logo.webp 出现时间点 (ms)
            GACHA_LOGO_DURATION: 400,  // hsr_logo.webp 停留时长 (ms)
            PHOTO_FX_ENABLED: true,    // 角色图后层粒子开关
            PHOTO_FX_INTENSITY: 1.0,   // 角色图后层粒子强度
            RADAR_AUTO_OFFSET: false,  // 雷达图是否根据形状自动平移中心（会导致“突然上移/下移”）
            PERFORMANCE_MODE: 'balanced', // high / balanced / smooth
            ADAPTIVE_PERF: true,          // 动态降级开关
            BRAND_TOP_RIGHT_TEXT: 'HONKAI: STAR RAIL V4.0',
            BRAND_BOTTOM_LEFT_TEXT: 'CURRENCY WAR / IPC',
            BRAND_WATERMARK_CN: '货币战争',
            BRAND_WATERMARK_EN: 'CURRENCY WAR',
            INTRO_TITLE_MAIN: '货币战争雷达图 V4.0',
            INTRO_TITLE_SUB: 'Currency War Radar System',
        };
let mvplist = ["castorice"];
let IMAGE_META = {};
let namelist = [

{ name: "castorice", points: [15, 15, 10, 20, 10, 10], desc: "无需多言", colorMode: "preset", colorIndex: 0, duration: 6000 },
{ name: "Nirvana", points: [9, 8, 9, 12, 9, 7], desc: "xqcl", colorMode: "preset", colorIndex: 1 },
{ name: "Radiohead", points: [13, 8, 9, 10, 8, 12], desc: "rym亲爹。我一直是idm粉丝啊", colorMode: "preset", colorIndex: 2 },
{ name: "Bob Dylan", points: [14, 4, 15, 14, 1, 2], desc: "诺贝尔文学奖得主的含金量，要歌词有歌词，唱功有歌词", colorMode: "preset", colorIndex: 3 },
        ];
return { COLOR_PRESETS, CONFIG, mvplist, IMAGE_META, namelist };
}
