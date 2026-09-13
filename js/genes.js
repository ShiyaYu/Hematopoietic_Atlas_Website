/**
 * Portraits of Genes - Interactive Ridge Plots
 */

document.addEventListener("DOMContentLoaded", () => {
    
    // ==========================================
    // 新增：HSPC 和 Whole 数据集对应的基因联动映射表
    // ==========================================
    const datasetGenes = {
        "HSPC": [
            "EMCN","MEG3","AVP","CRHBP","GATA2","GATA1","HBD","CD36","PPBP","PF4","MS4A2","TPSAB1","HDC","MPO",
            "ELANE","LYZ","IRF8","CD68","CCR7","MME","IL7R","CD19","VPREB1","PAX5","CD7","CD3D","RAG2","CD1A"
        ],
        "Whole": [
            "CD34", "AVP", "CRHBP", "GATA1", "HBA1", "HBB", "PPBP", "PF4", "ITGA2", "CLC", "CEBPA", "GATA2", "MS4A3", 
            "CSF3R", "CAMP", "CYBB", "CXCR2", "S100A8", "ITGA4", "MS4A2", "CPA3", "TPSB2", "TPSAB1", "CSF1R", "FCN1", 
            "CD14", "TCF7L2", "FCGR3A", "LYN", "CD1C", "CCND1", "FLT3", "XCR1", "CLEC9A", "IL3RA", "CD33", "LILRA4", 
            "ADGRE1", "ID2", "PLCG2", "GNLY", "SYNE1", "NKG7", "CD247", "CD3D", "CD3G", "KLRG1", "NCAM1", "KLF1", "NCR1", 
            "CD19", "VPREB1", "PAX5", "CD79A", "CD24", "TCL1A", "IGHM", "IGHD", "TNFRSF13B", "CD27", "CR2", "MZB1", 
            "XBP1", "SDC1", "PRDM1", "IGKC", "SLAMF7", "CD4", "IL7R", "TRBC2", "TCF7", "LEF1", "NR4A1", "ITGAE", "CD69", 
            "TBX21", "GZMB", "GZMH", "GZMA", "FOXP3", "IL2RA", "CD8A", "CD8B", "SPRY2", "TRDC", "TRGC1"
        ]
    };

    // 1. 全局状态
    let currentDataset = "HSPC";
    let currentGene = "EMCN";

    // 2. 初始化 ECharts 实例
    const charts = {
        tissue: echarts.init(document.getElementById('tissue-ridge-container')),
        cellular: echarts.init(document.getElementById('cellular-ridge-container'))
    };

    const mainGeneSelect = document.getElementById('main-gene-select');
    const sideGeneSelect = document.getElementById('gene-select');

    // ==========================================
    // 新增辅助函数：根据当前数据集动态更新下拉列表选项
    // ==========================================
    function updateSelectOptions(dataset) {
        const genes = datasetGenes[dataset] || [];
        const optionsHTML = genes.map(g => `<option value="${g}">${g}</option>`).join('');
        if (mainGeneSelect) mainGeneSelect.innerHTML = optionsHTML;
        if (sideGeneSelect) sideGeneSelect.innerHTML = optionsHTML;
    }

    // 3. 核心加载逻辑：分别请求 Tissue 和 Cellular 数据
    async function updateDashboard() {
        // 同步 UI
        document.querySelectorAll('.dataset-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.dataset === currentDataset);
        });
        if (mainGeneSelect) mainGeneSelect.value = currentGene;
        if (sideGeneSelect) sideGeneSelect.value = currentGene;

        const markerImage = document.getElementById('marker-image');
        if (markerImage) {
            markerImage.src = `../images/${currentDataset}_markers.png`;
        }

        // 定义两个数据请求路径
        const tissuePath = `../data/RidgePlor_A/${currentDataset}/${currentGene}.json`;
        const cellularPath = `../data/RidgePlor_CT/${currentDataset}/${currentGene}.json`;

        try {
            Object.values(charts).forEach(c => c.showLoading());
            
            // 安全的 fetch 封装
            const fetchJSON = (p) => fetch(p).then(r => r.ok ? r.json() : null).catch(() => null);

            // 同时请求两份数据
            const [tissueData, cellularData] = await Promise.all([
                fetchJSON(tissuePath),
                fetchJSON(cellularPath)
            ]);

            Object.values(charts).forEach(c => c.hideLoading());

            // 解析并渲染 Tissue 数据
            if (tissueData && tissueData.length > 0) {
                const parsedTissue = parseRidgeData(tissueData);
                renderRidgePlot(charts.tissue, parsedTissue);
            } else {
                charts.tissue.clear();
            }

            // 解析并渲染 Cellular 数据
            if (cellularData && cellularData.length > 0) {
                const parsedCellular = parseRidgeData(cellularData);
                renderRidgePlot(charts.cellular, parsedCellular);
            } else {
                charts.cellular.clear();
            }

        } catch (err) {
            console.error("Dashboard update error:", err);
            Object.values(charts).forEach(c => { c.hideLoading(); c.clear(); });
        }
    }

    // ==========================================
    // 4. 数据解析器：将扁平 JSON 转为 Ridge 数据
    // ==========================================
    function parseRidgeData(rawData) {
        const categories = [];
        const percentages = [];
        const seriesData = [];
        
        // 假设所有行共享相同的 X 轴点数 (X1 ~ X128)，我们生成一个等距的伪 X 轴
        // 从你的数据看，每一行都有 x_max，我们取最大的一个来计算步长
        const maxX = Math.max(...rawData.map(r => r.x_max));
        const xAxis = Array.from({length: 128}, (_, i) => ((i / 127) * maxX).toFixed(2));

        rawData.forEach(row => {
            categories.push(row._row); // 细胞/组织名称
            percentages.push((row.nz_ratio * 100).toFixed(2) + '%'); // 右侧百分比
            
            // 提取 X1 到 X128 的数据
            const rowData = [];
            for (let i = 1; i <= 128; i++) {
                rowData.push(row[`X${i}`] || 0);
            }
            seriesData.push(rowData);
        });

        return { categories, percentages, xAxis, seriesData };
    }

    // ==========================================
    // 5. 高级山脊图 (Ridge Plot) 渲染引擎
    // ==========================================
    function renderRidgePlot(chartInstance, parsedData) {
        const { categories, percentages, xAxis, seriesData } = parsedData;
        const grids = [];
        const xAxes = [];
        const yAxes = [];
        const series = [];

        const count = categories.length;
        const bottomSpace = 10; 
        const step = (100 - bottomSpace) / count; 
        const overlapFactor = 1.0; // 调整此值控制波峰重叠程度
        const gridHeight = step * overlapFactor;

        categories.forEach((cat, index) => {
            grids.push({
                top: `${index * step}%`,
                height: `${gridHeight}%`,
                left: '12%',
                right: '8%',
                show: false
            });

            xAxes.push({
                gridIndex: index,
                type: 'category',
                data: xAxis,
                show: index === count - 1, 
                axisLine: { show: true, lineStyle: { color: '#666' } },
                axisTick: { show: index === count - 1 },
                // 仅在最后一个刻度显示有限数量的标签以防拥挤
                axisLabel: { 
                    show: index === count - 1, 
                    color: '#333', 
                    fontSize: 11,
                    interval: 31 // 128个点，大约显示4-5个刻度标签
                }
            });

            // 左侧 Y 轴 (显示分类名称)
            yAxes.push({
                gridIndex: index,
                type: 'value',
                min: 0,
                max: (val) => val.max * 1.2, 
                splitLine: { show: false },
                axisTick: { show: false },
                axisLine: { show: true, lineStyle: { color: '#555', width: 1 } }, 
                // 【核心修改】：利用刻度标签在 0 值（底线）处显示文字，保证绝对水平对齐
                axisLabel: { 
                    show: true,showMinLabel: true,    // 【新增】
                    hideOverlap: false,
                    margin: 15,
                    color: '#4a5568',
                    fontSize: 12,
                    formatter: function (value) {
                        return value === 0 ? cat : '';
                    }
                }
            });

            // 右侧辅助 Y 轴 (显示百分比)
            yAxes.push({
                gridIndex: index,
                type: 'value',
                min: 0,
                max: (val) => val.max * 1.2,
                position: 'right',
                splitLine: { show: false },
                axisTick: { show: false },
                axisLine: { show: false }, 
                // 【核心修改】：同理，在右侧底线处显示百分比
                axisLabel: { 
                    show: true,
                    showMinLabel: true,    // 【新增】：强制显示最小刻度（0）的标签
                    hideOverlap: false,    // 【新增】：关闭防重叠隐藏机制
                    margin: 15,
                    color: '#718096',
                    fontSize: 11,
                    formatter: function (value) {
                        return value === 0 ? percentages[index] : '';
                    }
                }
            });

            series.push({
                name: cat,
                type: 'line',
                xAxisIndex: index,
                yAxisIndex: index * 2, 
                data: seriesData[index],
                smooth: true,
                symbol: 'none',
                lineStyle: { color: '#d94801', width: 1.5 },
                areaStyle: {
                    opacity: 0.85,
                    color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
                        { offset: 0, color: '#ffffb2' },
                        { offset: 0.5, color: '#fd8d3c' },
                        { offset: 1, color: '#bd0026' }
                    ])
                },
                z: count - index 
            });
        });

        chartInstance.setOption({
            tooltip: { trigger: 'axis', axisPointer: { type: 'line' } },
            grid: grids,
            xAxis: xAxes,
            yAxis: yAxes,
            series: series
        }, true);
    }

    // ==========================================
    // 6. 事件绑定
    // ==========================================
    
    document.querySelectorAll('.dataset-btn').forEach(btn => {
        btn.onclick = () => { 
            currentDataset = btn.dataset.dataset; 
            
            // 切换数据集时，首先安全重建对应的下拉框基因选项
            updateSelectOptions(currentDataset);
            
            // 联动重置当前基因为新数据集列表里的第一个，防止原基因不存在导致 404 不渲染图表
            currentGene = datasetGenes[currentDataset][0]; 
            
            updateDashboard(); 
        };
    });

    function handleGeneChange(e) {
        currentGene = e.target.value;
        updateDashboard();
    }
    if (mainGeneSelect) mainGeneSelect.addEventListener('change', handleGeneChange);
    if (sideGeneSelect) sideGeneSelect.addEventListener('change', handleGeneChange);

    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.onclick = (e) => {
            const targetId = btn.getAttribute('href');
            if (!targetId || targetId === "#") return;
            e.preventDefault();
            
            document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const targetElement = document.querySelector(targetId);
            if (targetElement) targetElement.scrollIntoView({ behavior: 'smooth' });
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

    window.addEventListener('resize', () => Object.values(charts).forEach(c => c.resize()));

    // 初始运行：首次载入页面时填充默认数据集选项
    updateSelectOptions(currentDataset);
    updateDashboard();
});