import mysql from "mysql2";
import Path from "path";
import child_process from "child_process";

interface Option  {
    host:string;
    port:number;
    user:string;
    password:string;
    database:string;
    sqlfile:string
}

export async function MySqlImport(option : Option){
    let conn = mysql.createConnection({
        host:option.host,
        port:option.port,
        user:option.user,
        password:option.password
    }).promise();

    await conn.query(`CREATE DATABASE IF NOT EXISTS ${option.database}`);
    
    let [result] : any = await conn.query('SHOW VARIABLES LIKE ?', ['basedir']);
    if(!result[0] || !result[0].Value)    
        throw new Error("无法获取到基础目录变量");

    let exec =  Path.join(result[0].Value,"./bin","./mysql");
    let template = 
    process.platform == "win32" ? 
    `"{executable}" -u{username} -p{password} {database} < {file}`:
    `{executable} -u{username} -p{password} {database} < {file}`;

    let cmd = template
    .replace('{executable}',exec)
    .replace('{username}',option.user)
    .replace('{password}',option.password)
    .replace('{database}',option.database)
    .replace('{file}',option.sqlfile)

    try{
        await new Promise<string>((resolve,reject)=>child_process.exec(cmd,(err,stdout,stderr)=>{
            if(err){
                reject(err);
                return;
            }
            resolve(stdout);
        }));
        return;
    }catch(err){
        throw err;
    }finally{
        conn.destroy();
    }
}
