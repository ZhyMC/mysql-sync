import Tunnel from "tunnel-ssh";
import MysqlDump from "mysqldump";
import net from "net";
import GetPort from "get-port";
import EventEmitter from "events";
import Path from "path";
import fs from "fs-extra";
import { MySqlImport } from "./MysqlImport";

export interface Logger{
    warn(msg:string):void;
    info(msg:string):void;
    error(msg:string):void;
}
export interface TaskOption{
    working_dir:string;

    dst_ssh:{
        host:string;
        port:number;
        user:string;
        pass:string;
    }

    dst_mysql:{
        host:string;
        port:number;
        user:string;
        pass:string;
        db:string;
    };

    local_mysql:{
        port:number;
        user:string;
        pass:string;
    };

}

export const DefaultTaskOption: TaskOption = {
    working_dir: "./",

    dst_ssh: {
        host: "remote.ssh.host",
        port: 22,
        user: "root",
        pass: "password"
    },

    dst_mysql: {
        host: "127.0.0.1",
        port: 3306,
        user: "root",
        pass: "sqlpass",
        db: "dbname"
    },

    local_mysql:{
        port: 3306,
        user: "root",
        pass: "sqlpass"
    }
};

export class SyncTask extends EventEmitter{
    private tunnel? : net.Server;
    private option : TaskOption;

    private local_host? : string;
    private local_port? : number;

    private logger : Logger;

    private state : "unready" | "ready" | "running" | "finish" | "error";
    constructor(option : TaskOption,logger : Logger){
        super();
        this.option = option;
        this.logger = logger;
        this.state = "unready"

        this.on("done",(err)=>{
            if(err){
                this.logger.error(`任务以错误的方式结束 ${err}`);
                return;
            }
            this.logger.info(`任务已经完成`);
        })
        this.init();
    }
    async start(){
        if(this.state != "ready")
            throw new Error(`当前状态为 ${this.state}, 不为 ready`);

        this.state = "running";
        try{
            await this.doTask();
            
            this.setDone();
        }catch(err){
            this.setDone(err);
        }
    }
    private setDone(err?: Error){
        if(err)
            this.state = "error";
        else
            this.state = "finish";

        this.emit("done",err);
    }
    private async doTask(){

        let sqlfile = Path.join(this.option.working_dir,"dump.sql");
        
        if(await fs.pathExists(sqlfile)) await fs.remove(sqlfile);

        this.logger.info(`开始从远程数据库导出 SQL 文件`);

        await MysqlDump({
            connection:{
                host:this.local_host,
                port:this.local_port,
                user:this.option.dst_mysql.user,
                password:this.option.dst_mysql.pass,
                database:this.option.dst_mysql.db
            },
            dumpToFile:sqlfile
        });
        this.logger.info(`已导出至 ${sqlfile}`);

        this.logger.info(`开始从 ${sqlfile} 导入到本地数据库...`);

        this.logger.info(`这可能使用很久时间, 请等待...`);
        await MySqlImport({
            host:this.local_host as string,
            port:this.option.local_mysql.port,
            user:this.option.local_mysql.user,
            password:this.option.local_mysql.pass,
            database:this.option.dst_mysql.db,
            sqlfile
        });
        this.logger.info(`导入至本地数据库完毕`);

        if(await fs.pathExists(sqlfile)) await fs.remove(sqlfile);
        this.tunnel?.close();

    }
    private async init(){
        this.local_host = "127.0.0.1";
        this.local_port = await GetPort();

        this.logger.info("开始建立 SSH 隧道...")
        try{
            await this.initTunnel();
            this.logger.info(`建立 SSH 隧道 完毕`);

            this.state = "ready";
            this.emit("ready");

        }catch(err){
            this.logger.error(`建立 SSH 隧道失败 ${err.stack}`);
            this.setDone(err);
        }

    }
    private async initTunnel(){
        return new Promise<void>((resolve,reject)=>{
            this.tunnel = Tunnel({
                host:this.option.dst_ssh.host,
                username:this.option.dst_ssh.user,
                password:this.option.dst_ssh.pass,
                port:this.option.dst_ssh.port,
                localHost:this.local_host,
                localPort:this.local_port,
                dstHost:this.option.dst_mysql.host,
                dstPort:this.option.dst_mysql.port
            },(err)=>{
                if(err){
                    reject(err);
                    return;
                }
                resolve();
            });
        })

        
    }
}