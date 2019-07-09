var sun = [];
var mon = [
    new Task(1,"吃晚餐",0, 2),
    new Task(1,"聽英文",0, 1),
    new Task(1,"英文課",0, 5),
    new Task(1,"寫功課",0, 1),
    new Task(1,"洗澡",0, 1),
];
var tue = [
    new Task(2,"吃晚餐",0, 2),
    new Task(2,"寫功課",0, 1),
    new Task(2,"聽英文",0, 2),
    new Task(2,"看電視",1, 1),
    new Task(2,"寫功課",0, 1),
    new Task(2,"看電視",1, 1),
    new Task(2,"洗澡",0, 1),
];
var wed = [
    new Task(3,"吃晚餐",0, 2),
    new Task(3,"寫功課",0, 1),
    new Task(3,"聽英文",0, 2),
    new Task(3,"看電視",1, 1),
    new Task(3,"寫功課",0, 1),
    new Task(3,"玩電腦",1, 1),
    new Task(3,"洗澡",0, 1),
]
var thu = [
    new Task(4,"吃晚餐",0, 2),
    new Task(4,"聽英文",0, 1),
    new Task(4,"英文課",0, 5),
    new Task(4,"寫功課",0, 1),
    new Task(4,"洗澡",0, 1),
];
var fri = [
    new Task(5,"吃晚餐",0, 2),
    new Task(5,"寫功課",0, 1),
    new Task(5,"聽英文",0, 1),
    new Task(5,"看電視",1, 1),
    new Task(5,"寫功課",0, 1),
    new Task(5,"玩電腦",1, 2),
    new Task(5,"洗澡",0, 1),
    new Task(5,"玩平板",1, 1),
];
var sat = [];
var schedule = [sun, mon, tue, wed, thu, fri, sat];

// ==========================================================
// 任務建構式
function Task(day, name, type, house_num){
    this.day = day;
    this.name = name;
    this.type = type;
    this.house_num = house_num;
    this.time = (this.house_num)*30;
    this.order = 0;
    this.start_time = "";
    this.real_start_time = "";
    this.real_start_unixtime = "";
    this.real_time = "";
    this.pass= false;
    this.state = 0;
    this.width = "";
}
// 計算時間
function convert(pre){
    var s = pre.start_time;
    var t = pre.time;
    var hour = Number(s.split(":")[0]);
    var min = Number(s.split(":")[1]);
    $(".hour").html(hour);
    min += t;
    if (min >=60){
        var plus = Math.floor(min/60);
        hour += plus;
        min -= plus*60;
    }
    min = ("0"+min).slice(-2) 
    return (`${hour} : ${min}`);
}

