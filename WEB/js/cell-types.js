/**
 * Portraits of Cell Types - Interactive Dashboard (Python Style Chord with D3.js)
 */

document.addEventListener("DOMContentLoaded", () => {
    
    // ==========================================
    // 1. 数据映射表与全局状态
    // ==========================================
    const cellTypeMapping = {
        "HSPC": ["HSC", "MPP#1", "MPP#2", "LMPP#1", "LMPP#2", "BMEP", "EryP", "MkP", "Ma/Eo/BaP", "GMP", "CDP", "pre-pDC", "CLP", "pre-B", "pro-B"],
        "Whole": ["HSPC", "Erythrocyte", "Monocyte", "DC", "Naive B cell", "Memory B cell", "Plasma cell", "Naive CD4 T cell", "Memory CD4 T cell", "Effector CD4 T cell", "Naive CD8 T cell", "gd T cell"]
    };

    const pathwayMapping = {
        "HSPC": ["MIF", "APP", "CD99", "CypA", "MK", "GALECTIN", "CXCL", "COLLAGEN", "NEGR", "MHC-II", "SELL", "ADGRE", "VCAM", "PECAM2", "LAMININ", "PECAM1", "FN1", "IGFBP", "Prostaglandin", "SELPLG", "TGFb", "ICAM", "CSF", "LAIR1", "CD34", "PARs", "VISFATIN", "ANGPTL", "THBS", "TENASCIN", "KIT", "DHEA", "PDGF", "SEMA4", "VWF", "Cholesterol", "PTPRM", "ADGRG", "SEMA3", "CysLTs", "MPZ", "DHEAS", "Histamine", "FGF", "JAM", "IL2", "CD40", "GAP", "ANGPT", "IL16", "BMP", "CD96", "CDH1", "EPHB", "ESAM", "Adrenaline", "CDH"], 
        "Whole": ["ANNEXIN", "BAFF", "BAG", "CXCL", "CypA", "FLT3", "GALECTIN", "IFN-II", "IL16", "MIF", "MK"] 
    };

    let currentDataset = "HSPC";
    let currentCellType = cellTypeMapping["HSPC"][0];
    let currentPathway = pathwayMapping["HSPC"][0]; 
    let cellDescriptions = {};

    const colorPalette = [
        "#3182ce", "#e53e3e", "#38a169", "#dd6b20", "#805ad5", "#319795", 
        "#d69e2e", "#4a5568", "#ed64a6", "#ecc94b", "#48bb78", "#38b2ac",
        "#9aa5b1", "#63b3ed", "#feb2b2", "#9ae6b4", "#fbd38d", "#d6bcfa"
    ];
    const colorMap = {};
    function getColor(name) {
        if (!colorMap[name]) {
            const index = Object.keys(colorMap).length;
            colorMap[name] = colorPalette[index % colorPalette.length];
        }
        return colorMap[name];
    }

    function getSafeFileName(cellName) {
        if (cellName === "Ma/Eo/BaP") return "Ma"; 
        let safeName = cellName.replace(/\s+/g, ''); 
        safeName = safeName.replace(/#/g, '%23');     
        safeName = safeName.replace(/\//g, '_');     
        return safeName;
    }

    // ==========================================
    // 2. DOM 元素与图表初始化
    // ==========================================
    const mainCellSelect = document.getElementById('main-cell-select');
    const sidebarCellSelect = document.getElementById('sidebar-cell-select');
    const pathwaySelect = document.getElementById('pathway-select');
    const introText = document.getElementById('cell-intro-text');
    
    // UI 控制元素
    const trajectorySection = document.getElementById('trajectory-scale');
    const navTrajectoryBtn = document.getElementById('nav-trajectory');

    const charts = {
        tissueBar: echarts.init(document.getElementById('ct-tissue-bar-container')),
        heat1: echarts.init(document.getElementById('ct-heatmap-1-container')),
        heat2: echarts.init(document.getElementById('ct-heatmap-2-container')),
        cciTotal: echarts.init(document.getElementById('cci-total-container'))
    };

    const d3PathwayContainer = document.getElementById('cci-pathway-container');

    fetch('../data/celltype_description.json')
        .then(res => res.ok ? res.json() : {})
        .then(data => {
            cellDescriptions = data;
            updateIntroText();
        }).catch(() => {
            if(introText) introText.textContent = "Description data could not be loaded.";
        });

    // ==========================================
    // 3. 下拉菜单与状态分发
    // ==========================================
    function updateDropdowns() {
        const cellOptions = cellTypeMapping[currentDataset];
        const cellHtml = cellOptions.map(cell => `<option value="${cell}">${cell}</option>`).join('');
        if (mainCellSelect) mainCellSelect.innerHTML = cellHtml;
        if (sidebarCellSelect) sidebarCellSelect.innerHTML = cellHtml;
        
        if (mainCellSelect) mainCellSelect.value = currentCellType;
        if (sidebarCellSelect) sidebarCellSelect.value = currentCellType;

        if (pathwaySelect) {
            const pathOptions = pathwayMapping[currentDataset] || [];
            const pathHtml = pathOptions.map(pw => `<option value="${pw}">${pw}</option>`).join('');
            pathwaySelect.innerHTML = pathHtml;
            pathwaySelect.value = currentPathway;
        }
    }

    function updateIntroText() {
        if (introText) introText.textContent = cellDescriptions[currentCellType] || `No detailed introduction available for ${currentCellType}.`;
    }

    async function updateDashboard() {
        document.querySelectorAll('.dataset-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.dataset === currentDataset);
        });

        updateDropdowns();
        updateIntroText();

        const safeCellFile = getSafeFileName(currentCellType);

        const paths = {
            tissueBar: `../data/BarPlot_CelltypeProportion/${currentDataset}/${safeCellFile}.json`,
            heat1: `../data/HeatMap_DEG_C/${currentDataset}/${safeCellFile}.json`,
            heat2: `../data/HeatMap_GO_C/${currentDataset}/${safeCellFile}.json`,
            cciTotal: `../data/ChordPlot_CCI/${currentDataset}/Total/Total.json`, 
            cciPathway: `../data/ChordPlot_CCI/${currentDataset}/${currentPathway}.json`
        };

        Object.values(charts).forEach(c => c.showLoading());
        if(d3PathwayContainer) d3PathwayContainer.innerHTML = '<div style="text-align:center; padding-top:40%; color:#a0aec0;">Loading...</div>';

        const fetchJSON = async (url) => {
            try {
                const response = await fetch(url);
                if (!response.ok) return null;
                return await response.json();
            } catch (e) { return null; }
        };

        const [barData, heat1Data, heat2Data, cciTotalData, cciPathwayData] = await Promise.all([
            fetchJSON(paths.tissueBar), fetchJSON(paths.heat1), fetchJSON(paths.heat2),
            fetchJSON(paths.cciTotal), fetchJSON(paths.cciPathway)
        ]);

        Object.values(charts).forEach(c => c.hideLoading());

        try { if (barData) renderBar(charts.tissueBar, barData); else charts.tissueBar.clear(); } catch(e) { charts.tissueBar.clear(); }
        try { if (heat1Data) renderHeatmap(charts.heat1, heat1Data); else charts.heat1.clear(); } catch(e) { charts.heat1.clear(); }
        try { if (heat2Data) renderHeatmap(charts.heat2, heat2Data); else charts.heat2.clear(); } catch(e) { charts.heat2.clear(); }

        try {
            if (cciTotalData && cciTotalData["C0"]) {
                renderLeftTotalGraph(charts.cciTotal, cciTotalData);
            } else charts.cciTotal.clear();
        } catch(e) { charts.cciTotal.clear(); }

        try {
            if (cciPathwayData) {
                renderRightPathwayChordD3(d3PathwayContainer, cciPathwayData, `${currentPathway} Pathway`);
            } else {
                if(d3PathwayContainer) d3PathwayContainer.innerHTML = '';
            }
        } catch(e) { 
            console.error(e);
            if(d3PathwayContainer) d3PathwayContainer.innerHTML = '<div style="text-align:center; padding-top:40%; color:#e53e3e;">Failed to render Chord</div>';
        }
    }

    // ==========================================
    // 4. 左侧图表：Total 互作关系网 (依然使用 ECharts)
    // ==========================================
    function renderLeftTotalGraph(chartInstance, totalJson) {
        const targetCells = totalJson["C0"]; 
        const nodesSet = new Set();
        const links = [];

        for (const sourceCell in totalJson) {
            if (sourceCell === "C0") continue;
            const valuesArray = totalJson[sourceCell];
            if (Array.isArray(valuesArray)) {
                valuesArray.forEach((val, index) => {
                    const targetCell = targetCells[index];
                    if (targetCell && val > 0) {
                        nodesSet.add(sourceCell);
                        nodesSet.add(targetCell);
                        links.push({ source: sourceCell, target: targetCell, value: val });
                    }
                });
            }
        }

        const nodes = Array.from(nodesSet).map(name => ({
            name: name,
            symbolSize: 8, 
            itemStyle: { color: getColor(name) },
            label: { show: true, fontSize: 12, color: '#4a5568' }
        }));

        chartInstance.setOption({
            title: { text: "Total Interaction", left: 'center', top: 15, textStyle: { fontSize: 14, color: '#4a5568' } },
            tooltip: { trigger: 'item', formatter: '{b}' },
            series: [{
                type: 'graph',
                layout: 'circular',
                circular: { rotateLabel: true },
                zoom: 0.65,
                top: '10%',
                data: nodes,
                links: links,
                roam: true,
                edgeSymbol: ['none', 'arrow'], 
                edgeSymbolSize: [0, 5],
                lineStyle: {
                    color: 'source',
                    width: 1,
                    curveness: 0.2,
                    opacity: 0.35
                }
            }]
        }, true);
    }

    // ==========================================
    // 5. 右侧高级和弦图：原生 D3.js 渲染引擎
    // ==========================================
    function renderRightPathwayChordD3(container, rawLinks, titleText) {
        if (!container) return;
        container.innerHTML = ""; // 清空容器

        if (!Array.isArray(rawLinks) || rawLinks.length === 0) return;

        const nodesSet = new Set();
        rawLinks.forEach(link => {
            nodesSet.add(link.source);
            nodesSet.add(link.target);
        });
        const nodes = Array.from(nodesSet);
        const indexMap = new Map(nodes.map((name, idx) => [name, idx]));
        
        const matrix = Array.from({ length: nodes.length }, () => new Array(nodes.length).fill(0));
        
        rawLinks.forEach(link => {
            const i = indexMap.get(link.source);
            const j = indexMap.get(link.target);
            matrix[i][j] += link.value || 0;
        });

        const width = container.clientWidth || 600;
        const height = container.clientHeight || 500;
        const outerRadius = Math.min(width, height) * 0.5 - 110; 
        const innerRadius = outerRadius - 15; 

        const svg = d3.select(container)
            .append("svg")
            .attr("width", width)
            .attr("height", height)
            .attr("viewBox", [-width / 2, -height / 2, width, height])
            .attr("style", "max-width: 100%; height: auto; font-family: sans-serif;");

        svg.append("text")
            .attr("y", -height / 2 + 30)
            .attr("x", 0)
            .attr("text-anchor", "middle")
            .style("font-size", "14px")
            .style("font-weight", "bold")
            .style("fill", "#4a5568")
            .text(titleText);

        const chord = d3.chord()
            .padAngle(0.05) 
            .sortSubgroups(d3.descending)
            .sortChords(d3.descending); 

        const chords = chord(matrix);

        const arc = d3.arc()
            .innerRadius(innerRadius)
            .outerRadius(outerRadius);

        const ribbon = d3.ribbon()
            .radius(innerRadius - 6); 
        
        const chartGroup = svg.append("g")
            .attr("transform", "translate(0, 20)");

        const group = chartGroup.append("g")
            .selectAll("g")
            .data(chords.groups)
            .join("g");

        group.append("path")
            .attr("fill", d => getColor(nodes[d.index]))
            .attr("d", arc)
            .append("title")
            .text(d => `${nodes[d.index]}: ${d.value.toFixed(2)}`);
            
        group.append("text")
            .each(d => { d.angle = (d.startAngle + d.endAngle) / 2; })
            .attr("dy", "0.35em")
            .attr("transform", d => `
                rotate(${(d.angle * 180 / Math.PI - 90)})
                translate(${outerRadius + 12})
                ${d.angle > Math.PI ? "rotate(180)" : ""}
            `)
            .attr("text-anchor", d => d.angle > Math.PI ? "end" : "start")
            .style("font-size", "13px")
            .style("fill", "#4a5568")
            .text(d => nodes[d.index]);

        chartGroup.append("g")
            .attr("fill-opacity", 0.6) 
            .selectAll("path")
            .data(chords)
            .join("path")
            .attr("d", ribbon)
            .attr("fill", d => getColor(nodes[d.source.index])) 
            .on("mouseover", function() { d3.select(this).attr("fill-opacity", 0.9); })
            .on("mouseout", function() { d3.select(this).attr("fill-opacity", 0.6); })
            .append("title")
            .text(d => `${nodes[d.source.index]} ➔ ${nodes[d.target.index]}: ${d.source.value.toFixed(2)}`);
    }

    // ==========================================
    // 6. 基础图表通用组件样式
    // ==========================================
    function renderBar(chartInstance, data) {
        chartInstance.setOption({
            tooltip: { trigger: 'axis' },
            grid: { bottom: '15%', left: '10%', right: '5%', top: '15%' },
            xAxis: { 
                type: 'category', data: data.map(i => i.name || "Unknown"), 
                axisLabel: { rotate: 45, interval: 0, fontSize: 12, color: '#4a5568' }
            },
            yAxis: { type: 'value', splitLine: { lineStyle: { color: '#f7fafc' } } },
            series: [{
                type: 'bar', barWidth: '15px',
                itemStyle: { borderRadius: [10, 10, 0, 0] },
                data: data.map(item => ({
                    value: item.value || 0,
                    itemStyle: { color: getColor(item.name) }
                }))
            }]
        }, true);
    }

    function renderHeatmap(chartInstance, jsonData) {
        const xAxis = jsonData.xAxis;
        const yAxis = jsonData.yAxis || [];
        const rawData = jsonData.data;

        const formattedData = rawData.map(item => {
            const xIdx = xAxis.indexOf(item[0]);
            const yIdx = yAxis.indexOf(item[1]);
            return [xIdx, yIdx, parseFloat(item[2]) || 0];
        }).filter(i => i[0] !== -1 && i[1] !== -1);

        chartInstance.setOption({
            tooltip: { position: 'top' },
            grid: { top: '5%', bottom: '15%', left: '30%', right: '15%' },
            xAxis: { type: 'category', data: xAxis },
            yAxis: { 
                type: 'category', data: yAxis,
                axisLabel: { fontSize: 12, interval: 0, formatter: (val) => val.length > 40 ? val.match(/.{1,40}/g).join('\n') : val } 
            },
            visualMap: {
                min: 0, max: 4, orient: 'vertical', right: '10%', top: 'center', calculate: true,
                text: ['Max', 'Min'], textStyle: { color: '#333', fontSize: 12 },
                inRange: { color: ['#fff7ec', '#fee8c8', '#fdbb84', '#e34a33', '#b30000'] }
            },
            series: [{ type: 'heatmap', data: formattedData }]
        }, true);
    }

    // ==========================================
    // 7. 全局事件监听与数据联动机制
    // ==========================================
    
    // 初始化检查 Whole 状态并隐藏 Trajectory
    const activeDatasetBtn = document.querySelector('.dataset-btn.active');
    if(activeDatasetBtn && activeDatasetBtn.getAttribute('data-dataset') === 'Whole') {
        if (trajectorySection) trajectorySection.style.display = 'none';
        if (navTrajectoryBtn) navTrajectoryBtn.style.display = 'none';
    }

    // Dataset (HSPC/Whole) 切换逻辑
    document.querySelectorAll('.dataset-btn').forEach(btn => {
        btn.onclick = () => { 
            currentDataset = btn.dataset.dataset;
            currentCellType = cellTypeMapping[currentDataset][0]; 
            currentPathway = (pathwayMapping[currentDataset] || [])[0] || "APP";
            updateDashboard(); 
            
            // Trajectory UI 的显示与隐藏逻辑
            if (currentDataset === 'HSPC') {
                if (trajectorySection) trajectorySection.style.display = 'block';
                if (navTrajectoryBtn) navTrajectoryBtn.style.display = 'block';
            } else if (currentDataset === 'Whole') {
                if (trajectorySection) trajectorySection.style.display = 'none';
                if (navTrajectoryBtn) navTrajectoryBtn.style.display = 'none';
            }
        };
    });

    function handleCellChange(e) { currentCellType = e.target.value; updateDashboard(); }
    if (mainCellSelect) mainCellSelect.addEventListener('change', handleCellChange);
    if (sidebarCellSelect) sidebarCellSelect.addEventListener('change', handleCellChange);

    if (pathwaySelect) {
        pathwaySelect.addEventListener('change', (e) => {
            currentPathway = e.target.value;
            updateDashboard();
        });
    }

    // PNG 模块下拉菜单切换逻辑
    const modulePdfSelect = document.getElementById('module-png-select');
    const modulePdfViewer = document.getElementById('module-png-viewer');

    if (modulePdfSelect && modulePdfViewer) {
        modulePdfSelect.addEventListener('change', function() {
            const selectedModule = this.value; 
            const newPdfPath = `../data/Trajectory/fig2-tra-module-GO-${selectedModule}.png`;
            modulePdfViewer.setAttribute('src', newPdfPath);
        });
    }

    // 侧边栏导航按钮平滑滚动点击事件
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.onclick = (e) => {
            const targetId = btn.getAttribute('href');
            if (!targetId || targetId === "#") return;
            e.preventDefault();
            
            // 这里不必强制移除 active，因为下方的 scroll spy 监听到滚动后也会自动加上
            document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

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

    // 回到顶部按钮
    const backToTopBtn = document.getElementById('back-to-top');
    if (backToTopBtn) backToTopBtn.onclick = () => window.scrollTo({ top: 0, behavior: 'smooth' });
    
    // Resize Listener
    window.addEventListener('resize', () => {
        Object.values(charts).forEach(c => c.resize());
        if(d3PathwayContainer && d3PathwayContainer.innerHTML !== "") updateDashboard();
    });

    updateDashboard();
});