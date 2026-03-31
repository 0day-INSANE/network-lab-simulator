// Neural Network Background Animation
class NeuralNetwork {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.nodes = [];
        this.connections = [];
        this.nodeCount = 80;
        this.maxDistance = 150;
        
        this.resize();
        this.init();
        window.addEventListener('resize', () => this.resize());
    }
    
    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }
    
    init() {
        this.nodes = [];
        for (let i = 0; i < this.nodeCount; i++) {
            this.nodes.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                vx: (Math.random() - 0.5) * 0.5,
                vy: (Math.random() - 0.5) * 0.5,
                radius: Math.random() * 2 + 1
            });
        }
    }
    
    update() {
        this.nodes.forEach(node => {
            node.x += node.vx;
            node.y += node.vy;
            
            if (node.x < 0 || node.x > this.canvas.width) node.vx *= -1;
            if (node.y < 0 || node.y > this.canvas.height) node.vy *= -1;
        });
    }
    
    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw connections
        this.ctx.strokeStyle = 'rgba(0, 242, 255, 0.15)';
        this.ctx.lineWidth = 0.5;
        
        for (let i = 0; i < this.nodes.length; i++) {
            for (let j = i + 1; j < this.nodes.length; j++) {
                const dx = this.nodes[i].x - this.nodes[j].x;
                const dy = this.nodes[i].y - this.nodes[j].y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < this.maxDistance) {
                    const opacity = (1 - distance / this.maxDistance) * 0.3;
                    this.ctx.strokeStyle = `rgba(0, 242, 255, ${opacity})`;
                    this.ctx.beginPath();
                    this.ctx.moveTo(this.nodes[i].x, this.nodes[i].y);
                    this.ctx.lineTo(this.nodes[j].x, this.nodes[j].y);
                    this.ctx.stroke();
                }
            }
        }
        
        // Draw nodes
        this.nodes.forEach(node => {
            this.ctx.fillStyle = 'rgba(0, 242, 255, 0.6)';
            this.ctx.beginPath();
            this.ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
            this.ctx.fill();
        });
    }
    
    animate() {
        this.update();
        this.draw();
        requestAnimationFrame(() => this.animate());
    }
}

// Network Lab - Main Application
class NetworkLab {
    constructor() {
        this.canvas = document.getElementById('networkCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.devices = [];
        this.connections = [];
        this.customDeviceTypes = this.loadCustomDevices();
        this.savedProjects = this.loadSavedProjects();
        this.currentProject = null;
        this.selectedDevice = null;
        this.connectionMode = false;
        this.deleteMode = false;
        this.moveMode = true;
        this.analyzeMode = false;
        this.firstConnectionDevice = null;
        this.draggedDevice = null;
        this.currentTool = null;
        this.trafficLog = [];
        this.currentPacket = null;
        this.simulationRunning = false;
        
        this.deviceIdCounter = 1;
        this.connectionIdCounter = 1;
        
        this.init();
    }
    
    init() {
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
        this.setupEventListeners();
        this.startAnimationLoop();
        this.loadCustomDeviceButtons();
        this.loadSavedTheme();
    }
    
    resizeCanvas() {
        const container = this.canvas.parentElement;
        this.canvas.width = container.clientWidth;
        this.canvas.height = container.clientHeight;
        this.render();
    }
    
    loadCustomDevices() {
        const stored = localStorage.getItem('networklab_custom_devices');
        return stored ? JSON.parse(stored) : {};
    }
    
    loadSavedProjects() {
        const stored = localStorage.getItem('networklab_projects');
        return stored ? JSON.parse(stored) : [];
    }
    
    setupEventListeners() {
        // Tool buttons
        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.setMode('add');
                document.querySelectorAll('.tool-btn, .action-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentTool = btn.dataset.device;
            });
        });
        
        // Mode buttons
        document.getElementById('moveMode').addEventListener('click', () => this.setMode('move'));
        document.getElementById('analyzeMode').addEventListener('click', () => this.setMode('analyze'));
        document.getElementById('connectMode').addEventListener('click', () => this.setMode('connect'));
        document.getElementById('deleteMode').addEventListener('click', () => this.setMode('delete'));
        
        // Packet management
        document.getElementById('createPacket').addEventListener('click', () => this.openPacketModal());
        document.getElementById('sendPacket').addEventListener('click', () => this.sendCurrentPacket());
        document.getElementById('stopSim').addEventListener('click', () => this.stopSimulation());
        
        // Console, Help, Theme, Config
        document.getElementById('toggleConsole').addEventListener('click', () => this.toggleConsole());
        document.getElementById('closeLogPanel').addEventListener('click', () => this.closeConsole());
        document.getElementById('showConfig').addEventListener('click', () => this.showConfig());
        document.getElementById('showHelp').addEventListener('click', () => this.showHelp());
        document.getElementById('changeTheme').addEventListener('click', () => this.showThemeSelector());
        
        // Custom devices
        document.getElementById('addCustomDevice').addEventListener('click', () => this.openCustomDeviceModal());
        document.getElementById('manageDevices').addEventListener('click', () => this.manageCustomDevices());
        
        // Project management
        document.getElementById('saveProject').addEventListener('click', () => this.saveCurrentProject());
        document.getElementById('exportProject').addEventListener('click', () => this.exportProject());
        document.getElementById('loadProject').addEventListener('click', () => {
            document.getElementById('fileInput').click();
        });
        document.getElementById('fileInput').addEventListener('change', (e) => this.importProject(e));
        document.getElementById('clearAll').addEventListener('click', () => {
            if (confirm('Vuoi davvero cancellare tutto il laboratorio?')) {
                this.devices = [];
                this.connections = [];
                this.trafficLog = [];
                this.currentPacket = null;
                this.selectedDevice = null;
                this.closeInfoPanel();
                this.updateLogPanel();
                this.render();
            }
        });
        
        // Canvas interactions
        this.canvas.addEventListener('click', (e) => this.handleCanvasClick(e));
        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        
        // Info panel
        document.getElementById('closePanel').addEventListener('click', () => this.closeInfoPanel());
        
        // Log panel
        document.getElementById('clearLog').addEventListener('click', () => {
            this.trafficLog = [];
            this.updateLogPanel();
        });
        
        // Help modal
        document.getElementById('closeHelpModal').addEventListener('click', () => this.closeHelp());
        document.getElementById('closeHelp').addEventListener('click', () => this.closeHelp());
        
        // Config modal
        document.getElementById('closeConfigModal').addEventListener('click', () => this.closeConfig());
        document.getElementById('closeConfig').addEventListener('click', () => this.closeConfig());
        
        // Theme modal
        document.getElementById('closeThemeModal').addEventListener('click', () => this.closeThemeModal());
        document.getElementById('closeTheme').addEventListener('click', () => this.closeThemeModal());
        document.querySelectorAll('.theme-option').forEach(btn => {
            btn.addEventListener('click', () => this.applyTheme(btn.dataset.theme));
        });
        
        // Modal buttons
        document.getElementById('closeModal').addEventListener('click', () => this.closeModal());
        document.getElementById('cancelConfig').addEventListener('click', () => this.closeModal());
        document.getElementById('saveConfig').addEventListener('click', () => this.saveDeviceConfig());
        
        // Packet modal
        document.getElementById('closePacketModal').addEventListener('click', () => this.closePacketModal());
        document.getElementById('cancelPacket').addEventListener('click', () => this.closePacketModal());
        document.getElementById('savePacket').addEventListener('click', () => this.createPacket(false));
        document.getElementById('createAndSend').addEventListener('click', () => this.createPacket(true));
        document.getElementById('sourceDevice').addEventListener('change', (e) => this.updatePacketSourceIP(e));
        
        // Custom device modal
        document.getElementById('closeCustomModal').addEventListener('click', () => this.closeCustomDeviceModal());
        document.getElementById('cancelCustomDevice').addEventListener('click', () => this.closeCustomDeviceModal());
        document.getElementById('saveCustomDevice').addEventListener('click', () => this.saveCustomDeviceType());
        document.getElementById('iconImageInput').addEventListener('change', (e) => this.previewIcon(e));
    }
    
    setMode(mode) {
        this.moveMode = mode === 'move';
        this.analyzeMode = mode === 'analyze';
        this.connectionMode = mode === 'connect';
        this.deleteMode = mode === 'delete';
        
        if (mode !== 'add') {
            this.currentTool = null;
            document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
        }
        
        document.querySelectorAll('.action-btn').forEach(b => b.classList.remove('active'));
        
        if (mode === 'move') document.getElementById('moveMode').classList.add('active');
        if (mode === 'analyze') document.getElementById('analyzeMode').classList.add('active');
        if (mode === 'connect') document.getElementById('connectMode').classList.add('active');
        if (mode === 'delete') document.getElementById('deleteMode').classList.add('active');
        
        this.firstConnectionDevice = null;
        this.canvas.style.cursor = mode === 'move' ? 'grab' : mode === 'analyze' ? 'help' : 'crosshair';
    }
    
    // CONTINUA NEL PROSSIMO BLOCCO...
    
    toggleConsole() {
        const panel = document.getElementById('logPanel');
        panel.classList.toggle('hidden');
    }
    
    closeConsole() {
        document.getElementById('logPanel').classList.add('hidden');
    }
    
    showHelp() {
        document.getElementById('helpModal').classList.add('active');
    }
    
    closeHelp() {
        document.getElementById('helpModal').classList.remove('active');
    }
    
    showConfig() {
        document.getElementById('configModal2').classList.add('active');
    }
    
    closeConfig() {
        document.getElementById('configModal2').classList.remove('active');
    }
    
    showThemeSelector() {
        document.getElementById('themeModal').classList.add('active');
    }
    
    closeThemeModal() {
        document.getElementById('themeModal').classList.remove('active');
    }
    
    applyTheme(themeName) {
        const themes = {
            default: {
                primary: '#00f2ff',
                secondary: '#ff00ff',
                success: '#00ff88',
                danger: '#ff0055',
                warning: '#ffaa00',
                dark: '#0a0e27',
                darker: '#050814'
            },
            ocean: {
                primary: '#4cc9f0',
                secondary: '#4361ee',
                success: '#3a0ca3',
                danger: '#f72585',
                warning: '#ffd60a',
                dark: '#0d1b2a',
                darker: '#1b263b'
            },
            forest: {
                primary: '#52b788',
                secondary: '#40916c',
                success: '#95d5b2',
                danger: '#d62828',
                warning: '#fcbf49',
                dark: '#081c15',
                darker: '#1b4332'
            },
            sunset: {
                primary: '#ff6d00',
                secondary: '#ff9e00',
                success: '#ffba08',
                danger: '#dc2f02',
                warning: '#e85d04',
                dark: '#370617',
                darker: '#6a040f'
            },
            purple: {
                primary: '#9d4edd',
                secondary: '#c77dff',
                success: '#e0aaff',
                danger: '#ff006e',
                warning: '#fb5607',
                dark: '#240046',
                darker: '#10002b'
            },
            hacker: {
                primary: '#00ff00',
                secondary: '#00cc00',
                success: '#009900',
                danger: '#ff0000',
                warning: '#ffff00',
                dark: '#000000',
                darker: '#0d1b0d'
            }
        };
        
        const theme = themes[themeName];
        if (theme) {
            document.documentElement.style.setProperty('--primary', theme.primary);
            document.documentElement.style.setProperty('--secondary', theme.secondary);
            document.documentElement.style.setProperty('--success', theme.success);
            document.documentElement.style.setProperty('--danger', theme.danger);
            document.documentElement.style.setProperty('--warning', theme.warning);
            document.documentElement.style.setProperty('--dark', theme.dark);
            document.documentElement.style.setProperty('--darker', theme.darker);
            
            localStorage.setItem('networklab_theme', themeName);
            this.closeThemeModal();
        }
    }
    
    loadSavedTheme() {
        const savedTheme = localStorage.getItem('networklab_theme');
        if (savedTheme) {
            this.applyTheme(savedTheme);
        }
    }
    
    generateMAC(id) {
        const hex = id.toString(16).padStart(4, '0');
        return `00:1A:${hex.slice(0, 2).toUpperCase()}:${hex.slice(2, 4).toUpperCase()}:00:01`;
    }
    
    getDeviceTypeName(type) {
        if (this.customDeviceTypes[type]) {
            return this.customDeviceTypes[type].name;
        }
        
        const names = {
            router: 'Router',
            switch: 'Switch',
            pc: 'PC',
            server: 'Server',
            firewall: 'Firewall',
            ids: 'IDS'
        };
        return names[type] || type;
    }
    
    getDefaultConfig(type) {
        if (this.customDeviceTypes[type]) {
            return JSON.parse(JSON.stringify(this.customDeviceTypes[type].defaultConfig));
        }
        
        const configs = {
            router: {
                ip: '192.168.1.1',
                subnet: '255.255.255.0',
                gateway: '',
                routing: 'enabled',
                nat: true,
                inboundRules: [],
                outboundRules: [],
                logicRules: []
            },
            switch: {
                ports: 24,
                vlans: [1],
                spanningTree: true,
                portSecurity: false,
                macTable: [],
                logicRules: []
            },
            pc: {
                ip: '192.168.1.100',
                subnet: '255.255.255.0',
                gateway: '192.168.1.1',
                os: 'Windows 11',
                openPorts: [445, 3389],
                inboundRules: [],
                outboundRules: [],
                logicRules: []
            },
            server: {
                ip: '192.168.1.50',
                subnet: '255.255.255.0',
                gateway: '192.168.1.1',
                services: ['HTTP:80', 'HTTPS:443', 'SSH:22'],
                os: 'Ubuntu Server',
                openPorts: [80, 443, 22],
                inboundRules: [],
                outboundRules: [],
                logicRules: []
            },
            firewall: {
                ip: '192.168.1.254',
                subnet: '255.255.255.0',
                inboundRules: [
                    { name: 'Allow HTTP', protocol: 'TCP', srcIP: 'any', srcPort: 'any', dstIP: 'any', dstPort: '80', action: 'allow', flags: [] },
                    { name: 'Allow HTTPS', protocol: 'TCP', srcIP: 'any', srcPort: 'any', dstIP: 'any', dstPort: '443', action: 'allow', flags: [] }
                ],
                outboundRules: [
                    { name: 'Allow All', protocol: 'any', srcIP: 'any', srcPort: 'any', dstIP: 'any', dstPort: 'any', action: 'allow', flags: [] }
                ],
                defaultInbound: 'deny',
                defaultOutbound: 'allow',
                logging: true,
                logicRules: []
            },
            ids: {
                ip: '192.168.1.253',
                subnet: '255.255.255.0',
                mode: 'IPS',
                signatures: 'enabled',
                alerts: true,
                blockedIPs: [],
                logicRules: []
            }
        };
        return configs[type] || { logicRules: [] };
    }
    
    startAnimationLoop() {
        const animate = () => {
            this.render();
            requestAnimationFrame(animate);
        };
        animate();
    }
    
    render() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.connections.forEach(conn => this.drawConnection(conn));
        this.devices.forEach(device => this.drawDevice(device));
    }
    
    drawDevice(device) {
        const size = 60;
        const x = device.x;
        const y = device.y;
        
        this.ctx.shadowColor = 'rgba(0, 242, 255, 0.5)';
        this.ctx.shadowBlur = 20;
        
        this.ctx.fillStyle = device.status === 'active' ? 
            'rgba(42, 45, 58, 0.9)' : 'rgba(58, 61, 74, 0.5)';
        this.ctx.beginPath();
        this.ctx.arc(x, y, size / 2, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.ctx.strokeStyle = device === this.selectedDevice ? '#ff00ff' : '#00f2ff';
        this.ctx.lineWidth = 3;
        this.ctx.stroke();
        
        this.ctx.shadowBlur = 0;
        
        if (device.customIcon) {
            const img = new Image();
            img.src = device.customIcon;
            const imgSize = 40;
            this.ctx.drawImage(img, x - imgSize/2, y - imgSize/2, imgSize, imgSize);
        } else {
            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = '24px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(this.getDeviceIcon(device.type), x, y);
        }
        
        this.ctx.fillStyle = '#00f2ff';
        this.ctx.font = 'bold 12px Arial';
        this.ctx.fillText(device.name, x, y + size / 2 + 15);
        
        if (device.status === 'active') {
            this.ctx.fillStyle = '#00ff88';
            this.ctx.beginPath();
            this.ctx.arc(x + size / 2 - 5, y - size / 2 + 5, 4, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }
    
    getDeviceIcon(type) {
        if (this.customDeviceTypes[type]) {
            return this.customDeviceTypes[type].icon || '📦';
        }
        
        const icons = {
            router: '🔄',
            switch: '⚡',
            pc: '💻',
            server: '🖥️',
            firewall: '🔥',
            ids: '🛡️'
        };
        return icons[type] || '📦';
    }
    
    drawConnection(conn) {
        const from = conn.from;
        const to = conn.to;
        
        conn.animationOffset = (conn.animationOffset + 0.02) % 1;
        
        const isActive = conn.status === 'active' && (Date.now() - (conn.lastCheck || 0)) < 5000;
        const color = isActive ? '#00f2ff' : '#ffaa00';
        const glowColor = isActive ? 'rgba(0, 242, 255, 0.8)' : 'rgba(255, 170, 0, 0.6)';
        
        this.ctx.shadowColor = glowColor;
        this.ctx.shadowBlur = isActive ? 15 : 8;
        
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = isActive ? 3 : 2;
        this.ctx.beginPath();
        this.ctx.moveTo(from.x, from.y);
        this.ctx.lineTo(to.x, to.y);
        this.ctx.stroke();
        
        if (isActive) {
            const numPackets = 3;
            for (let i = 0; i < numPackets; i++) {
                const offset = (conn.animationOffset + i / numPackets) % 1;
                const px = from.x + (to.x - from.x) * offset;
                const py = from.y + (to.y - from.y) * offset;
                
                const gradient = this.ctx.createRadialGradient(px, py, 0, px, py, 8);
                gradient.addColorStop(0, 'rgba(0, 255, 136, 1)');
                gradient.addColorStop(0.5, 'rgba(0, 255, 136, 0.6)');
                gradient.addColorStop(1, 'rgba(0, 255, 136, 0)');
                
                this.ctx.fillStyle = gradient;
                this.ctx.beginPath();
                this.ctx.arc(px, py, 8, 0, Math.PI * 2);
                this.ctx.fill();
                
                this.ctx.fillStyle = '#00ff88';
                this.ctx.beginPath();
                this.ctx.arc(px, py, 3, 0, Math.PI * 2);
                this.ctx.fill();
            }
        }
        
        this.ctx.shadowBlur = 0;
        
        const midX = (from.x + to.x) / 2;
        const midY = (from.y + to.y) / 2;
        
        this.ctx.fillStyle = 'rgba(42, 45, 58, 0.9)';
        this.ctx.fillRect(midX - 40, midY - 12, 80, 24);
        
        this.ctx.fillStyle = isActive ? '#00ff88' : '#ffaa00';
        this.ctx.font = '11px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(isActive ? `${conn.bandwidth || 1000}Mbps` : 'INACTIVE', midX, midY);
    }
    
    handleCanvasClick(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        if (this.currentTool) {
            this.addDevice(this.currentTool, x, y);
        } else if (this.connectionMode) {
            this.handleConnectionClick(x, y);
        } else if (this.deleteMode) {
            this.handleDeleteClick(x, y);
        } else if (this.analyzeMode) {
            this.handleAnalyzeClick(x, y);
        }
    }
    
    handleMouseDown(e) {
        if (this.moveMode) {
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            const device = this.getDeviceAt(x, y);
            if (device) {
                this.draggedDevice = device;
                this.dragOffset = { x: x - device.x, y: y - device.y };
                this.canvas.style.cursor = 'grabbing';
            }
        }
    }
    
    handleMouseMove(e) {
        if (this.draggedDevice && this.moveMode) {
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            this.draggedDevice.x = x - this.dragOffset.x;
            this.draggedDevice.y = y - this.dragOffset.y;
            this.render();
        }
    }
    
    handleMouseUp(e) {
        if (this.draggedDevice) {
            this.draggedDevice = null;
            this.canvas.style.cursor = 'grab';
        }
    }
    
    addDevice(type, x, y) {
        const device = {
            id: this.deviceIdCounter++,
            type: type,
            x: x,
            y: y,
            name: `${this.getDeviceTypeName(type)}-${this.deviceIdCounter - 1}`,
            mac: this.generateMAC(this.deviceIdCounter - 1),
            config: this.getDefaultConfig(type),
            status: 'active',
            customIcon: this.customDeviceTypes[type]?.iconImage || null
        };
        
        this.devices.push(device);
        this.render();
        this.openConfigModal(device);
    }
    
    getDeviceAt(x, y) {
        for (let i = this.devices.length - 1; i >= 0; i--) {
            const device = this.devices[i];
            const distance = Math.sqrt((x - device.x) ** 2 + (y - device.y) ** 2);
            if (distance < 30) {
                return device;
            }
        }
        return null;
    }
    
    handleConnectionClick(x, y) {
        const device = this.getDeviceAt(x, y);
        
        if (device) {
            if (!this.firstConnectionDevice) {
                this.firstConnectionDevice = device;
                console.log('Seleziona il secondo dispositivo');
            } else {
                if (device.id !== this.firstConnectionDevice.id) {
                    this.createConnection(this.firstConnectionDevice, device);
                }
                this.firstConnectionDevice = null;
            }
        }
    }
    
    createConnection(device1, device2) {
        const exists = this.connections.some(conn => 
            (conn.from.id === device1.id && conn.to.id === device2.id) ||
            (conn.from.id === device2.id && conn.to.id === device1.id)
        );
        
        if (!exists) {
            const connection = {
                id: this.connectionIdCounter++,
                from: device1,
                to: device2,
                status: 'inactive',
                bandwidth: 1000,
                latency: 5,
                packets: 0,
                animationOffset: 0,
                lastCheck: Date.now()
            };
            
            this.connections.push(connection);
            this.render();
            console.log('Connessione creata!');
        }
    }
    
    handleDeleteClick(x, y) {
        const device = this.getDeviceAt(x, y);
        if (device) {
            this.devices = this.devices.filter(d => d.id !== device.id);
            this.connections = this.connections.filter(conn => 
                conn.from.id !== device.id && conn.to.id !== device.id
            );
            if (this.selectedDevice && this.selectedDevice.id === device.id) {
                this.closeInfoPanel();
            }
            this.render();
            return;
        }
    }
    
    handleAnalyzeClick(x, y) {
        const device = this.getDeviceAt(x, y);
        if (device) {
            this.selectedDevice = device;
            this.showInfoPanel(device);
        }
    }
    
    showInfoPanel(device) {
        const panel = document.getElementById('infoPanel');
        const deviceName = document.getElementById('deviceName');
        const deviceInfo = document.getElementById('deviceInfo');
        
        deviceName.textContent = device.name;
        
        let infoHtml = `
            <div class="info-group">
                <h3>Informazioni Base</h3>
                <div class="info-row">
                    <span class="info-label">Tipo:</span>
                    <span class="info-value">${this.getDeviceTypeName(device.type)}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">MAC:</span>
                    <span class="info-value">${device.mac}</span>
                </div>
            </div>
        `;
        
        if (device.config.ip) {
            infoHtml += `
                <div class="info-group">
                    <h3>Configurazione Rete</h3>
                    <div class="info-row">
                        <span class="info-label">IP:</span>
                        <span class="info-value">${device.config.ip}</span>
                    </div>
                </div>
            `;
        }
        
        infoHtml += `
            <button class="btn btn-primary" style="width: 100%; margin-top: 15px;" 
                onclick="lab.openConfigModal(lab.selectedDevice)">
                ⚙️ Modifica Configurazione
            </button>
        `;
        
        deviceInfo.innerHTML = infoHtml;
        panel.classList.add('active');
    }
    
    closeInfoPanel() {
        document.getElementById('infoPanel').classList.remove('active');
        this.selectedDevice = null;
    }
    
    openConfigModal(device) {
        const modal = document.getElementById('configModal');
        const modalTitle = document.getElementById('modalTitle');
        const modalBody = document.getElementById('modalBody');
        
        modalTitle.textContent = `⚙️ Configurazione ${device.name}`;
        this.currentConfigDevice = device;
        
        let formHtml = `<form id="deviceConfigForm">
            <div class="form-group">
                <label>Nome Dispositivo</label>
                <input type="text" name="name" value="${device.name}" required>
            </div>
            <div class="form-group">
                <label>Indirizzo IP</label>
                <input type="text" name="ip" value="${device.config.ip || ''}" placeholder="192.168.1.1">
            </div>
        </form>`;
        
        modalBody.innerHTML = formHtml;
        modal.classList.add('active');
    }
    
    closeModal() {
        document.getElementById('configModal').classList.remove('active');
        this.currentConfigDevice = null;
    }
    
    saveDeviceConfig() {
        const form = document.getElementById('deviceConfigForm');
        const formData = new FormData(form);
        const device = this.currentConfigDevice;
        
        device.name = formData.get('name');
        if (formData.get('ip')) {
            device.config.ip = formData.get('ip');
        }
        
        this.closeModal();
        if (this.selectedDevice) {
            this.showInfoPanel(device);
        }
        this.render();
    }
    
    openPacketModal() {
        const modal = document.getElementById('packetModal');
        const sourceSelect = document.getElementById('sourceDevice');
        
        sourceSelect.innerHTML = '<option value="">-- Seleziona dispositivo --</option>';
        this.devices.forEach(device => {
            if (device.config.ip) {
                sourceSelect.innerHTML += `<option value="${device.id}">${device.name} (${device.config.ip})</option>`;
            }
        });
        
        modal.classList.add('active');
    }
    
    closePacketModal() {
        document.getElementById('packetModal').classList.remove('active');
    }
    
    updatePacketSourceIP(e) {
        const deviceId = parseInt(e.target.value);
        const device = this.devices.find(d => d.id === deviceId);
        
        if (device && device.config.ip) {
            document.querySelector('[name="sourceIP"]').value = device.config.ip;
        }
    }
    
    createPacket(sendImmediately) {
        const form = document.getElementById('packetForm');
        const formData = new FormData(form);
        
        const sourceDeviceId = parseInt(formData.get('sourceDevice'));
        const sourceDevice = this.devices.find(d => d.id === sourceDeviceId);
        
        if (!sourceDevice) {
            alert('Seleziona un dispositivo sorgente');
            return;
        }
        
        this.currentPacket = {
            id: Date.now(),
            sourceDevice: sourceDevice,
            sourceIP: sourceDevice.config.ip,
            sourcePort: parseInt(formData.get('sourcePort')),
            destIP: formData.get('destIP'),
            destPort: parseInt(formData.get('destPort')),
            protocol: formData.get('protocol'),
            payload: formData.get('payload'),
            timestamp: new Date().toISOString()
        };
        
        this.closePacketModal();
        console.log('Pacchetto creato!');
        
        if (sendImmediately) {
            this.sendCurrentPacket();
        }
    }
    
    sendCurrentPacket() {
        if (!this.currentPacket) {
            alert('Crea prima un pacchetto!');
            this.openPacketModal();
            return;
        }
        
        const destIP = this.currentPacket.destIP;
        const destDevice = this.devices.find(d => d.config.ip === destIP);
        
        if (!destDevice) {
            this.logTraffic('blocked', 
                `${this.currentPacket.sourceDevice.name} → ${destIP}`,
                'Dispositivo destinazione non trovato',
                'info');
            return;
        }
        
        this.logTraffic('info',
            `${this.currentPacket.sourceDevice.name} → ${destDevice.name}`,
            `Invio pacchetto ${this.currentPacket.protocol}`,
            'info');
        
        // Update connection visual
        const conn = this.connections.find(c =>
            (c.from.id === this.currentPacket.sourceDevice.id && c.to.id === destDevice.id) ||
            (c.from.id === destDevice.id && c.to.id === this.currentPacket.sourceDevice.id)
        );
        if (conn) {
            conn.status = 'active';
            conn.lastCheck = Date.now();
        }
    }
    
    stopSimulation() {
        this.simulationRunning = false;
        console.log('Simulazione fermata');
    }
    
    logTraffic(type, route, message, layer) {
        const timestamp = new Date().toLocaleTimeString();
        this.trafficLog.push({
            timestamp,
            type,
            route,
            message,
            layer
        });
        
        if (this.trafficLog.length > 100) {
            this.trafficLog.shift();
        }
        
        this.updateLogPanel();
    }
    
    updateLogPanel() {
        const logContent = document.getElementById('logContent');
        
        if (this.trafficLog.length === 0) {
            logContent.innerHTML = '<p class="log-empty">Console pronta. Crea un pacchetto per iniziare!</p>';
            return;
        }
        
        let html = '';
        for (let i = this.trafficLog.length - 1; i >= 0; i--) {
            const log = this.trafficLog[i];
            let statusClass = 'allowed';
            let statusText = 'INFO';
            
            if (log.type === 'success') {
                statusClass = 'allowed';
                statusText = 'ALLOWED';
            } else if (log.type === 'blocked') {
                statusClass = 'denied';
                statusText = 'DENIED';
            } else if (log.type === 'info') {
                statusClass = 'processing';
                statusText = 'INFO';
            }
            
            html += `
                <div class="log-entry ${log.type}">
                    <span class="log-time">[${log.timestamp}]</span>
                    <span class="log-status ${statusClass}">${statusText}</span>
                    <br>
                    <strong>${log.route}</strong><br>
                    ${log.message}
                </div>
            `;
        }
        
        logContent.innerHTML = html;
        logContent.scrollTop = 0;
    }
    
    openCustomDeviceModal() {
        document.getElementById('customDeviceModal').classList.add('active');
        document.getElementById('customDeviceForm').reset();
    }
    
    closeCustomDeviceModal() {
        document.getElementById('customDeviceModal').classList.remove('active');
    }
    
    previewIcon(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                const preview = document.getElementById('iconPreview');
                preview.src = ev.target.result;
                preview.style.display = 'block';
            };
            reader.readAsDataURL(file);
        }
    }
    
    saveCustomDeviceType() {
        const form = document.getElementById('customDeviceForm');
        const formData = new FormData(form);
        
        const typeName = formData.get('typeName');
        const typeKey = typeName.toLowerCase().replace(/\s+/g, '_');
        
        this.customDeviceTypes[typeKey] = {
            name: typeName,
            description: formData.get('description'),
            icon: formData.get('icon') || '📦',
            iconImage: null,
            defaultConfig: {}
        };
        
        localStorage.setItem('networklab_custom_devices', JSON.stringify(this.customDeviceTypes));
        this.loadCustomDeviceButtons();
        this.closeCustomDeviceModal();
        console.log('Dispositivo custom creato!');
    }
    
    loadCustomDeviceButtons() {
        // Placeholder - aggiungi pulsanti custom nella toolbar se necessario
    }
    
    manageCustomDevices() {
        alert('Gestione dispositivi custom - da implementare');
    }
    
    saveCurrentProject() {
        const projectName = prompt('Nome del progetto:');
        if (!projectName) return;
        
        const project = {
            id: Date.now(),
            name: projectName,
            timestamp: new Date().toISOString(),
            devices: this.devices,
            connections: this.connections.map(c => ({
                id: c.id,
                fromId: c.from.id,
                toId: c.to.id,
                bandwidth: c.bandwidth
            }))
        };
        
        this.savedProjects.push(project);
        localStorage.setItem('networklab_projects', JSON.stringify(this.savedProjects));
        console.log('Progetto salvato!');
    }
    
    exportProject() {
        const project = {
            version: '2.0',
            timestamp: new Date().toISOString(),
            devices: this.devices,
            connections: this.connections.map(c => ({
                id: c.id,
                fromId: c.from.id,
                toId: c.to.id
            }))
        };
        
        const dataStr = JSON.stringify(project, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
        
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', `network-lab-${Date.now()}.json`);
        linkElement.click();
        
        console.log('Progetto esportato!');
    }
    
    importProject(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const project = JSON.parse(e.target.result);
                
                this.devices = project.devices;
                this.deviceIdCounter = Math.max(...this.devices.map(d => d.id), 0) + 1;
                
                this.connections = project.connections.map(c => {
                    const fromDevice = this.devices.find(d => d.id === c.fromId);
                    const toDevice = this.devices.find(d => d.id === c.toId);
                    return {
                        id: c.id,
                        from: fromDevice,
                        to: toDevice,
                        bandwidth: c.bandwidth || 1000,
                        status: 'inactive',
                        animationOffset: 0,
                        lastCheck: Date.now()
                    };
                });
                
                this.connectionIdCounter = Math.max(...this.connections.map(c => c.id), 0) + 1;
                this.render();
                console.log('Progetto importato!');
                
            } catch (error) {
                alert('Errore nell\'importazione: ' + error.message);
            }
        };
        
        reader.readAsText(file);
        event.target.value = '';
    }
}

// Initialize everything when DOM is ready
let lab;
let neural;

document.addEventListener('DOMContentLoaded', () => {
    // Start neural network background
    neural = new NeuralNetwork(document.getElementById('neuralBg'));
    neural.animate();
    
    // Start network lab
    lab = new NetworkLab();
    
    // Setup collapsible sections
    const sectionHeaders = document.querySelectorAll('.section-header');
    
    sectionHeaders.forEach(header => {
        header.addEventListener('click', () => {
            const sectionId = header.dataset.section;
            const content = document.getElementById(sectionId);
            
            header.classList.toggle('collapsed');
            content.classList.toggle('collapsed');
            
            const isCollapsed = header.classList.contains('collapsed');
            localStorage.setItem(`section_${sectionId}`, isCollapsed);
        });
        
        // Restore saved state
        const sectionId = header.dataset.section;
        const savedState = localStorage.getItem(`section_${sectionId}`);
        if (savedState === 'true') {
            header.classList.add('collapsed');
            document.getElementById(sectionId).classList.add('collapsed');
        }
    });
    
    console.log('Network Lab v2.0 Final - Ready!');
});

// CONFIGURAZIONI AVANZATE COMPLETE

NetworkLab.prototype.openConfigModal = function(device) {
    const modal = document.getElementById('configModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');
    
    modalTitle.textContent = `⚙️ Configurazione ${device.name}`;
    this.currentConfigDevice = device;
    
    let formHtml = '<form id="deviceConfigForm">';
    
    // Nome dispositivo
    formHtml += `
        <div class="form-group">
            <label>Nome Dispositivo</label>
            <input type="text" name="name" value="${device.name}" required>
        </div>
        
        <div class="form-group">
            <label>Descrizione (opzionale)</label>
            <textarea name="description" rows="2" placeholder="Es: Router principale dell'ufficio">${device.description || ''}</textarea>
        </div>
    `;
    
    // Configurazione specifica per tipo
    if (device.type === 'firewall') {
        formHtml += this.generateFirewallConfig(device);
    } else if (device.type === 'router') {
        formHtml += this.generateRouterConfig(device);
    } else if (device.type === 'switch') {
        formHtml += this.generateSwitchConfig(device);
    } else if (device.type === 'pc' || device.type === 'server') {
        formHtml += this.generateHostConfig(device);
    } else if (device.type === 'ids') {
        formHtml += this.generateIDSConfig(device);
    }
    
    // Logiche custom - per TUTTI i dispositivi
    formHtml += `
        <hr style="border-color: var(--border); margin: 20px 0;">
        <h3 style="color: var(--primary); margin-bottom: 15px;">🧠 Logiche Custom</h3>
        <div class="form-group">
            <label>Regole Logiche (JSON)</label>
            <textarea name="logicRules" rows="6" placeholder='[
  {
    "name": "Block SSH",
    "field": "destPort",
    "operator": "equals",
    "value": 22,
    "action": "block"
  },
  {
    "name": "Block SYN flood",
    "field": "flags",
    "operator": "has_flag",
    "value": "SYN",
    "action": "block"
  }
]'>${JSON.stringify(device.config.logicRules || [], null, 2)}</textarea>
            <small style="color: rgba(255,255,255,0.6); font-size: 11px; display: block; margin-top: 5px;">
                <strong>Campi:</strong> sourceIP, sourcePort, destIP, destPort, protocol, flags<br>
                <strong>Operatori:</strong> equals, not_equals, contains, greater_than, less_than, in_list, has_flag<br>
                <strong>Azioni:</strong> allow, block
            </small>
        </div>
    `;
    
    formHtml += '</form>';
    modalBody.innerHTML = formHtml;
    modal.classList.add('active');
};

NetworkLab.prototype.generateFirewallConfig = function(device) {
    let html = `
        <div class="form-group">
            <label>Indirizzo IP</label>
            <input type="text" name="ip" value="${device.config.ip || ''}" placeholder="Es: 192.168.1.254">
        </div>
        
        <div class="form-group">
            <label>Subnet Mask</label>
            <input type="text" name="subnet" value="${device.config.subnet || ''}" placeholder="Es: 255.255.255.0">
        </div>
        
        <h3 style="color: var(--success); margin: 20px 0 10px 0;">🔽 Traffico in Entrata (Inbound)</h3>
        
        <div class="form-group">
            <label>Policy Default Inbound</label>
            <select name="defaultInbound">
                <option value="deny" ${device.config.defaultInbound === 'deny' ? 'selected' : ''}>❌ Nega Tutto (Recommended)</option>
                <option value="allow" ${device.config.defaultInbound === 'allow' ? 'selected' : ''}>✅ Permetti Tutto</option>
            </select>
        </div>
        
        <div class="form-group">
            <label>Regole Inbound (JSON)</label>
            <textarea name="inboundRules" rows="10" placeholder='[
  {
    "name": "Allow HTTP from anywhere",
    "protocol": "TCP",
    "srcIP": "any",
    "srcPort": "any",
    "dstIP": "192.168.1.50",
    "dstPort": "80",
    "action": "allow",
    "flags": []
  },
  {
    "name": "Block external SSH",
    "protocol": "TCP",
    "srcIP": "0.0.0.0/0",
    "srcPort": "any",
    "dstIP": "any",
    "dstPort": "22",
    "action": "deny",
    "flags": ["SYN"]
  }
]'>${JSON.stringify(device.config.inboundRules || [], null, 2)}</textarea>
            <small style="color: rgba(255,255,255,0.6); font-size: 11px;">
                <strong>Formato:</strong> name, protocol (TCP/UDP/any), srcIP, srcPort, dstIP, dstPort, action (allow/deny), flags (array)
            </small>
        </div>
        
        <h3 style="color: var(--warning); margin: 20px 0 10px 0;">🔼 Traffico in Uscita (Outbound)</h3>
        
        <div class="form-group">
            <label>Policy Default Outbound</label>
            <select name="defaultOutbound">
                <option value="allow" ${device.config.defaultOutbound === 'allow' ? 'selected' : ''}>✅ Permetti Tutto (Recommended)</option>
                <option value="deny" ${device.config.defaultOutbound === 'deny' ? 'selected' : ''}>❌ Nega Tutto</option>
            </select>
        </div>
        
        <div class="form-group">
            <label>Regole Outbound (JSON)</label>
            <textarea name="outboundRules" rows="8" placeholder='[
  {
    "name": "Allow all outbound",
    "protocol": "any",
    "srcIP": "any",
    "srcPort": "any",
    "dstIP": "any",
    "dstPort": "any",
    "action": "allow",
    "flags": []
  }
]'>${JSON.stringify(device.config.outboundRules || [], null, 2)}</textarea>
        </div>
        
        <div class="form-group">
            <div class="checkbox-group">
                <input type="checkbox" name="logging" id="logging" ${device.config.logging ? 'checked' : ''}>
                <label for="logging">Abilita Logging Dettagliato</label>
            </div>
        </div>
    `;
    return html;
};

NetworkLab.prototype.generateRouterConfig = function(device) {
    let html = `
        <div class="form-group">
            <label>Indirizzo IP</label>
            <input type="text" name="ip" value="${device.config.ip || ''}" placeholder="Es: 192.168.1.1">
        </div>
        
        <div class="form-group">
            <label>Subnet Mask</label>
            <input type="text" name="subnet" value="${device.config.subnet || ''}" placeholder="Es: 255.255.255.0">
        </div>
        
        <div class="form-group">
            <label>Gateway (opzionale)</label>
            <input type="text" name="gateway" value="${device.config.gateway || ''}" placeholder="Es: 192.168.1.254 (lascia vuoto se è il gateway principale)">
        </div>
        
        <div class="form-group">
            <div class="checkbox-group">
                <input type="checkbox" name="nat" id="nat" ${device.config.nat ? 'checked' : ''}>
                <label for="nat">Abilita NAT (Network Address Translation)</label>
            </div>
        </div>
        
        <div class="form-group">
            <label>Routing</label>
            <select name="routing">
                <option value="enabled" ${device.config.routing === 'enabled' ? 'selected' : ''}>✅ Abilitato (permetti routing tra subnet)</option>
                <option value="disabled" ${device.config.routing === 'disabled' ? 'selected' : ''}>❌ Disabilitato</option>
            </select>
        </div>
        
        <h3 style="color: var(--success); margin: 20px 0 10px 0;">Regole Router</h3>
        
        <div class="form-group">
            <label>Regole Inbound</label>
            <textarea name="inboundRules" rows="4" placeholder='[{"name":"Allow management","protocol":"TCP","srcIP":"192.168.1.0/24","srcPort":"any","dstIP":"any","dstPort":"22","action":"allow","flags":[]}]'>${JSON.stringify(device.config.inboundRules || [], null, 2)}</textarea>
        </div>
        
        <div class="form-group">
            <label>Regole Outbound</label>
            <textarea name="outboundRules" rows="4" placeholder='[{"name":"Allow all","protocol":"any","srcIP":"any","srcPort":"any","dstIP":"any","dstPort":"any","action":"allow","flags":[]}]'>${JSON.stringify(device.config.outboundRules || [], null, 2)}</textarea>
        </div>
    `;
    return html;
};

NetworkLab.prototype.generateSwitchConfig = function(device) {
    let html = `
        <div class="form-group">
            <label>Numero Porte</label>
            <input type="number" name="ports" value="${device.config.ports || 24}" min="4" max="48" placeholder="Es: 24">
        </div>
        
        <div class="form-group">
            <label>VLAN (separate da virgola)</label>
            <input type="text" name="vlans" value="${(device.config.vlans || [1]).join(',')}" placeholder="Es: 1,10,20,30 (VLAN IDs)">
        </div>
        
        <div class="form-group">
            <div class="checkbox-group">
                <input type="checkbox" name="spanningTree" id="spanningTree" ${device.config.spanningTree ? 'checked' : ''}>
                <label for="spanningTree">Spanning Tree Protocol (STP) - previeni loop</label>
            </div>
        </div>
        
        <div class="form-group">
            <div class="checkbox-group">
                <input type="checkbox" name="portSecurity" id="portSecurity" ${device.config.portSecurity ? 'checked' : ''}>
                <label for="portSecurity">Port Security - limita MAC address per porta</label>
            </div>
        </div>
    `;
    return html;
};

NetworkLab.prototype.generateHostConfig = function(device) {
    let html = `
        <div class="form-group">
            <label>Indirizzo IP</label>
            <input type="text" name="ip" value="${device.config.ip || ''}" placeholder="Es: 192.168.1.100">
        </div>
        
        <div class="form-group">
            <label>Subnet Mask</label>
            <input type="text" name="subnet" value="${device.config.subnet || ''}" placeholder="Es: 255.255.255.0">
        </div>
        
        <div class="form-group">
            <label>Gateway</label>
            <input type="text" name="gateway" value="${device.config.gateway || ''}" placeholder="Es: 192.168.1.1 (IP del router)">
        </div>
        
        <div class="form-group">
            <label>Sistema Operativo</label>
            <input type="text" name="os" value="${device.config.os || ''}" placeholder="Es: Windows 11, Ubuntu 22.04, macOS">
        </div>
        
        <div class="form-group">
            <label>Porte Aperte (separate da virgola)</label>
            <input type="text" name="openPorts" value="${(device.config.openPorts || []).join(',')}" placeholder="Es: 80,443,22,3389 (porte TCP/UDP aperte)">
        </div>
    `;
    
    if (device.type === 'server') {
        html += `
            <div class="form-group">
                <label>Servizi Attivi (formato: NOME:PORTA)</label>
                <input type="text" name="services" value="${(device.config.services || []).join(',')}" placeholder="Es: HTTP:80,HTTPS:443,SSH:22,MySQL:3306">
            </div>
        `;
    }
    
    html += `
        <h3 style="color: var(--success); margin: 20px 0 10px 0;">Firewall Host</h3>
        
        <div class="form-group">
            <label>Regole Inbound</label>
            <textarea name="inboundRules" rows="4" placeholder='[{"name":"Allow RDP","protocol":"TCP","srcIP":"192.168.1.0/24","srcPort":"any","dstIP":"any","dstPort":"3389","action":"allow","flags":[]}]'>${JSON.stringify(device.config.inboundRules || [], null, 2)}</textarea>
        </div>
        
        <div class="form-group">
            <label>Regole Outbound</label>
            <textarea name="outboundRules" rows="4" placeholder='[{"name":"Allow all","protocol":"any","srcIP":"any","srcPort":"any","dstIP":"any","dstPort":"any","action":"allow","flags":[]}]'>${JSON.stringify(device.config.outboundRules || [], null, 2)}</textarea>
        </div>
    `;
    
    return html;
};

NetworkLab.prototype.generateIDSConfig = function(device) {
    let html = `
        <div class="form-group">
            <label>Indirizzo IP</label>
            <input type="text" name="ip" value="${device.config.ip || ''}" placeholder="Es: 192.168.1.253">
        </div>
        
        <div class="form-group">
            <label>Subnet Mask</label>
            <input type="text" name="subnet" value="${device.config.subnet || ''}" placeholder="Es: 255.255.255.0">
        </div>
        
        <div class="form-group">
            <label>Modalità</label>
            <select name="mode">
                <option value="IDS" ${device.config.mode === 'IDS' ? 'selected' : ''}>IDS (Detection Only - solo rileva)</option>
                <option value="IPS" ${device.config.mode === 'IPS' ? 'selected' : ''}>IPS (Prevention Active - blocca attacchi)</option>
            </select>
        </div>
        
        <div class="form-group">
            <div class="checkbox-group">
                <input type="checkbox" name="signatures" id="signatures" ${device.config.signatures === 'enabled' ? 'checked' : ''}>
                <label for="signatures">Abilita Signature Detection (rileva pattern noti)</label>
            </div>
        </div>
        
        <div class="form-group">
            <div class="checkbox-group">
                <input type="checkbox" name="alerts" id="alerts" ${device.config.alerts ? 'checked' : ''}>
                <label for="alerts">Abilita Alert System (notifiche real-time)</label>
            </div>
        </div>
        
        <div class="form-group">
            <label>IP Bloccati (uno per riga)</label>
            <textarea name="blockedIPs" rows="4" placeholder="Es:&#10;192.168.1.99&#10;10.0.0.15&#10;172.16.5.100">${(device.config.blockedIPs || []).join('\n')}</textarea>
        </div>
    `;
    return html;
};

NetworkLab.prototype.saveDeviceConfig = function() {
    const form = document.getElementById('deviceConfigForm');
    const formData = new FormData(form);
    const device = this.currentConfigDevice;
    
    device.name = formData.get('name');
    device.description = formData.get('description');
    
    for (let [key, value] of formData.entries()) {
        if (['name', 'description'].includes(key)) continue;
        
        if (form.elements[key] && form.elements[key].type === 'checkbox') {
            device.config[key] = form.elements[key].checked;
        }
        else if (key === 'services' || key === 'vlans') {
            device.config[key] = value.split(',').map(v => v.trim()).filter(v => v);
        }
        else if (key === 'openPorts') {
            device.config[key] = value.split(',').map(v => parseInt(v.trim())).filter(v => !isNaN(v));
        }
        else if (key === 'inboundRules' || key === 'outboundRules' || key === 'logicRules') {
            try {
                device.config[key] = JSON.parse(value);
            } catch (e) {
                console.error(`Errore parsing ${key}:`, e);
                device.config[key] = [];
            }
        }
        else if (key === 'blockedIPs') {
            device.config[key] = value.split('\n').map(v => v.trim()).filter(v => v);
        }
        else if (key === 'ports') {
            device.config[key] = parseInt(value);
        }
        else {
            device.config[key] = value;
        }
    }
    
    this.closeModal();
    if (this.selectedDevice) {
        this.showInfoPanel(device);
    }
    this.render();
    console.log('Configurazione salvata!', device);
};

// Gestione Custom Devices
NetworkLab.prototype.saveCustomDevicesToStorage = function() {
    localStorage.setItem('networklab_custom_devices', JSON.stringify(this.customDeviceTypes));
};

NetworkLab.prototype.loadCustomDeviceButtons = function() {
    const section = document.querySelector('#custom');
    if (!section) return;
    
    const existingCustomBtns = section.querySelectorAll('.tool-btn[data-custom]');
    existingCustomBtns.forEach(btn => btn.remove());
    
    Object.keys(this.customDeviceTypes).forEach(typeKey => {
        const type = this.customDeviceTypes[typeKey];
        const btn = document.createElement('button');
        btn.className = 'tool-btn';
        btn.setAttribute('data-device', typeKey);
        btn.setAttribute('data-custom', 'true');
        btn.innerHTML = `<span class="icon">${type.icon || '📦'}</span>${type.name}`;
        btn.addEventListener('click', () => {
            this.setMode('add');
            document.querySelectorAll('.tool-btn, .action-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            this.currentTool = typeKey;
        });
        section.insertBefore(btn, section.querySelector('#addCustomDevice'));
    });
};

NetworkLab.prototype.manageCustomDevices = function() {
    let html = '<div style="max-height: 400px; overflow-y: auto;">';
    
    if (Object.keys(this.customDeviceTypes).length === 0) {
        html += '<p class="log-empty">Nessun dispositivo custom. Creane uno!</p>';
    } else {
        Object.keys(this.customDeviceTypes).forEach(key => {
            const type = this.customDeviceTypes[key];
            html += `
                <div class="project-item">
                    <div class="project-name">${type.icon} ${type.name}</div>
                    <div class="project-meta">${type.description || 'Nessuna descrizione'}</div>
                    <div class="project-actions">
                        <button class="btn-sm btn-delete" onclick="lab.deleteCustomDeviceType('${key}')">
                            Elimina
                        </button>
                    </div>
                </div>
            `;
        });
    }
    
    html += '</div>';
    
    const modal = document.getElementById('projectsModal');
    document.getElementById('projectsList').innerHTML = html;
    modal.classList.add('active');
    
    const closeBtn = document.getElementById('closeProjectsModal');
    const closeBtn2 = document.getElementById('closeProjects');
    
    closeBtn.onclick = () => modal.classList.remove('active');
    closeBtn2.onclick = () => modal.classList.remove('active');
};

NetworkLab.prototype.deleteCustomDeviceType = function(key) {
    if (confirm('Sei sicuro di voler eliminare questo tipo di dispositivo?')) {
        delete this.customDeviceTypes[key];
        this.saveCustomDevicesToStorage();
        this.loadCustomDeviceButtons();
        this.manageCustomDevices();
    }
};

console.log('Network Lab - Configurazioni avanzate caricate!');


// LOGICA SIMULAZIONE PACCHETTI COMPLETA

NetworkLab.prototype.sendCurrentPacket = function() {
    if (!this.currentPacket) {
        alert('Crea prima un pacchetto!');
        this.openPacketModal();
        return;
    }
    
    const destIP = this.currentPacket.destIP;
    const destDevice = this.devices.find(d => d.config.ip === destIP);
    
    if (!destDevice) {
        this.logTraffic('blocked', 
            `${this.currentPacket.sourceDevice.name} → ${destIP}`,
            'Dispositivo destinazione non trovato nella rete',
            'info');
        return;
    }
    
    this.logTraffic('info',
        `${this.currentPacket.sourceDevice.name} → ${destDevice.name}`,
        `Invio pacchetto ${this.currentPacket.protocol} da porta ${this.currentPacket.sourcePort} a ${this.currentPacket.destPort}`,
        'info');
    
    this.simulationRunning = true;
    this.simulatePacketFlow(this.currentPacket.sourceDevice, destDevice, this.currentPacket);
};

NetworkLab.prototype.simulatePacketFlow = function(fromDevice, toDevice, packet) {
    const path = this.findPath(fromDevice, toDevice);
    
    if (!path || path.length === 0) {
        this.logTraffic('blocked', 
            `${fromDevice.name} → ${toDevice.name}`,
            'Nessun percorso fisico disponibile',
            'blocked');
        return;
    }
    
    this.logTraffic('info',
        `${fromDevice.name} → ${toDevice.name}`,
        `Percorso trovato: ${path.map(d => d.name).join(' → ')}`,
        'info');
    
    // Simula passaggio attraverso ogni dispositivo
    for (let i = 0; i < path.length; i++) {
        const currentDevice = path[i];
        const nextDevice = path[i + 1];
        
        const allowed = this.processPacketAtDevice(
            currentDevice, 
            fromDevice, 
            toDevice, 
            packet, 
            i === 0 ? 'outbound' : i === path.length - 1 ? 'inbound' : 'transit'
        );
        
        if (!allowed) {
            return; // Pacchetto bloccato
        }
        
        if (nextDevice) {
            this.logTraffic('success',
                `${currentDevice.name} → ${nextDevice.name}`,
                'Pacchetto inoltrato',
                'success');
        }
    }
    
    // Pacchetto arrivato a destinazione
    this.logTraffic('success',
        `${fromDevice.name} → ${toDevice.name}`,
        `✅ Pacchetto consegnato con successo! Porta ${packet.destPort}/${packet.protocol}`,
        'success');
    
    // Aggiorna connessione visiva
    const conn = this.connections.find(c =>
        (c.from.id === fromDevice.id && c.to.id === toDevice.id) ||
        (c.from.id === toDevice.id && c.to.id === fromDevice.id)
    );
    if (conn) {
        conn.status = 'active';
        conn.lastCheck = Date.now();
    }
};

NetworkLab.prototype.processPacketAtDevice = function(device, srcDevice, dstDevice, packet, direction) {
    this.logTraffic('info',
        `📍 ${device.name}`,
        `Processamento pacchetto (${direction})`,
        'info');
    
    // Applica logiche custom del dispositivo
    if (device.config.logicRules && device.config.logicRules.length > 0) {
        for (let rule of device.config.logicRules) {
            if (this.evaluateLogicRule(rule, packet)) {
                if (rule.action === 'block' || rule.action === 'deny') {
                    this.logTraffic('blocked',
                        `${device.name}`,
                        `Bloccato da logica custom: ${rule.name || 'Regola senza nome'}`,
                        'blocked');
                    return false;
                }
            }
        }
    }
    
    // Logica specifica per tipo dispositivo
    if (device.type === 'firewall') {
        const rules = direction === 'outbound' ? device.config.outboundRules : device.config.inboundRules;
        const defaultAction = direction === 'outbound' ? device.config.defaultOutbound : device.config.defaultInbound;
        
        for (let rule of rules) {
            if (this.matchFirewallRule(rule, packet)) {
                if (rule.action === 'deny' || rule.action === 'block') {
                    this.logTraffic('blocked',
                        `${device.name}`,
                        `Firewall: Regola "${rule.name}" - ${direction}`,
                        'blocked');
                    return false;
                }
                if (rule.action === 'allow') {
                    this.logTraffic('success',
                        `${device.name}`,
                        `Firewall: Regola "${rule.name}" permette - ${direction}`,
                        'success');
                    return true;
                }
            }
        }
        
        if (defaultAction === 'deny') {
            this.logTraffic('blocked',
                `${device.name}`,
                `Firewall: Default policy DENY - ${direction}`,
                'blocked');
            return false;
        }
    }
    
    if (device.type === 'ids' && device.config.mode === 'IPS') {
        if (device.config.blockedIPs && device.config.blockedIPs.includes(packet.sourceIP)) {
            this.logTraffic('blocked',
                `${device.name}`,
                `IPS: IP sorgente ${packet.sourceIP} nella blocklist`,
                'blocked');
            return false;
        }
    }
    
    // Verifica porta destinazione se è il destinatario finale
    if (device.id === dstDevice.id) {
        const openPorts = device.config.openPorts || [];
        
        if (!openPorts.includes(packet.destPort)) {
            this.logTraffic('blocked',
                `${device.name}`,
                `Porta ${packet.destPort}/${packet.protocol} chiusa`,
                'blocked');
            return false;
        }
    }
    
    return true;
};

NetworkLab.prototype.evaluateLogicRule = function(rule, packet) {
    if (!rule.field || !rule.operator) return false;
    
    let packetValue = packet[rule.field];
    const ruleValue = rule.value;
    
    switch (rule.operator) {
        case 'equals':
            return packetValue == ruleValue;
        case 'not_equals':
            return packetValue != ruleValue;
        case 'contains':
            return String(packetValue).includes(String(ruleValue));
        case 'greater_than':
            return packetValue > ruleValue;
        case 'less_than':
            return packetValue < ruleValue;
        case 'in_list':
            return Array.isArray(ruleValue) && ruleValue.includes(packetValue);
        case 'has_flag':
            return Array.isArray(packet.flags) && packet.flags.includes(ruleValue);
        default:
            return false;
    }
};

NetworkLab.prototype.matchFirewallRule = function(rule, packet) {
    if (rule.protocol !== 'any' && rule.protocol !== packet.protocol) {
        return false;
    }
    
    if (rule.srcIP !== 'any' && rule.srcIP !== packet.sourceIP) {
        if (!rule.srcIP.includes('/')) return false;
    }
    
    if (rule.dstIP !== 'any' && rule.dstIP !== packet.destIP) {
        if (!rule.dstIP.includes('/')) return false;
    }
    
    if (rule.srcPort !== 'any' && rule.srcPort != packet.sourcePort) {
        return false;
    }
    
    if (rule.dstPort !== 'any' && rule.dstPort != packet.destPort) {
        return false;
    }
    
    if (rule.flags && rule.flags.length > 0 && packet.flags) {
        const hasAllFlags = rule.flags.every(f => packet.flags.includes(f));
        if (!hasAllFlags) return false;
    }
    
    return true;
};

NetworkLab.prototype.findPath = function(fromDevice, toDevice) {
    const queue = [[fromDevice]];
    const visited = new Set([fromDevice.id]);
    
    while (queue.length > 0) {
        const path = queue.shift();
        const current = path[path.length - 1];
        
        if (current.id === toDevice.id) {
            return path;
        }
        
        const neighbors = this.connections
            .filter(conn => conn.from.id === current.id || conn.to.id === current.id)
            .map(conn => conn.from.id === current.id ? conn.to : conn.from)
            .filter(device => !visited.has(device.id));
        
        neighbors.forEach(neighbor => {
            visited.add(neighbor.id);
            queue.push([...path, neighbor]);
        });
    }
    
    return null;
};

// Info panel migliorata
NetworkLab.prototype.showInfoPanel = function(device) {
    const panel = document.getElementById('infoPanel');
    const deviceName = document.getElementById('deviceName');
    const deviceInfo = document.getElementById('deviceInfo');
    
    deviceName.textContent = device.name;
    
    let infoHtml = `
        <div class="info-group">
            <h3>Informazioni Base</h3>
            <div class="info-row">
                <span class="info-label">Tipo:</span>
                <span class="info-value">${this.getDeviceTypeName(device.type)}</span>
            </div>
            <div class="info-row">
                <span class="info-label">MAC:</span>
                <span class="info-value">${device.mac}</span>
            </div>
            ${device.description ? `<div class="info-row">
                <span class="info-label">Descrizione:</span>
                <span class="info-value">${device.description}</span>
            </div>` : ''}
        </div>
    `;
    
    if (device.config.ip) {
        infoHtml += `
            <div class="info-group">
                <h3>Configurazione Rete</h3>
                <div class="info-row">
                    <span class="info-label">IP:</span>
                    <span class="info-value">${device.config.ip}</span>
                </div>
                ${device.config.subnet ? `<div class="info-row">
                    <span class="info-label">Subnet:</span>
                    <span class="info-value">${device.config.subnet}</span>
                </div>` : ''}
                ${device.config.gateway ? `<div class="info-row">
                    <span class="info-label">Gateway:</span>
                    <span class="info-value">${device.config.gateway}</span>
                </div>` : ''}
                ${device.config.openPorts ? `<div class="info-row">
                    <span class="info-label">Porte Aperte:</span>
                    <span class="info-value">${device.config.openPorts.join(', ')}</span>
                </div>` : ''}
            </div>
        `;
    }
    
    if (device.type === 'firewall') {
        infoHtml += `
            <div class="info-group">
                <h3>Policy Firewall</h3>
                <div class="info-row">
                    <span class="info-label">🔽 Inbound Default:</span>
                    <span class="info-value" style="color: ${device.config.defaultInbound === 'deny' ? 'var(--danger)' : 'var(--success)'}">
                        ${device.config.defaultInbound.toUpperCase()}
                    </span>
                </div>
                <div class="info-row">
                    <span class="info-label">🔼 Outbound Default:</span>
                    <span class="info-value" style="color: ${device.config.defaultOutbound === 'deny' ? 'var(--danger)' : 'var(--success)'}">
                        ${device.config.defaultOutbound.toUpperCase()}
                    </span>
                </div>
                <div class="info-row">
                    <span class="info-label">Regole Inbound:</span>
                    <span class="info-value">${(device.config.inboundRules || []).length}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Regole Outbound:</span>
                    <span class="info-value">${(device.config.outboundRules || []).length}</span>
                </div>
            </div>
        `;
    }
    
    if (device.config.logicRules && device.config.logicRules.length > 0) {
        infoHtml += `
            <div class="info-group">
                <h3>Logiche Custom</h3>
                <div class="info-row">
                    <span class="info-label">Regole Attive:</span>
                    <span class="info-value">${device.config.logicRules.length}</span>
                </div>
            </div>
        `;
    }
    
    const connections = this.connections.filter(c => c.from.id === device.id || c.to.id === device.id);
    if (connections.length > 0) {
        infoHtml += '<div class="info-group"><h3>Connessioni</h3>';
        connections.forEach(conn => {
            const other = conn.from.id === device.id ? conn.to : conn.from;
            const isActive = conn.status === 'active' && (Date.now() - (conn.lastCheck || 0)) < 5000;
            infoHtml += `
                <div class="info-row">
                    <span class="info-label">↔️ ${other.name}</span>
                    <span class="info-value" style="color: ${isActive ? 'var(--success)' : 'var(--warning)'}">
                        ${isActive ? '✅ ACTIVE' : '⚠️ INACTIVE'}
                    </span>
                </div>
            `;
        });
        infoHtml += '</div>';
    }
    
    infoHtml += `
        <button class="btn btn-primary" style="width: 100%; margin-top: 15px;" 
            onclick="lab.openConfigModal(lab.selectedDevice)">
            ⚙️ Modifica Configurazione
        </button>
    `;
    
    deviceInfo.innerHTML = infoHtml;
    panel.classList.add('active');
};

console.log('Network Lab - Simulazione pacchetti completa caricata!');


// AGGIORNAMENTO: Salvataggio dispositivo custom con categoria
NetworkLab.prototype.saveCustomDeviceType = function() {
    const form = document.getElementById('customDeviceForm');
    const formData = new FormData(form);
    
    const typeName = formData.get('typeName');
    const category = formData.get('category');
    const typeKey = typeName.toLowerCase().replace(/\s+/g, '_');
    
    if (!category) {
        alert('Seleziona una categoria!');
        return;
    }
    
    let iconImage = null;
    const preview = document.getElementById('iconPreview');
    if (preview && preview.src && preview.style.display !== 'none') {
        iconImage = preview.src;
    }
    
    let defaultConfig = {};
    try {
        const configText = formData.get('defaultConfig');
        if (configText && configText.trim()) {
            defaultConfig = JSON.parse(configText);
        }
    } catch (e) {
        console.error('Errore parsing config:', e);
        defaultConfig = {};
    }
    
    defaultConfig.inboundRules = defaultConfig.inboundRules || [];
    defaultConfig.outboundRules = defaultConfig.outboundRules || [];
    defaultConfig.logicRules = defaultConfig.logicRules || [];
    
    this.customDeviceTypes[typeKey] = {
        name: typeName,
        description: formData.get('description'),
        icon: formData.get('icon') || '📦',
        iconImage: iconImage,
        category: category,
        defaultConfig: defaultConfig
    };
    
    this.saveCustomDevicesToStorage();
    this.loadCustomDeviceButtons();
    this.closeCustomDeviceModal();
    console.log('Dispositivo custom creato in categoria:', category);
};

// AGGIORNAMENTO: Caricamento pulsanti custom nelle categorie corrette
NetworkLab.prototype.loadCustomDeviceButtons = function() {
    // Rimuovi tutti i pulsanti custom esistenti
    document.querySelectorAll('.tool-btn[data-custom]').forEach(btn => btn.remove());
    
    Object.keys(this.customDeviceTypes).forEach(typeKey => {
        const type = this.customDeviceTypes[typeKey];
        const category = type.category || 'custom';
        
        let sectionId;
        if (category === 'devices') {
            sectionId = 'devices';
        } else if (category === 'security') {
            sectionId = 'security';
        } else {
            sectionId = 'custom';
        }
        
        const section = document.getElementById(sectionId);
        if (!section) return;
        
        const btn = document.createElement('button');
        btn.className = 'tool-btn';
        btn.setAttribute('data-device', typeKey);
        btn.setAttribute('data-custom', 'true');
        
        if (type.iconImage) {
            btn.innerHTML = `
                <img src="${type.iconImage}" style="width: 18px; height: 18px; object-fit: contain; display: inline-block; vertical-align: middle;" />
                <span style="margin-left: 8px;">${type.name}</span>
            `;
        } else {
            btn.innerHTML = `<span class="icon">${type.icon || '📦'}</span>${type.name}`;
        }
        
        btn.addEventListener('click', () => {
            this.setMode('add');
            document.querySelectorAll('.tool-btn, .action-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            this.currentTool = typeKey;
        });
        
        // Inserisci alla fine della sezione
        section.appendChild(btn);
    });
};

console.log('Network Lab - Categorie custom devices aggiornate!');

