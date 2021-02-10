require("./compile");

const { SyncTask, DefaultTaskOption } = require("../lib/SyncTask");
const meow = require("meow");
const fs = require("fs");
const cli = meow(`

Options:
    --init 初始化任务配置文件, 生成一个 task.json
    --config, -c 指定一个任务配置文件

`,{
    flags:{
        init:{
            type:"boolean"
        },
        config:{
            alias:"c",
            type:"string"
        }
    }
});


if(cli.flags.init){
    fs.writeFileSync("task.json",JSON.stringify(DefaultTaskOption,"t",2));
}else if(cli.flags.config){

    let config = JSON.parse(fs.readFileSync(cli.flags.config));

    let task = new SyncTask(config,console);
    task.on("ready",()=>{
        task.start();
    })

}else{
    cli.showHelp();
}
