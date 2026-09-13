HSPC-atlas 部署文档
您好！为适配分配到的二级域名 https://www.biosino.org/HSPC-atlas/，并且不占用服务器额外向外暴露的端口，本项目已整体封装为 docker-compose 架构。

架构特点：
内部包含了独立的前端 Nginx 路由中心以及两个 Cellxgene 数据后端，已在内部完美处理了 Subpath 映射和 API 纠偏。对外仅暴露唯一端口（8080，暂时设定，请您根据具体情况修改）。

麻烦您协助进行以下两步操作，即可一键上线：

步骤一：在服务器启动 Docker Compose 服务
请解压附件的压缩包，在根目录下执行以下命令（首次执行约需 1-2 分钟构建底层环境）：

Bash
docker-compose up -d --build
(如遇 8080 端口已被占用，请自行修改 docker-compose.yml 中的外射端口即可。)

步骤二：在宿主机主 Nginx 配置反向代理
容器成功运行后，麻烦在 Biosino 主服务器的 Nginx 配置文件中，加入以下规则。
将分配给我们的 /HSPC-atlas/ 路径，原封不动地（注意 proxy_pass 结尾不要加斜杠）代理到本机的 8080 端口（暂时设定，请您根据具体情况修改）即可：

Nginx
location /HSPC-atlas/ {
    proxy_pass http://127.0.0.1:8080;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    
    # 维持单细胞数据渲染必需的 WebSocket 通道
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
}
配置完成后重载主 Nginx（sudo nginx -s reload）即可，非常感谢您的支持与配合！