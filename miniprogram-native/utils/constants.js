const CITIES = [
  '北京', '上海', '广州', '深圳', '杭州', '南京', '武汉', '成都',
  '重庆', '西安', '苏州', '天津', '青岛', '长沙', '郑州', '大连',
  '沈阳', '济南', '福州', '厦门', '合肥', '昆明', '哈尔滨', '长春',
  '贵阳', '太原', '石家庄', '兰州', '乌鲁木齐', '呼和浩特'
]

const SUBJECTS = ['语文', '数学', '英语', '物理', '化学', '生物', '历史', '地理', '政治']

const EDUCATION_DEPT_LINKS = {
  北京: 'https://jw.beijing.gov.cn/',
  上海: 'https://edu.sh.gov.cn/',
  广州: 'https://jyj.gz.gov.cn/',
  深圳: 'https://szeb.sz.gov.cn/',
  杭州: 'https://edu.hangzhou.gov.cn/',
  南京: 'https://edu.nanjing.gov.cn/',
  武汉: 'https://jyj.wuhan.gov.cn/',
  成都: 'https://edu.chengdu.gov.cn/',
  重庆: 'https://jw.cq.gov.cn/',
  西安: 'http://edu.xa.gov.cn/',
  苏州: 'https://jyj.suzhou.gov.cn/',
  天津: 'https://jy.tj.gov.cn/',
  青岛: 'http://edu.qingdao.gov.cn/',
  长沙: 'http://jyj.changsha.gov.cn/',
  郑州: 'https://zzjy.zhengzhou.gov.cn/',
  大连: 'https://edu.dl.gov.cn/',
  沈阳: 'http://jyj.shenyang.gov.cn/',
  济南: 'http://jnedu.jinan.gov.cn/',
  福州: 'https://jyj.fuzhou.gov.cn/',
  厦门: 'https://edu.xm.gov.cn/',
  合肥: 'https://jyj.hefei.gov.cn/',
  昆明: 'https://jtj.km.gov.cn/',
  哈尔滨: 'https://www.harbin.gov.cn/haerbin/c104550/ty_list.shtml',
  长春: 'http://jyj.changchun.gov.cn/',
  贵阳: 'https://jyj.guiyang.gov.cn/',
  太原: 'https://jyj.taiyuan.gov.cn/',
  石家庄: 'http://sjzjyj.sjz.gov.cn/',
  兰州: 'https://jyj.lanzhou.gov.cn/',
  乌鲁木齐: 'http://www.urumqi.gov.cn/fjbm/jyj.htm',
  呼和浩特: 'http://jyj.huhhot.gov.cn/'
}

module.exports = {
  CITIES,
  SUBJECTS,
  EDUCATION_DEPT_LINKS
}
