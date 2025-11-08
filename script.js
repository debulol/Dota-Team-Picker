// 全局变量
let playerPool = []; // 从配置文件加载的玩家库
let selectedPlayers = []; // 本次选择的玩家
let team1 = [];
let team2 = [];
let availablePlayers = [];
let pickOrder = [1, 2, 2, 1, 1, 2, 2, 1]; // 选人顺序

// DOTA2 英雄图标 CDN
const HERO_IMAGE_URL = 'https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/heroes/';

// 页面加载时读取玩家配置
window.addEventListener('DOMContentLoaded', function() {
    loadPlayerData();
});

// 从 players.json 加载玩家数据
async function loadPlayerData() {
    try {
        const response = await fetch('players/players.json');
        
        if (!response.ok) {
            throw new Error('无法加载玩家配置文件');
        }
        
        playerPool = await response.json();
        
        // 验证数据
        if (!Array.isArray(playerPool) || playerPool.length === 0) {
            throw new Error('玩家配置文件格式错误或为空');
        }
        
        // 加载成功，显示选择界面
        document.getElementById('loadingArea').style.display = 'none';
        document.getElementById('selectionArea').style.display = 'block';
        updateSelectionDisplay();
        
    } catch (error) {
        console.error('加载失败:', error);
        showError('无法加载玩家数据，请检查 players/players.json 文件是否存在且格式正确。');
    }
}

// 显示错误信息
function showError(message) {
    document.getElementById('loadingArea').style.display = 'none';
    document.getElementById('errorArea').style.display = 'block';
    document.getElementById('errorMessage').textContent = message;
}

// 获取英雄图标 URL
function getHeroImageUrl(heroId) {
    if (!heroId || heroId === '') {
        return 'https://via.placeholder.com/60x60/333333/ffffff?text=?';
    }
    return `${HERO_IMAGE_URL}${heroId}.png`;
}

// 生成英雄头像HTML
function getHeroesHTML(heroes, size = 'normal') {
    const sizeClass = size === 'tiny' ? 'hero-icon-tiny' : 
                      size === 'small' ? 'hero-icon-small' : 
                      size === 'medium' ? 'hero-icon-medium' : 'hero-icon';
    
    // 如果 heroes 为空或不足3个，用空占位符补充
    const heroList = heroes && heroes.length > 0 ? [...heroes] : [];
    while (heroList.length < 3) {
        heroList.push('');
    }
    
    return heroList.slice(0, 3).map(heroId => `
        <img class="${sizeClass}" 
             src="${getHeroImageUrl(heroId)}" 
             alt="${heroId || '未选择'}"
             title="${heroId || '未选择'}"
             onerror="this.src='https://via.placeholder.com/60x60/333333/ffffff?text=?'">
    `).join('');
}

// ========== 选择参赛者 ==========

// 更新选择参赛者显示
function updateSelectionDisplay() {
    const selectionDiv = document.getElementById('playerSelection');
    
    selectionDiv.innerHTML = playerPool.map(player => {
        const isSelected = selectedPlayers.some(p => p.name === player.name);
        return `
            <div class="player-card ${isSelected ? 'selected' : ''}" 
                 onclick='togglePlayer(${JSON.stringify(player).replace(/'/g, "&#39;")})'>
                <div class="avatar-section">
                    <img class="avatar" 
                         src="players/${player.avatar}" 
                         alt="${player.name}"
                         onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(player.name)}&background=667eea&color=fff&size=80'">
                    <div class="name">${player.name}</div>
                    <span class="position">${player.position}</span>
                </div>
                <div class="heroes-section">
                    <div class="heroes-label">偏好英雄</div>
                    <div class="heroes">
                        ${getHeroesHTML(player.heroes)}
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    // 更新已选择数量
    document.getElementById('selectedCount').textContent = selectedPlayers.length;
    
    // 更新开始按钮状态
    document.getElementById('startDraftBtn').disabled = selectedPlayers.length !== 10;
}

// 切换玩家选择状态
function togglePlayer(player) {
    const index = selectedPlayers.findIndex(p => p.name === player.name);
    
    if (index !== -1) {
        // 取消选择
        selectedPlayers.splice(index, 1);
    } else {
        // 添加选择
        if (selectedPlayers.length >= 10) {
            alert('已经选择了10名玩家！');
            return;
        }
        selectedPlayers.push(player);
    }
    
    updateSelectionDisplay();
}

// ========== 开始选人 ==========

// 开始选人
function startDraft() {
    if (selectedPlayers.length !== 10) {
        alert('请选择正好10名玩家！');
        return;
    }
    
    // 随机分配两名队长
    const shuffled = [...selectedPlayers].sort(() => Math.random() - 0.5);
    team1 = [shuffled[0]]; // 蓝队队长
    team2 = [shuffled[1]]; // 红队队长
    availablePlayers = shuffled.slice(2); // 剩余8名玩家
    
    // 切换页面
    document.getElementById('selectionArea').style.display = 'none';
    document.getElementById('draftArea').style.display = 'block';
    
    updateDraftDisplay();
}

// 更新选人界面
function updateDraftDisplay() {
    // 更新队伍显示
    document.getElementById('team1Players').innerHTML = team1.map((player, index) => `
        <div class="team-player">
            <img class="avatar-small" 
                 src="players/${player.avatar}" 
                 alt="${player.name}"
                 onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(player.name)}&background=2196F3&color=fff&size=45'">
            <div class="player-info">
                <div class="player-name">${player.name}${index === 0 ? ' 👑' : ''}</div>
                <div class="player-position">${player.position}</div>
            </div>
            <div class="heroes-small">
                ${getHeroesHTML(player.heroes, 'small')}
            </div>
        </div>
    `).join('');
    
    document.getElementById('team2Players').innerHTML = team2.map((player, index) => `
        <div class="team-player">
            <img class="avatar-small" 
                 src="players/${player.avatar}" 
                 alt="${player.name}"
                 onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(player.name)}&background=f44336&color=fff&size=45'">
            <div class="player-info">
                <div class="player-name">${player.name}${index === 0 ? ' 👑' : ''}</div>
                <div class="player-position">${player.position}</div>
            </div>
            <div class="heroes-small">
                ${getHeroesHTML(player.heroes, 'small')}
            </div>
        </div>
    `).join('');
    
    // 更新当前轮次提示
    const totalPicked = team1.length + team2.length - 2; // 减去两个队长
    if (totalPicked >= 8) {
        document.getElementById('currentTurn').innerHTML = '✅ 选人完成！';
        document.getElementById('availablePlayers').innerHTML = '';
        return;
    }
    
    const currentTeam = pickOrder[totalPicked];
    const teamName = currentTeam === 1 ? '🔵 蓝队' : '🔴 红队';
    const captain = currentTeam === 1 ? team1[0] : team2[0];
    
    document.getElementById('currentTurn').innerHTML = 
        `当前回合：${teamName} - 队长 <strong>${captain.name}</strong> 请选择队员`;
    
    // 更新可选玩家
    const playersDiv = document.getElementById('availablePlayers');
    playersDiv.innerHTML = availablePlayers.map(player => `
        <div class="available-player" onclick='pickPlayer(${JSON.stringify(player).replace(/'/g, "&#39;")})'>
            <img class="avatar-medium" 
                 src="players/${player.avatar}" 
                 alt="${player.name}"
                 onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(player.name)}&background=667eea&color=fff&size=70'">
            <div class="name">${player.name}</div>
            <span class="position-tag">${player.position}</span>
            <div class="heroes-row">
                ${getHeroesHTML(player.heroes, 'tiny')}
            </div>
        </div>
    `).join('');
}

// 选择玩家
function pickPlayer(player) {
    const totalPicked = team1.length + team2.length - 2;
    if (totalPicked >= 8) return; // 已选完
    
    const currentTeam = pickOrder[totalPicked];
    
    // 添加到对应队伍
    if (currentTeam === 1) {
        team1.push(player);
    } else {
        team2.push(player);
    }
    
    // 从可选列表移除
    availablePlayers = availablePlayers.filter(p => p.name !== player.name);
    
    // 更新显示
    updateDraftDisplay();
}

// 重新选择参赛者
function resetToSelection() {
    if (confirm('确定要重新选择参赛者吗？')) {
        team1 = [];
        team2 = [];
        availablePlayers = [];
        
        document.getElementById('draftArea').style.display = 'none';
        document.getElementById('selectionArea').style.display = 'block';
        
        updateSelectionDisplay();
    }
}