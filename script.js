// 全局变量
let players = [];
let team1 = [];
let team2 = [];
let availablePlayers = [];
let currentTurn = 1; // 1 = 蓝队, 2 = 红队
let pickOrder = [1, 2, 2, 1, 1, 2, 2, 1]; // 1-2-2-1-1-2-2-1 选人顺序

// 添加玩家
function addPlayer() {
    const input = document.getElementById('playerNameInput');
    const name = input.value.trim();
    
    if (name === '') {
        alert('请输入玩家名字！');
        return;
    }
    
    if (players.includes(name)) {
        alert('该玩家已存在！');
        return;
    }
    
    if (players.length >= 10) {
        alert('已达到10人上限！');
        return;
    }
    
    players.push(name);
    input.value = '';
    updatePlayerList();
    
    // 如果达到10人，启用开始按钮
    if (players.length === 10) {
        document.getElementById('startBtn').disabled = false;
    }
}

// 移除玩家
function removePlayer(name) {
    players = players.filter(p => p !== name);
    updatePlayerList();
    document.getElementById('startBtn').disabled = players.length !== 10;
}

// 更新玩家列表显示
function updatePlayerList() {
    const listDiv = document.getElementById('playerList');
    listDiv.innerHTML = players.map(name => `
        <div class="player-tag">
            <span>${name}</span>
            <button onclick="removePlayer('${name}')">×</button>
        </div>
    `).join('');
    
    // 显示当前人数
    if (players.length > 0) {
        listDiv.innerHTML += `<div style="width:100%; text-align:center; margin-top:10px; color:#666;">当前人数: ${players.length}/10</div>`;
    }
}

// 开始选人
function startDraft() {
    if (players.length !== 10) {
        alert('需要正好10名玩家才能开始！');
        return;
    }
    
    // 随机分配两名队长
    const shuffled = [...players].sort(() => Math.random() - 0.5);
    team1 = [shuffled[0]]; // 蓝队队长
    team2 = [shuffled[1]]; // 红队队长
    availablePlayers = shuffled.slice(2); // 剩余8名玩家
    
    // 切换显示区域
    document.getElementById('setupArea').style.display = 'none';
    document.getElementById('draftArea').style.display = 'block';
    
    currentTurn = 1;
    updateDraftDisplay();
}

// 更新选人界面
function updateDraftDisplay() {
    // 更新队伍显示
    document.getElementById('team1Players').innerHTML = team1.map(name => 
        `<div class="team-player">${name}${team1.indexOf(name) === 0 ? ' 👑' : ''}</div>`
    ).join('');
    
    document.getElementById('team2Players').innerHTML = team2.map(name => 
        `<div class="team-player">${name}${team2.indexOf(name) === 0 ? ' 👑' : ''}</div>`
    ).join('');
    
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
        `当前回合：${teamName} - 队长 <strong>${captain}</strong> 请选择队员`;
    
    // 更新可选玩家
    const playersDiv = document.getElementById('availablePlayers');
    playersDiv.innerHTML = availablePlayers.map(name => `
        <div class="available-player selectable" onclick="pickPlayer('${name}')">
            ${name}
        </div>
    `).join('');
}

// 选择玩家
function pickPlayer(name) {
    const totalPicked = team1.length + team2.length - 2;
    if (totalPicked >= 8) return; // 已选完
    
    const currentTeam = pickOrder[totalPicked];
    
    // 添加到对应队伍
    if (currentTeam === 1) {
        team1.push(name);
    } else {
        team2.push(name);
    }
    
    // 从可选列表移除
    availablePlayers = availablePlayers.filter(p => p !== name);
    
    // 更新显示
    updateDraftDisplay();
}

// 重新开始
function resetDraft() {
    if (confirm('确定要重新开始吗？')) {
        players = [];
        team1 = [];
        team2 = [];
        availablePlayers = [];
        currentTurn = 1;
        
        document.getElementById('setupArea').style.display = 'block';
        document.getElementById('draftArea').style.display = 'none';
        document.getElementById('startBtn').disabled = true;
        
        updatePlayerList();
    }
}

// 支持Enter键添加玩家
document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('playerNameInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            addPlayer();
        }
    });
});