$(document).ready(function () {
    // ==========================  初始設定  ============================
    // 是否是用秒數測試呢? (受試者測試改false、demo時用true)
    // 改 有一個常數作為分秒換算乘上的值
    var isSecond = true;
    var c = isSecond ? 1 : 60;
    console.log(c);
    var day = 1;
    var end_day = false;
    var task = {};

    // 設定order並轉換時間
    for (var i=1; i<schedule.length-1; i++){
      var s = schedule[i];
      for (var j=0; j<s.length; j++){
        var task = s[j];
        task.order = j;
        task.start_time = (j==0)? "17:00" : convert(s[j-1]);
      }
    }
    setting();
    // 開啟本頁面的初始判斷：是否已經開始一天的行程 (是否有task)
    function setting(){
      day = get_day() || 2;
      if (!get_task()) {
        set_schedule(schedule);
        // task設定根據現在day
        task = schedule[day][0];
        console.log(task)
        set_task(task);
        task = get_task();
        set_remain(-1 * get_remain());
        start_task();
      } else {
        if (get_task() == undefined) {
            set_schedule(schedule);
            task = schedule[day][0];
            console.log(task)
            set_task(task);
            task = get_task();
            start_task();
        } else {
            console.log(true)
            task = get_task();
            if (!task.real_start_unixtime) {
                start_task();
            }
        }
      }
    }
    

    // ===================  顯示資料於畫面上, 含重新整理時(進度條, 放大卡片)  =====================
    // 照資料顯示進度條資料
    update();
    function update() {
        var schedule = get_schedule();
        var task = get_task();
        var str = "";
        // 計算總房子數，讓畫面填滿視窗
        var all_house = schedule[task.day].reduce(function (previous, current) {
            return (previous + current.house_num);
        }, 0);
        console.log(`共有${all_house}棟房子`);
        // 設定task的數量 (css property)
        $("body").get(0).style.setProperty("--num", all_house);

        // 呼叫updateCard
        updateCard(task);

        // 畫行程表
        for (var s of schedule[task.day]) {
            var color = s.type == 0 ? "work" : "play";
            // 可畫兩棟房子
            var houseHTML = `<img class="house" src="../static/img/icon_${color}house.png"></img>`;
            var progressStr =
                `<div class="task num_${s.house_num} ${color}">
                    <div class="icon">
                        ${(houseHTML).repeat(s.house_num)}
                    </div>
                    <div class="progress">
                        <div class="progress-bar"></div>
                    </div>
                    <div class="task_name">
                        <span class="time">${s.start_time}</span>
                        ${(s.name).split(";")[0]}
                        <span class="detail">${(s.name).split(";")[1] || ""}</span>
                    </div>
                </div>`
            str += progressStr;
        }
        $(".schedule").html(str);
        var chinese_day = ["日", "一", "二", "三", "四", "五", "六"]
        $(".day").html(`星期${chinese_day[task.day]}`);

        // 依照狀態放小人怪物叉叉
        schedule[task.day].forEach(function (s) {
            if (s.state == 1) people(s);
            else if (s.state == 2) monster(s);
            else if (s.pass) cross(s);
            $(".task .progress-bar").eq(s.order).width(`${s.width}%`);
        })

        // 判斷是否正在執行：task是否有real_start_time
        // 若現在正在執行，發紅色光，剩餘時間顯示 "動態紀錄的時間" (要把動態紀錄的時間和Width存進資料庫><)
        if (task.real_start_time != "") {
            $(".task .progress").eq(task.order).addClass("active");
            // 重新計算長度回去
            var dt = new Date();
            var real_time_s = (dt.getTime() - task.real_start_unixtime) / 1000;
            var bar_increase = (100 / (task.time * 60));
            var increasing = bar_increase * real_time_s;
            $(".task .progress-bar").eq(task.order).width(`${increasing}%`);
            $(".zoom_card .progress-bar").width(`${increasing}%`);
            // 重要!!動態剩餘時間(若重新整理)
            var real_time = Math.floor((dt.getTime() - task.real_start_unixtime) / 60000);
            var newRemain = task.time - real_time;
            // start會做的事還是要做 (只是不計路時間)
            if (task.real_time !== "") {
                $(".btn.finish").hide();
                $(".btn.start").show();
            }
            bar_stop_move(task);
            bar_move(task, increasing);
            $(".remain").html(`還有 <span> ${newRemain} </span> 分鐘`);
        }
    }

    // 更新放大卡片的資料
    function updateCard(task) {
        var cardColor = task.type == 0 ? "work" : "play";
        var houseHTML = `<div class="house_container">
        <img class="house" src="../static/img/icon_${cardColor}house.png"></div>`
        var cardStr =
            `<div class="zoom_card mb-5 ${cardColor}">
                <div class="icon">
                    <div class="house_container">
                        <img class="house" src="../static/img/icon_${cardColor}house.png">
                        <div class="task_name">
                            ${(task.name).split(";")[0]}
                            <span class="detail">${(task.name).split(";")[1] || ""}<span>
                        </div>
                    </div>
                    ${(houseHTML).repeat(task.house_num - 1)}
                </div>
                <div class="progress">
                    <div class="progress-bar"></div>
                </div>
                <h1 class="remain">還有 <span> ...</span>分鐘</h1>
            </div>`;
        $(".zoom").html(cardStr);
    }


    // =====================  按鈕事件 + function(完成、開始、跳過、下一個)  =========================
    $(".btn.start").on("click", click_start);
    $(".btn.finish").on("click", finish_task);
    $(".btn.pass").on("click", pass_task);

    // 改 取得real_time (根據初始設定的 "c" )
    function get_real_time(task){
        var dt = new Date();
        var real_time = Math.floor((dt.getTime() - task.real_start_unixtime) / (c*1000));
        return real_time;
    }

    // 完成任務
    var auto_start;
    function finish_task() {
        var schedule = get_schedule();
        var task = get_task();
        // 改
        // var dt = new Date();
        // var real_time = Math.floor((dt.getTime() - task.real_start_unixtime) / (c*1000));
        var real_time = get_real_time(task);
        task.real_time = real_time;
        schedule[task.day][task.order] = task;
        set_task(task);
        // set_schedule(schedule)

        // 停止進度條動畫
        // 把完成時的width(bar progress)數值記下來
        schedule[task.day][task.order].width = ($(".task .progress-bar").eq(task.order).width() / $(".task .progress-bar").eq(task.order).parent().width()) * 100;
        set_schedule(schedule);

        // 若現在是工作
        if (task.type == 0) {
            var remain = task.time - task.real_time;

            // 提早情況
            if (remain > 0) {
                schedule = get_schedule();
                $(".zoom_card .task_name").html("休息！");

                people(task);
                schedule[task.day][task.order].state = 1; //設提早狀態
                set_schedule(schedule)

                // 彈跳視窗：顯示提早多久
                var title = `提早${remain}分鐘完成`;
                var content = `你提早完成了「${task.name}」任務，成功招募了小島民們
                <br> 在「${task.name}」任務的房子前放上小島民吧！`;
                var btnWord = "好的";
                modalShow(title, content, btnWord);

                // $('#myModal').on('show.bs.modal', function (event) {
                //     var modal = $(this);
                //     modal.find('.modal-title').text(`提早${remain}分鐘完成`);
                //     modal.find('.modal-body').html(`你提早完成了「${task.name}」任務，成功招募了小島民們
                // <br> 在「${task.name}」任務的房子前放上小島民吧！`);
                //     modal.find('.modal-footer .btn').text("好的");
                // });
                // $('#myModal').modal({
                //     backdrop: "static",
                // });
                console.log(`提早了${remain}分鐘!`);

                // 跳下一個任務
                $(".btn.start").show()
                $(".btn.finish").hide();

                auto_start = setInterval(click_start, remain * 60000);
            }
            // 延遲情況
            else {
                set_remain(remain)
                // 龍龍出現
                monster(task);
                schedule = get_schedule();
                schedule[task.day][task.order].state = 2; //設提早狀態

                set_schedule(schedule);
                schedule = get_schedule();

                // 彈跳視窗：延遲提早多久
                var title = `延遲了${Math.abs(remain)}分鐘完成`;
                var content = `你延遲完成了「${task.name}」任務，房子沒有蓋好，沒有小島子民到來
		        <br> 神獸生氣了阿！請立刻把神獸放在穀倉前面吧！`;
                var btnWord = "嗚嗚好吧...";
                modalShow(title, content, btnWord);
                // $('#myModal').on('show.bs.modal', function (event) {
                //     var modal = $(this);
                //     modal.find('.modal-title').text(`延遲了${Math.abs(remain)}分鐘完成`);
                //     modal.find('.modal-body').html(`你延遲完成了「${task.name}」任務，房子沒有蓋好，沒有小島子民到來
                // <br> 神獸生氣了阿！請立刻把神獸放在穀倉前面吧！
                // `);
                //     modal.find('.modal-footer .btn').text("嗚嗚好吧...");
                // });
                // $('#myModal').modal({
                //     backdrop: "static",
                // });
                console.log(`延遲了${Math.abs(remain)}分鐘!`);

                // 跳下一個任務並開始
                bar_stop_move(task);
                next_task(task, schedule);
                start_task();
            }
        }
        // 若是玩樂
        else {
            var title = `開始下一項任務吧`;
            var content = `開始下一項任務吧`;
            var btnWord = "好的";
            modalShow(title, content, btnWord);
            // $('#myModal').on('show.bs.modal', function (event) {
            //     var modal = $(this);
            //     modal.find('.modal-title').text(`開始下一項任務吧`);
            //     modal.find('.modal-body').html(`開始下一項任務吧`);
            //     modal.find('.modal-footer .btn').text("好的");
            // });
            // $('#myModal').modal({
            //     backdrop: "static",
            // });
            bar_stop_move(task);
            next_task(task, schedule);
            start_task();
        }
    }

    // 提早結束休息 (類似開始的功能)
    function click_start() {
        var task = get_task();
        var schedule = get_schedule();
        schedule[task.day][task.order].width = ($(".task .progress-bar").eq(task.order).width() / $(".task .progress-bar").eq(task.order).parent().width()) * 100;
        set_schedule(schedule);
        // 改
        // var dt = new Date();
        // var real_time = Math.floor((dt.getTime() - task.real_start_unixtime) / 60000);
        var real_time = get_real_time(task);
        var remain = task.time - real_time;
        set_remain(remain)
        clearInterval(auto_start);
        bar_stop_move(task);
        next_task(task, schedule);
        start_task();
    }

    // 開始任務 (一開始 & 換下一個任務時)
    function start_task() {
        if (end_day) {
            return null;
        }
        var dt = new Date();
        var task = get_task();

        // 如果是玩樂，要把前面省下來或占用的時間挪過來
        if (task.type == 1) {
            task.time += get_remain();

            var title = `開始玩樂`;
            var total_remain = get_remain();
            if (total_remain > 0) {
                var content = `因為前面任務提早了${total_remain}分鐘，可以得到額外的玩樂時間!`;
            } else {
                total_remain *= -1;
                var content = `因為前面任務延遲了${total_remain}分鐘，失去一些玩樂時間!`;
            }
            var btnWord = "好的";
            modalShow(title, content, btnWord);


            // $('#myModal').on('show.bs.modal', function (event) {
            //     var modal = $(this);
            //     var total_remain = get_remain();

            //     modal.find('.modal-title').text(`開始玩樂`);
            //     if (total_remain > 0) {
            //         modal.find('.modal-body').html(`因為前面任務提早了${total_remain}分鐘，可以得到
            // 額外的玩樂時間!`);
            //     } else {
            //         total_remain *= -1;
            //         modal.find('.modal-body').html(`因為前面任務延遲了${total_remain}分鐘，
            // 	失去一些玩樂時間!`);
            //     }
            //     modal.find('.modal-footer .btn').text("好的");
            // });
            // $('#myModal').modal({
            //     backdrop: "static",
            // });


            set_remain(-1 * get_remain());
        }

        // 測試用：縮短時間
        // task.time = Math.round(task.time / 60);
        task.real_start_unixtime = dt.getTime();
        task.real_start_time = dt.getHours() + ":" + dt.getMinutes();
        set_task(task);

        $(".btn.start").hide()
        $(".btn.finish").show()
        // 進度條動畫
        $(".task .progress").eq(task.order).addClass("active");
        bar_move(task);
    }

    // 跳過任務
    function pass_task() {
        var schedule = get_schedule();
        var task = get_task();
        task.pass = true;
        task.width = ($(".task .progress-bar").eq(task.order).width() / $(".task .progress-bar").eq(task.order).parent().width()) * 100;
        schedule[task.day][task.order] = task
        set_schedule(schedule);
        cross(task);
        bar_stop_move(task);

        var title = `跳過任務`;
        var content = `你跳過任務了！請在${task.name}上放一個綠色叉叉`;
        var btnWord = "好的";
        modalShow(title, content, btnWord);

        // $('#myModal').on('show.bs.modal', function (event) {
        //     var modal = $(this);
        //     modal.find('.modal-title').text(`跳過任務`);
        //     modal.find('.modal-body').html(`你跳過任務了！請在${task.name}上放一個
        // 		綠色叉叉 `);
        //     modal.find('.modal-footer .btn').text("好的");
        // });
        // $('#myModal').modal({
        //     backdrop: "static",
        // });
        next_task(task, schedule)
        start_task();
    }

    // 設定下一個任務
    function next_task(task, schedule) {
        $(".task .progress").eq(task.order).removeClass("active");
        if (task.order + 1 < schedule[task.day].length) {
            task = schedule[task.day][task.order + 1];
            // $(".day").html(`星期${task.day}`);
            set_task(task)
            // 更新card資料 (task跳下一個時)
            updateCard(task);
            return null
        }
        else {
            // 跳回首頁! day加1(task跳至下一天)
            end_day = true;
            setTimeout(function () {
                day += 1;
                set_day(day);
                var task = schedule[day][0];
                set_task(task);
                location.href = "start.html";
            }, 5000);
        }
    }

    // ================  畫面效果function(進度條動畫, 放上icon)  ==================
    // 進度條動畫 + 顯示剩餘時間
    var interval;
    function bar_move(task, increasing) {
        // 元素：外層progress、內層bar、下個玩樂
        var task = get_task();
        var progress = $(".task").eq(task.order);
        var bar = progress.find(".progress-bar");
        var progress_play = progress.nextAll(".play").eq(0);

        // 原始寬度(百分比)；一般progress、下個玩樂progress、bar
        var progress_width = progress.width() / progress.parent().width() * 100;
        var progress_play_width = progress_play.width() / progress_play.parent().width() * 100;
        // 若重新整理 bar_width起始非0
        var bar_width = increasing || 0;

        // 增加量(百分比)：100% 分給有幾"秒"
        // 改
        var bar_increase = (100 / (task.time * c));
        var progress_increase = bar_increase * (progress_width / 100);

        interval = setInterval(function () {
            // 動態時間顯示
            var task_int = get_task();
            // 改
            // var dt = new Date();
            // var real_time = Math.floor((dt.getTime() - task_int.real_start_unixtime) / (c*1000));
            var real_time = get_real_time(task_int);

            var remain = task_int.time - real_time;
            if (remain > 0) {
                $(".remain").html(`還有 <span> ${remain} </span> 分鐘`);
            } else {
                $(".remain").html(`<span>時間到啦!</span>`);
            }
            // 進度條動畫
            // 當bar畫滿時，外層progress增加，玩樂的progress減少
            if (bar_width >= 100) {
                console.log(task_int.real_start_unixtime);
                console.log(remain);

                bar_width = 100;
                bar.css("width", `${bar_width}%`);
                progress_width += progress_increase;
                progress.css("width", `${progress_width}%`);
                progress_play_width -= progress_increase;
                progress_play.css("width", `${progress_play_width}%`);
                // 工作且未完成
                if (get_task().type == 0 && get_task().real_time === "") {
                    bar.addClass("delay");
                    $(".zoom_card .progress-bar").addClass("delay");
                }
                else{
                    document.getElementById("audio").play();
                }
            }
            // bar寬度增加
            else {
                bar_width += bar_increase;
                bar.css("width", `${bar_width}%`);
                $(".zoom_card .progress-bar").width(`${bar_width}%`);
            }
        }, 1000);
    }
    function bar_stop_move(task) {
        clearInterval(interval);
    }

    // 彈跳視窗
    function modalShow(title, content, btnWord) {
        // $('#myModal').on('show.bs.modal', function (event) {
        //     console.log("出現");
        //     var modal = $(this);
        //     modal.find('.modal-title').text(title);
        //     modal.find('.modal-body').html(content);
        //     modal.find('.modal-footer .btn').text(btnWord);
        // });
        console.log("提示出現");
        var modal = $('#myModal');
        modal.find('.modal-title').text(title);
        modal.find('.modal-body').html(content);
        modal.find('.modal-footer .btn').text(btnWord);
        $('#myModal').modal({
            backdrop: "static",
        });
    }
    // 事件只能掛一次!!! 否則會執行很多次....
    $(".ok").on("click", function (e) {
        console.log("點擊好的");
        task = get_task();
        if (get_schedule()[task.day][task.order].state == 1) {
            $('#selectModal').modal({
                backdrop: "static"
            });
        }
    });
    $(".startFirst").on("click", function (e) {
        console.log("點擊提早開始");
        click_start();
    });



    // 小人 icon
    function people(task) {
        var boy = `<img class="boy" src="../static/img/icon_boy@2x.png" alt="">`;
        var icon = $(".task .icon").eq(task.order);
        icon.prepend(boy);
    }
    // 怪物 icon
    function monster(task) {
        var monster = `<img class="monster" src="../static/img/icon_龍龍@2x.png" alt="">`;
        var icon = $(".task .icon").eq(task.order).parent().nextAll(".play").eq(0).children(".icon");
        icon.prepend(monster);
    }
    // 叉叉icon
    function cross(task) {
        var cross = `<img class="cross" src="../static/img/icon_pass.png" alt="">`;
        var icon = $(".task .icon").eq(task.order);
        icon.prepend(cross);
    }


    // ======================= set/get localStorage資料  ===========================
    // schedule為二維Array，第一是星期，0是周日1是周一以此類推
    // 第二是第幾個任務，每個任務長度不等，
    // schedule[3][2]代表周三的第N個任務，每個任務為dict格式
    function set_schedule(schedule) {
        localStorage.setItem("schedule", JSON.stringify(schedule));
    }
    function get_schedule() {
        var data = localStorage.getItem("schedule");
        return JSON.parse(data);
    }
    //task是任務，dict格式，key有:
    // day 星期日期
    // order 當天第幾個任務次序，從0開始
    // name 任務名稱
    // type 任務型態 ，0為工作，1為玩樂
    // start_time 表定開始時間
    // time  表定執行時間長度，單位分鐘
    // real_start_time  實際開始時間
    // real_time  實際執行長度，單位分鐘
    // real_start_unixtime為計算時間方便，為1970年1月1日零時零分計起到起始時間的毫秒數
    // pass 是否被略過
    // state是狀態，0為未開始、1為提早、2為延遲
    function set_task(task) {
        // 傳入JSON存入內存
        localStorage.setItem("task", JSON.stringify(task));
    }
    function get_task() {
        var data = localStorage.getItem("task");
        return JSON.parse(data);
    }
    function get_remain() {
        var data = localStorage.getItem("remain");
        return JSON.parse(data);
    }
    function set_remain(remain) {
        ori_remain = get_remain()
        localStorage.setItem("remain", JSON.stringify(ori_remain + remain));
    }
    // 星期幾資料
    function get_day() {
        var data = localStorage.getItem("day");
        return JSON.parse(data);
    }
    function set_day(day) {
        localStorage.setItem("day", JSON.stringify(day));
    }


    // ======================= AJAX  ===========================
    // var refresh = setInterval(refresh, 5000);
    // function refresh() {
    //     $.getJSON(url = "/refresh", data = {
    //         schedule: JSON.stringify(get_schedule()),
    //         task: JSON.stringify(get_task()),
    //         remain: get_remain()
    //     },
    //         function (data) {
    //             if (data) {
    //                 if (data[0]) {
    //                     set_schedule(data[0]);
    //                 }
    //                 if (data[1]) {
    //                     set_task(data[1]);
    //                 }
    //                 if (data[2]) {
    //                     set_remain(data[2]);
    //                 }
    //             }
    //         });
    //     clearInterval(refresh);
    // }
});