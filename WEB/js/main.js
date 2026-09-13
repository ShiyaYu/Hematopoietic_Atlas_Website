/**
 * Hematopoietic Atlas - Main JavaScript File
 */

document.addEventListener("DOMContentLoaded", () => {
    // 确认脚本已成功加载，方便在浏览器控制台(F12)调试路径是否正确
    console.log("Hematopoietic Atlas website script loaded successfully.");

    // 平滑滚动效果 (适用于页面内的锚点链接，例如 href="#section-id")
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const targetId = this.getAttribute('href');
            
            // 排除仅用作下拉菜单触发器的空链接 (href="#")
            if (targetId !== '#') {
                const targetElement = document.querySelector(targetId);
                if (targetElement) {
                    e.preventDefault();
                    targetElement.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            }
        });
    });

    // TODO: 如果未来您需要在没有 iframe 的页面中直接使用 Plotly.js 或 Echarts 渲染图表
    // 可以在这里编写图表的初始化逻辑
});