/**
 * Portraits of Tissues - Final Polished & Integrated Version
 */

document.addEventListener("DOMContentLoaded", () => {
    
    // ==========================================
    // 1. 全局状态与本地 Tissue Scale 数据
    // ==========================================
    let currentDataset = "HSPC";
    let currentTissue = "Bone Marrow";

    // 统一颜色映射表：确保 Pie 和 Bar 颜色一致
    const cellColorMap = {
        "HSPC": "#3182ce",
        "Erythrocyte": "#e53e3e",
        "Platelet": "#38a169",
        "Monocyte": "#dd6b20",
        "Naive B cell": "#805ad5",
        "Naive CD8 T cell": "#319795",
        "NK cell": "#d69e2e",
        "Plasma cell": "#4a5568"
    };
    const defaultPalette = ['#3182ce', '#e53e3e', '#38a169', '#dd6b20', '#805ad5', '#319795'];

    const atlasData = {
        "HSPC": {
            "Bone Marrow": { desc: "Bone marrow is a semi-solid tissue found within the spongy portions of bones. It is the primary site of haematopoiesis." },
            "Blood": { desc: "Blood is a body fluid in the circulatory system that delivers necessary substances such as nutrients and oxygen." },
            "Thymus": { desc: "The thymus is a specialized primary lymphoid organ of the immune system where T cells mature." },
            "Cord Blood": { desc: "Cord blood remains in the placenta and umbilical cord after childbirth." },
            "Spleen": { desc: "The spleen acts primarily as a blood filter and plays a key role in the immune system." },
            "Lung-draining Lymph Nodes": { desc: "Lymph nodes close to the lungs and airways." },
            "Mesenteric Lymph Nodes": { desc: "Lymph nodes lying between the layers of the mesentery." }
        },
        "Whole": {
            "Bone Marrow": { desc: "Bone marrow is a semi-solid tissue found within the spongy portions of bones. It is the primary site of haematopoiesis." },
            "Blood": { desc: "Blood is a body fluid in the circulatory system that delivers necessary substances such as nutrients and oxygen." },
            "Thymus": { desc: "The thymus is a specialized primary lymphoid organ of the immune system where T cells mature." },
            "Cord Blood": { desc: "Cord blood remains in the placenta and umbilical cord after childbirth." },
            "Spleen": { desc: "The spleen acts primarily as a blood filter and plays a key role in the immune system." },
            "Lung-draining Lymph Nodes": { desc: "Lymph nodes close to the lungs and airways." },
            "Mesenteric Lymph Nodes": { desc: "Lymph nodes lying between the layers of the mesentery." }
        }
    };

    const tissueMap = {
        "Bone Marrow": "BM", "Blood": "PB", "Spleen": "SP", "Thymus": "thymus",
        "Lung-draining Lymph Nodes": "LLN", "Mesenteric Lymph Nodes": "MLN", "Cord Blood": "CB"
    };

    // ==========================================
    // 2. 初始化 ECharts 实例
    // ==========================================
    const charts = {
        pie: echarts.init(document.getElementById('pie-chart-container')),
        bar: echarts.init(document.getElementById('bar-chart-container')),
        heat1: echarts.init(document.getElementById('heatmap-1-container')),
        heat2: echarts.init(document.getElementById('heatmap-2-container'))
    };

    // ==========================================
    // 3. 核心加载与 UI 更新逻辑
    // ==========================================
    async function updateDashboard() {
        const fileName = tissueMap[currentTissue] || currentTissue;
        
        // 3.1 同步 UI 状态（左侧人体图按钮）
        document.querySelectorAll('.organ-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tissue === currentTissue);
        });

        // 3.2 同步 UI 状态（数据集按钮）
        document.querySelectorAll('.dataset-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.dataset === currentDataset);
        });

        // 3.3 同步 UI 状态（右侧下拉菜单）
        const tissueSelect = document.getElementById('tissue-select');
        if (tissueSelect) {
            tissueSelect.value = currentTissue;
        }
        
        // 3.4 更新 Tissue Scale 文本描述
        const localInfo = atlasData[currentDataset]?.[currentTissue];
        document.getElementById('info-title').textContent = currentTissue;
        document.getElementById('info-desc').textContent = localInfo ? localInfo.desc : "Data description unavailable.";

        // 3.5 构建数据路径
        const paths = {
            pie: `../data/PiePlot/${currentDataset}/${fileName}.json`,
            bar: `../data/BarPlot_A/${currentDataset}/${fileName}.json`,
            heat1: `../data/Heatmap_DEG_A/${currentDataset}/${fileName}.json`,
            heat2: `../data/Heatmap_GO_A/${currentDataset}/${fileName}.json`
        };

        try {
            Object.values(charts).forEach(c => c.showLoading());
            const fetchJSON = (p) => fetch(p).then(r => r.ok ? r.json() : null).catch(() => null);

            const [pieData, barData, heat1Data, heat2Data] = await Promise.all([
                fetchJSON(paths.pie), fetchJSON(paths.bar), fetchJSON(paths.heat1), fetchJSON(paths.heat2)
            ]);

            Object.values(charts).forEach(c => c.hideLoading());

            // 渲染各个图表，若数据不存在则清空
            if (pieData) renderPie(pieData); else charts.pie.clear();
            if (barData) renderBar(barData); else charts.bar.clear();
            if (heat1Data) renderHeatmap(charts.heat1, heat1Data); else charts.heat1.clear();
            if (heat2Data) renderHeatmap(charts.heat2, heat2Data); else charts.heat2.clear();

        } catch (err) {
            console.error("Dashboard update error:", err);
            Object.values(charts).forEach(c => { c.hideLoading(); c.clear(); });
        }
    }

    // ==========================================
    // 4. 渲染函数
    // ==========================================

    function getCellColor(name, index) {
        return cellColorMap[name] || defaultPalette[index % defaultPalette.length];
    }

    function renderPie(data) {
        charts.pie.setOption({
            tooltip: { trigger: 'item', formatter: '{b}: {d}%' },
            legend: { orient: 'vertical', right: '5%', top: 'center', type: 'scroll' },
            series: [{
                type: 'pie',
                radius: ['40%', '70%'],
                center: ['40%', '50%'],
                data: data.map((item, idx) => ({
                    name: item.name,
                    value: item.value,
                    itemStyle: { color: getCellColor(item.name, idx) }
                }))
            }]
        }, true);
    }

    function renderBar(data) {
        charts.bar.setOption({
            tooltip: { trigger: 'axis' },
            grid: { bottom: '25%', left: '10%', right: '5%' },
            xAxis: { 
                type: 'category', 
                data: data.map(i => i.name), 
                axisLabel: { rotate: 45, interval: 0, fontSize: 13 } 
            },
            yAxis: { type: 'value' },
            series: [{
                type: 'bar',
                data: data.map((item, idx) => ({
                    value: item.value,
                    itemStyle: { color: getCellColor(item.name, idx) }
                }))
            }]
        }, true);
    }

    function renderHeatmap(chartInstance, jsonData) {
        const xAxis = jsonData.xAxis || [];
        const yAxis = jsonData.yAxis || [];
        const rawData = jsonData.data || [];

        const formattedData = rawData.map(item => {
            const xIdx = xAxis.indexOf(item[0]);
            const yIdx = yAxis.indexOf(item[1]);
            return [xIdx, yIdx, parseFloat(item[2]) || 0];
        }).filter(i => i[0] !== -1 && i[1] !== -1);

        chartInstance.setOption({
            tooltip: { 
                position: 'top',
                formatter: (p) => `${xAxis[p.value[0]]}<br/>${yAxis[p.value[1]]}: <b>${p.value[2]}</b>`
            },
            grid: { top: '5%', bottom: '15%', left: '30%', right: '15%' },
            xAxis: { type: 'category', data: xAxis },
            yAxis: { 
                type: 'category', 
                data: yAxis,
                axisLabel: { 
                    fontSize: 12,
                    interval: 0,
                    formatter: (val) => val.length > 30 ? val.match(/.{1,30}/g).join('\n') : val
                } 
            },
            visualMap: {
                min: 0, max: 4, 
                orient: 'vertical', right: '10%', top: 'center', calculate: true,
                text: ['Max', 'Min'], 
                textStyle: {
                    color: '#333',
                    fontSize: 12,
                    fontWeight: 'bold'
                },
                inRange: { color: ['#fff7ec', '#fee8c8', '#fdbb84', '#e34a33', '#b30000'] }
            },
            series: [{ type: 'heatmap', data: formattedData }]
        }, true);
    }

    // ==========================================
    // 5. 事件绑定
    // ==========================================

    // 5.1 左侧人体图组织按钮点击
    document.querySelectorAll('.organ-btn').forEach(btn => {
        btn.onclick = () => { 
            currentTissue = btn.dataset.tissue; 
            updateDashboard(); 
        };
    });

    // 5.2 数据集切换按钮（HSPC / Whole）
    document.querySelectorAll('.dataset-btn').forEach(btn => {
        btn.onclick = () => { 
            currentDataset = btn.dataset.dataset; 
            updateDashboard(); 
        };
    });

    // 5.3 右侧下拉菜单选择联动 (Select structural unit)
    const tissueSelect = document.getElementById('tissue-select');
    if (tissueSelect) {
        tissueSelect.addEventListener('change', (e) => {
            currentTissue = e.target.value;
            // 联动更新并重新加载图表
            updateDashboard();
        });
    }

    // 5.4 响应式缩放
    window.addEventListener('resize', () => {
        Object.values(charts).forEach(c => c.resize());
    });

    // 5.5 导航按钮平滑滚动与状态高亮联动
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.onclick = (e) => {
            const targetId = btn.getAttribute('href');
            if (!targetId || targetId === "#") return;
            e.preventDefault();
            
            // ✨ 关键修复：移除其他所有按钮的高亮，点亮当前点击的按钮
            document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // 执行平滑滚动
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                targetElement.scrollIntoView({ behavior: 'smooth' });
            }
        };
    });

    // ==========================================
    // 8. 侧边栏跟随滚动高亮 (Scroll Spy) 逻辑
    // ==========================================
    const sections = document.querySelectorAll('section.scale-section[id]');
    const navLinks = document.querySelectorAll('.ctrl-group .nav-btn');

    window.addEventListener('scroll', () => {
        let current = '';
        
        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            // 减去 80 像素的偏移，确保刚滑到就切换
            if (window.scrollY >= sectionTop - 80) {
                current = section.getAttribute('id');
            }
        });

        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === `#${current}`) {
                link.classList.add('active');
            }
        });
    });
	
	// 5.6 回到顶部按钮逻辑
    const backToTopBtn = document.getElementById('back-to-top');
    if (backToTopBtn) {
        backToTopBtn.onclick = () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        };
    }

    // 初始运行
    updateDashboard();
});