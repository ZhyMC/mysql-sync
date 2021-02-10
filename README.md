# Mysql-Sync

## 简介

这是一个基于 SSH隧道 的自动导入远程Mysql数据库到本地Mysql数据库的脚本

## 用途

通常用途是将线上的远程数据库同步至本地，或者开发服务器，用于搭建开发环境。

## 用法

克隆本仓库

```
git clone https://github.com/zhymc/mysql-sync
```

运行命令初始化一个任务配置

```
mkdir dev
cd dev
node ../bin/cli --init
```

打开 task.json 并修改默认任务配置
```
{
  "working_dir": "./",
  "dst_ssh": {
    "host": "remote.ssh.host",
    "port": 22,
    "user": "root",
    "pass": "sshpass"
  },
  "dst_mysql": {
    "host": "127.0.0.1",
    "port": 3306,
    "user": "root",
    "pass": "sqlpass",
    "db": "dbname"
  },
  "local_mysql": {
    "port": 3306,
    "user": "root",
    "pass": "sqlpass"
  }
}
```

然后直接运行命令
```
node ../bin/cli -c task.json
```

则会开始自动同步, 若远程数据库过大, 

导入需要很长时间, 这与本地数据库的插入性能有关


